# Spurdle

Spurdle is [Heardle.app](https://www.heardle.app) made for [Spicetify](https://spicetify.app). 
This project is fairly early in development and is not complete/bug-free. If you have suggestions, free to contribute 😄

![Preview screenshot](docs/preview.png)

## Table of contents
  - [Installation](#installation)
  - [Usage](#usage)
  - [Planned Features](#planned-features)

## Installation
Download the [dist branch](https://github.com/theRealPadster/spurdle/archive/refs/heads/dist.zip) and rename the folder "spurdle". Copy it into the spicetify custom apps folder:
| **Platform**    | **Path**                               |
|-----------------|----------------------------------------|
| **Linux/macOS** | `~/.config/spicetify/CustomApps`       |
| **Windows**     | `%userprofile%/.spicetify/CustomApps/` |

After putting the spurdle folder into the correct custom apps folder, run the following command to enable it:
```
spicetify config custom_apps spurdle
spicetify apply
```
Note: Using the `config` command to add the custom app will always append the file name to the existing custom apps list. It does not replace the whole key's value.

Or you can manually edit your `config-xpui.ini` file. Add your desired custom apps folder names in the `custom_apps` key, separated them by the | character.
Example:
```ini
[AdditionalOptions]
...
custom_apps = spicetify-marketplace|spurdle
```

Then run:
```
spicetify apply
```

## Usage
- Right-click on any artist, playlist, album, etc. 
- Click "play" to hear the first second of the track.
- Making a guess adds one second of music playback. It will reveal the song when you get it right. 
- (If you open it via the left-side navigation, it will just use the song you are currently playing.)

## Planned Features
- Possible "random" mode that doesn't use the beginning of the song, but grabs random segments from it
- Come up with a better name

## Made with Spicetify Creator
- https://github.com/spicetify/spicetify-creator
