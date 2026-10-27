// The drill walk (src/walk.ts), ported from Lampas's tests/unit/drillIt.test.ts with the Greek replaced by the fixture: the walk goes
// up a step on a right answer, back halfway on a miss, and ends proved, at its edge or at the question limit.
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { validate, type Level } from 'learn-kit/graph';
import {
  DrillFormError,
  MAX_QUESTIONS,
  PROVED_STREAK,
  answerWalk,
  currentQuestion,
  numberSteps,
  resultOf,
  startWalk,
  unmetNeed,
  type RawStep,
  type Walk,
} from '../src/index.js';
import { FORMS, LADDER, rawSteps, type Q } from './fixtures.js';

const ALL_SOLID = new Map<string, Level>(LADDER.nodes.map((n) => [n.id, 'solid']));

function begin(steps: RawStep<string>[] = rawSteps(), options = {}): Walk<string> {
  const walk = startWalk(LADDER, 'a3', ALL_SOLID, numberSteps(steps), options);
  if ('needs' in walk) throw new Error(`needs ${walk.needs}`);
  return walk;
}

/** Answers every question with `decide` until the walk ends; the questions in the order asked. */
function run(walk: Walk<string>, decide: (q: Q, n: number) => { right: boolean; hinted?: boolean }): { walk: Walk<string>; asked: Q[] } {
  const asked: Q[] = [];
  let state = walk;
  for (let guard = 0; guard < 40 && !state.result; guard += 1) {
    const q = currentQuestion(state)!;
    asked.push(q);
    const { right, hinted = false } = decide(q, asked.length);
    state = answerWalk(state, right, hinted);
  }
  return { walk: state, asked };
}

describe('the steps', () => {
  it('numbers the steps from 1, drops one with no question, and tags every question with its step', () => {
    const raw = rawSteps(3);
    raw.splice(1, 0, { title: 'empty', questions: [] });
    const steps = numberSteps(raw);
    expect(steps.map((s) => s.step)).toEqual([1, 2, 3]);
    expect(steps.map((s) => s.title)).toEqual(['step 1', 'step 2', 'step 3']);
    for (const step of steps) for (const q of step.questions) expect(q.step).toBe(step.step);
  });

  it('refuses a question whose form the registry does not have', () => {
    const raw = rawSteps(2);
    raw[1].questions[0] = { ...raw[1].questions[0], form: 'juggle' };
    expect(() => numberSteps(raw, FORMS)).toThrow(DrillFormError);
    expect(() => numberSteps(rawSteps(2), FORMS)).not.toThrow();
  });
});

