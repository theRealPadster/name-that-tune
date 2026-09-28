# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A [Spicetify](https://spicetify.app) custom app that turns the Spotify desktop client into a Heardle-style
"guess the song" game. It runs *inside* the Spotify client, so `Spicetify.*` globals (Player, Platform,
ContextMenu, URI, CosmosAsync, GraphQL, React) are the entire runtime API surface — there is no server,
no bundled React, and no DOM outside of Spotify's own.

The README is honest that the app is not complete or bug-free, and invites contributions.

## Commands

pnpm only (`engines` blocks npm/yarn), Node >= 24 (`.nvmrc`).

| Command | What it does |
|---|---|
| `pnpm build` | Builds straight into your live Spicetify `CustomApps/name-that-tune` folder (resolved via `spicetify -c`). Run `spicetify apply` after. |
| `pnpm watch` | Same target, rebuild on change. Normal dev loop. |
| `pnpm build:local` | Minified build into `./dist` — what CI runs. `dist/` is gitignored on `main`. |
| `pnpm lint` / `pnpm lint:ci` | ESLint with `--fix` / without. |
| `pnpm type-check` | `tsc --noEmit`. |
| `pnpm test` / `pnpm test:watch` | Vitest, once / on change. |
| `pnpm update-types` | Re-downloads `src/types/spicetify.d.ts` from spicetify-cli upstream. |

The unit tests (`src/*.test.ts`) cover only the pure logic: clue timing and random offsets (`round.ts`),
title matching (`logic.ts`), and `shuffle`. They run in Node with no `Spicetify` global, so anything
that touches the player is tested in the real client instead. Verification =
`pnpm lint:ci && pnpm type-check && pnpm test && pnpm build:local`.

CI: `lint.yml` (named "Quality"; push/PR to main) runs lint, type-check and tests; `build.yml` (PR) runs
`build:local`. `push-dist.yml` runs the same checks on every push to `main`, then builds and commits the
output to the `dist` branch — that branch is what users download, so `main` is effectively released on
merge.

`package.json` carries `pnpm.overrides` pinning patched versions of a few transitive dev dependencies
(`js-yaml`, `brace-expansion`, `@humanfs/node`) for security advisories. Drop an entry once its parent
package ships the fix.

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

CSS modules go through `postcss-modules`, not esbuild's native `local-css` loader, and the reason only
shows up in a **minified** build: esbuild treats local class names as identifiers and renames them, so
`--minify` collapses the stylesheet to `.i`, `.o`, `.s`. Every Spicetify app's CSS loads into one shared
document, and any other app minified the same way draws from the same tiny pool. postcss-modules writes
the scoped names in before esbuild sees them, and esbuild does not rename class names it did not create.

**This is why the module stylesheets are called `name-that-tune*.module.scss`.** The scoped name is
`[name]__[local]`, where `[name]` is the filename — so the prefix there is what keeps these unique
between apps. Renaming them back to `app.module.scss`, or "organising" them into a `name-that-tune/`
folder (the directory is not part of the name), reintroduces the clash.

There is no content hash in the pattern: filename plus local name is already unique, and stable names
are kinder to anyone writing custom CSS against the app.

**Check CSS changes against `pnpm build:local`, not `pnpm build`.** Only the former minifies, and that is
where class-name behaviour differs — a dev build looks correct while the shipped artifact is not.

### Routing

Hand-rolled: `App.render()` reads `Spicetify.Platform.History.location.pathname` and returns `<Stats>`
for `/name-that-tune/stats`, `<Game>` otherwise. Navigation is `History.push({ pathname, state })`.
`<Game>` is keyed on `location.key`, so every navigation remounts it and starts a fresh round.

### Data flow for a game

