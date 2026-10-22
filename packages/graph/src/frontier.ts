// The frontier and solid, over the injected store. The frontier is the nodes not solid whose every need is solid: what is ready to learn now. A node is solid when it
// is tested out (at once) or reviewed to the solid step. One node at a time is being learned, at the frontier level: every writer
// here keeps to that, and proving that node moves it on to the next ready one. Each node's review schedule is kept in its state.
// The store is asynchronous and has no transactions: a caller that writes from two places at once serialises the writes itself.
import { nodeOf, type Graph, type GraphNode } from './graph.js';
import { levelFromStep, type Level } from './levels.js';
import { isDue, knownSchedule, nextReview, startSchedule } from './schedule.js';
import type { GraphStore, NodeState } from './store.js';

/** What a node tested out was set by: the `how` of its state. */
export const TESTED_OUT = 'tested-out';

/** The frontier: the nodes not in `solid` whose every need is, in the graph's order. These, and only these, are ready to learn now. */
export function frontierOf<T extends GraphNode>(graph: Graph<T>, solid: ReadonlySet<string>): T[] {
  return graph.nodes.filter((n) => !solid.has(n.id) && n.needs.every((need) => solid.has(need)));
}

/** The levels of the graph's nodes the store has a state for. */
async function levelsIn(store: GraphStore, graph: Graph): Promise<Map<string, Level>> {
  const states = await store.entries();
  return new Map([...states].filter(([id]) => graph.byId.has(id)).map(([id, state]): [string, Level] => [id, state.level]));
}

/** The ids of the graph's solid nodes, in the graph's order. */
export async function solidOf(store: GraphStore, graph: Graph): Promise<Set<string>> {
  const levels = await levelsIn(store, graph);
  return new Set(graph.nodes.filter((n) => levels.get(n.id) === 'solid').map((n) => n.id));
}

/** The frontier in the store: the nodes not solid whose every need is solid, in the graph's order. */
export async function frontier<T extends GraphNode>(store: GraphStore, graph: Graph<T>): Promise<T[]> {
  return frontierOf(graph, await solidOf(store, graph));
}

/** The nodes being learned now: at the frontier level, in the graph's order. One at most, when only this module's writers write levels. */
export async function learning<T extends GraphNode>(store: GraphStore, graph: Graph<T>): Promise<T[]> {
  const levels = await levelsIn(store, graph);
  return graph.nodes.filter((n) => levels.get(n.id) === 'frontier');
}

/** The nodes whose review falls due by `now`, in the graph's order; a node with no schedule is never due. */
export async function dueOf<T extends GraphNode>(store: GraphStore, graph: Graph<T>, now: number = Date.now()): Promise<T[]> {
  const states = await store.entries();
  return graph.nodes.filter((n) => {
    const review = states.get(n.id)?.review;
    return review !== undefined && isDue(review, now);
  });
}

const idsOf = (nodes: readonly GraphNode[]): string[] => nodes.map((n) => n.id);

/** Puts the node at the frontier, how `how`, starting its schedule unless it has one. */
async function makeFrontier(store: GraphStore, id: string, how: string, now: number): Promise<void> {
  const review = (await store.get(id))?.review ?? startSchedule(now);
  await store.put(id, { level: 'frontier', since: now, how, review });
}

/** Puts the node back to not yet, how `how`, keeping its schedule so it comes back quickly; a node not yet already is left as it was. */
async function putBack(store: GraphStore, id: string, how: string, now: number): Promise<void> {
  const state = await store.get(id);
  if (state?.level === 'notYet') return;
  await store.put(id, keepReview({ level: 'notYet', since: now, how }, state));
}

const keepReview = (next: NodeState, before: NodeState | undefined): NodeState => (before?.review ? { ...next, review: before.review } : next);

/**
 * Proving the frontier moves it on: when `before` (the nodes being learned when the write began) held a node that is solid now and
 * no node is being learned, the first node in the graph's order that is not yet and whose needs are all solid becomes the frontier,
 * how 'next', on the schedule (keeping a schedule it had). A node with no state is not yet.
 */
async function advance(store: GraphStore, graph: Graph, before: readonly string[], now: number): Promise<void> {
  if (before.length === 0) return;
  const levels = await levelsIn(store, graph);
  if ([...levels.values()].includes('frontier') || !before.some((id) => levels.get(id) === 'solid')) return;
  const solid = new Set([...levels].filter(([, level]) => level === 'solid').map(([id]) => id));
  const next = frontierOf(graph, solid).find((n) => (levels.get(n.id) ?? 'notYet') === 'notYet');
  if (next) await makeFrontier(store, next.id, 'next', now);
}

/**
 * Tests a node out: solid at once, how 'tested-out', on the schedule at the 30-day step (keeping the lapses and rights of a schedule
 * it had). When it was the node being learned, the frontier moves on. Throws, writing nothing, on a node the graph does not have.
 */