describe('the walk', () => {
  it('proves the idea in its top step with two unhinted rights in a row', () => {
    const { walk, asked } = run(begin(), () => ({ right: true }));
    const result = resultOf(walk)!;
    expect(result.nodeId).toBe('a3');
    expect(result.proved).toBe(true);
    expect(result.ended).toBe('proved');
    expect(result.edgeStep).toBe(result.topStep);
    expect(PROVED_STREAK).toBe(2);
    const top = result.topStep;
    expect(asked.map((q) => q.step)).toEqual([...Array.from({ length: top }, (_, i) => i + 1), top]);
    expect(result.answers).toHaveLength(asked.length);
  });

  it('asks step 2 again after right, right, miss from step 1 (the halfway rule)', () => {
    let state = begin();
    expect(currentQuestion(state)!.step).toBe(1);
    state = answerWalk(state, true, false);
    expect(currentQuestion(state)!.step).toBe(2);
    state = answerWalk(state, true, false);
    expect(currentQuestion(state)!.step).toBe(3);
    state = answerWalk(state, false, false);
    expect(currentQuestion(state)!.step).toBe(2);
  });

  it('finds the edge at once when the step above the one he holds was missed: right at 1, miss at 2, right at 1', () => {
    let state = begin();
    state = answerWalk(state, true, false);
    state = answerWalk(state, false, false);
    expect(currentQuestion(state)!.step).toBe(1); // halfway between 1 and 2, rounded down
    state = answerWalk(state, true, false);
    expect(state.result?.ended).toBe('edge');
    expect(state.result?.edgeStep).toBe(1);
  });

  it('goes back by halves, rounded down, and keeps going back while he misses', () => {
    let state = begin();
    state = answerWalk(state, true, false);
    state = answerWalk(state, true, false);
    state = answerWalk(state, false, false); // missed 3, held 2: halfway is 2
    expect(currentQuestion(state)!.step).toBe(2);
    state = answerWalk(state, false, false); // missed 2 as well, held 1: halfway is 1
    expect(currentQuestion(state)!.step).toBe(1);
  });

  it('asks the facet just missed again at the easier step', () => {
    let state = begin();
    state = answerWalk(state, true, false);
    state = answerWalk(state, true, false);
    const missed = currentQuestion(state)!.facet.id;
    state = answerWalk(state, false, false);
    expect(currentQuestion(state)!.step).toBe(2);
    expect(currentQuestion(state)!.facet.id).toBe(missed);
  });

  it('ends at the edge 0, with the missed facets in weak, when everything is missed', () => {
    const { walk, asked } = run(begin(), () => ({ right: false }));
    const result = resultOf(walk)!;
    expect(result.ended).toBe('edge');
    expect(result.proved).toBe(false);
    expect(result.edgeStep).toBe(0);
    expect(asked.length).toBeLessThan(MAX_QUESTIONS);
    expect(result.weak.map((f) => f.id).sort()).toEqual([...new Set(asked.map((q) => q.facet.id))].sort());
    expect(result.strong).toEqual([]);
  });

  it('finds the edge between the last right step and the first miss, and names strong and weak facets', () => {
    // right up to step 3, miss at 4, then right at 3 again: edge 3
    const { walk, asked } = run(begin(), (q) => ({ right: q.step <= 3 }));
    const result = resultOf(walk)!;
    expect(result.ended).toBe('edge');
    expect(result.proved).toBe(false);
    expect(result.edgeStep).toBe(3);
    expect(result.topStep).toBe(5);
    // a facet missed (only above step 3) is weak while it has fewer than two rights; one with two rights is strong
    const missed = new Set(asked.filter((q) => q.step > 3).map((q) => q.facet.id));
    const rights = (id: string): number => result.answers.filter((a) => a.facet.id === id && a.right).length;
    expect(new Set(result.weak.map((f) => f.id))).toEqual(new Set([...missed].filter((id) => rights(id) < 2)));
    for (const f of result.strong) expect(result.weak.map((w) => w.id)).not.toContain(f.id);
    for (const f of result.weak) expect(missed.has(f.id)).toBe(true);
    expect(result.strong.length).toBeGreaterThan(0);
  });

  it('never counts a hinted right toward proved', () => {
    let state = begin();
    const top = state.steps.length;
    for (let i = 1; i < top; i += 1) state = answerWalk(state, true, false); // climb to the top with plain rights
    expect(currentQuestion(state)!.step).toBe(top);
    state = answerWalk(state, true, false); // one unhinted right at the top
    state = answerWalk(state, true, true); // a hinted right: the streak is broken
    expect(state.result).toBeNull();
    state = answerWalk(state, true, false);
    expect(state.result).toBeNull();
    state = answerWalk(state, true, false);
    expect(resultOf(state)!.proved).toBe(true);
  });

  it('does not move up on a hinted right, and does not count it as right', () => {
    let state = begin();
    state = answerWalk(state, true, true);
    expect(state.step).toBe(1);
    expect(state.asked[0]).toMatchObject({ right: true, hinted: true });
    const result = resultOf(run(state, () => ({ right: true })).walk)!;
    expect(result.answers[0].hinted).toBe(true);
    const first = result.answers[0].facet.id;
    const unhintedRights = result.answers.filter((a) => a.facet.id === first && a.right && !a.hinted).length;
    expect(result.strong.some((f) => f.id === first)).toBe(unhintedRights > 0);
  });

  it('stops at 14 questions', () => {
    const { walk, asked } = run(begin(), () => ({ right: true, hinted: true }));
    expect(asked).toHaveLength(MAX_QUESTIONS);
    expect(MAX_QUESTIONS).toBe(14);
    const result = resultOf(walk)!;
    expect(result.ended).toBe('limit');
    expect(result.proved).toBe(false);
  });

  it('asks no question twice in a row', () => {
    const { asked } = run(begin(), (_q, n) => ({ right: n % 3 !== 0 }));
    for (let i = 1; i < asked.length; i += 1) expect(asked[i].key).not.toBe(asked[i - 1].key);
  });

  it('does not change a walk that is over', () => {
    const { walk } = run(begin(), () => ({ right: true }));
    expect(answerWalk(walk, false, false)).toBe(walk);
    expect(currentQuestion(walk)).toBeNull();
  });

  it('takes the limits from the options', () => {
    const { asked } = run(begin(rawSteps(), { maxQuestions: 3 }), () => ({ right: true }));
    expect(asked).toHaveLength(3);
    const proved = run(begin(rawSteps(2), { provedStreak: 3 }), () => ({ right: true }));
    expect(proved.asked).toHaveLength(2 + 2);
    expect(resultOf(proved.walk)!.proved).toBe(true);
  });
});

