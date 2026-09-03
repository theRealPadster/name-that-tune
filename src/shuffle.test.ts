import { describe, expect, it, vi } from 'vitest';

import { shuffle } from './shuffle+';

describe('shuffle', () => {
  it('does not mutate router state passed in by the caller', () => {
    const input = ['one', 'two', 'three'];
    vi.spyOn(Math, 'random').mockReturnValue(0);

    const output = shuffle(input);

    expect(input).toEqual(['one', 'two', 'three']);
    expect(output).not.toBe(input);
    expect([...output].sort()).toEqual([...input].sort());
    vi.restoreAllMocks();
  });
});
