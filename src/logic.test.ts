import { describe, expect, it } from 'vitest';

import { checkGuess, normalizeTitle } from './logic';

describe('normalizeTitle', () => {
  it('preserves letters and numbers across writing systems', () => {
    expect(normalizeTitle('你好，世界！')).toBe('你好世界');
    expect(normalizeTitle('Γειά σου Κόσμε')).toBe('γειασουκοσμε');
    expect(normalizeTitle('BTS 방탄소년단 2')).toBe('bts방탄소년단2');
  });

  it('normalizes accents, punctuation, and ampersands', () => {
    expect(normalizeTitle('  Déjà Vu & Me!  ')).toBe('dejavuandme');
  });
});

describe('checkGuess', () => {
  it('accepts exact Unicode titles', () => {
    expect(checkGuess('七里香', '七里香')).toBe(true);
  });

  it('accepts common release decorations being omitted', () => {
    expect(checkGuess('Everyday', 'Everyday (Remastered 2026)')).toBe(true);
    expect(checkGuess('Midnight City', 'Midnight City - Radio Edit')).toBe(true);
    expect(checkGuess('Stay', 'Stay feat. Someone')).toBe(true);
  });

  it('allows a small typo in a sufficiently long title', () => {
    expect(checkGuess('halleluja', 'Hallelujah')).toBe(true);
  });

  it('requires short titles to match exactly', () => {
    expect(checkGuess('Us', 'Use')).toBe(false);
    expect(checkGuess('Us', 'Us')).toBe(true);
  });
});
