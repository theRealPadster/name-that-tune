# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A [Spicetify](https://spicetify.app) custom app that turns the Spotify desktop client into a Heardle-style
"guess the song" game. It runs *inside* the Spotify client, so `Spicetify.*` globals (Player, Platform,
ContextMenu, URI, CosmosAsync, GraphQL, React) are the entire runtime API surface — there is no server,
no bundled React, and no DOM outside of Spotify's own.

Note the README: the project is no longer in active development.

## Commands

pnpm only (`engines` blocks npm/yarn), Node >= 24 (`.nvmrc`).

| Command | What it does |
|---|---|
| `pnpm build` | Builds straight into your live Spicetify `CustomApps/name-that-tune` folder (resolved via `spicetify -c`). Run `spicetify apply` after. |
| `pnpm watch` | Same target, rebuild on change. Normal dev loop. |
| `pnpm build:local` | Minified build into `./dist` — what CI runs. `dist/` is gitignored on `main`. |
| `pnpm lint` / `pnpm lint:ci` | ESLint with `--fix` / without. |
| `pnpm type-check` | `tsc --noEmit`. **Not run in CI** — run it manually before finishing work. |
| `pnpm update-types` | Re-downloads `src/types/spicetify.d.ts` from spicetify-cli upstream. |

There are no tests. Verification = `pnpm lint:ci && pnpm type-check && pnpm build:local`.

CI: `lint.yml` (push/PR to main), `build.yml` (PR). `push-dist.yml` builds on every push to `main` and
commits the output to the `dist` branch — that branch is what users download, so `main` is effectively
released on merge.

## Architecture

### Two independent bundles

`scripts/build.mjs` (esbuild) emits two separate things from `src/`:

1. **The custom app** — entry `src/app.tsx`, mounted by Spotify when the user navigates to
   `/name-that-tune`. `src/settings.json` is the app manifest (`nameId` determines both the output
   folder name and the route).
2. **The extension** — every file in `src/extensions/` becomes its own bundle, loaded at Spotify
   startup regardless of route. `extension.tsx` polls until `Spicetify.Platform`/`ContextMenu`/`URI`
   exist, then registers the right-click menu entry and a `History.listen` handler.

They share no runtime state, so each ends up with its own i18next instance. The *configuration* is
shared source, though: `src/i18n.ts` exports `initI18n()`, which both entry points call. Adding a
locale means dropping the JSON in `src/locales/` and adding one line to that file.

`initI18n()` reads `Spicetify.Locale`, so it must be called rather than run on import. `app.tsx` calls
it at module scope, which is safe because the app bundle only loads on navigation; `extension.tsx`
calls it after its startup poll, because extensions load before `Spicetify.Locale` necessarily exists.

`react` / `react-dom` are marked external and rewritten to `Spicetify.React` / `Spicetify.ReactDOM`.
Everything else is bundled, which is why all deps live in `devDependencies`.

### The build script

`scripts/build.mjs` replaced `spicetify-creator`, which was deprecated in December 2025 while pinning
esbuild 0.14. It reproduces what that tool did, and the resemblance is deliberate — several details are
a contract with Spotify rather than choices to tidy up:

- the esbuild `globalName` is `nameId` with `-` → `D` (`nameDthatDtune`), and `index.js` gets
  `const render=()=>nameDthatDtune.default();` appended — that is how Spotify mounts the app;
- `src/app.tsx` is wrapped by a generated entry that exports `render()`, so the app file itself
  does not have to;
- `index.css` is renamed to `style.css`, and `manifest.json` holds the icon SVG's *contents*;
- each extension bundle is wrapped in an async IIFE that waits for `Spicetify.React` — extensions
  load at startup, and `extension.tsx` imports `react-i18next`, so without the gate it evaluates
  against an undefined global.

CSS modules use esbuild's native `local-css` loader — sass compiles the SCSS, esbuild scopes the class
names. **This is why the module stylesheets are called `name-that-tune*.module.scss`.** esbuild builds
scoped names from the file's *basename* alone, ignoring the directory, and adds no app-specific suffix;
every Spicetify app's stylesheet loads into one shared document, so a generic `app.module.scss` here
would collide with another app's. The prefix in the filename is the only thing making these unique —
renaming them back, or "organising" them into a `name-that-tune/` folder, reintroduces the clash.

### Routing

Hand-rolled: `App.render()` reads `Spicetify.Platform.History.location.pathname` and returns `<Stats>`
for `/name-that-tune/stats`, `<Game>` otherwise. Navigation is `History.push({ pathname, state })`.

### Data flow for a game

1. Context menu (extension) → `sendToApp(URIs)` → `History.push('/name-that-tune', { state: { URIs } })`.
2. `Game`'s constructor reads `Spicetify.Platform.History.location.state.URIs` — this is the only
   channel between extension and app.
3. `logic.initialize(URIs)` → `shuffle+.ts`, which resolves a URI to a track list depending on its type
   (playlist/album/artist/folder/collection/show, each via a different Cosmos or GraphQL call) and
   then pushes that list onto Spotify's queue via the private
   `Spicetify.Platform.PlayerAPI._queue._client.setQueue`. `shuffle+.ts` is adapted from the
   Shuffle+ extension and leans on undocumented internals; expect it to break on Spotify updates.

### Clipping playback

`AudioManager` is the mechanism that only lets you hear the first N seconds: it subscribes to the
player's `onprogress` event and, once progress exceeds `end` seconds, calls `pause()` + `skipBack()`.
`end` comes from `stageToTime(stage) = 1 + 0.5(stage + stage²)` (1s, 2s, 4s, 7s, 11s, 16s — Heardle's
curve). Setting `end` to `0` disables clipping, which is how winning/giving up reveals the full song.

### Hiding the answer

Two body classes drive all information-hiding, and both bundles set them:

- `body.name-that-tune` — app is open (set by the extension's `History.listen`).
- `body.name-that-tune--guessing` — a round is in progress (`logic.toggleIsGuessing`, called from both
  the extension on navigation and from `Game` on win/give-up/next).

`src/css/app.global.scss` uses them to hide the now-playing bar, queue, and skip buttons. It targets
Spotify's own internal class names (`.main-nowPlayingBar-left`, `.player-controls__buttons`, …), which
are unversioned and change between Spotify releases — this is the most fragile part of the app.
Component styling uses SCSS modules (`*.module.scss`) instead, and Spicetify CSS vars (`--spice-text`).

### Guess matching

`logic.normalize()` strips parentheticals, everything after ` - `, diacritics, and all non-alphanumerics
(with explicit ranges kept for Cyrillic/Polish/Arabic/Hebrew), then `diceCoefficient` > `0.8` counts as
correct.

### Stats

Written to `localStorage` under `name-that-tune:stats` as `{ [stage]: count }`, where `-1` means
"gave up". `Stats.tsx` buckets stage > 5 into ">16s" and renders a chart.js horizontal bar chart.

## Conventions

- `src/types/spicetify.d.ts` is generated (`pnpm update-types`) and ESLint-ignored — never hand-edit it.
- Pages/components are React **class** components with local state; there is no store.
- ESLint enforces 2-space indent, single quotes, semicolons, trailing commas on multiline. `switch`
  cases are *not* indented (see `shuffle+.ts`) — that's the configured `indent` rule's behaviour, don't
  "fix" it.
- Translation strings use i18next interpolation and `$t(appName)` references; plurals use the
  `_one` / `_other` suffixes.
- Dependabot runs monthly and ignores patch updates; most commits on `main` are those bumps.
