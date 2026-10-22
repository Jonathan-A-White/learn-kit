// The placement: a bounded test that finds where a learner is on a graph and marks what he passes tested out. Pure (the app asks the questions and
// writes the result), over any graph, with no subject. Carved from Lampas's placement.ts, which walks the ideas of one approach in order, two
// questions an idea; the kit keeps its rules of answering and stopping and finds the place by bisecting over the graph's levels instead:
//   Two answers a node (ANSWERS_PER_NODE): both right = solid (passed), one right = frontier, none = not yet. Only a solid node is passed.
//   BISECT: over the graph's levels (a node's own level, or its depth when it has none), ask one node of the middle level, the one standing on the
//     most. Passed: that level and all below it are looked on as passed, and the nodes it stands on are marked passed (implied) without a question;
//     not passed: the search goes below it. A level whose nodes are all passed already costs no question. This finds the CEILING, the highest level
//     passed, in at most maxProbes(levels) = ceil(log2(levels + 1)) probes.
//   CONFIRM: every node below the ceiling not yet passed is asked, in the graph's order, but not one standing on a node that was missed (it is left
//     untested). A gap below the ceiling is found here, and it, not the level above, is where the learner starts.
//   It stops when nothing is left to ask ('finished'), or at QUESTION_LIMIT questions in a sitting ('paused': the state is plain data, kept so the
//   learner goes on another day with resumePlacement).
// What he passes is written tested out (applyPlacement) through the graph's `place`, so the node at the frontier is the first one he has not passed.
import { below, depthOf, frontier, learning, order, place, setLevel, solidOf, type Graph, type GraphNode, type GraphStore, type Level } from 'learn-kit/graph';
import { checkItems, type Forms, type MadeItem } from './forms.js';
import type { ItemMaker } from './drillPlan.js';

/** Questions in one sitting. */
export const QUESTION_LIMIT = 20;
/** Questions on one node. */
export const ANSWERS_PER_NODE = 2;

export interface Asked {
  nodeId: string;
  right: boolean;
}

/** A node the placement asked, and how it came out. */
export interface Placed {
  nodeId: string;
  level: Level;
}

export type PlacementDone = 'finished' | 'paused';

/** The placement's state: plain data (it survives JSON), and it holds no graph: every function takes the graph. */
export interface PlacementState {
  /** the graph's distinct levels, easy first */
  ladder: number[];
  /** the bisection: the levels below index `lo` are passed, those from index `hi` up are not; the search is over when they meet */
  lo: number;
  hi: number;
  /** the ids that were solid when the placement began: never asked */
  known: string[];
  /** every node asked and fully answered, in order */
  placed: Placed[];
  /** the ids marked passed because a passed node stands on them, in the order found */
  implied: string[];
  /** every answer, in order */
  asked: Asked[];
  /** the node being asked, even while paused; null once nothing is left */
  current: string | null;
  /** 'finished' when nothing is left to ask, 'paused' at the question limit, null while it goes on */
  done: PlacementDone | null;
  questionsLeft: number;
  limit: number;
  answersPerNode: number;
  /** the questions' seed; the n-th answer's question is questionSeed(state) */
  seed: number;
}

export interface PlacementOptions {
  /** questions in a sitting (QUESTION_LIMIT) */
  limit?: number;
  /** questions on a node (ANSWERS_PER_NODE) */
  answersPerNode?: number;
  seed?: number;
}

/** The most probes the bisection asks over this many levels: ceil(log2(levels + 1)). */
export const maxProbes = (levels: number): number => (levels <= 0 ? 0 : Math.ceil(Math.log2(levels + 1)));

/** The level a node's answers give: all of them right is solid, some right the frontier, none not yet. */
export const levelOfAnswers = (rights: number, answers: number = ANSWERS_PER_NODE): Level => (rights >= answers ? 'solid' : rights > 0 ? 'frontier' : 'notYet');

const levelOfNode = (graph: Graph, node: GraphNode): number => node.level ?? depthOf(graph, node.id);
const wholeNumber = (n: number): boolean => Number.isInteger(n) && n > 0;

const passedOf = (state: PlacementState): Set<string> =>
  new Set([...state.known, ...state.placed.filter((p) => p.level === 'solid').map((p) => p.nodeId), ...state.implied]);

/**
 * Looks for the next node to ask: bisects past the levels with nothing to ask, then confirms below the ceiling. Returns the state with its search
 * moved on and `current` set, or finished when nothing is left.
 */
