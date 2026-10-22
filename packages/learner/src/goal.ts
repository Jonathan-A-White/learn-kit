// A goal chosen with the tutor: an id, a title, and the nodes of a graph it aims at (its targets). The goal covers the targets and every node
// they rest on, however far down, in teaching order from the roots up; its progress is the share of those that are solid, 0 to 1. Pure: the
// solid nodes are given, or read from the graph's injected store.
import { below, nodeOf, order, solidOf, type Graph, type GraphNode, type GraphStore } from 'learn-kit/graph';

/** A goal: its id, its title as the learner sees it, and the ids of the nodes it aims at. */
export interface Goal {
  id: string;
  title: string;
  targets: readonly string[];
}

/** Thrown for a goal that is not one of the graph: every problem, each naming the goal. */
export class GoalError extends Error {
  readonly problems: readonly string[];

  constructor(problems: readonly string[]) {
    super(`Not a goal of this graph: ${problems.join('; ')}`);
    this.name = 'GoalError';
    this.problems = problems;
  }
}

/** What is wrong with a goal over a graph: no id, no title or no targets; a target listed twice, or one that is no node of the graph. None for a goal of it. */
export function goalProblems(goal: Goal, graph: Graph): string[] {
  const problems: string[] = [];
  if (goal.id.trim() === '') problems.push('the goal has no id');
  if (goal.title.trim() === '') problems.push('the goal has no title');
  if (goal.targets.length === 0) problems.push('the goal has no targets');
  const seen = new Set<string>();
  const twice = new Set<string>();
  for (const target of goal.targets) {
    if (!seen.has(target)) {
      seen.add(target);
      if (!graph.byId.has(target)) problems.push(`${goal.id} aims at ${target}, which is not a node of the graph`);
    } else if (!twice.has(target)) {
      twice.add(target);
      problems.push(`${goal.id} aims at ${target} twice`);
    }
  }
  return problems;
}

/** The goal, when it is one of the graph. Throws a GoalError naming every problem when it is not. */
export function checkGoal<G extends Goal>(goal: G, graph: Graph): G {
  const problems = goalProblems(goal, graph);
  if (problems.length > 0) throw new GoalError(problems);
  return goal;
}

/** The nodes the goal covers: its targets and every node they rest on, in the graph's teaching order (order), from the roots up. Throws a GoalError for a goal not of the graph. */
export function goalNodes<T extends GraphNode>(goal: Goal, graph: Graph<T>): T[] {
  checkGoal(goal, graph);
  const covered = new Set(goal.targets);
  for (const target of goal.targets) for (const node of below(graph, target)) covered.add(node.id);
  return order(graph)
    .filter((id) => covered.has(id))
    .map((id) => nodeOf(graph, id));
}

/** The goal's progress: the share of the nodes it covers that are in `solid`, 0 (nothing solid) to 1 (all of them). Throws a GoalError for a goal not of the graph. */
export function goalProgress(goal: Goal, graph: Graph, solid: ReadonlySet<string>): number {
  const nodes = goalNodes(goal, graph);
  return nodes.filter((n) => solid.has(n.id)).length / nodes.length;
}

/** The goal's progress over the solid nodes of the store. */
export async function goalProgressFrom(store: GraphStore, goal: Goal, graph: Graph): Promise<number> {
  return goalProgress(goal, graph, await solidOf(store, graph));
}
