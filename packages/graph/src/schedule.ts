// The review schedule: when a node next comes up for review, from how the learner has
// answered it. Pure: the frontier functions (frontier.ts) keep each node's schedule in the store beside its level.

/** A day, in ms. */
export const DAY = 24 * 60 * 60 * 1000;

/**
 * The gap before the next review at each step, in days.
 *
 * The rule (a node answered right is seen less and less, one answered wrong more often):
 * - A node starts at step 0 (1 day).
 * - Right twice in a row (`rights` counts the rights since the last advance or wrong) moves it up one step; a single right keeps its
 *   step and it comes back after that step's gap.
 * - One wrong drops it two steps (never below step 0), counts a lapse, and it is due tomorrow.
 * - Past the last step (step === STEP_DAYS.length) it is a rare check, due again every RARE_CHECK_DAYS days.
 */
export const STEP_DAYS = Object.freeze([1, 3, 7, 14, 30, 60] as const);

/** The gap, in days, once a node is past the last step. */
export const RARE_CHECK_DAYS = 90;

/** The step of the rare check: one past the last of STEP_DAYS. */
export const RARE_STEP = STEP_DAYS.length;

/** The step whose gap is 30 days: where a node known already (tested out) starts. */
export const KNOWN_STEP = STEP_DAYS.indexOf(30);

/** A wrong answer drops a node this many steps. */
const DROP_STEPS = 2;

/** A node's place on the schedule. */
export interface Schedule {
  /** The position on STEP_DAYS (0 is the shortest gap; RARE_STEP the rare check). */
  step: number;
  /** When it next comes up (ms since the epoch). */
  due: number;
  /** When it was last answered (ms since the epoch). */
  lastWhen: number;
  /** How many times it was answered wrong. */
  lapses: number;
  /** Rights in a row since it last moved up or was wrong; two move it up a step. */
  rights: number;
}

/** The gap, in ms, a step waits before the node is due again. */
export function gapOf(step: number): number {
  return (step >= RARE_STEP ? RARE_CHECK_DAYS : STEP_DAYS[step]) * DAY;
}

/** The schedule of a node after one answer at `now`; `review` is undefined for a node not scheduled yet. */
export function nextReview(review: Schedule | undefined, right: boolean, now: number): Schedule {
  const step = review?.step ?? 0;
  const lapses = review?.lapses ?? 0;
  if (!right) {
    return { step: Math.max(0, step - DROP_STEPS), due: now + DAY, lastWhen: now, lapses: lapses + 1, rights: 0 };
  }
  const rights = (review?.rights ?? 0) + 1;
  const advance = rights >= 2;
  const to = advance ? Math.min(step + 1, RARE_STEP) : step;
  return { step: to, due: now + gapOf(to), lastWhen: now, lapses, rights: advance ? 0 : rights };
}

/** Whether the node is due at `now`. */
export function isDue(review: Pick<Schedule, 'due'>, now: number): boolean {
  return review.due <= now;
}

/** The schedule of a node starting to be learned at `now`: step 0, due after the first gap. */
export function startSchedule(now: number): Schedule {
  return { step: 0, due: now + gapOf(0), lastWhen: now, lapses: 0, rights: 0 };
}

/** The schedule of a node known already at `now` (tested out): the 30-day step, due in 30 days, keeping the lapses and rights of `review`. */
export function knownSchedule(now: number, review?: Schedule): Schedule {
  return { step: KNOWN_STEP, due: now + gapOf(KNOWN_STEP), lastWhen: now, lapses: review?.lapses ?? 0, rights: review?.rights ?? 0 };
}
