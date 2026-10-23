// The README's example, run: what it says it gives is what it gives; and every export is named in the README.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { expect, it } from 'vitest';
import * as recall from '../src/index.js';
import { DEFAULT_PASS, RECALL_PACKAGE, fold, foldWords, hideWords, matchSequence } from '../src/index.js';

const README = fileURLToPath(new URL('../README.md', import.meta.url));

it('names every export in the README', () => {
  const text = readFileSync(README, 'utf-8');
  expect(Object.keys(recall).filter((name) => !text.includes(name))).toEqual([]);
});

it('runs the README example', () => {
  expect(RECALL_PACKAGE).toBe('@learn-kit/recall');
  expect(fold('Οἴδαμεν δὲ ὅτι')).toBe('οιδαμεν δε οτι');
  expect(fold('λόγος')).toBe('λογοσ');
  expect(fold('Blessed,')).toBe('blessed');
  expect(foldWords('For God so  loved')).toEqual(['for', 'god', 'so', 'loved']);

  const target = foldWords('We know that all things work together for good');
  const heard = matchSequence(target, foldWords('we know that all things work for good um'));
  expect(heard.score).toBeCloseTo(8 / 9);
  expect(heard.hits).toEqual([0, 1, 2, 3, 4, 5, 7, 8]);
  expect(heard.misses).toEqual([6]);
  expect(heard.extras).toEqual([8]);
  expect(heard.passed).toBe(false);
  expect(DEFAULT_PASS).toBe(0.9);
  expect(matchSequence(target, foldWords('we know that all things work for good'), { pass: 0.8 }).passed).toBe(true);

  const hidden = hideWords(target.length, 0.5, 7);
  expect(hidden.size).toBe(Math.round(target.length / 2));
  const shown = target.map((word, i) => (hidden.has(i) ? '_'.repeat(word.length) : word));
  expect(shown.filter((w) => w.startsWith('_'))).toHaveLength(hidden.size);
});
