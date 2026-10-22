// The drill plan: which nodes a sitting drills and by which items. A sitting takes the nodes at the frontier (the one being learned first, then the
// others ready to learn) and the reviews that are due (the longest overdue first), in a stated mix, each node once; it asks an injected item maker for
// items of each node, and every item must be in a form the app has registered. Lampas has no such rule (it drills one idea at a time, from the
// idea's own screen), so the mix is the kit's own. Nothing here knows a subject: the maker is the app's.
import { frontier, learning, type Graph, type GraphNode, type GraphStore } from 'learn-kit/graph';
import { checkItems, type DrillItem, type Forms, type MadeItem } from './forms.js';

/** The shares of a sitting's nodes that come from the frontier and from the reviews that are due; only their proportion matters. */
export interface DrillMix {
  frontier: number;
  due: number;
}

/** Half the nodes from the frontier, half from the reviews due. */
export const DEFAULT_MIX: DrillMix = Object.freeze({ frontier: 1, due: 1 });
/** Nodes in a sitting. */
export const DEFAULT_SIZE = 6;
/** Items asked of each node. */
export const DEFAULT_ITEMS_PER_NODE = 2;

/** What an item maker is told: how many items it is to make, and a seed so that the same seed gives the same items. */
export interface ItemAsk {
  count: number;
  seed: number;
}

/** The app's item maker: items for a node (about the node, in some registered form). It may be asynchronous. */
export type ItemMaker<P = unknown> = (node: GraphNode, ask: ItemAsk) => MadeItem<P>[] | Promise<MadeItem<P>[]>;

/** Why a node is in the sitting: it is at the frontier, or its review is due. */
export type PlanRole = 'frontier' | 'due';

export interface PlanEntry<P = unknown> {
  nodeId: string;
  role: PlanRole;
  items: DrillItem<P>[];
}

export interface DrillPlan<P = unknown> {
  /** the nodes of the sitting, the frontier and the reviews alternating, in the stated proportion */
  entries: PlanEntry<P>[];
  /** every item, entry by entry */
  items: DrillItem<P>[];
}

export interface PlanOptions<P> {
  graph: Graph;
  store: GraphStore;
  forms: Forms;
  make: ItemMaker<P>;
  /** nodes in the sitting (DEFAULT_SIZE) */
  size?: number;
  mix?: DrillMix;
  /** items asked of each node (DEFAULT_ITEMS_PER_NODE) */
  itemsPerNode?: number;
  /** the items' seed */
  seed?: number;
  /** ms since the epoch; the reviews due by then are taken (now) */
  now?: number;
}

const wholeNumber = (n: number): boolean => Number.isInteger(n) && n > 0;

/**
 * The plan for a sitting. Of `size` nodes, the share `mix.frontier` of the frontier's and `mix.due` of the due reviews' (rounded; a kind that runs short is
 * filled from the other, unless the other's share is 0), each node once, a node both at the frontier and due counted as frontier. A plan is shorter than
 * `size` when both kinds run short. Throws on a mix that is negative or empty, a size or itemsPerNode that is not a positive whole number, and, as a
 * DrillFormError, on an item in a form the registry does not hold.
 */
export async function planDrill<P>(options: PlanOptions<P>): Promise<DrillPlan<P>> {
  const { graph, store, forms, make } = options;
  const size = options.size ?? DEFAULT_SIZE;
  const mix = options.mix ?? DEFAULT_MIX;
  const per = options.itemsPerNode ?? DEFAULT_ITEMS_PER_NODE;
  const now = options.now ?? Date.now();
  if (!wholeNumber(size)) throw new Error(`The size of a drill plan is a positive whole number, not ${size}`);
  if (!wholeNumber(per)) throw new Error(`itemsPerNode is a positive whole number, not ${per}`);
  if (!(mix.frontier >= 0 && mix.due >= 0 && mix.frontier + mix.due > 0 && Number.isFinite(mix.frontier + mix.due))) {
    throw new Error(`A drill mix has a share of each kind that is not negative, and one more than 0; not ${JSON.stringify(mix)}`);
  }

  const learningNow = (await learning(store, graph)).map((n) => n.id);
  const ready = (await frontier(store, graph)).map((n) => n.id);
  const atFrontier = [...new Set([...learningNow, ...ready])];
  const states = await store.entries();
  const due = graph.nodes
    .flatMap((n) => {
      const review = states.get(n.id)?.review;
      return review !== undefined && review.due <= now && !atFrontier.includes(n.id) ? [{ id: n.id, due: review.due }] : [];
    })
    .sort((a, b) => a.due - b.due) // the longest overdue first; the graph's order within a tie
    .map((d) => d.id);

  const want = Math.round((size * mix.frontier) / (mix.frontier + mix.due));
  let nf = mix.frontier > 0 ? Math.min(atFrontier.length, want) : 0;
  const nd = mix.due > 0 ? Math.min(due.length, size - nf) : 0;
  if (mix.frontier > 0) nf = Math.min(atFrontier.length, size - nd);
  const chosen: { id: string; role: PlanRole }[] = [];
  const fs = atFrontier.slice(0, nf);
  const ds = due.slice(0, nd);
  for (let i = 0; i < Math.max(fs.length, ds.length); i += 1) {
    if (i < fs.length) chosen.push({ id: fs[i], role: 'frontier' });
    if (i < ds.length) chosen.push({ id: ds[i], role: 'due' });
  }

  const entries: PlanEntry<P>[] = [];
  for (const [index, { id, role }] of chosen.entries()) {
    const node = graph.byId.get(id)!;
    const made = await make(node, { count: per, seed: ((options.seed ?? 0) + index * 7919) >>> 0 });
    checkItems(forms, made);
    entries.push({ nodeId: id, role, items: made.map((item): DrillItem<P> => ({ ...item, nodeId: id })) });
  }
  return { entries, items: entries.flatMap((e) => e.items) };
}
