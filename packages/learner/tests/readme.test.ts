// The README's example, run: what it says it gives is what it gives. The two goals are the README's fixtures; the subject graphs come later.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { memoryStore, testOut, validate } from 'learn-kit/graph';
import { expect, it } from 'vitest';
import { HINTS, SLOWER_PACE, checkGoal, emptyProfile, goalProgress, learnAll, scaffold, scaffoldFrom, supportsFor, valuesOf, type Goal } from '../src/index.js';

const README = fileURLToPath(new URL('../README.md', import.meta.url));

it('shows the two fixture goals', () => {
  const text = readFileSync(README, 'utf-8');
  expect(text).toContain("id: 'sat-maths-800'");
  expect(text).toContain("id: 'competition'");
});

it('runs the README example', async () => {
  // what the tutor learned in a talk, each with the turn it came from
  const { profile, results } = learnAll(emptyProfile(), [
    { field: 'age', value: 15, turn: 'turn-3', when: 3, sure: 'guessed' },
    { field: 'experience', value: 'knows nothing past fractions', turn: 'turn-3', when: 3 },
    { field: 'age', value: 14, turn: 'turn-5', when: 5, sure: 'told' },
    { field: 'speed', value: 'slow', turn: 'turn-6', when: 6 },
    { field: 'note', value: 'wants to beat his brother', turn: 'turn-6', when: 6 },
  ]);
  expect(results).toEqual(['learned', 'learned', 'replaced', 'learned', 'noted']);
  expect(valuesOf(profile)).toEqual({ age: 14, experience: 'knows nothing past fractions', speed: 'slow' });
  expect(profile.age?.turn).toBe('turn-5');

  const graph = validate([
    { id: 'counting', needs: [], level: 0 },
    { id: 'arithmetic', needs: ['counting'], level: 1 },
    { id: 'fractions', needs: ['arithmetic'], level: 2 },
    { id: 'shapes', needs: ['counting'], level: 1 },
    { id: 'algebra', needs: ['fractions'], level: 3 },
    { id: 'geometry', needs: ['shapes', 'fractions'], level: 3 },
    { id: 'functions', needs: ['algebra'], level: 4 },
    { id: 'statistics', needs: ['fractions'], level: 3 },
    { id: 'number-theory', needs: ['arithmetic'], level: 3 },
    { id: 'combinatorics', needs: ['arithmetic'], level: 3 },
    { id: 'proof', needs: ['algebra'], level: 4 },
  ]);
  const sat: Goal = { id: 'sat-maths-800', title: 'An 800 on the maths SAT', targets: ['functions', 'geometry', 'statistics'] };
  const competition: Goal = { id: 'competition', title: 'A maths competition', targets: ['number-theory', 'combinatorics', 'proof'] };
  checkGoal(sat, graph);
  checkGoal(competition, graph);

  // knows nothing: the whole path, from the roots
  const fromNothing = scaffold(sat, graph, new Set());
  expect(fromNothing.steps.map((s) => s.node.id)).toEqual(['counting', 'arithmetic', 'fractions', 'shapes', 'algebra', 'geometry', 'functions', 'statistics']);
  expect(fromNothing.progress).toBe(0);
  expect(scaffold(competition, graph, new Set()).steps.map((s) => s.node.id)).toEqual(['counting', 'arithmetic', 'fractions', 'algebra', 'number-theory', 'combinatorics', 'proof']);

  // placed past fractions: shorter, and the scaffolds of what is solid are gone
  const store = memoryStore();
  for (const id of ['counting', 'arithmetic', 'fractions']) await testOut(store, graph, id);
  const placed = await scaffoldFrom(store, sat, graph);
  expect(placed.steps.map((s) => s.node.id)).toEqual(['shapes', 'algebra', 'geometry', 'functions', 'statistics']);
  expect(placed.steps.filter((s) => s.ready).map((s) => s.node.id)).toEqual(['shapes', 'algebra', 'statistics']);
  expect(supportsFor(placed, 'fractions')).toEqual([]);
  expect(supportsFor(placed, 'algebra')).toEqual([HINTS, SLOWER_PACE]);
  expect(placed.progress).toBe(3 / 8);
  expect(goalProgress(competition, graph, new Set(['counting', 'arithmetic', 'fractions']))).toBe(3 / 7);

  // the app chooses the supports, from the profile, say: a slower pace only for a slow learner
  const slow = valuesOf(profile).speed === 'slow';
  const mine = scaffold(sat, graph, new Set(['counting', 'arithmetic', 'fractions']), { supports: () => (slow ? [HINTS, SLOWER_PACE] : [HINTS]) });
  expect(supportsFor(mine, 'geometry')).toEqual([HINTS, SLOWER_PACE]);
});

it("sweeps Lampas's goal and weave, each row a verdict of Kit or Greek-only", () => {
  const text = readFileSync(README, 'utf-8');
  const sweep = text.slice(text.indexOf('## Where this came from'), text.indexOf("Lampas's About you"));
  for (const file of ['goal.ts', 'goalSaved.ts', 'goalNeeds.ts', 'goalProgress.ts', 'weave.ts', 'weaveOrder.ts', 'GoalScreen.tsx']) expect(sweep).toContain(file);
  const rows = sweep
    .split('\n')
    .filter((line) => line.startsWith('|') && !/^\|[\s:|-]+\|$/.test(line))
    .map((line) => line.split('|').slice(1, -1).map((cell) => cell.trim()))
    .filter(([what]) => what !== 'Lampas field or rule');
  expect(rows.length).toBeGreaterThan(20);
  expect(rows.filter(([, verdict]) => !/^(Kit|Greek-only)\b/.test(verdict ?? '')).map(([what]) => what)).toEqual([]);
});
