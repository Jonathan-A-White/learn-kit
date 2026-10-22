// The store: where each node stands for the learner, kept outside the graph. The graph functions take a store and keep no state of
// their own, so an app injects its own (a database table, say) and a test or a script uses memoryStore.
import type { Level } from './levels.js';

/** A node's state: its level, since when (ms) and what set it ('review', 'tested-out', 'sheet' ...). */
export interface NodeState {
  level: Level;
  since: number;
  how: string;
}

/** The store the graph functions read and write a node's state through. Asynchronous, so a database can stand behind it. */
export interface GraphStore {
  /** The node's state, or undefined when it has none. */
  get(id: string): Promise<NodeState | undefined>;
  /** Puts the node's state in place of any it had. */
  put(id: string, state: NodeState): Promise<void>;
  /** Takes away the node's state. */
  delete(id: string): Promise<void>;
  /** Every node's state, by id. */
  entries(): Promise<Map<string, NodeState>>;
}

/** A store in memory, starting from `initial`. Each store is its own: two never see each other. It keeps copies, so a state changed after it was put or got changes nothing stored. */
export function memoryStore(initial: Iterable<readonly [string, NodeState]> = []): GraphStore {
  const states = new Map<string, NodeState>();
  for (const [id, state] of initial) states.set(id, { ...state });
  return {
    get: async (id) => {
      const state = states.get(id);
      return state && { ...state };
    },
    put: async (id, state) => {
      states.set(id, { ...state });
    },
    delete: async (id) => {
      states.delete(id);
    },
    entries: async () => new Map([...states].map(([id, state]) => [id, { ...state }])),
  };
}
