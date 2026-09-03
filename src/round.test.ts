import { describe, expect, it } from 'vitest';

import {
  isFinalStage,
  pickSnippetStart,
  ROUND_TIMES,
  stageToTime,
} from './round';

describe('round timing', () => {
  it('uses the six Heardle-style clue lengths', () => {
    expect(ROUND_TIMES).toEqual([1, 2, 4, 7, 11, 16]);
    expect(ROUND_TIMES.map((_, stage) => stageToTime(stage)))
      .toEqual([1, 2, 4, 7, 11, 16]);
  });

  it('caps out-of-range stages safely', () => {
    expect(stageToTime(-5)).toBe(1);
    expect(stageToTime(999)).toBe(16);
    expect(isFinalStage(4)).toBe(false);
    expect(isFinalStage(5)).toBe(true);
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
