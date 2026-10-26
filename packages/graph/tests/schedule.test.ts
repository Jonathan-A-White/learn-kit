// The review schedule, ported case for case from Lampas's tests/unit/schedule.test.ts: the same STEP_DAYS, the same dates. A
// schedule here is what Lampas's Review is without its kind and id (the node it belongs to keeps it in the store).
import { describe, expect, it } from 'vitest';
import {
  DAY,
  KNOWN_STEP,
  RARE_CHECK_DAYS,
  RARE_STEP,
  SOLID_STEP,
  STEP_DAYS,
  gapOf,
  isDue,
  knownSchedule,
  levelFromStep,
  nextReview,
  startSchedule,
  type Grade,
  type Schedule,
} from '../src/index.js';

const NOW = Date.UTC(2026, 9, 8, 9, 0, 0);
const at = (days: number) => NOW + days * DAY;

function review(step: number, over: Partial<Schedule> = {}): Schedule {
  return { step, due: NOW, lastWhen: NOW - DAY, lapses: 0, rights: 0, ...over };
}

describe('the spaced schedule', () => {
  it('has the steps 1, 3, 7, 14, 30, 60 days and a rare check every 90', () => {
    expect(STEP_DAYS).toEqual([1, 3, 7, 14, 30, 60]);
    expect(RARE_CHECK_DAYS).toBe(90);
    expect(RARE_STEP).toBe(6);
    expect(Object.isFrozen(STEP_DAYS)).toBe(true);
  });

  it('keeps a new item that is answered right once at step 0, due tomorrow', () => {
    const r = nextReview(undefined, true, NOW);
    expect(r).toEqual({ step: 0, due: at(1), lastWhen: NOW, lapses: 0, rights: 1 });
  });

  it('moves an item to step 1 (3 days) when it is right twice in a row', () => {
    const first = nextReview(undefined, true, NOW);
    const second = nextReview(first, true, at(1));
    expect(second.step).toBe(1);
    expect(second.due).toBe(at(1) + 3 * DAY);
    expect(second.rights).toBe(0);
  });

  it('does not count a right across a wrong', () => {
    const a = nextReview(review(2, { rights: 1 }), false, NOW);
    const b = nextReview(a, true, NOW);
    expect(b.step).toBe(0);
    expect(b.rights).toBe(1);
  });

  it('drops a wrong at step 3 (14 days) to step 1, due tomorrow, with a lapse', () => {
    const r = nextReview(review(3, { lapses: 1 }), false, NOW);
    expect(r.step).toBe(1);
    expect(r.due).toBe(at(1));
    expect(r.lapses).toBe(2);
    expect(r.rights).toBe(0);
  });

  it('never drops below step 0', () => {
    expect(nextReview(review(1), false, NOW).step).toBe(0);
    expect(nextReview(review(0), false, NOW).step).toBe(0);
  });

  it('puts the item due again in 90 days past the last step', () => {
    const r = nextReview(review(5, { rights: 1 }), true, NOW);
    expect(r.step).toBe(6);
    expect(r.due).toBe(at(90));
    const again = nextReview(r, true, at(90));
    expect(again.step).toBe(6);
    expect(again.due).toBe(at(90) + 90 * DAY);
    const third = nextReview(again, true, at(180));
    expect(third.step).toBe(6);
  });

  it('drops a wrong in the rare check back two steps', () => {
    expect(nextReview(review(6), false, NOW).step).toBe(4);
  });

  it('is due at the moment it falls due and after, not before', () => {
    const r = review(0, { due: at(1) });
    expect(isDue(r, at(1) - 1)).toBe(false);
    expect(isDue(r, at(1))).toBe(true);
    expect(isDue(r, at(2))).toBe(true);
  });
});

