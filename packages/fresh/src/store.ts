// The store: where the ledger of asked keys and the set of ideas to confirm are kept, outside the rules. The functions take a store and keep no
// state of their own, so an app injects its own (a Dexie table, say) and a test uses MemoryFreshStore.

/** The store the ledger and the confirm rule read and write through. Asynchronous, so a database can stand behind it. */
export interface FreshStore {
  /** The keys asked on the idea, oldest first; empty when none. */
  getAsked(idea: string): Promise<readonly string[]>;
  /** Puts the idea's keys, oldest first, in place of any it had. */
  putAsked(idea: string, keys: readonly string[]): Promise<void>;
  /** The ideas marked to confirm, in the order they were marked. */
  listToConfirm(): Promise<readonly string[]>;
  /** Marks the idea to confirm; one marked already stays so, once. */
  markToConfirm(idea: string): Promise<void>;
  /** Takes the mark off the idea; an idea not marked is left alone. */
  clearToConfirm(idea: string): Promise<void>;
}

/** What a MemoryFreshStore starts from. */
export interface MemoryFreshInitial {
  asked?: Iterable<readonly [string, readonly string[]]>;
  toConfirm?: Iterable<string>;
}

/** A store in memory. Each is its own: two never see each other. It keeps copies, so a list changed after it was put or got changes nothing stored. */
export class MemoryFreshStore implements FreshStore {
  private readonly keys = new Map<string, string[]>();
  private readonly marked = new Set<string>();

  constructor(initial: MemoryFreshInitial = {}) {
    for (const [idea, keys] of initial.asked ?? []) this.keys.set(idea, [...keys]);
    for (const idea of initial.toConfirm ?? []) this.marked.add(idea);
  }

  async getAsked(idea: string): Promise<readonly string[]> {
    return [...(this.keys.get(idea) ?? [])];
  }

  async putAsked(idea: string, keys: readonly string[]): Promise<void> {
    this.keys.set(idea, [...keys]);
  }

  async listToConfirm(): Promise<readonly string[]> {
    return [...this.marked];
  }

  async markToConfirm(idea: string): Promise<void> {
    this.marked.add(idea);
  }

  async clearToConfirm(idea: string): Promise<void> {
    this.marked.delete(idea);
  }
}

/** The store the ask-ahead stock keeps its items in: the fresh items of each idea, oldest first. Asynchronous, so a database can stand behind it. */
export interface StockStore<T> {
  /** The items kept for the idea, oldest first; empty when none. */
  get(idea: string): Promise<readonly T[]>;
  /** Puts the idea's items, oldest first, in place of any it had. */
  put(idea: string, items: readonly T[]): Promise<void>;
}

/** What a MemoryStockStore starts from. */
export interface MemoryStockInitial<T> {
  kept?: Iterable<readonly [string, readonly T[]]>;
}

/** A stock store in memory, for tests. Each is its own, and it keeps copies of the lists it is given and gives. */
export class MemoryStockStore<T> implements StockStore<T> {
  private readonly items = new Map<string, T[]>();

  constructor(initial: MemoryStockInitial<T> = {}) {
    for (const [idea, kept] of initial.kept ?? []) this.items.set(idea, [...kept]);
  }

  async get(idea: string): Promise<readonly T[]> {
    return [...(this.items.get(idea) ?? [])];
  }

  async put(idea: string, items: readonly T[]): Promise<void> {
    this.items.set(idea, [...items]);
  }
}
