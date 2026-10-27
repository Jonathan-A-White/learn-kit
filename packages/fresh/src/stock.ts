// The ask-ahead stock: fresh items kept for each idea, so the next question never waits for a mill. The stock serves the oldest kept item once, and
// tops itself up in the background when an idea's stock runs low (on open, on serve, on a right answer after a miss). The app's `ask` makes the
// items (its mill call, its check, its shape) and resolves to none when it cannot ask; the stock never calls a mill, checks an answer or knows what
// an item looks like. Nothing here is waited on: the triggers return at once, and one ask is in flight at a time, for the whole stock.
import { asked } from './ledger.js';
import type { FreshStore, StockStore } from './store.js';

/** Items kept per idea at most; a top-up asks for the room that is left. PROVISIONAL. */
export const STOCK_CAP = 6;
/** An idea with fewer kept items than this is topped up in the background. PROVISIONAL. */
export const STOCK_LOW_WATER = 2;

/** What the app's ask is told: how many items to make at most, and the question keys it is not to make again. */
export interface AskRequest {
  count: number;
  avoid: string[];
}

export interface StockOptions<T> {
  /** The app's ask. It resolves to the items it made and checked, or to none when it cannot ask (offline, no key, no licence); a rejection is a failed ask. */
  ask: (idea: string, request: AskRequest) => Promise<T[]>;
  /** The question key of an item: what the ledger and `avoid` hold. */
  keyOf: (item: T) => string;
  /** Under this many kept items an idea is topped up (STOCK_LOW_WATER). */
  lowWater?: number;
  /** Most items kept per idea (STOCK_CAP). */
  cap?: number;
  store: StockStore<T>;
  /** The ledger of questions asked: a key in it is never kept or served, and goes to the ask with the keys to avoid. */
  fresh?: FreshStore;
}

export interface Stock<T> {
  /** The oldest kept item of the idea, dropped from the stock so it is served once; undefined when none. Tops up when that leaves the stock low. */
  take(idea: string): Promise<T | undefined>;
  /** How many items are kept for the idea. */
  count(idea: string): Promise<number>;
  /**
   * Asks for the room that is left (cap minus kept) and keeps what comes back, up to the newest cap: an item whose key is in `avoid`, in the
   * ledger, kept already or repeated is dropped. Resolves to how many were kept, and never rejects: a failed ask leaves the stock as it was.
   * While an ask is in flight a call returns that ask's promise.
   */
  topUp(idea: string, avoid?: readonly string[]): Promise<number>;
  /** Whether an ask is running, for the idea or (given none) for any. */
  inFlight(idea?: string): boolean;
  /** A drill, a Review round or Prove it opens on the idea: tops up when its stock is low. Never awaited. */
  opened(idea: string, avoid?: readonly string[]): void;
  /** An item of the idea was served (take calls this): tops up when its stock is low. Never awaited. */
  served(idea: string, avoid?: readonly string[]): void;
  /** A right answer on a seen question after a miss (the 'to-confirm' verdict): tops up even when the stock is not low. Never awaited. */
  rightAfterMiss(idea: string, avoid?: readonly string[]): void;
  /** Resolves when no trigger is still deciding and no ask is in flight. For tests. */
  settle(): Promise<void>;
}

const unique = (keys: readonly string[]): string[] => [...new Set(keys)];

/** An ask-ahead stock over an injected store. The state is the stock's own: two stocks never share an ask. */
export function createStock<T>(options: StockOptions<T>): Stock<T> {
  const { ask, keyOf, store, fresh } = options;
  const lowWater = options.lowWater ?? STOCK_LOW_WATER;
  const cap = options.cap ?? STOCK_CAP;

  // the store is read and written in turn, so a take and a merge never overwrite each other; the ask itself is outside it
  let chain: Promise<unknown> = Promise.resolve();
  const exclusive = <R>(work: () => Promise<R>): Promise<R> => {
    const run = chain.then(work);
    chain = run.catch(() => undefined);
    return run;
  };
  let running: { idea: string; promise: Promise<number> } | undefined;
  const deciding = new Set<Promise<void>>();

  const ledgerOf = async (idea: string): Promise<readonly string[]> => (fresh ? asked(fresh, idea) : []);

  const askAhead = async (idea: string, avoid: readonly string[]): Promise<number> => {
    try {
      const room = await exclusive(async () => {
        const kept = await store.get(idea);
        if (kept.length >= cap) return undefined;
        return { need: cap - kept.length, avoid: unique([...avoid, ...(await ledgerOf(idea)), ...kept.map(keyOf)]) };
      });
      if (!room) return 0;
      const made = await ask(idea, { count: room.need, avoid: room.avoid });
      return await exclusive(async () => {
        const kept = await store.get(idea);
        const skip = new Set([...room.avoid, ...(await ledgerOf(idea)), ...kept.map(keyOf)]);
        const added: T[] = [];
        for (const item of made) {
          const key = keyOf(item);
          if (skip.has(key)) continue;
          skip.add(key);
          added.push(item);
        }
        if (added.length === 0) return 0;
        const next = [...kept, ...added].slice(-cap);
        await store.put(idea, next);
        return added.filter((item) => next.includes(item)).length;
      });
    } catch {
      return 0;
    }
  };

  const topUp = (idea: string, avoid: readonly string[] = []): Promise<number> => {
    if (running) return running.promise;
    // set before anything is awaited, so a second call in the same moment finds this ask
    const promise = askAhead(idea, avoid).finally(() => {
      running = undefined;
    });
    running = { idea, promise };
    return promise;
  };

  const count = async (idea: string): Promise<number> => (await exclusive(() => store.get(idea))).length;

  const decide = (idea: string, avoid: readonly string[], always: boolean): void => {
    const decision: Promise<void> = (async () => {
      try {
        if (always || (await count(idea)) < lowWater) void topUp(idea, avoid);
      } catch {
        // a store that cannot be read asks nothing
      }
    })().finally(() => deciding.delete(decision));
    deciding.add(decision);
  };

  const served = (idea: string, avoid: readonly string[] = []): void => decide(idea, avoid, false);

  return {
    async take(idea) {
      const first = await exclusive(async () => {
        const kept = await store.get(idea);
        const seen = new Set(await ledgerOf(idea));
        const [head, ...rest] = kept.filter((item) => !seen.has(keyOf(item)));
        if (rest.length !== kept.length) await store.put(idea, rest);
        return head;
      });
      served(idea);
      return first;
    },
    count,
    topUp,
    inFlight: (idea) => running !== undefined && (idea === undefined || running.idea === idea),
    opened: (idea, avoid = []) => decide(idea, avoid, false),
    served,
    rightAfterMiss: (idea, avoid = []) => decide(idea, avoid, true),
    async settle() {
      while (deciding.size > 0 || running) {
        await Promise.all([...deciding]);
        await running?.promise;
      }
    },
  };
}
