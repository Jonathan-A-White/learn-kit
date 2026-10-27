// The README's examples, run: what it says it gives is what it gives.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { validate, type Level } from 'learn-kit/graph';
import { answerWalk, currentQuestion, numberSteps, resultOf, startWalk } from 'learn-kit/drill';
import { expect, it } from 'vitest';
import { LEDGER_CAP, MemoryFreshStore, asked, isFresh, isToConfirm, markAsked, recordAnswer, toConfirm } from '../src/index.js';

const README = fileURLToPath(new URL('../README.md', import.meta.url));

it('names the provisional constant it holds', () => {
  expect(readFileSync(README, 'utf-8')).toContain(`| \`LEDGER_CAP\` | ${LEDGER_CAP} |`);
});

it('runs the ledger example', async () => {
  const store = new MemoryFreshStore();
  await markAsked(store, 'verbs', 'q1');
  await markAsked(store, 'verbs', 'q2');
  await markAsked(store, 'verbs', 'q1');
  expect(await asked(store, 'verbs')).toEqual(['q2', 'q1']);
  expect(await isFresh(store, 'verbs', 'q3')).toBe(true);
  expect(await isFresh(store, 'verbs', 'q1')).toBe(false);
});

it('runs the recordAnswer example', async () => {
  const store = new MemoryFreshStore();
  expect(await recordAnswer(store, 'verbs', 'q1', true, { missedBefore: true })).toBe('known');
  expect(await recordAnswer(store, 'verbs', 'q1', true, { missedBefore: true })).toBe('to-confirm');
  expect(await isToConfirm(store, 'verbs')).toBe(true);
  expect(await toConfirm(store)).toEqual(['verbs']);
  expect(await recordAnswer(store, 'verbs', 'q2', true, { missedBefore: true })).toBe('known');
  expect(await isToConfirm(store, 'verbs')).toBe(false);
});

it('runs the walk example: seen keys do not prove, and the same walk on fresh keys does', async () => {
  const graph = validate([{ id: 'verbs', needs: [], level: 1 }]);
  const levels = new Map<string, Level>();
  const rawSteps = [1, 2].map((n) => ({
    title: `step ${n}`,
    questions: [0, 1, 2].map((i) => ({ key: `s${n}q${i}`, form: 'tap', facet: { id: 'f', label: 'f' }, payload: `s${n}q${i}` })),
  }));
  const store = new MemoryFreshStore();
  for (const step of rawSteps) for (const q of step.questions) await markAsked(store, 'verbs', q.key);
  const seen = new Set(await asked(store, 'verbs'));

  const run = (options: { isFresh: (key: string) => boolean }): string | undefined => {
    let walk = startWalk(graph, 'verbs', levels, numberSteps(rawSteps), options);
    if ('needs' in walk) throw new Error('needs');
    while (currentQuestion(walk)) walk = answerWalk(walk, true, false);
    return resultOf(walk)?.ended;
  };
  expect(run({ isFresh: (key) => !seen.has(key) })).toBe('limit');
  expect(run({ isFresh: () => true })).toBe('proved');
});
