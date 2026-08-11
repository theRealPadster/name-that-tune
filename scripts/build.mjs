#!/usr/bin/env node
// Build the custom app and the extension bundles.
//
// Replaces spicetify-creator, which was deprecated in December 2025 and pinned
// esbuild 0.14. This reproduces what it did — deliberately byte for byte, so the
// migration is verifiable by diffing against a spicetify-creator build.
//
//   node scripts/build.mjs [--out=DIR] [--watch] [--minify]
//
// With no --out, writes into the live Spicetify CustomApps folder, resolved
// from `spicetify -c`. Run `spicetify apply` afterwards.

import * as esbuild from 'esbuild';
import { compileAsync } from 'sass-embedded';
import postcss from 'postcss';
import postcssModules from 'postcss-modules';
import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';

const execAsync = promisify(exec);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const srcDir = path.join(root, 'src');

const argv = process.argv.slice(2);
const flag = (name) => argv.some((a) => a === `--${name}` || a.startsWith(`--${name}=`));
const value = (name) => argv.find((a) => a.startsWith(`--${name}=`))?.split('=').slice(1).join('=');

const watch = flag('watch');
const minify = flag('minify');

const settings = JSON.parse(fs.readFileSync(path.join(srcDir, 'settings.json'), 'utf-8'));

// spicetify-creator derived the esbuild globalName this way. Spotify calls the
// generated `render()`, which reaches into this global, so the mangling has to
// match exactly — `name-that-tune` becomes `nameDthatDtune`.
const globalName = settings.nameId.replace(/-/g, 'D');

const outDir = value('out')
  ? path.resolve(root, value('out'))
  : path.join(
    path.dirname((await execAsync('spicetify -c')).stdout.trim()),
    'CustomApps',
    settings.nameId,
  );

fs.mkdirSync(outDir, { recursive: true });

const extensions = fs.readdirSync(path.join(srcDir, 'extensions'))
  .filter((f) => /\.(tsx?|jsx?)$/.test(f))
  .map((f) => path.join(srcDir, 'extensions', f));
const extensionOutNames = extensions.map((e) => `${path.basename(e).replace(/\.[^.]+$/, '')}.js`);

// --- manifest.json -----------------------------------------------------------
// The icon fields hold the SVG's contents, not a path to it.
const readIcon = (rel) => (rel ? fs.readFileSync(path.join(srcDir, rel), 'utf-8') : '');
console.log('Generating manifest.json...');
fs.writeFileSync(
  path.join(outDir, 'manifest.json'),
  JSON.stringify({
    name: settings.displayName,
    icon: readIcon(settings.icon),
    'active-icon': readIcon(settings.activeIcon ?? settings.icon),
    subfiles: [],
    subfiles_extension: extensionOutNames,
  }, null, 2),
);

// --- app entry ---------------------------------------------------------------
// Spotify expects a `render()`. Rather than require src/app.tsx to export one,
// synthesise a wrapper that does, exactly as spicetify-creator did.
const appPath = ['app.tsx', 'app.ts', 'app.jsx', 'app.js']
  .map((f) => path.join(srcDir, f))
  .find((f) => fs.existsSync(f));
if (!appPath) throw new Error(`No app entry point found in ${srcDir}`);

const tempDir = path.join(os.tmpdir(), 'name-that-tune-build');
fs.mkdirSync(tempDir, { recursive: true });
const indexPath = path.join(tempDir, 'index.jsx');
fs.writeFileSync(indexPath, [
  `import App from '${appPath.replace(/\\/g, '/')}'`,
  "import React from 'react';",
  '',
  'export default function render() {',
  '  return <App />;',
  '}',
].join('\n'));

// --- plugins -----------------------------------------------------------------

// react/react-dom are not bundled; Spotify supplies them on the Spicetify global.
// Replaces esbuild-plugin-external-global.
const externalGlobals = {
  name: 'external-globals',
  setup(build) {
    const mapping = { react: 'Spicetify.React', 'react-dom': 'Spicetify.ReactDOM' };
    const filter = /^(react|react-dom)$/;
    build.onResolve({ filter }, (args) => ({ path: args.path, namespace: 'external-global' }));
    build.onLoad({ filter: /.*/, namespace: 'external-global' }, (args) => ({
      contents: `module.exports = ${mapping[args.path]};`,
      loader: 'js',
    }));
  },
};

