// import FuzzySet from 'fuzzyset';
import { diceCoefficient } from 'dice-coefficient';

import { fetchAndPlay, shuffle, Queue } from './shuffle+';
import { getLocalStorageDataFromKey } from './Utils';
import { STATS_KEY } from './constants';

/**
 * Set "is guessing" body class (controls element visibility/interactivity)
 * @param guessing If we are enabling or disabling the "is guessing" class
 */
export const toggleIsGuessing = (guessing: boolean) => {
  document.body.classList.toggle('name-that-tune--guessing', guessing);
};

// TODO: potentially tweak this
const normalize = (str: string | undefined) => {
  if (!str) return '';

  let cleaned = str.trim().toLowerCase();

  // Remove anything within parentheses
  cleaned = cleaned.replace(/\(.*\)/g, '');

  // Remove anything that comes after a ' - '
  cleaned = cleaned.replace(/\s-\s.*$/, '');

  // Convert & to 'and'
  cleaned = cleaned.replace(/&/g, 'and');

  // Remove everything (including spaces) that is not a number, letter, or from Cyrylic/Polish/Arabic/Hebrew alphabet
  // (Github Copilot says Arabic letters range from \u0621 to \u064A and Hebrew letters range from \u05D0 to \u05EA)
  cleaned = cleaned.replace(/[^\wа-яА-ЯіїІЇ\dąćęłńóśźż\u0621-\u064A\u05D0-\u05EA\d]/g, '');

  // TODO: add any other logic?

  return cleaned;
};

export const checkGuess = (guess: string) => {
  console.log({
    title: Spicetify.Player.data.item?.metadata?.title,
    guess,
  });
  // console.log({
  //   artist_name: Spicetify.Player.data.item.metadata.artist_name,
  //   album_artist_name: Spicetify.Player.data.item.metadata.album_artist_name,
  // });

  const normalizedTitle = normalize(
    Spicetify.Player.data.item?.metadata?.title,
  );
  const normalizedGuess = normalize(guess);
  console.log({ normalizedTitle, normalizedGuess });

  // const set = FuzzySet([normalizedTitle], false);
  // const result = set.get(normalizedGuess);
  // if (result) {
  //   const [similarity, match] = result.flat();
  //   console.log({ similarity, match });
  // } else {
  //   console.log('no match');
  // }

  const similarity = diceCoefficient(normalizedGuess, normalizedTitle);
  console.log({ similarity });

  return similarity > 0.8;
};

export const initialize = (URIs?: string[]) => {
  // If passed in URIs, use them
  if (URIs) {
    if (URIs.length === 1) {
      fetchAndPlay(URIs[0]);
      return;
    }

    Queue(shuffle(URIs), null);

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
