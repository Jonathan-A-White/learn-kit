// The drill walk, carved from Lampas's drillIt.ts (the Governor's want: 'start easy in the concept and work your way step by step up ...
// if it's now too hard for the person scale back ... kind of like a binary search ... find where is that person what are their gaps').
// Pure: no store, no screen, no subject. The app supplies the node's questions in STEPS of rising difficulty (1 = easiest), each question
// tagged with a facet (a short id and the label that names it): what a miss tells the learner he has not got.
//   The walk starts at step 1, goes UP one step on a right answer, and on a miss goes back HALFWAY (rounded down) between the last step he
//   held and the one he missed; a hinted right is neither (the step stays, and it never counts toward proved). It ends
//     'proved'  after PROVED_STREAK unhinted rights in a row at the top step (and every required facet answered right, unhinted),
//     'edge'    when the step he holds has the step above it failed (the highest step right, with a miss above it), or he misses step 1 twice,
//     'limit'   after MAX_QUESTIONS questions.
//   A first miss on a step that sets `retryFirstMiss` (words to read, say) stays at that step and asks the same target with another question, so
//   one he cannot say does not end the walk at the step below; a second miss on it goes back as any miss does.
//   The result: {nodeId, proved, edgeStep, topStep, strong, weak, answers, ended}; a facet is weak when missed at least once and right fewer than
//   twice, or when a miss came on a step that retries.
// A node's needs are assumed SOLID, never tested: startWalk takes the learner's levels and, when a need is not solid, returns {needs: <the lowest>}
// instead of a walk (one solid at a time, then one frontier).
import { depthOf, nodeOf, type Graph, type Level } from 'learn-kit/graph';
import { checkItems, type Forms, type MadeItem } from './forms.js';

/** Questions in one walk. */
export const MAX_QUESTIONS = 14;
/** Unhinted rights in a row at the top step that prove the node. */
export const PROVED_STREAK = 2;

/** What a miss names: a short id and the words for it. */
export interface Facet {
  id: string;
  label: string;
}

/** A question as the app makes it: an item in a form, about a facet. */
export interface RawQuestion<P = unknown> extends MadeItem<P> {
  facet: Facet;
}

/** The questions of one step before they are numbered. */
export interface RawStep<P = unknown> {
  title: string;
  questions: RawQuestion<P>[];
  /** a first miss here asks the same facet again at this step; a second goes back as any miss does */
  retryFirstMiss?: boolean;
}

/** A question of a step. */
export interface WalkQuestion<P = unknown> extends RawQuestion<P> {
  /** the step it belongs to, from 1 */
  step: number;
}

export interface WalkStep<P = unknown> {
  step: number;
  title: string;
  questions: WalkQuestion<P>[];
  retryFirstMiss?: true;
}

/**
 * The steps of a drill, numbered from 1 in the order given (easiest first); a step with no question is left out. With `forms`, throws a
 * DrillFormError for the first question in a form the registry does not hold.
 */
export function numberSteps<P>(raw: readonly RawStep<P>[], forms?: Forms): WalkStep<P>[] {
  const kept = raw.filter((r) => r.questions.length > 0);
  if (forms) checkItems(forms, kept.flatMap((r) => r.questions));
  return kept.map((r, i) => ({
    step: i + 1,
    title: r.title,
    ...(r.retryFirstMiss ? { retryFirstMiss: true as const } : {}),
    questions: r.questions.map((q): WalkQuestion<P> => ({ ...q, step: i + 1 })),
  }));
}

export interface WalkOptions {
  /** questions in the walk (MAX_QUESTIONS) */
  maxQuestions?: number;
  /** unhinted rights in a row at the top step that prove the node (PROVED_STREAK) */
  provedStreak?: number;
  /** ids of facets that must each be answered right, unhinted, before the node is proved (the sides of a rule, say): the walk keeps asking the one still missing at the top step */
  required?: readonly string[];
  /**
   * Whether a question key is one he has not been asked before (learn-kit/fresh's `isFresh`, read by the app). When given, a right answer on a key that is
   * not fresh neither counts toward the proved streak nor breaks it; the walk goes on. Absent, every key counts.
   */
  isFresh?: (key: string) => boolean;
}

// ---- The foundation ----

/**
 * The lowest need of the node that is not solid in `levels`, or null: lowest by the subject's level for the need (its depth when it has none),
 * the need listed first of those of one level. A need with no level in `levels` is not solid. Throws on a node the graph does not have.
 */
export function unmetNeed(graph: Graph, nodeId: string, levels: ReadonlyMap<string, Level>): string | null {
  const rung = (id: string): number => nodeOf(graph, id).level ?? depthOf(graph, id);
  const unmet = nodeOf(graph, nodeId).needs.filter((id) => levels.get(id) !== 'solid');
  if (unmet.length === 0) return null;
  return unmet.reduce((lowest, id) => (rung(id) < rung(lowest) ? id : lowest));
}