// SCSS + CSS modules. esbuild can scope CSS itself via its local-css loader, but
// its class names carry no app-specific suffix, and every Spicetify app shares
// one document — two apps with a like-named .module.scss would collide. Keeping
// postcss-modules preserves spicetify-creator's `_<globalName>` suffix, and
// keeps the generated names identical so the output stays diffable.
const scss = {
  name: 'scss',
  setup(build) {
    const cssStore = new Map();

    build.onResolve({ filter: /\.module\.scss\.css$/ }, (args) => ({
      path: args.path,
      namespace: 'virtual-css',
    }));
    build.onLoad({ filter: /.*/, namespace: 'virtual-css' }, (args) => ({
      contents: cssStore.get(args.path),
      loader: 'css',
    }));

    build.onLoad({ filter: /\.scss$/ }, async (args) => {
      const { css } = await compileAsync(args.path, { loadPaths: [path.dirname(args.path)] });

      // Global stylesheets need nothing further — postcss is here solely to
      // scope CSS-module class names.
      if (!args.path.endsWith('.module.scss')) {
        return { contents: css, loader: 'css' };
      }

      let exported = {};
      const result = await postcss([
        postcssModules({
          generateScopedName: `[name]__[local]___[hash:base64:5]_${globalName}`,
          getJSON: (_, json) => { exported = json; },
        }),
      ]).process(css, { from: args.path });

      // Hand the CSS to esbuild via a virtual import so it lands in the shared
      // stylesheet, and export the local->scoped name map as the module's value.
      // The virtual path is repo-relative: esbuild writes it into a provenance
      // comment, and an absolute one would differ between a local build and CI.
      const virtual = `${path.relative(root, args.path)}.css`;
      cssStore.set(virtual, result.css);
      return {
        contents: `import ${JSON.stringify(virtual)};\nexport default ${JSON.stringify(exported)};`,
        loader: 'js',
        resolveDir: path.dirname(args.path),
      };
    });
  },
};

// --- build -------------------------------------------------------------------
const options = {
  entryPoints: [indexPath, ...extensions],
  outdir: outDir,
  bundle: true,
  platform: 'browser',
  globalName,
  external: ['react', 'react-dom'],
  plugins: [scss, externalGlobals],
  logLevel: 'warning',
  // Minify as part of bundling rather than over the finished text. esbuild can
  // then rename across module boundaries, which a post-hoc pass cannot.
  minify,
  legalComments: minify ? 'none' : 'eof',
};

// esbuild writes entry outputs into subfolders mirroring the entry paths when
// those paths do not share a root. Flatten them back out.
const flatten = (dir) => {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const sub = path.join(dir, entry.name);
    flatten(sub);
    for (const file of fs.readdirSync(sub)) {
      fs.renameSync(path.join(sub, file), path.join(dir, file));
    }
    fs.rmdirSync(sub);
  }
};

const afterBundle = async () => {
  console.log('Moving files out of folders...');
  flatten(outDir);

  console.log('Modifying index.js...');
  fs.appendFileSync(
    path.join(outDir, 'index.js'),
    `const render=()=>${globalName}.default();\n`,
  );

  console.log('Renaming index.css...');
  const indexCss = path.join(outDir, 'index.css');
  if (fs.existsSync(indexCss)) fs.renameSync(indexCss, path.join(outDir, 'style.css'));

  // Extensions load at Spotify startup, before Spicetify.React necessarily
  // exists. Anything importing react — react-i18next here — would evaluate
  // against an undefined global without this gate.
  for (const name of extensionOutNames) {
    const file = path.join(outDir, name);
    const body = fs.readFileSync(file, 'utf-8');
    fs.writeFileSync(file, [
      '(async function() {',
      '          while (!Spicetify.React || !Spicetify.ReactDOM) {',
      '            await new Promise(resolve => setTimeout(resolve, 10));',
      '          }',
      `          ${body}`,
      '        })();',
    ].join('\n'));
  }

  console.log('Build succeeded.');
};

if (watch) {
  const ctx = await esbuild.context({
    ...options,
    plugins: [...options.plugins, {
      name: 'after-bundle',
      setup(build) {
        build.onEnd(async (result) => {
          if (result.errors.length === 0) await afterBundle();
        });
      },
    }],
  });
  await ctx.watch();
  console.log('Watching...');
} else {
  await esbuild.build(options);
  await afterBundle();
}
