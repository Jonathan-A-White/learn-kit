// @learn-kit/graph: the learning graph. Nodes and the nodes they need, validated as a directed acyclic graph, in topological order
// and by depth; where each node stands for the learner, kept through an injected store; the frontier, solid (tested out, or reviewed
// to the solid step), one node learned at a time, and the review schedule. No React, no Dexie, no subject.

/** The package's own name. */
export const GRAPH_PACKAGE = '@learn-kit/graph';

export { GraphError, below, graphProblems, needsOf, nodeOf, order, orderProblems, validate, type Graph, type GraphNode } from './graph.js';
export { SOLID_STEP, depthOf, layers, levelFromStep, levelOf, levelsOf, setLevel, type Level } from './levels.js';
export { memoryStore, type GraphStore, type NodeState } from './store.js';
export {
  DAY,
  KNOWN_STEP,
  RARE_CHECK_DAYS,
  RARE_STEP,
  STEP_DAYS,
  gapOf,
  isDue,
  knownSchedule,
  nextReview,
  startSchedule,
  type Grade,
  type Schedule,
} from './schedule.js';
export {
  TESTED_OUT,
  dueOf,
  frontier,
  frontierOf,
  learning,
  place,
  review,
  solidOf,
  teach,
  testOut,
  type FrontierChoice,
  type TeachResult,
} from './frontier.js';