function advance(graph: Graph, state: PlacementState): PlacementState {
  const passed = passedOf(state);
  const placedIds = new Set(state.placed.map((p) => p.nodeId));
  let { lo } = state;
  while (lo < state.hi) {
    const level = state.ladder[(lo + state.hi) >> 1];
    const unpassed = graph.nodes.filter((n) => levelOfNode(graph, n) === level && !passed.has(n.id) && !placedIds.has(n.id));
    if (unpassed.length > 0) {
      // the node standing on the most; the one listed first of those
      const probe = unpassed.reduce((best, n) => (below(graph, n.id).length > below(graph, best.id).length ? n : best));
      return { ...state, lo, current: probe.id };
    }
    lo = ((lo + state.hi) >> 1) + 1; // every node of the level is passed already
  }
  const ceiling = state.ladder[lo] ?? Infinity;
  const next = order(graph).find((id) => {
    const node = graph.byId.get(id)!;
    return levelOfNode(graph, node) < ceiling && !passed.has(id) && !placedIds.has(id) && node.needs.every((need) => passed.has(need));
  });
  return next === undefined ? { ...state, lo, current: null, done: 'finished' } : { ...state, lo, current: next };
}

/**
 * Sets up a placement. `known` is the ids already solid (they are never asked); throws on an id the graph does not have, and on a limit or
 * answersPerNode that is not a positive whole number. A graph with nothing left to ask is finished at once.
 */
export function startPlacement(graph: Graph, known: Iterable<string>, options: PlacementOptions = {}): PlacementState {
  const limit = options.limit ?? QUESTION_LIMIT;
  const answersPerNode = options.answersPerNode ?? ANSWERS_PER_NODE;
  if (!wholeNumber(limit)) throw new Error(`The limit of a placement is a positive whole number, not ${limit}`);
  if (!wholeNumber(answersPerNode)) throw new Error(`answersPerNode is a positive whole number, not ${answersPerNode}`);
  const solid = [...new Set(known)];
  for (const id of solid) if (!graph.byId.has(id)) throw new Error(`Unknown node: ${JSON.stringify(id)}`);
  const ladder = [...new Set(graph.nodes.map((n) => levelOfNode(graph, n)))].sort((a, b) => a - b);
  return advance(graph, {
    ladder,
    lo: 0,
    hi: ladder.length,
    known: solid,
    placed: [],
    implied: [],
    asked: [],
    current: null,
    done: null,
    questionsLeft: limit,
    limit,
    answersPerNode,
    seed: (options.seed ?? 0) >>> 0,
  });
}

/** Sets up a placement that does not ask what the store has solid already. */
export async function startPlacementFromStore(graph: Graph, store: GraphStore, options: PlacementOptions = {}): Promise<PlacementState> {
  return startPlacement(graph, await solidOf(store, graph), options);
}

/** The node being asked, or null once the placement is over or paused. */
export const currentNode = (state: PlacementState): string | null => (state.done === null ? state.current : null);

/** The seed of the question being asked: the same state gives the same question, and each question differs. */
export const questionSeed = (state: PlacementState): number => (state.seed + state.asked.length * 7919) >>> 0;

/**
 * One answer to the question on the node being asked. When it was the node's last question, its level is set and the search moves on: a passed probe
 * marks the nodes it stands on passed and raises the floor, a probe not passed lowers the ceiling. A placement that is over or paused does not change.
 */
export function answerPlacement(graph: Graph, state: PlacementState, right: boolean): PlacementState {
  const id = currentNode(state);
  if (id === null) return state;
  const asked = [...state.asked, { nodeId: id, right }];
  const questionsLeft = state.questionsLeft - 1;
  const mine = asked.filter((a) => a.nodeId === id);
  if (mine.length < state.answersPerNode) return questionsLeft === 0 ? { ...state, asked, questionsLeft, done: 'paused' } : { ...state, asked, questionsLeft };

  const level = levelOfAnswers(mine.filter((a) => a.right).length, state.answersPerNode);
  let { lo, hi, implied } = state;
  if (lo < hi) {
    const mid = (lo + hi) >> 1; // the probe's level: (lo, hi) have not moved since it was chosen
    if (level === 'solid') {
      lo = mid + 1;
      const passed = passedOf(state);
      implied = [...implied, ...below(graph, id).map((n) => n.id).filter((n) => !passed.has(n))];
    } else hi = mid;
  }
  const next = advance(graph, { ...state, asked, questionsLeft, lo, hi, implied, placed: [...state.placed, { nodeId: id, level }] });
  return questionsLeft === 0 && next.done === null ? { ...next, done: 'paused' } : next;
}