1. Context menu (extension) → `sendToApp(URIs)` → `History.push('/name-that-tune', { state: { URIs } })`.
   The menu entry is offered for playlists, albums, artists, folders, Liked Songs and multi-track
   selections, not podcast shows (an episode can't pass the track check in step 3).
2. `App` passes `location.state.URIs` to `<Game>` as a prop — this is the only channel between
   extension and app. Opening the app from the header bar passes none, so the round uses whatever is
   already playing.
3. `logic.initialize(URIs)` → `shuffle+.ts`, which resolves a URI to a track list depending on its type
   (playlist/album/artist/folder/collection/show, each via a different Cosmos or GraphQL call) and
   then pushes that list onto Spotify's queue via the private
   `Spicetify.Platform.PlayerAPI._queue._client.setQueue`. `shuffle+.ts` is adapted from the
   Shuffle+ extension and leans on undocumented internals; expect it to break on Spotify updates.
4. `initialize` then waits for the player's `songchange` event (10s timeout), snapshots that track
   into a `RoundTrack` (`round.ts`: URI, title, artists, artwork, duration), and pauses at 0. The
   round checks guesses and renders the Reveal from the snapshot, never from `Player.data`, so the
   answer can't drift mid-round.

`Game` runs rounds through `GameState` (Loading → Playing → Won/Lost, or Error). A `songchange` to a
different track mid-round is treated as outside interference and ends the round on the error card.
Two known rough edges: if the first shuffled track is the one already playing, no `songchange` fires
and the start times out; and Next song past the end of a source runs into unrelated tracks and errors.

### Clipping playback

`AudioManager` is the mechanism that only lets you hear part of the song: `setWindow(start, duration)`
sets the clip, `play()` seeks to `start`, and an `onprogress` listener pauses and seeks back to
`start` once playback passes the end of the window. It stops 250ms short of the end of the track so
Spotify can't auto-advance to the next answer. `clearWindow()` / `reveal()` lift the window, which is
how winning or giving up plays the full song.

Clip lengths come from `stageToTime(stage) = 1 + 0.5(stage + stage²)` in `round.ts` — Heardle's curve:
1s, 2s, 4s, 7s, 11s, 16s for the six default clues (`ROUND_TIMES`, `MAX_ATTEMPTS`). Missing the sixth
sets `askingToKeepGuessing`, and the player chooses **Keep guessing** (the curve continues: 22s, 29s,
…) or **Give up and reveal**.

Two clip modes, picked before the first guess and stored under `name-that-tune:mode`: **Intro** plays
from 0; **Random spot** plays every clue from one offset chosen by `pickSnippetStart` — at least 10s
in, leaving room for the 16s clue before the end. Clues past the sixth simply stop at the end of the
song.

### Hiding the answer

Two body classes drive all information-hiding, and both bundles set them:

- `body.name-that-tune` — app is open (set by the extension's `History.listen`).
- `body.name-that-tune--guessing` — a round is in progress (`logic.toggleIsGuessing`, called from the
  extension on navigation, from `logic.initialize`, and from `Game` when a round loads, ends or errors).

`src/css/app.global.scss` uses them to hide the now-playing bar, queue, and skip buttons. It targets
Spotify's own internal class names (`.main-nowPlayingBar-left`, `.player-controls__buttons`, …), which
are unversioned and change between Spotify releases — this is the most fragile part of the app.
Component styling uses SCSS modules (`*.module.scss`) instead, and Spicetify CSS vars (`--spice-text`).

Known gaps: the playback bar stays visible (only non-interactive), so it shows the song's length and,
in Random spot mode, where the clip is; and Spotify's screen-reader live region announces "Now playing:
Song by Artist" when a clip starts.

The window title is covered best effort only. `Game.protectWindowTitle` sets it to the app name with
`Spicetify.AppTitle.set()`, but that only overrides Spotify's *idle* title: while a clip plays, Spotify
shows "Artist - Song" for about a second before the override lands. `set()` resolves to a
subscription with `cancel()`, not the `{ clear }` that `spicetify.d.ts` declares (fixed upstream in
spicetify/cli#3966) — so don't keep or call its return value; `reset()` undoes it.

### Guess matching

`logic.checkGuess(guess, title)` compares against several candidates for the title: as-is, without
`(…)` / `[…]`, without anything after ` - `, and without a `feat.` / `ft.` credit. `normalizeTitle()`
lowercases, turns `&` into `and`, strips diacritics, and keeps only Unicode letters and numbers, so any
script works. Titles shorter than 4 characters must match exactly; otherwise `diceCoefficient` must reach
`0.86` (under 7 characters) or `0.8`.

### Stats

Written to `localStorage` under `name-that-tune:stats` as `{ [stage]: count }`, where `-1` means
"gave up" — any loss, whether from the Give up button or the Keep guessing prompt. `Stats.tsx` buckets
stage > 5 (a win after choosing Keep guessing) into ">16s", renders a chart.js horizontal bar chart,
and shows an empty state when there are no games yet.

## Conventions

- `src/types/spicetify.d.ts` is generated (`pnpm update-types`) and ESLint-ignored — never hand-edit it.
- Pages (`App`, `Game`, `Stats`) are React **class** components with local state; smaller components
  (`Button`, `Reveal`, `GuessItem`, `TrackSuggestions`) are function components. There is no store.
- ESLint enforces 2-space indent, single quotes, semicolons, trailing commas on multiline. `switch`
  cases are *not* indented (see `shuffle+.ts`) — that's the configured `indent` rule's behaviour, don't
  "fix" it.
- Translation strings use i18next interpolation and `$t(appName)` references; plurals use the
  `_one` / `_other` suffixes. Outside React (e.g. errors thrown in `logic.ts` and shown on the error
  card), use `i18n.t()` from `i18next` directly. New keys usually land in `en.json` only; other
  locales fall back to English until translated.
- `.gitattributes` normalizes text files to LF.
- Dependabot runs monthly and ignores patch updates; most commits on `main` are those bumps.
