// Levels, in the two senses the graph has: where a node sits in the graph (its depth, one row below the deepest node it needs, and
// the rows of the graph by depth), and where it stands for the learner (solid, at the frontier, or not yet), kept in an injected store.
import { nodeOf, type Graph } from './graph.js';
import type { GraphStore } from './store.js';

/** The depth of a node, remembering every depth it works out in `memo`. */
function depthIn(graph: Graph, id: string, memo: Map<string, number>): number {
  const known = memo.get(id);
  if (known !== undefined) return known;
  const needs = nodeOf(graph, id).needs;
  const d = needs.length === 0 ? 0 : 1 + Math.max(...needs.map((need) => depthIn(graph, need, memo)));
  memo.set(id, d);
  return d;
}

/** How deep a node sits: 0 for one that needs nothing, else one more than the deepest node it needs. */
export const depthOf = (graph: Graph, id: string): number => depthIn(graph, id, new Map());

/** The graph's ids in rows by depth: the nodes that need nothing first, a node one row below the deepest node it needs; each row in the graph's order. */
export function layers(graph: Graph): string[][] {
  const memo = new Map<string, number>();
  const rows: string[][] = [];
  for (const node of graph.nodes) (rows[depthIn(graph, node.id, memo)] ??= []).push(node.id);
  return rows;
}

/** Where a node stands for the learner: solid, at the frontier (being learned now), or not yet. */
export type Level = 'solid' | 'frontier' | 'notYet';

/** The first review step at which a node counts as solid (the step of the 14-day gap). */
export const SOLID_STEP = 3;

/** The level a node at review step `step` has: solid from `solidStep` up, frontier below it. */
export function levelFromStep(step: number, solidStep: number = SOLID_STEP): Level {
  return step >= solidStep ? 'solid' : 'frontier';
}

/** A node's level in the store: not yet when the store has no state for it. */
export async function levelOf(store: GraphStore, id: string): Promise<Level> {
  return (await store.get(id))?.level ?? 'notYet';
}

/**
 * Sets a node's level in the store, with when (`now`, ms) and what set it (`how`: 'review', 'tested-out' ...), keeping the node's review
 * schedule. Throws, writing nothing, on a node the graph does not have. It keeps no rule of the frontier: frontier.ts's writers do.
 */
export async function setLevel(store: GraphStore, graph: Graph, id: string, level: Level, how: string, now: number = Date.now()): Promise<void> {
  nodeOf(graph, id);
  const review = (await store.get(id))?.review;
  await store.put(id, review ? { level, since: now, how, review } : { level, since: now, how });
}

/** The level of every node of the graph, in the graph's order: not yet for a node with no state; the store's states of nodes the graph does not have are left out. */
export async function levelsOf(store: GraphStore, graph: Graph): Promise<Map<string, Level>> {
  const states = await store.entries();
  return new Map(graph.nodes.map((n): [string, Level] => [n.id, states.get(n.id)?.level ?? 'notYet']));
}
