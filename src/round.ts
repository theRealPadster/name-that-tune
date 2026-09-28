export const ROUND_TIMES = [1, 2, 4, 7, 11, 16] as const;
export const MAX_ATTEMPTS = ROUND_TIMES.length;

export type GameMode = 'intro' | 'random';

export type RoundTrack = {
  uri: string;
  title: string;
  artists: string;
  artwork?: string;
  durationMs: number;
};

/**
 * Heardle's curve, 1 + 0.5(stage + stage²). The first MAX_ATTEMPTS values are
 * ROUND_TIMES; past those, clues keep growing (22s, 29s, ...) for players who
 * choose to keep guessing.
 */
export const stageToTime = (stage: number) => {
  const safeStage = Math.max(0, stage);
  return 1 + 0.5 * (safeStage + safeStage ** 2);
};

/** The last default clue, after which the player chooses to keep going or reveal. */
export const isFinalStage = (stage: number) => stage === MAX_ATTEMPTS - 1;

/**
 * Choose one stable offset for a random-mode round. The sixth, 16-second clue
 * must fit without Spotify advancing to another track, and the intro is
 * avoided whenever the song is long enough to give us room. Clues past the
 * sixth stop at the end of the song instead.
 */
export const pickSnippetStart = (
  durationMs: number,
  randomValue = Math.random(),
) => {
  const durationSeconds = Math.max(0, durationMs / 1000);
  const latestStart = Math.max(0, durationSeconds - stageToTime(MAX_ATTEMPTS - 1) - 1);

  if (latestStart === 0) {
    return 0;
  }

  const earliestStart = Math.min(10, latestStart);
  const boundedRandom = Math.max(0, Math.min(randomValue, 0.999999));
  return Math.floor(earliestStart + boundedRandom * (latestStart - earliestStart));
};
