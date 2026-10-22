// The plan for a gap, carved from Lampas's drillPlan.ts ('Your drill plan'; the Governor's want: 'come back with a plan for drilling tailored to
// that person so that they can get to yes I really know this and can move on knowing that they really know it'). Pure: no store, no screen.
//   planFrom(result): a walk that did not prove its node and left weak facets gives a plan: one short drill for each weak facet, the easiest facet
//     first (the lowest step the run asked it at), then 'Prove it', a full walk that closes the plan when it passes. A run with no weak facet makes no plan.
//   facetQuestions(steps, item): the 4 to 6 questions of a facet's short drill, at and just below the step the run's edge stood at.
// Keeping a plan and scheduling its items is the app's; the plan is plain data.
import type { Facet, DrillResult, WalkQuestion, WalkStep } from './walk.js';

/** The id of the last item of every plan, the full walk. */
export const PROVE_ID = 'prove';
/** The fewest and the most questions in a facet's short drill. */
export const FACET_QUESTIONS_MIN = 4;
export const FACET_QUESTIONS_MAX = 6;
/** The share of a short drill's questions he must get right for the item to be done (4 of 4 or 3 of 4, 5 of 6 ...: one miss is allowed). */
export const FACET_PASS = 0.75;

export interface PlanItem {
  /** 'facet:<facet id>' or PROVE_ID: unique in its plan */
  id: string;
  kind: 'facet' | 'prove';
  /** the facet a short drill is about; none for Prove it */
  facet?: Facet;
  /** the step the short drill is centred on: the run's edge step (at least 1); for Prove it, the top step */
  step: number;
  /** answered right on its schedule */
  done: boolean;
}

export interface GapPlan {
  nodeId: string;
  /** when the run that made it was kept; it names the plan, so an answer to an item of an older plan can be ignored */
  at: number;
  items: PlanItem[];
}

/** The plan a run calls for, or null when it proved the node or left no weak facet to drill. */
export function planFrom(result: DrillResult, at: number): GapPlan | null {
  if (result.proved || result.weak.length === 0) return null;
  const lowest = (facet: Facet): number => Math.min(Infinity, ...result.answers.filter((a) => a.facet.id === facet.id).map((a) => a.step));
  // the easiest facet first; the run's own order (the order it was missed in) breaks a tie
  const weak = result.weak
    .map((facet, i) => ({ facet, i, step: lowest(facet) }))
    .sort((a, b) => a.step - b.step || a.i - b.i);
  const edge = Math.max(1, result.edgeStep);
  const items: PlanItem[] = [
    ...weak.map(({ facet }): PlanItem => ({ id: `facet:${facet.id}`, kind: 'facet', facet: { id: facet.id, label: facet.label }, step: edge, done: false })),
    { id: PROVE_ID, kind: 'prove', step: result.topStep, done: false },
  ];
  return { nodeId: result.nodeId, at, items };
}

/** How many items of the plan are still to do. */
export const toGo = (plan: GapPlan): number => plan.items.filter((i) => !i.done).length;

/** The first item not done, or undefined for a plan that is finished. */
export const nextItem = (plan: GapPlan): PlanItem | undefined => plan.items.find((i) => !i.done);

/**
 * The questions of a facet's short drill: those of the facet at the item's step and the one just below it, FACET_QUESTIONS_MAX at most; when the facet has
 * fewer than FACET_QUESTIONS_MIN there, the nearest steps' fill the drill (an easier step first on a tie). Empty for an item that is no facet drill.
 */
export function facetQuestions<P>(steps: readonly WalkStep<P>[], item: PlanItem): WalkQuestion<P>[] {
  if (!item.facet) return [];
  const own = steps.flatMap((s) => s.questions).filter((q) => q.facet.id === item.facet?.id);
  const near = own.filter((q) => q.step === item.step || q.step === item.step - 1);
  if (near.length >= FACET_QUESTIONS_MIN) return near.slice(0, FACET_QUESTIONS_MAX);
  const distance = (q: WalkQuestion<P>): number => Math.abs(q.step - item.step) + (q.step > item.step ? 0.5 : 0);
  const rest = own.filter((q) => !near.includes(q)).sort((a, b) => distance(a) - distance(b));
  return [...near, ...rest.slice(0, FACET_QUESTIONS_MIN - near.length)].slice(0, FACET_QUESTIONS_MAX);
}

/** Whether a short drill with `right` of `asked` questions right is done. */
export const facetPassed = (right: number, asked: number): boolean => asked > 0 && right >= Math.ceil(asked * FACET_PASS);