// ---- The walk ----

export interface WalkAnswer {
  step: number;
  facet: Facet;
  key: string;
  right: boolean;
  /** he was helped: a hinted right is not counted as right */
  hinted: boolean;
}

export type DrillEnd = 'proved' | 'edge' | 'limit';

export interface DrillResult {
  nodeId: string;
  /** PROVED_STREAK unhinted rights in a row at the top step */
  proved: boolean;
  /** the highest step he holds: 0 when he does not hold the first, the top step when proved */
  edgeStep: number;
  topStep: number;
  /** facets right at least once and not weak */
  strong: Facet[];
  /** facets missed at least once and right fewer than twice, and facets missed on a step that retries */
  weak: Facet[];
  answers: WalkAnswer[];
  ended: DrillEnd;
}

export interface Walk<P = unknown> {
  nodeId: string;
  steps: WalkStep<P>[];
  /** the step being asked */
  step: number;
  asked: WalkAnswer[];
  /** the question being asked; null once the walk is over */
  current: WalkQuestion<P> | null;
  /** unhinted rights in a row at the top step */
  streak: number;
  result: DrillResult | null;
  maxQuestions: number;
  provedStreak: number;
  /** the required facets the steps ask (WalkOptions.required) */
  required: string[];
  /** WalkOptions.isFresh, when given */
  isFresh?: (key: string) => boolean;
}

/** The question being asked, or null once the walk is over. */
export const currentQuestion = <P>(walk: Walk<P>): WalkQuestion<P> | null => walk.current;

/** How the walk ended, or null while it goes on. */
export const resultOf = <P>(walk: Walk<P>): DrillResult | null => walk.result;

interface Tally {
  facet: Facet;
  right: number;
  missed: number;
  retried: boolean;
}

/** The questions asked so far at a facet: right and missed counts; a hinted right is neither. */
function tally(asked: readonly WalkAnswer[], steps: readonly WalkStep[]): Map<string, Tally> {
  const facets = new Map<string, Tally>();
  for (const a of asked) {
    const t = facets.get(a.facet.id) ?? { facet: a.facet, right: 0, missed: 0, retried: false };
    if (!a.right) {
      t.missed += 1;
      if (steps[a.step - 1]?.retryFirstMiss) t.retried = true;
    } else if (!a.hinted) t.right += 1;
    facets.set(a.facet.id, t);
  }
  return facets;
}

/** Where he stands on each step he was asked: 'held' when his latest sure answer there was right, 'failed' when it was a miss. */
function standing(asked: readonly WalkAnswer[]): Map<number, 'held' | 'failed'> {
  const out = new Map<number, 'held' | 'failed'>();
  for (const a of asked) {
    if (!a.right) out.set(a.step, 'failed');
    else if (!a.hinted) out.set(a.step, 'held');
  }
  return out;
}

const highestHeld = (stood: ReadonlyMap<number, 'held' | 'failed'>, below = Infinity): number =>
  Math.max(0, ...[...stood].filter(([step, s]) => s === 'held' && step < below).map(([step]) => step));

/**
 * The next question at `step`: one not asked yet; the facet he just missed first when the walk went back to an easier step (to see whether it is a
 * gap), else a facet not asked yet, else the one asked least. When the step has no question left, the one asked longest ago, but never the one just asked.
 */
function nextAt<P>(steps: readonly WalkStep<P>[], step: number, asked: readonly WalkAnswer[], retry: string | null): WalkQuestion<P> | null {
  const pool = steps[step - 1]?.questions ?? [];
  const last = asked[asked.length - 1]?.key;
  const seen = new Set(asked.map((a) => a.key));
  let candidates = pool.filter((q) => !seen.has(q.key));
  if (candidates.length === 0) {
    const lastAsked = (q: WalkQuestion<P>): number => asked.reduce((at, a, i) => (a.key === q.key ? i : at), -1);
    candidates = pool.filter((q) => q.key !== last).sort((a, b) => lastAsked(a) - lastAsked(b));
  }
  if (candidates.length === 0) return pool[0] ?? null;
  const times = (q: WalkQuestion<P>): number => asked.filter((a) => a.facet.id === q.facet.id).length;
  const again = retry === null ? undefined : candidates.find((q) => q.facet.id === retry);
  return again ?? candidates.reduce((best, q) => (times(q) < times(best) ? q : best));
}

/**
 * Begins the walk on a node at step 1, or, when a need of the node is not solid in `levels`, says which one is the lowest: {needs: id}. The questions
 * assume the needs are solid and never test them. Throws on a node the graph does not have.
 */
