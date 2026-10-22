// The learning graph: nodes and the nodes each one needs, a directed acyclic graph taken AS DATA, so any subject is one graph among
// others and nothing here knows a subject's ids. A node is {id, needs, level?, tags?}; a graph is its nodes in their listed order.
// Pure: no store, no screen.

/** A node of the graph: its id, the ids it rests on, and optionally the subject's own level for it and tags the graph carries. */
export interface GraphNode {
  id: string;
  /** The ids of the nodes this one rests on directly. */
  needs: readonly string[];
  /** The subject's own level for the node, easy low; a node may not need one of a higher level. */
  level?: number;
  /** Labels the graph carries for the subject and never reads. */
  tags?: readonly string[];
}

/** A graph: its nodes in their listed order, and by id. */
export interface Graph<T extends GraphNode = GraphNode> {
  nodes: readonly T[];
  byId: ReadonlyMap<string, T>;
}

/** Thrown by validate: every problem of the nodes, each naming the node it is about. */
export class GraphError extends Error {
  readonly problems: readonly string[];

  constructor(problems: readonly string[]) {
    super(`Not a graph: ${problems.join('; ')}`);
    this.name = 'GraphError';
    this.problems = problems;
  }
}

/**
 * What is wrong with a list of nodes as a graph, each problem naming its node: an id listed twice, a need that names no node, a need
 * of a higher level than the node, or a cycle (named in full; a node that needs itself is one). None for a directed acyclic graph.
 */
export function graphProblems(nodes: readonly GraphNode[]): string[] {
  const problems: string[] = [];
  const byId = new Map<string, GraphNode>();
  for (const node of nodes) {
    if (byId.has(node.id)) problems.push(`${node.id} is listed twice`);
    else byId.set(node.id, node);
  }
  for (const node of nodes) {
    for (const need of node.needs) {
      const under = byId.get(need);
      if (!under) problems.push(`${node.id} needs ${need}, which is not a node of the graph`);
      else if (node.level !== undefined && under.level !== undefined && under.level > node.level) {
        problems.push(`${node.id} needs ${need}, which is of a higher level (${under.level} above ${node.level})`);
      }
    }
  }
  // depth-first colouring: a need that is still 'open' on the walk is a way back to a node above it, a cycle
  const state = new Map<string, 'open' | 'done'>();
  const walk = (id: string, trail: string[]): void => {
    state.set(id, 'open');
    for (const need of byId.get(id)?.needs ?? []) {
      if (!byId.has(need)) continue;
      const here = [...trail, id];
      if (state.get(need) === 'open') problems.push(`cycle: ${[...here.slice(here.indexOf(need)), need].join(' needs ')}`);
      else if (!state.has(need)) walk(need, here);
    }
    state.set(id, 'done');
  };
  for (const node of byId.values()) if (!state.has(node.id)) walk(node.id, []);
  return problems;
}

/** The graph of these nodes. Throws a GraphError, naming every problem, when they are not a directed acyclic graph. */
export function validate<T extends GraphNode>(nodes: readonly T[]): Graph<T> {
  const problems = graphProblems(nodes);
  if (problems.length > 0) throw new GraphError(problems);
  return { nodes, byId: new Map(nodes.map((n) => [n.id, n])) };
}

/** The node with this id. Throws on one the graph does not have. */
export function nodeOf<T extends GraphNode>(graph: Graph<T>, id: string): T {
  const node = graph.byId.get(id);
  if (!node) throw new Error(`Unknown node: ${JSON.stringify(id)}`);
  return node;
}

/** The nodes this one rests on directly, in the graph's order. */
export function needsOf<T extends GraphNode>(graph: Graph<T>, id: string): T[] {
  const needs = nodeOf(graph, id).needs;
  return graph.nodes.filter((n) => needs.includes(n.id));
}

/** Every node this one rests on, however far down, in the graph's order. */
export function below<T extends GraphNode>(graph: Graph<T>, id: string): T[] {
  const seen = new Set<string>();
  const walk = (at: string): void => {
    for (const need of nodeOf(graph, at).needs) {
      if (!seen.has(need)) {
        seen.add(need);
        walk(need);
      }
    }
  };
  walk(id);
  return graph.nodes.filter((n) => seen.has(n.id));
}

/**
 * A topological order of the graph's ids: every node after every node it needs. Of the nodes ready at each turn the one listed first
 * comes first, so a graph listed easy first already is returned in its listed order. Deterministic: the same graph, the same order.
 */
export function order(graph: Graph): string[] {
  const index = new Map(graph.nodes.map((n, i) => [n.id, i]));
  const waiting = new Map(graph.nodes.map((n) => [n.id, new Set(n.needs).size]));
  const dependents = new Map<string, string[]>(graph.nodes.map((n) => [n.id, []]));
  for (const node of graph.nodes) for (const need of new Set(node.needs)) dependents.get(need)!.push(node.id);
  const ready = graph.nodes.filter((n) => waiting.get(n.id) === 0).map((n) => n.id);
  const sorted: string[] = [];
  while (ready.length > 0) {
    const id = ready.shift()!;
    sorted.push(id);
    for (const next of dependents.get(id)!) {
      const left = waiting.get(next)! - 1;
      waiting.set(next, left);
      if (left > 0) continue;
      // keep the ready nodes in their listed order
      const at = ready.findIndex((r) => index.get(r)! > index.get(next)!);
      ready.splice(at === -1 ? ready.length : at, 0, next);
    }
  }
  return sorted;
}

/**
 * What is wrong with an order of the graph's ids as a teaching order: each node it puts before a node it needs ('b before a'), each
 * node of the graph it leaves out, and each id it has that is no node of the graph. None for an order that teaches nothing early.
 */
export function orderProblems(graph: Graph, ids: readonly string[]): string[] {
  const at = new Map<string, number>();
  ids.forEach((id, i) => {
    if (!at.has(id)) at.set(id, i);
  });
  const problems: string[] = [];
  for (const node of graph.nodes) {
    const mine = at.get(node.id);
    if (mine === undefined) {
      problems.push(`${node.id} is not in the order`);
      continue;
    }
    for (const need of node.needs) {
      const theirs = at.get(need);
      if (theirs !== undefined && theirs > mine) problems.push(`${node.id} before ${need}`);
    }
  }
  for (const id of at.keys()) if (!graph.byId.has(id)) problems.push(`${id} is not a node of the graph`);
  return problems;
}
