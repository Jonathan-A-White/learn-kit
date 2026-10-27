// @learn-kit/drill: the drill engine and the placement. A walk up and down a node's steps of questions to find the gap, a plan for the gap, the
// drill forms an app registers, a sitting's mix of the frontier and the reviews due, and the placement that finds where a learner is on a graph and
// marks what he passes tested out. Over a learn-kit/graph graph and its injected store. No React, no Dexie, no subject.

/** The package's own name. */
export const DRILL_PACKAGE = '@learn-kit/drill';

export { DrillFormError, checkItems, createForms, type DrillForm, type DrillItem, type Forms, type MadeItem } from './forms.js';
export {
  MAX_QUESTIONS,
  PROVED_STREAK,
  answerWalk,
  currentQuestion,
  numberSteps,
  resultOf,
  startWalk,
  unmetNeed,
  type DrillEnd,
  type DrillResult,
  type Facet,
  type RawQuestion,
  type RawStep,
  type Walk,
  type WalkAnswer,
  type WalkOptions,
  type WalkQuestion,
  type WalkStep,
} from './walk.js';
export {
  FACET_PASS,
  FACET_QUESTIONS_MAX,
  FACET_QUESTIONS_MIN,
  PROVE_ID,
  facetPassed,
  facetQuestions,
  nextItem,
  planFrom,
  toGo,
  type GapPlan,
  type PlanItem,
} from './gapPlan.js';
export {
  DEFAULT_ITEMS_PER_NODE,
  DEFAULT_MIX,
  DEFAULT_SIZE,
  planDrill,
  stockThenMaker,
  type AskedKeys,
  type DrillMix,
  type DrillPlan,
  type ItemAsk,
  type ItemMaker,
  type PlanEntry,
  type PlanOptions,
  type PlanRole,
} from './drillPlan.js';
export {
  ANSWERS_PER_NODE,
  QUESTION_LIMIT,
  answerPlacement,
  applyPlacement,
  currentNode,
  levelOfAnswers,
  maxProbes,
  placementItem,
  placementResult,
  questionSeed,
  resumePlacement,
  startPlacement,
  startPlacementFromStore,
  summarize,
  type Asked,
  type Placed,
  type PlacementDone,
  type PlacementOptions,
  type PlacementResult,
  type PlacementState,
  type PlacementSummary,
} from './placement.js';
