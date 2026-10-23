// hideWords (src/hide.ts): which words of a target a rung hides, spread evenly and seeded.
import { describe, expect, it } from 'vitest';
import { hideWords } from '../src/index.js';

const neighbours = (hidden: Set<number>): boolean => [...hidden].some((i) => hidden.has(i + 1));

describe('hideWords', () => {
  it('hides round(count * share) words, no two neighbours', () => {
    for (const seed of [1, 2, 3, 42, 9999]) {
      const half = hideWords(12, 0.5, seed);
      expect(half.size).toBe(6);
      expect(neighbours(half)).toBe(false);
      const quarter = hideWords(12, 0.25, seed);
      expect(quarter.size).toBe(3);
      expect(neighbours(quarter)).toBe(false);
    }
  });

  it('spreads the hidden words across the whole text', () => {
    const hidden = hideWords(12, 0.25, 7);
    const first = [...hidden].filter((i) => i < 4).length;
    const last = [...hidden].filter((i) => i >= 8).length;
    expect(first).toBe(1);
    expect(last).toBe(1);
  });

  it('hides all with share 1 and none with share 0', () => {
    expect([...hideWords(12, 1, 5)].sort((a, b) => a - b)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
    expect(hideWords(12, 0, 5).size).toBe(0);
  });

  it('gives the same set for the same seed and another for another', () => {
    const a = [...hideWords(30, 0.5, 11)];
    expect([...hideWords(30, 0.5, 11)]).toEqual(a);
    const sets = new Set([1, 2, 3, 4, 5, 6].map((s) => [...hideWords(30, 0.5, s)].join(',')));
    expect(sets.size).toBeGreaterThan(1);
  });

  it('rounds half up: one word at 0.5 hides that one', () => {
    expect([...hideWords(1, 0.5, 3)]).toEqual([0]);
  });

  it('stays inside the text and handles an empty one', () => {
    expect(hideWords(0, 0.5, 1).size).toBe(0);
    for (const i of hideWords(9, 0.75, 4)) {
      expect(i).toBeGreaterThanOrEqual(0);
      expect(i).toBeLessThan(9);
    }
    expect(hideWords(9, 0.75, 4).size).toBe(7);
  });

  it('leaves the kept words apart when more than half is hidden', () => {
    const kept = new Set([...Array(12).keys()].filter((i) => !hideWords(12, 0.75, 8).has(i)));
    expect(kept.size).toBe(3);
    expect(neighbours(kept)).toBe(false);
  });
});