describe('the gaps and the starts', () => {
  it('gives each step its gap in ms, and the rare check 90 days from the last step on', () => {
    expect(STEP_DAYS.map((_, step) => gapOf(step))).toEqual([1, 3, 7, 14, 30, 60].map((d) => d * DAY));
    expect(gapOf(RARE_STEP)).toBe(90 * DAY);
    expect(gapOf(RARE_STEP + 3)).toBe(90 * DAY);
  });

  it('starts a node being learned at step 0, due after the first gap', () => {
    expect(startSchedule(NOW)).toEqual({ step: 0, due: at(1), lastWhen: NOW, lapses: 0, rights: 0 });
  });

  it('starts a node known already (tested out) at the 30-day step, due in 30 days, keeping the lapses and rights it had', () => {
    expect(STEP_DAYS[KNOWN_STEP]).toBe(30);
    expect(knownSchedule(NOW)).toEqual({ step: KNOWN_STEP, due: at(30), lastWhen: NOW, lapses: 0, rights: 0 });
    expect(knownSchedule(NOW, review(1, { lapses: 2, rights: 1 }))).toEqual({ step: KNOWN_STEP, due: at(30), lastWhen: NOW, lapses: 2, rights: 1 });
  });

  it('counts a node solid from the 14-day step: the known start and the rare check are solid, the steps below are not', () => {
    expect(STEP_DAYS[SOLID_STEP]).toBe(14);
    expect(levelFromStep(SOLID_STEP - 1)).toBe('frontier');
    expect(levelFromStep(SOLID_STEP)).toBe('solid');
    expect(levelFromStep(KNOWN_STEP)).toBe('solid');
    expect(levelFromStep(RARE_STEP)).toBe('solid');
  });
});

describe('the grades', () => {
  const steps = Array.from({ length: RARE_STEP + 1 }, (_, step) => step);

  it('moves a node knowing it well up a step at once, due after that step\'s gap, rights back to 0', () => {
    for (const step of steps) {
      for (const rights of [0, 1]) {
        const to = Math.min(step + 1, RARE_STEP);
        expect(nextReview(review(step, { rights, lapses: 2 }), 'well', NOW)).toEqual({ step: to, due: NOW + gapOf(to), lastWhen: NOW, lapses: 2, rights: 0 });
      }
    }
    expect(nextReview(review(RARE_STEP), 'well', NOW).due).toBe(at(90));
  });

  it('starts a node not scheduled yet at step 1 when it is known well', () => {
    expect(nextReview(undefined, 'well', NOW)).toEqual({ step: 1, due: at(3), lastWhen: NOW, lapses: 0, rights: 0 });
  });

  it('treats kind of knowing it as a right, and not knowing it as a wrong, at every step', () => {
    for (const step of steps) {
      for (const rights of [0, 1]) {
        const r = review(step, { rights, lapses: 1 });
        expect(nextReview(r, 'some', NOW)).toEqual(nextReview(r, true, NOW));
        expect(nextReview(r, 'not', NOW)).toEqual(nextReview(r, false, NOW));
      }
    }
    expect(nextReview(undefined, 'some', NOW)).toEqual(nextReview(undefined, true, NOW));
    expect(nextReview(undefined, 'not', NOW)).toEqual(nextReview(undefined, false, NOW));
  });

  it('advances one step on two kind-of answers in a row', () => {
    const first = nextReview(review(2), 'some', NOW);
    expect(first).toMatchObject({ step: 2, due: at(7), rights: 1 });
    const second = nextReview(first, 'some', at(7));
    expect(second).toMatchObject({ step: 3, due: at(7) + 14 * DAY, rights: 0 });
  });

  it('does not count a kind-of across a not, and lets well follow a kind-of', () => {
    const a = nextReview(review(3, { rights: 1 }), 'not', NOW);
    expect(nextReview(a, 'some', NOW)).toMatchObject({ step: 1, rights: 1 });
    expect(nextReview(review(1, { rights: 1 }), 'well', NOW)).toMatchObject({ step: 2, rights: 0 });
  });

  it('names the three grades', () => {
    const grades: Grade[] = ['well', 'some', 'not'];
    expect(grades.map((g) => nextReview(review(1), g, NOW).step)).toEqual([2, 1, 0]);
  });
});
