import { diceCoefficient } from 'dice-coefficient';

import { fetchAndPlay, shuffle, Queue } from './shuffle+';
import { getLocalStorageDataFromKey } from './Utils';
import { STATS_KEY } from './constants';
import { RoundTrack } from './round';

export { stageToTime } from './round';

const SONG_CHANGE_TIMEOUT_MS = 10_000;

/** Set the body class that hides Spotify metadata while a round is active. */
export const toggleIsGuessing = (guessing: boolean) => {
  document.body.classList.toggle('name-that-tune--guessing', guessing);
};

/**
 * Normalize titles without restricting them to a hand-maintained collection of
 * alphabets. NFKD handles full-width forms and accents, while Unicode property
 * classes preserve letters and numbers from every writing system.
 */
export const normalizeTitle = (value: string | undefined) => {
  if (!value) {
    return '';
  }

  return value
    .trim()
    .toLocaleLowerCase()
    .replace(/&/g, 'and')
    .normalize('NFKD')
    .replace(/\p{Mark}/gu, '')
    .normalize('NFKC')
    .replace(/[^\p{Letter}\p{Number}]/gu, '');
};

const titleCandidates = (title: string) => {
  const withoutBrackets = title
    .replace(/\s*\([^)]*\)/g, '')
    .replace(/\s*\[[^\]]*\]/g, '');
  const variants = [
    title,
    withoutBrackets,
    title.replace(/\s[-–—]\s.*$/, ''),
    title.replace(/\s+(?:feat(?:uring)?\.?|ft\.?)\s+.*$/i, ''),
  ];

  return [...new Set(variants.map(normalizeTitle).filter(Boolean))];
};

export const checkGuess = (guess: string, title: string | undefined) => {
  const normalizedGuess = normalizeTitle(guess);

  if (!normalizedGuess || !title) {
    return false;
  }

  return titleCandidates(title).some((candidate) => {
    if (normalizedGuess === candidate) {
      return true;
    }

    const shortestLength = Math.min(normalizedGuess.length, candidate.length);
    if (shortestLength < 4) {
      return false;
    }

    const threshold = shortestLength < 7 ? 0.86 : 0.8;
    return diceCoefficient(normalizedGuess, candidate) >= threshold;
  });
};

const snapshotTrack = (
  item = Spicetify.Player.data?.item,
): RoundTrack => {
  if (
    !item?.uri
    || !(item.uri.startsWith('spotify:track:') || item.uri.startsWith('spotify:local:'))
    || !item.name
  ) {
    throw new Error('Spotify did not load a playable song');
  }

  return {
    uri: item.uri,
    title: item.name,
    artists: (item.artists ?? []).map((artist) => artist.name).join(' · '),
    artwork:
      item.metadata?.image_xlarge_url
      || item.metadata?.image_large_url,
    durationMs:
      item.duration?.milliseconds
      || Spicetify.Player.getDuration()
      || 0,
  };
};

export const getCurrentTrack = () => snapshotTrack();

export const pauseAndRewind = () => {
  Spicetify.Player.pause();
  Spicetify.Player.seek(0);
};

type TrackChangeTrigger = () =>
  void | boolean | Promise<void | boolean>;

const waitForSongChange = (
  trigger: TrackChangeTrigger,
): Promise<RoundTrack> => new Promise((resolve, reject) => {
  let settled = false;
  let timeout: ReturnType<typeof setTimeout> | undefined;

  const cleanup = () => {
    if (timeout) {
      clearTimeout(timeout);
    }
    Spicetify.Player.removeEventListener('songchange', listener);
  };

  const fail = (error: unknown) => {
    if (settled) {
      return;
    }
    settled = true;
    cleanup();
    reject(error instanceof Error ? error : new Error(String(error)));
  };

  const listener = (event?: Event) => {
    if (settled) {
      return;
    }

    try {
      const playerState = (
        event as Event & { data?: Spicetify.PlayerState }
      )?.data;
      const track = snapshotTrack(playerState?.item);
      settled = true;
      cleanup();
      resolve(track);
    } catch (error) {
      fail(error);
    }
  };

  Spicetify.Player.addEventListener('songchange', listener);

  try {
    Promise.resolve(trigger())
      .then((started) => {
        if (started === false) {
          fail(new Error('No playable songs were found in that source'));
          return;
        }

        if (!settled) {
          timeout = setTimeout(() => {
            fail(new Error('Spotify did not advance to another song in time'));
          }, SONG_CHANGE_TIMEOUT_MS);
        }
      })
      .catch(fail);
  } catch (error) {
    fail(error);
  }
});

export const initialize = async (URIs?: string[]) => {
  toggleIsGuessing(true);

  if (!URIs?.length) {
    pauseAndRewind();
    return snapshotTrack();
  }

  const track = await waitForSongChange(async () => {
    if (URIs.length === 1) {
      return fetchAndPlay(URIs[0]);
    }

    await Queue(shuffle(URIs), null);
    return true;
  });

  pauseAndRewind();
  return track;
};

export const advanceToNextTrack = async () => {
  const track = await waitForSongChange(() => {
    Spicetify.Player.next();
  });

  pauseAndRewind();
  return track;
};

/** Save a win stage, or -1 for a loss, in localStorage. */
export const saveStats = (stage: number) => {
  const stored = getLocalStorageDataFromKey(STATS_KEY, {});
  const savedStats = stored && typeof stored === 'object' ? stored : {};
  savedStats[stage] = savedStats[stage] + 1 || 1;
  localStorage.setItem(STATS_KEY, JSON.stringify(savedStats));
};
