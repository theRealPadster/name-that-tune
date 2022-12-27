# Name That Tune

Name That Tune is [Heardle.app](https://www.heardle.app) made for [Spicetify](https://spicetify.app). 
This project is fairly early in development and is not complete/bug-free. If you have suggestions, free to contribute 😄

![Preview screenshot](docs/preview.png)

## Table of contents
  - [Installation](#installation)
  - [Usage](#usage)
  - [Planned Features](#planned-features)

## ⚙️ Installation
Download the [dist branch](https://github.com/theRealPadster/name-that-tune/archive/refs/heads/dist.zip) and rename the folder "name-that-tune". Copy it into the spicetify custom apps folder:
| **Platform**    | **Path**                               |
|-----------------|----------------------------------------|
| **Linux/macOS** | `~/.config/spicetify/CustomApps`       |
| **Windows**     | `%localappdata%\spicetify\CustomApps` |

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

## 🪄 Usage
- Right-click on any artist, playlist, album, etc. 
- Click "play" to hear the first second of the track.
- Making a guess adds one second of music playback. It will reveal the song when you get it right. 
- (If you open it via the left-side navigation, it will just use the song you are currently playing.)

## 🌎 Translations
I've added translations support! If you use Spotify in a non-English language and are getting the "Play Name That Tune" menu item etc in English, you can get your language added by either: 
- Submitting a pull request with a new copy of `src/locales/en.json` but named after your locale, with your translated content inside. 
- Or making a new issue with the relevant translations from [`src/locales/en.json`](https://github.com/theRealPadster/name-that-tune/blob/main/src/locales/en.json). 

## Planned Features
- Possible "random" mode that doesn't use the beginning of the song, but grabs random segments from it
- Come up with a better name

## Made with Spicetify Creator
- https://github.com/spicetify/spicetify-creator
