// The plan for a gap (src/gapPlan.ts), ported from Lampas's drillPlan.ts ('Your drill plan'): a walk that did not prove its node and
// left weak facets gives a plan of one short drill a weak facet, easiest first, then 'Prove it'.
import { describe, expect, it } from 'vitest';
import {
  FACET_PASS,
  FACET_QUESTIONS_MAX,
  FACET_QUESTIONS_MIN,
  PROVE_ID,
  answerWalk,
  currentQuestion,
  facetPassed,
  facetQuestions,
  nextItem,
  numberSteps,
  planFrom,
  resultOf,
  startWalk,
  toGo,
  type DrillResult,
  type Walk,
} from '../src/index.js';
import { LADDER, rawSteps } from './fixtures.js';

const levels = new Map(LADDER.nodes.map((n) => [n.id, 'solid' as const]));
const steps = numberSteps(rawSteps(5, 9));

function walked(decide: (step: number, facet: string) => boolean): DrillResult {
  let walk = startWalk(LADDER, 'a3', levels, steps) as Walk<string>;
  for (let guard = 0; guard < 40 && !walk.result; guard += 1) {
    const q = currentQuestion(walk)!;
    walk = answerWalk(walk, decide(q.step, q.facet.id), false);
  }
  return resultOf(walk)!;
}

describe('planFrom', () => {
  it('makes no plan from a run that proved the node', () => {
    expect(planFrom(walked(() => true), 100)).toBeNull();
  });

  it('makes no plan from a run with no weak facet', () => {
    const result = walked(() => true);
    expect(planFrom({ ...result, proved: false, weak: [] }, 100)).toBeNull();
  });

  it('makes one short drill a weak facet, then Prove it, with the run named by its time', () => {
    const result = walked((step, facet) => step <= 2 || facet === 'f1');
    expect(result.weak.length).toBeGreaterThan(0);
    const plan = planFrom(result, 1234)!;
    expect(plan.nodeId).toBe('a3');
    expect(plan.at).toBe(1234);
    expect(plan.items.slice(0, -1).map((i) => i.id).sort()).toEqual(result.weak.map((f) => `facet:${f.id}`).sort());
    const prove = plan.items[plan.items.length - 1];
    expect(prove).toMatchObject({ kind: 'prove', done: false, step: result.topStep });
    for (const item of plan.items.slice(0, -1)) expect(item).toMatchObject({ kind: 'facet', step: Math.max(1, result.edgeStep), done: false });
  });

  it('puts the facet missed at the lowest step first, the run\'s own order breaking a tie', () => {
    const result: DrillResult = {
      nodeId: 'a3',
      proved: false,
      ended: 'edge',
      edgeStep: 0,
      topStep: 5,
      strong: [],
      weak: [{ id: 'hard', label: 'Hard' }, { id: 'easy', label: 'Easy' }, { id: 'also', label: 'Also' }],
      answers: [
        { step: 3, facet: { id: 'hard', label: 'Hard' }, key: 'k1', right: false, hinted: false },
        { step: 1, facet: { id: 'easy', label: 'Easy' }, key: 'k2', right: false, hinted: false },
        { step: 3, facet: { id: 'also', label: 'Also' }, key: 'k3', right: false, hinted: false },
      ],
    };
    const plan = planFrom(result, 1)!;
    expect(plan.items.map((i) => i.id)).toEqual(['facet:easy', 'facet:hard', 'facet:also', PROVE_ID]);
    expect(plan.items[0].step).toBe(1); // at least step 1
  });
});

describe('the plan as it is worked through', () => {
  const plan = planFrom(walked((step, facet) => step <= 2 || facet === 'f1'), 5)!;

  it('counts the items to go and names the next', () => {
    expect(toGo(plan)).toBe(plan.items.length);
    expect(nextItem(plan)).toBe(plan.items[0]);
    const done = { ...plan, items: plan.items.map((i, n) => (n === 0 ? { ...i, done: true } : i)) };
    expect(toGo(done)).toBe(plan.items.length - 1);
    expect(nextItem(done)).toBe(plan.items[1]);
    expect(nextItem({ ...plan, items: plan.items.map((i) => ({ ...i, done: true })) })).toBeUndefined();
  });
});

describe('facetQuestions', () => {
  const item = { id: 'facet:f1', kind: 'facet' as const, facet: { id: 'f1', label: 'facet f1' }, step: 3, done: false };

  it('takes the facet\'s questions at the item\'s step and the one below, at most six', () => {
    const qs = facetQuestions(steps, item);
    expect(qs.length).toBeGreaterThanOrEqual(FACET_QUESTIONS_MIN);
    expect(qs.length).toBeLessThanOrEqual(FACET_QUESTIONS_MAX);
    for (const q of qs) {
      expect(q.facet.id).toBe('f1');
      expect([2, 3]).toContain(q.step);
    }
  });

  it('fills a facet with too few questions from the nearest steps, an easier step first on a tie', () => {
    const sparse = numberSteps(rawSteps(5, 3, ['f1', 'f2', 'f3', 'f4', 'f5', 'f6']));
    const qs = facetQuestions(sparse, { ...item, step: 3 });
    expect(qs.every((q) => q.facet.id === 'f1')).toBe(true);
    expect(qs.length).toBeLessThanOrEqual(FACET_QUESTIONS_MAX);
  });

  it('is empty for an item that is no facet drill', () => {
    expect(facetQuestions(steps, { id: PROVE_ID, kind: 'prove', step: 5, done: false })).toEqual([]);
  });
});

describe('facetPassed', () => {
  it('allows one miss in four or in six, and nothing asked is not passed', () => {
    expect(FACET_PASS).toBe(0.75);
    expect(facetPassed(4, 4)).toBe(true);
    expect(facetPassed(3, 4)).toBe(true);
    expect(facetPassed(2, 4)).toBe(false);
    expect(facetPassed(5, 6)).toBe(true);
    expect(facetPassed(4, 6)).toBe(false);
    expect(facetPassed(0, 0)).toBe(false);
  });
});