describe('the foundation', () => {
  it('returns the lowest need that is not solid instead of a walk, and a missing level is not solid', () => {
    const levels = new Map<string, Level>(ALL_SOLID);
    expect(unmetNeed(LADDER, 'a3', levels)).toBeNull();
    levels.set('a2', 'frontier');
    levels.delete('b2');
    expect(unmetNeed(LADDER, 'a3', levels)).toBe('a2'); // of one level: the one listed first
    levels.set('a2', 'solid');
    expect(unmetNeed(LADDER, 'a3', levels)).toBe('b2');
    const walk = startWalk(LADDER, 'a3', levels, numberSteps(rawSteps()));
    expect(walk).toEqual({ needs: 'b2' });
  });

  it('names the lowest by level, not by the order of the needs, and the one listed first of one level', () => {
    const graph = validate([
      { id: 'high', needs: [], level: 3 },
      { id: 'low', needs: [], level: 1 },
      { id: 'also-low', needs: [], level: 1 },
      { id: 'top', needs: ['high', 'low', 'also-low'], level: 4 },
    ]);
    expect(unmetNeed(graph, 'top', new Map())).toBe('low');
    expect(unmetNeed(graph, 'top', new Map<string, Level>([['low', 'solid']]))).toBe('also-low');
    expect(unmetNeed(graph, 'top', new Map<string, Level>([['low', 'solid'], ['also-low', 'solid']]))).toBe('high');
  });

  it('is pure: it imports neither React nor Dexie', () => {
    const src = resolve(dirname(fileURLToPath(import.meta.url)), '../src');
    for (const file of readdirSync(src)) {
      const specifiers = [...readFileSync(join(src, file), 'utf-8').matchAll(/\b(?:from|import)\s*\(?\s*['"]([^'"]+)['"]/g)].map((m) => m[1]);
      // nothing but its own files and the graph it works over
      for (const s of specifiers) expect(s).toMatch(/^(\.\/.+\.js|learn-kit\/graph)$/);
    }
    const pkg = JSON.parse(readFileSync(join(src, '..', 'package.json'), 'utf-8')) as Record<string, unknown>;
    for (const field of ['dependencies', 'peerDependencies', 'optionalDependencies']) expect(pkg[field]).toBeUndefined();
  });
});

describe('a step that reads a word: a first miss asks the same target again at the same step', () => {
  const retrySteps = (): RawStep<string>[] => {
    const steps = rawSteps(3, 6, ['x', 'y']);
    steps[1] = { ...steps[1], retryFirstMiss: true };
    return steps;
  };

  it('stays at the step after a first miss, with the same facet, and goes back after a second', () => {
    let state = begin(retrySteps());
    state = answerWalk(state, true, false); // step 1
    const missed = currentQuestion(state)!;
    expect(missed.step).toBe(2);
    state = answerWalk(state, false, false);
    expect(currentQuestion(state)!.step).toBe(2);
    expect(currentQuestion(state)!.facet.id).toBe(missed.facet.id);
    state = answerWalk(state, false, false); // the second miss at it goes back as any miss does
    expect(currentQuestion(state)!.step).toBe(1);
  });

  it('names the facet weak even when its other answers are right', () => {
    let state = begin(retrySteps());
    state = answerWalk(state, true, false);
    const target = currentQuestion(state)!.facet.id;
    state = answerWalk(state, false, false);
    const result = resultOf(run(state, () => ({ right: true })).walk)!;
    expect(result.weak.map((f) => f.id)).toContain(target);
  });
});

describe('required facets: each must be answered right, unhinted, before the idea is proved', () => {
  const steps = (): RawStep<string>[] => rawSteps(2, 6, ['near', 'far']);

  it('keeps asking at the top step until every required facet was answered right', () => {
    const { walk, asked } = run(begin(steps(), { required: ['far'] }), (q) => ({ right: q.facet.id !== 'far' }));
    // 'far' is always wrong: never proved
    expect(resultOf(walk)!.proved).toBe(false);
    expect(asked.length).toBeGreaterThan(2);
  });

  it('proves once a required facet is answered right, though the streak came first', () => {
    let state = begin(steps(), { required: ['near', 'far'] });
    const seen = new Set<string>();
    for (let guard = 0; guard < 14 && !state.result; guard += 1) {
      seen.add(currentQuestion(state)!.facet.id);
      state = answerWalk(state, true, false);
    }
    expect(resultOf(state)!.proved).toBe(true);
    expect([...seen].sort()).toEqual(['far', 'near']);
  });

  it('asks the side again after a hinted right on it', () => {
    let state = begin(steps(), { required: ['far'] });
    for (let guard = 0; guard < 14; guard += 1) {
      const q = currentQuestion(state)!;
      if (q.facet.id === 'far') break;
      state = answerWalk(state, true, false);
    }
    const far = currentQuestion(state)!;
    expect(far.facet.id).toBe('far');
    state = answerWalk(state, true, true);
    expect(currentQuestion(state)!.facet.id).toBe('far');
  });
});

describe('a walk that proves on fresh questions only (options.isFresh)', () => {
  const allRight = (): { right: boolean } => ({ right: true });

  it('is unchanged when no isFresh is given: rights on any keys prove it', () => {
    const { walk } = run(begin(rawSteps(), {}), allRight);
    expect(walk.result?.ended).toBe('proved');
  });

  it('does not prove on seen keys: the walk goes on to the question limit and the asked list still grows', () => {
    const { walk, asked } = run(begin(rawSteps(), { isFresh: () => false }), allRight);
    expect(walk.result?.proved).toBe(false);
    expect(walk.result?.ended).toBe('limit');
    expect(asked).toHaveLength(MAX_QUESTIONS);
    expect(walk.asked).toHaveLength(MAX_QUESTIONS);
  });

  it('proves on fresh keys, as with no option', () => {
    const plain = run(begin(rawSteps(), {}), allRight);
    const fresh = run(begin(rawSteps(), { isFresh: () => true }), allRight);
    expect(fresh.walk.result?.ended).toBe('proved');
    expect(fresh.asked.map((q) => q.key)).toEqual(plain.asked.map((q) => q.key));
  });

  it('counts only the fresh keys at the top step: a seen right neither counts nor breaks the streak', () => {
    const top = numberSteps(rawSteps()).length;
    const seen = new Set<string>();
    // the first question asked at the top step is seen; the next two top-step rights are fresh
    let state = begin(rawSteps(), { isFresh: (key: string) => !seen.has(key) });
    for (let step = 1; step < top; step += 1) state = answerWalk(state, true, false);
    expect(currentQuestion(state)!.step).toBe(top);
    seen.add(currentQuestion(state)!.key);
    state = answerWalk(state, true, false); // seen: streak stays 0
    expect(state.streak).toBe(0);
    expect(state.result).toBeNull();
    state = answerWalk(state, true, false); // fresh: 1
    expect(state.streak).toBe(1);
    seen.add(currentQuestion(state)!.key);
    state = answerWalk(state, true, false); // seen again: still 1, not broken
    expect(state.streak).toBe(1);
    expect(state.result).toBeNull();
    state = answerWalk(state, true, false); // fresh: 2, proved
    expect(state.result?.ended).toBe('proved');
  });

  it('still breaks the streak on a miss or a hinted right at the top', () => {
    const top = numberSteps(rawSteps()).length;
    let state = begin(rawSteps(), { isFresh: () => true });
    for (let step = 1; step < top; step += 1) state = answerWalk(state, true, false);
    state = answerWalk(state, true, false);
    expect(state.streak).toBe(1);
    state = answerWalk(state, true, true);
    expect(state.streak).toBe(0);
  });
});
