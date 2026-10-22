// The scaffold of a goal: the path still to go from the roots to its targets, built from 'knows nothing' upward, each node with the supports
// shown with it (hints, a slower pace ...) until it is solid. A solid node leaves the path and its supports fall away, so the path is the
// whole goal for a learner with nothing solid and shorter for one with levels solid. The supports are named by id; what each looks like is
// the app's, which may choose them per node (from the learner's profile, say).
import { solidOf, type Graph, type GraphNode, type GraphStore } from 'learn-kit/graph';
import { goalNodes, type Goal } from './goal.js';

/** A support shown with a node until it is solid, by id: HINTS, SLOWER_PACE, or one of the app's own. */
export type Support = string;
export const HINTS = 'hints';
export const SLOWER_PACE = 'slower-pace';
/** The supports of every node not solid, when the app chooses none. */
export const DEFAULT_SUPPORTS: readonly Support[] = Object.freeze([HINTS, SLOWER_PACE]);

/** What the app's choice of supports is told of a node: whether it is ready to learn now (every need solid) and whether it is a target. */
export interface SupportContext {
  ready: boolean;
  target: boolean;
}

export interface ScaffoldOptions<T extends GraphNode = GraphNode> {
  /** The supports of each node not solid (DEFAULT_SUPPORTS when not given). */
  supports?: (node: T, at: SupportContext) => readonly Support[];
}

/** One node of the path still to go. */
export interface ScaffoldStep<T extends GraphNode = GraphNode> {
  node: T;
  /** every need is solid: ready to learn now */
  ready: boolean;
  /** one of the goal's targets */
  target: boolean;
  supports: readonly Support[];
}

export interface GoalScaffold<T extends GraphNode = GraphNode> {
  goal: Goal;
  /** the goal's nodes not solid, in teaching order from the roots up */
  steps: ScaffoldStep<T>[];
  /** the ids of the goal's nodes that are solid, in teaching order */
  solid: string[];
  /** the goal's progress, 0 to 1 (goalProgress) */
  progress: number;
}

/** The goal's scaffold for a learner whose solid nodes are `solid`. Throws a GoalError for a goal not of the graph. */
export function scaffold<T extends GraphNode>(goal: Goal, graph: Graph<T>, solid: ReadonlySet<string>, options: ScaffoldOptions<T> = {}): GoalScaffold<T> {
  const nodes = goalNodes(goal, graph);
  const targets = new Set(goal.targets);
  const steps = nodes
    .filter((node) => !solid.has(node.id))
    .map((node): ScaffoldStep<T> => {
      const at = { ready: node.needs.every((need) => solid.has(need)), target: targets.has(node.id) };
      return { node, ...at, supports: [...(options.supports?.(node, at) ?? DEFAULT_SUPPORTS)] };
    });
  const done = nodes.filter((node) => solid.has(node.id)).map((node) => node.id);
  return { goal, steps, solid: done, progress: done.length / nodes.length };
}

/** The goal's scaffold over the solid nodes of the store. */
export async function scaffoldFrom<T extends GraphNode>(store: GraphStore, goal: Goal, graph: Graph<T>, options: ScaffoldOptions<T> = {}): Promise<GoalScaffold<T>> {
  return scaffold(goal, graph, await solidOf(store, graph), options);
}

/** The supports shown with a node: none once it is solid, or for a node the goal does not cover. */
export function supportsFor(scaffold: GoalScaffold, id: string): readonly Support[] {
  return scaffold.steps.find((step) => step.node.id === id)?.supports ?? [];
}
