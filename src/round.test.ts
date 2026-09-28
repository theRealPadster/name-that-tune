import { describe, expect, it } from 'vitest';

import {
  findAudibleStart,
  isFinalStage,
  pickSnippetStart,
  ROUND_TIMES,
  stageToTime,
} from './round';

// Segments every 0.5s from the given loudness_max values, in dB.
const analysis = (trackLoudness: number, loudness: number[]) => ({
  track: { loudness: trackLoudness },
  segments: loudness.map((loudness_max, index) => ({ start: index * 0.5, loudness_max })),
});

describe('findAudibleStart', () => {
  it('keeps 0:00 for a song that starts almost straight away', () => {
    // Measured from "Mighty to Save": audible at 0.19s.
    expect(findAudibleStart({
      track: { loudness: -7 },
      segments: [
        { start: 0, loudness_max: -59.3 },
        { start: 0.19, loudness_max: -8.8 },
      ],
    })).toBe(0);
  });

  it('skips even a fraction of a second, since the first clue is only 1s long', () => {
    // Measured from "Hey, it's Phil...": past -40 dB at 0.61s.
    expect(findAudibleStart({
      track: { loudness: -8 },
      segments: [
        { start: 0, loudness_max: -60 },
        { start: 0.52, loudness_max: -47.4 },
        { start: 0.61, loudness_max: -34.9 },
        { start: 0.92, loudness_max: -0.7 },
      ],
    })).toBeCloseTo(0.41);
  });

  it('skips a silent opening, starting just before the first audible segment', () => {
    // Silent for 4s, audible from 4.0s.
    expect(findAudibleStart(analysis(-8, [-60, -60, -60, -60, -60, -60, -60, -60, -5])))
      .toBeCloseTo(3.8);
  });

  it('keeps a quiet but audible intro rather than skipping to the loud part', () => {
    // A soft intro at -30 dB (think "Lateralus"), then the full band at 3s.
    expect(findAudibleStart(analysis(-8, [-30, -30, -30, -30, -30, -30, -5]))).toBe(0);
  });

  it('lowers the threshold for tracks that are quiet throughout', () => {
    // Averaging -35 dB ("Speak to Me"), -45 dB counts as part of the song.
    expect(findAudibleStart(analysis(-35, [-70, -70, -70, -70, -45, -30])))
      .toBeCloseTo(1.8);
    // In a track averaging -8, the same -45 dB is still near-silence.
    expect(findAudibleStart(analysis(-8, [-70, -70, -70, -70, -45, -30])))
      .toBeCloseTo(2.3);
  });

  it('never skips more than 30 seconds', () => {
    expect(findAudibleStart(analysis(-8, [...Array(100).fill(-60), -5])))
      .toBeCloseTo(29.8);
  });

  it('falls back to 0:00 without usable analysis', () => {
    expect(findAudibleStart(undefined)).toBe(0);
    expect(findAudibleStart(null)).toBe(0);
    expect(findAudibleStart({ segments: [] })).toBe(0);
    // What getAudioData resolves with when Spicetify's request fails.
    expect(findAudibleStart({ code: 401, message: 'Failed to fetch' } as never)).toBe(0);
  });
});

describe('round timing', () => {
  it('uses the six Heardle-style clue lengths', () => {
    expect(ROUND_TIMES).toEqual([1, 2, 4, 7, 11, 16]);
    expect(ROUND_TIMES.map((_, stage) => stageToTime(stage)))
      .toEqual([1, 2, 4, 7, 11, 16]);
  });

  it('keeps growing past the sixth clue for players who keep guessing', () => {
    expect(stageToTime(6)).toBe(22);
    expect(stageToTime(7)).toBe(29);
  });

  it('clamps negative stages to the first clue', () => {
    expect(stageToTime(-5)).toBe(1);
  });

  it('marks only the sixth clue as final', () => {
    expect(isFinalStage(4)).toBe(false);
    expect(isFinalStage(5)).toBe(true);
    expect(isFinalStage(6)).toBe(false);
  });
});

describe('pickSnippetStart', () => {
  it('keeps all six clues on one stable, non-intro offset', () => {
    expect(pickSnippetStart(180_000, 0)).toBe(10);
    expect(pickSnippetStart(180_000, 0.5)).toBe(86);
    expect(pickSnippetStart(180_000, 1)).toBe(162);
  });

  it('falls back to the intro when a track is too short', () => {
    expect(pickSnippetStart(16_000, 0.75)).toBe(0);
  });
});
