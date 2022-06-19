/// <reference path="../../spicetify-cli/globals.d.ts" />
/// <reference path="../../spicetify-cli/jsHelper/spicetifyWrapper.js" />

import { fetchAndPlay, shuffle, playList } from './shuffle+';
import { getLocalStorageDataFromKey } from './Utils';
import { STATS_KEY } from './constants';

export const toggleNowPlaying = (visible: boolean) => {
  // visible = true;
  // Hide items that give away information while playing
  [
    // The left side chunk with the title, artist, album art, etc.
    document.querySelector<HTMLElement>('.main-nowPlayingBar-left'),
    // Play/pause/next/previous/etc.
    document.querySelector<HTMLElement>('.player-controls__buttons'),
  ].forEach((item) => {
    if (item) {
      item.style.opacity = visible ? '1' : '0';
      item.style.pointerEvents = visible ? 'auto' : 'none';
    }
  });

  // Disable playback bar interaction while playing
  const playbackBar = document.querySelector<HTMLElement>('.playback-bar');
  if (playbackBar) {
    playbackBar.style.pointerEvents = visible ? 'auto' : 'none';
  }
};

// TODO: potentially tweak this (e.g. accept '&'/'and' or other things)
const normalize = (str: string) => {
  let cleaned = str.trim().toLowerCase();

  // Remove anything within parentheses
  cleaned = cleaned.replace(/\(.*\)/g, '');

  // Remove special characters
  // TODO: This strips out spaces in between words...
  cleaned = cleaned.replace(/[^a-zA-Z0-9]/g, '');

  // TODO: add any other logic?

  return cleaned;
};

export const checkGuess = (guess: string) => {
  console.log({ guess });
  console.log(`title: ${Spicetify.Player.data.track.metadata.title}`);
  console.log(
    `artist_name: ${Spicetify.Player.data.track.metadata.artist_name}`
  );
  console.log(
    `album_artist_name: ${Spicetify.Player.data.track.metadata.album_artist_name}`
  );

  const normalizedGuess = normalize(guess);
  const normalizedAnswer = normalize(
    Spicetify.Player.data.track.metadata.title
  );

  return normalizedGuess === normalizedAnswer;
};

export const initialize = (URIs?: string[]) => {
  // If passed in URIs, use them
  if (URIs) {
    if (URIs.length === 1) {
      fetchAndPlay(URIs[0]);
      return;
    }

    playList(shuffle(URIs), null);

    // Spicetify.Player.playUri(URIs[0]);
    // Because it will start playing automatically
    try {
      Spicetify.Player.pause();
    } catch (e) {
      console.log('Error pausing player:', e);
    }
    // if (Spicetify.Player.isPlaying()) {
    // }
    Spicetify.Player.seek(0);
  }
};

/*
  * Don't just add the same amount of time for each guess
  * Heardle offsets:
  * 1s, +1s, +2s, +3s, +4s, +5s
  * Which is this equation:
  * s = 1 + 0.5x + 0.5x^2
  */
export const stageToTime = (stage: number) => {
  return (1 + 0.5 * (stage + stage ** 2));
};

/**
 * Saves an object to localStorage with key:value pairs as stage:occurrences
 * @param stage The stage they won at, or -1 if they gave up
 */
export const saveStats = (stage: number) => {
  const savedStats = getLocalStorageDataFromKey(STATS_KEY, {});
  console.debug('Existing stats:', savedStats);
  savedStats[stage] = savedStats[stage] + 1 || 1;
  console.debug('Saving stats:', savedStats);
  localStorage.setItem(STATS_KEY, JSON.stringify(savedStats));
};
