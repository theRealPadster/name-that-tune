export const ROUND_TIMES = [1, 2, 4, 7, 11, 16] as const;
export const MAX_ATTEMPTS = ROUND_TIMES.length;

export type GameMode = 'intro' | 'random';

export type RoundTrack = {
  uri: string;
  title: string;
  artists: string;
  artwork?: string;
  durationMs: number;
  /** Where Intro clues start, in seconds: past any silent or near-silent opening. */
  audibleStart?: number;
};

/** The parts of Spotify's audio analysis that findAudibleStart reads. */
export type AudioAnalysis = {
  track?: { loudness?: number };
  segments?: { start: number; loudness_max: number }[];
};

/**
 * Only skip near-silence, not a quiet intro: a soft organ swell or guitar is
 * often the most recognisable part of the song. Measured against real tracks, a
 * relative threshold (15 dB below average) skipped 17s of "Where the Streets
 * Have No Name"; this keeps it while still skipping dead air.
 */
const NEAR_SILENCE_DB = -40;
/**
 * For tracks that are quiet throughout ("Speak to Me" averages -35 dB), -40 dB
 * is part of the song, so the threshold also sits this far below the average.
 */
const QUIET_TRACK_MARGIN_DB = 20;
/** Gaps shorter than this aren't worth moving the start for. */
const MIN_INTRO_SKIP = 0.5;
/** Never skip further than this, so a long soft intro isn't skipped entirely. */
const MAX_INTRO_SKIP = 30;
/** Start slightly before the first audible segment, so its attack isn't clipped. */
const INTRO_LEAD = 0.2;

/**
 * Find where a song becomes audible, for Intro mode. Returns 0 when there is no
 * analysis, or when the opening silence is too short to matter.
 */
export const findAudibleStart = (analysis?: AudioAnalysis | null) => {
  const segments = analysis?.segments;
  const average = analysis?.track?.loudness;
  if (!segments?.length || typeof average !== 'number') {
    return 0;
  }

  const threshold = Math.min(NEAR_SILENCE_DB, average - QUIET_TRACK_MARGIN_DB);
  const first = segments.find((segment) => segment.loudness_max >= threshold);
  const audible = Math.min(first?.start ?? 0, MAX_INTRO_SKIP);

  return audible < MIN_INTRO_SKIP ? 0 : Math.max(0, audible - INTRO_LEAD);
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