/** A paused placement, ready for another sitting: the next question is the one he was about to be asked. */
export function resumePlacement(state: PlacementState): PlacementState {
  return state.done === 'paused' ? { ...state, done: null, questionsLeft: state.limit } : state;
}

export interface PlacementResult {
  /** the nodes passed, in the graph's order: asked and solid, or implied (not the ones that were solid already) */
  testedOut: string[];
  /** of those, the ones marked passed without a question because a passed node stands on them */
  implied: string[];
  /** asked, one answer right (several, when more are asked) */
  frontier: string[];
  /** asked, none right */
  notYet: string[];
  /** not solid at the start and not asked: above the ceiling, or standing on a node that was missed */
  untested: string[];
  /** the highest level passed, or null when none was */
  ceiling: number | null;
}

/** Where the placement stands. Useful while it goes on, and when it is paused. */
export function placementResult(graph: Graph, state: PlacementState): PlacementResult {
  const passed = passedOf(state);
  const known = new Set(state.known);
  const placed = new Map(state.placed.map((p) => [p.nodeId, p.level]));
  const inGraphOrder = (keep: (id: string) => boolean): string[] => graph.nodes.map((n) => n.id).filter(keep);
  return {
    testedOut: inGraphOrder((id) => passed.has(id) && !known.has(id)),
    implied: inGraphOrder((id) => state.implied.includes(id)),
    frontier: inGraphOrder((id) => placed.get(id) === 'frontier'),
    notYet: inGraphOrder((id) => placed.get(id) === 'notYet'),
    untested: inGraphOrder((id) => !passed.has(id) && !placed.has(id)),
    ceiling: state.lo > 0 ? state.ladder[state.lo - 1] : null,
  };
}

export interface PlacementSummary {
  solid: number;
  frontier: number;
  notYet: number;
  untested: number;
  total: number;
}

/** Where he is, counted by level: the nodes solid (at the start or passed), at the frontier, not yet, and not tested. */
export function summarize(graph: Graph, state: PlacementState): PlacementSummary {
  const result = placementResult(graph, state);
  return {
    solid: state.known.length + result.testedOut.length,
    frontier: result.frontier.length,
    notYet: result.notYet.length,
    untested: result.untested.length,
    total: graph.nodes.length,
  };
}

/**
 * Writes what the placement found, so far (a paused placement writes what it has): every node passed is tested out, solid at once (a node solid
 * already is left as it is); every node missed is not yet, and of the nodes missed that are ready to learn (every need solid) the first in the graph's
 * order is the frontier, how 'placement'. When none is, the lowest ready node is. A node not asked is not written.
 */
export async function applyPlacement(store: GraphStore, graph: Graph, state: PlacementState, now: number = Date.now()): Promise<void> {
  const result = placementResult(graph, state);
  for (const id of result.testedOut) await place(store, graph, id, true, now);
  const solid = new Set([...state.known, ...result.testedOut]);
  const missed = new Set([...result.frontier, ...result.notYet]);
  for (const node of graph.nodes.filter((n) => missed.has(n.id))) {
    if (node.needs.every((need) => solid.has(need))) await place(store, graph, node.id, false, now);
    else await setLevel(store, graph, node.id, 'notYet', 'placement', now);
  }
  if ((await learning(store, graph)).length > 0) return;
  const [lowest] = (await frontier(store, graph)).sort((a, b) => levelOfNode(graph, a) - levelOfNode(graph, b));
  if (lowest) await place(store, graph, lowest.id, false, now);
}

/**
 * The item for the node being asked, from the app's item maker: null once the placement is over or paused. The same state gives the same item, and a
 * second question on a node is not the one before it (`before`): the maker is asked again with another seed, up to five times. Throws a DrillFormError
 * for an item in a form the registry does not hold.
 */
export async function placementItem<P>(graph: Graph, state: PlacementState, make: ItemMaker<P>, forms: Forms, before?: MadeItem): Promise<MadeItem<P> | null> {
  const id = currentNode(state);
  if (id === null) return null;
  const node = graph.byId.get(id)!;
  let item: MadeItem<P> | undefined;
  for (let tries = 0; tries <= 5; tries += 1) {
    [item] = await make(node, { count: 1, seed: (questionSeed(state) + tries * 104729) >>> 0 });
    if (item === undefined) throw new Error(`The item maker made no item for ${JSON.stringify(id)}`);
    checkItems(forms, [item]);
    if (before?.key !== item.key) break;
  }
  return item ?? null;
}
