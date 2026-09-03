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

export const stageToTime = (stage: number) => {
  const safeStage = Math.max(0, Math.min(stage, MAX_ATTEMPTS - 1));
  return ROUND_TIMES[safeStage];
};

export const isFinalStage = (stage: number) => stage >= MAX_ATTEMPTS - 1;

/**
 * Choose one stable offset for a random-mode round. The final 16-second clue
 * must fit without Spotify advancing to another track, and the intro is
 * avoided whenever the song is long enough to give us room.
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
