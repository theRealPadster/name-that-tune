# Spurdle

Spurdle is [Heardle.app](https://www.heardle.app) made for [Spicetify](https://spicetify.app). 
This project is very early in development and in no way complete or fun to use. If you're impatient to play Heardle with your Spotify, feel free to contribute 😄

TODO: add screenshot

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
Open via the left-side navigation. Click "play" to hear the first second of the track. Making a guess adds one second of music playback. It will reveal the song when you get it right. 
Right now it only works on the currently playing track, which is not ideal. I plan to add functionality to allow you to add songs from an artist, playlist, album, etc. 

## Planned Features
- Source songs from playlist/album/etc
- Source songs from artist
- Source songs from genre
- etc. 
- Possible "random" mode that doesn't use the beginning of the song, but grabs random segments from it
- Come up with a better name

## Made with Spicetify Creator
- https://github.com/spicetify/spicetify-creator