export function startWalk<P>(
  graph: Graph,
  nodeId: string,
  levels: ReadonlyMap<string, Level>,
  steps: readonly WalkStep<P>[],
  options: WalkOptions = {},
): Walk<P> | { needs: string } {
  const needs = unmetNeed(graph, nodeId, levels);
  if (needs !== null) return { needs };
  const asked = new Set(steps.flatMap((s) => s.questions.map((q) => q.facet.id)));
  const required = (options.required ?? []).filter((id) => asked.has(id));
  return {
    nodeId,
    steps: [...steps],
    step: 1,
    asked: [],
    current: nextAt(steps, 1, [], null),
    streak: 0,
    result: null,
    maxQuestions: options.maxQuestions ?? MAX_QUESTIONS,
    provedStreak: options.provedStreak ?? PROVED_STREAK,
    required,
    ...(options.isFresh ? { isFresh: options.isFresh } : {}),
  };
}

/** The required facets not yet answered right, unhinted. */
const missingFacets = (walk: Walk, asked: readonly WalkAnswer[]): string[] =>
  walk.required.filter((id) => !asked.some((a) => a.facet.id === id && a.right && !a.hinted));

function finish<P>(walk: Walk<P>, asked: WalkAnswer[], ended: DrillEnd, streak: number): Walk<P> {
  const topStep = walk.steps.length;
  const facets = [...tally(asked, walk.steps).values()];
  const isWeak = (t: Tally): boolean => t.retried || (t.missed >= 1 && t.right < 2);
  const weak = facets.filter(isWeak).map((t) => t.facet);
  const strong = facets.filter((t) => t.right >= 1 && !isWeak(t)).map((t) => t.facet);
  const edgeStep = ended === 'proved' ? topStep : highestHeld(standing(asked));
  return { ...walk, asked, current: null, streak, result: { nodeId: walk.nodeId, proved: ended === 'proved', edgeStep, topStep, strong, weak, answers: asked, ended } };
}

/**
 * One answer to the question being asked. A right answer goes up one step (and the streak of unhinted ones at the top proves the node); a miss goes back
 * halfway between the highest step he holds below it and the one missed; a hinted right stays put and breaks the run; a right on a key that is not fresh (WalkOptions.isFresh) at the top neither counts nor breaks it. A walk that is over does not change.
 */
export function answerWalk<P>(walk: Walk<P>, right: boolean, hinted: boolean): Walk<P> {
  const q = walk.current;
  if (walk.result || !q) return walk;
  const asked = [...walk.asked, { step: q.step, facet: q.facet, key: q.key, right, hinted }];
  const top = walk.steps.length;
  const sure = right && !hinted;
  // a right at the top counts when its key is fresh (or no isFresh is given); a seen one leaves the streak as it was
  const seen = walk.isFresh !== undefined && !walk.isFresh(q.key);
  const streak = !sure || q.step !== top ? 0 : seen ? walk.streak : walk.streak + 1;
  const missing = missingFacets(walk, asked);
  if (streak >= walk.provedStreak && missing.length === 0) return finish(walk, asked, 'proved', streak);
  if (asked.length >= walk.maxQuestions) return finish(walk, asked, 'limit', streak);

  const stood = standing(asked);
  let step = q.step;
  let retry: string | null = null;
  if (sure) {
    // the step he holds has the one above it failed: that is the edge
    if (stood.get(q.step + 1) === 'failed') return finish(walk, asked, 'edge', streak);
    step = Math.min(q.step + 1, top);
  } else if (!right) {
    const base = highestHeld(stood, q.step);
    if (base === 0 && q.step === 1 && asked.filter((a) => a.step === 1 && !a.right).length >= 2) return finish(walk, asked, 'edge', streak);
    step = Math.max(1, Math.floor((base + q.step) / 2));
    // a first miss on a step that retries asks the same target again at the same step; a second one goes back as any miss does
    const second = walk.asked.some((a) => a.step === q.step && a.facet.id === q.facet.id && !a.right);
    const retries = walk.steps[q.step - 1]?.retryFirstMiss === true;
    if (retries && !second) step = q.step;
    // an easier step asks the facet just missed again; step 1 asks another
    retry = step < q.step || retries ? q.facet.id : null;
  }
  // a hinted right on a required facet still missing asks that facet again; else, at the top, a required facet not yet answered right is asked first
  if (right && hinted && missing.includes(q.facet.id)) retry = q.facet.id;
  if (retry === null && step === top) retry = missing[0] ?? null;
  return { ...walk, step, asked, current: nextAt(walk.steps, step, asked, retry), streak };
}
