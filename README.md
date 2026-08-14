# Name That Tune

**This project is not complete/bug-free. If you have suggestions or bug fixes, feel free to contribute.**

Name That Tune is [Heardle](https://en.wikipedia.org/wiki/Heardle) made for [Spicetify](https://spicetify.app) — guess the song from progressively longer snippets. Spotify acquired the original and shut it down in 2023; this keeps the game alive inside their own desktop client.

![Preview screenshot](docs/preview-2026-08.png)

## Table of contents
  - [Installation](#installation)
  - [Usage](#usage)
  - [Translations](#translations)
  - [Planned Features](#planned-features)

## Installation
Download the [dist branch](https://github.com/theRealPadster/name-that-tune/archive/refs/heads/dist.zip) and rename the folder "name-that-tune". Copy it into the spicetify custom apps folder:
| **Platform**    | **Path**                               |
|-----------------|----------------------------------------|
| **Linux/macOS** | `~/.config/spicetify/CustomApps`       |
| **Windows**     | `%appdata%\spicetify\CustomApps`       |

After putting the name-that-tune folder into the correct custom apps folder, run the following command to enable it:
```
spicetify config custom_apps name-that-tune
spicetify apply
```
Note: Using the `config` command to add the custom app will always append the file name to the existing custom apps list. It does not replace the whole key's value.

Or you can manually edit your `config-xpui.ini` file. Add your desired custom apps folder names in the `custom_apps` key, separated them by the | character.
Example:
```ini
[AdditionalOptions]
...
custom_apps = spicetify-marketplace|name-that-tune
```

Then run:
```
spicetify apply
```

## Usage
- Right-click on any artist, playlist, album, etc. 
- Click "play" to hear the first second of the track.
- Making a guess adds one second of music playback. It will reveal the song when you get it right. 
- (If you open the app directly from the header bar, it will just use the song you are currently playing.)

## Translations
I've added translations support! If you use Spotify in a non-English language and are getting the "Play Name That Tune" menu item etc in English, you can get your language added by either:

- Making a [new issue](https://github.com/theRealPadster/name-that-tune/issues/new?labels=i18n&template=new_translation.yml) with the translated contents of [`src/locales/en.json`](https://github.com/theRealPadster/name-that-tune/blob/main/src/locales/en.json). No setup needed — I'll wire it up.
- Or submitting a pull request:
  1. Copy `src/locales/en.json` to `src/locales/<locale>.json` and translate the values.
  2. **Register it in [`src/i18n.ts`](https://github.com/theRealPadster/name-that-tune/blob/main/src/i18n.ts)** — add the import and one entry to the `resources` map. A locale file that isn't listed there is never loaded, and the app silently falls back to English.

`<locale>` has to match what Spotify reports, hyphens and all: `pt-BR`, `es-419`, `zh-CN` — not `ptBR`. You can check your own in the Spotify devtools console with `Spicetify.Locale.getLocale()`.

Some languages need more plural forms than English does. Keys like `songWithCount` and `sendingURIs` use i18next's `_one` / `_other` suffixes; if your language also needs `_few` or `_many` (Polish, for instance), add those keys too.

## Planned Features
- Possible "random" mode that doesn't use the beginning of the song, but grabs random segments from it
- Come up with a better name