export async function testOut(store: GraphStore, graph: Graph, id: string, now: number = Date.now()): Promise<void> {
  nodeOf(graph, id);
  const before = idsOf(await learning(store, graph));
  const review = knownSchedule(now, (await store.get(id))?.review);
  await store.put(id, { level: 'solid', since: now, how: TESTED_OUT, review });
  await advance(store, graph, before, now);
}

/** What `teach` was told to do when another node is being learned: put the other back to not yet and teach this one, or keep the other. */
export type FrontierChoice = 'switch' | 'keep';

/** What `teach` did: 'taught'; 'busy' (`other` is being learned and no choice was given: nothing was written); 'kept' (the choice was to keep `other`: nothing was written). */
export type TeachResult = { status: 'taught' } | { status: 'busy'; other: string } | { status: 'kept'; other: string };

/**
 * Starts the learner on a node: at the frontier, how 'taught', on the schedule at step 0, due after the first gap (keeping the lapses
 * and rights of a schedule it had). When another node is being learned it writes nothing and answers 'busy' until `choice` is given:
 * 'switch' puts the other back to not yet (its schedule kept) and teaches this one; 'keep' leaves everything as it was. Teaching the
 * node being learned is no second one. Throws, writing nothing, on a node the graph does not have.
 */
export async function teach(store: GraphStore, graph: Graph, id: string, now: number = Date.now(), choice?: FrontierChoice): Promise<TeachResult> {
  nodeOf(graph, id);
  const other = idsOf(await learning(store, graph)).find((n) => n !== id);
  if (other !== undefined && choice !== 'switch') return { status: choice === 'keep' ? 'kept' : 'busy', other };
  if (other !== undefined) await putBack(store, other, 'taught', now);
  const there = (await store.get(id))?.review;
  const review = { ...startSchedule(now), lapses: there?.lapses ?? 0, rights: there?.rights ?? 0 };
  await store.put(id, { level: 'frontier', since: now, how: 'taught', review });
  return { status: 'taught' };
}

/**
 * Records one review answer at `now` (nextReview) and moves the node's level from its new step: a right that reaches the solid step
 * makes it solid; a wrong that drops it below makes a solid node the frontier; a node not yet, or with no state, becomes the frontier.
 * A right never lowers a solid node (one made solid by hand keeps its level), and a level that does not change keeps its since and
 * how. Never a second frontier: when another node is being learned, the answer is kept on the schedule and the level stays where it
 * was. Proving the node being learned moves the frontier on. Returns the level after the answer. Throws, writing nothing, on a node
 * the graph does not have.
 */
export async function review(store: GraphStore, graph: Graph, id: string, right: boolean, now: number = Date.now()): Promise<Level> {
  nodeOf(graph, id);
  const before = idsOf(await learning(store, graph));
  const state = await store.get(id);
  const schedule = nextReview(state?.review, right, now);
  const was = state?.level;
  const after: Level = right && was === 'solid' ? 'solid' : levelFromStep(schedule.step);
  const kept = was ?? 'notYet';
  const second = after === 'frontier' && was !== 'frontier' && before.some((other) => other !== id);
  if (second || after === was) {
    await store.put(id, { ...(state ?? { level: kept, since: now, how: 'review' }), review: schedule });
    return second ? kept : after;
  }
  await store.put(id, { level: after, since: now, how: 'review', review: schedule });
  await advance(store, graph, before, now);
  return after;
}

/**
 * Writes one placement result: a node passed is tested out (solid, how 'tested-out', the 30-day step); a node not passed is unproved,
 * and of it and the node being learned the first in the graph's order is the frontier (how 'placement', on the schedule) and the
 * other is not yet (how 'placement', its schedule kept). A pass never moves the frontier on: the placement settles it. Throws,
 * writing nothing, on a node the graph does not have.
 */
export async function place(store: GraphStore, graph: Graph, id: string, passed: boolean, now: number = Date.now()): Promise<void> {
  nodeOf(graph, id);
  const state = await store.get(id);
  if (passed) {
    await store.put(id, { level: 'solid', since: now, how: TESTED_OUT, review: knownSchedule(now, state?.review) });
    return;
  }
  const there = idsOf(await learning(store, graph)).filter((n) => n !== id);
  await store.put(id, keepReview({ level: 'notYet', since: now, how: 'placement' }, state));
  const unproved = new Set([...there, id]);
  const [first, ...rest] = graph.nodes.filter((n) => unproved.has(n.id)).map((n) => n.id);
  if (first === undefined) return;
  if (!there.includes(first)) await makeFrontier(store, first, 'placement', now);
  for (const other of rest) await putBack(store, other, 'placement', now);
}
