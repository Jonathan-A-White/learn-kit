// matchSequence (src/match.ts): the words of a target heard in order against what was said.
import { describe, expect, it } from 'vitest';
import { foldWords, matchSequence } from '../src/index.js';

const ten = 'one two three four five six seven eight nine ten'.split(' ');

describe('matchSequence', () => {
  it('scores 1 and passes when the whole verse is said', () => {
    expect(matchSequence(ten, ten)).toEqual({ score: 1, hits: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9], misses: [], extras: [], passed: true });
  });

  it('scores 0.9 and passes with one of ten missed', () => {
    const said = ten.filter((_, i) => i !== 4);
    const r = matchSequence(ten, said);
    expect(r.score).toBeCloseTo(0.9);
    expect(r.misses).toEqual([4]);
    expect(r.passed).toBe(true);
  });

  it('scores 0.8 and does not pass with two of ten missed', () => {
    const r = matchSequence(ten, ten.filter((_, i) => i !== 2 && i !== 7));
    expect(r.score).toBeCloseTo(0.8);
    expect(r.misses).toEqual([2, 7]);
    expect(r.passed).toBe(false);
  });

  it('counts words out of sequence as misses (longest common subsequence)', () => {
    // 'ten' said first, then one..nine: nine hit in order, ten missed
    const said = ['ten', ...ten.slice(0, 9)];
    const r = matchSequence(ten, said);
    expect(r.hits).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8]);
    expect(r.misses).toEqual([9]);
    expect(r.extras).toEqual([0]);
    expect(r.score).toBeCloseTo(0.9);
  });

  it('costs nothing for an extra word, or a word said twice', () => {
    const said = ['um', ...ten.slice(0, 5), 'five', ...ten.slice(5)];
    const r = matchSequence(ten, said);
    expect(r.score).toBe(1);
    expect(r.passed).toBe(true);
    expect(r.extras).toEqual([0, 6]);
  });

  it('matches Greek said without accents against the accented target', () => {
    const r = matchSequence(foldWords('Οἴδαμεν δὲ ὅτι τοῖς ἀγαπῶσιν τὸν θεόν'), foldWords('οιδαμεν δε οτι τοις αγαπωσιν τον θεον'));
    expect(r.score).toBe(1);
    expect(r.passed).toBe(true);
  });

  it('folds both sides itself, so raw words match', () => {
    expect(matchSequence(['Οἴδαμεν', 'λόγος,'], ['οιδαμεν', 'λογοσ']).score).toBe(1);
  });

  it('takes a pass share and a fold', () => {
    expect(matchSequence(ten, ten.slice(0, 8), { pass: 0.8 }).passed).toBe(true);
    expect(matchSequence(['a', 'b'], ['A', 'B'], { fold: (w) => w }).score).toBe(0);
  });

  it('scores 0 with every index missed when nothing was said', () => {
    const r = matchSequence(ten, []);
    expect(r).toEqual({ score: 0, hits: [], misses: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9], extras: [], passed: false });
  });

  it('scores 1 and passes for an empty target', () => {
    expect(matchSequence([], ['anything'])).toEqual({ score: 1, hits: [], misses: [], extras: [0], passed: true });
    expect(matchSequence([], []).passed).toBe(true);
  });
});
