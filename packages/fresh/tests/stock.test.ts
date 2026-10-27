// The ask-ahead stock (src/stock.ts): fresh items kept per idea, served oldest first and once, topped up in the background and never waited on.
import { describe, expect, it } from 'vitest';
import { MemoryFreshStore, MemoryStockStore, createStock, markAsked, type AskRequest } from '../src/index.js';

interface Q {
  key: string;
}
const q = (key: string): Q => ({ key });
const keyOf = (item: Q): string => item.key;

/** An ask the test settles by hand: each call is recorded and waits for `release`. */
function manual() {
  const calls: { idea: string; request: AskRequest }[] = [];
  const waiting: ((items: Q[] | Error) => void)[] = [];
  const ask = (idea: string, request: AskRequest): Promise<Q[]> => {
    calls.push({ idea, request });
    return new Promise<Q[]>((resolve, reject) => waiting.push((r) => (r instanceof Error ? reject(r) : resolve(r))));
  };
  return { ask, calls, release: (items: Q[] | Error) => waiting.shift()!(items) };
}

/** An ask that answers at once with the keys it is given, once per call. */
const answering = (...batches: string[][]) => {
  const calls: { idea: string; request: AskRequest }[] = [];
  const ask = async (idea: string, request: AskRequest): Promise<Q[]> => {
    calls.push({ idea, request });
    return (batches.shift() ?? []).map(q);
  };
  return { ask, calls };
};

describe('createStock: topUp and take', () => {
  it('keeps what the ask returns and serves the oldest first, each once', async () => {
    const { ask } = answering(['a', 'b', 'c']);
    const stock = createStock<Q>({ ask, keyOf, store: new MemoryStockStore() });
    expect(await stock.topUp('verbs')).toBe(3);
    expect(await stock.count('verbs')).toBe(3);
    expect(await stock.take('verbs')).toEqual(q('a'));
    expect(await stock.take('verbs')).toEqual(q('b'));
    expect(await stock.count('verbs')).toBe(1);
    expect(await stock.take('verbs')).toEqual(q('c'));
    expect(await stock.take('verbs')).toBeUndefined();
    await stock.settle();
  });

  it('asks for cap minus kept, with the keys to avoid, and keeps the newest up to cap', async () => {
    const { ask, calls } = answering(['a', 'b'], ['c', 'd', 'e', 'f']);
    const stock = createStock<Q>({ ask, keyOf, cap: 4, lowWater: 0, store: new MemoryStockStore() });
    await stock.topUp('verbs', ['seen1']);
    expect(calls[0]).toEqual({ idea: 'verbs', request: { count: 4, avoid: ['seen1'] } });
    await stock.topUp('verbs');
    expect(calls[1].request.count).toBe(2);
    expect(calls[1].request.avoid).toEqual(['a', 'b']);
    // the mill returned four where two were asked: the newest up to the cap are kept
    expect(await stock.count('verbs')).toBe(4);
    expect([await stock.take('verbs'), await stock.take('verbs'), await stock.take('verbs'), await stock.take('verbs')]).toEqual([q('c'), q('d'), q('e'), q('f')]);
  });

  it('defaults to a low-water mark of 2 and a cap of 6', async () => {
    const { ask, calls } = answering(['a']);
    const stock = createStock<Q>({ ask, keyOf, store: new MemoryStockStore() });
    await stock.topUp('verbs');
    expect(calls[0].request.count).toBe(6);
  });

  it('asks nothing when the stock is full', async () => {
    const { ask, calls } = answering(['a', 'b']);
    const stock = createStock<Q>({ ask, keyOf, cap: 2, store: new MemoryStockStore() });
    await stock.topUp('verbs');
    expect(await stock.topUp('verbs')).toBe(0);
    expect(calls).toHaveLength(1);
  });

  it('drops a returned item whose key is avoided, in the ledger, already kept or repeated', async () => {
    const fresh = new MemoryFreshStore({ asked: [['verbs', ['ledgered']]] });
    const { ask, calls } = answering(['a'], ['avoided', 'ledgered', 'a', 'b', 'b', 'c']);
    const stock = createStock<Q>({ ask, keyOf, fresh, store: new MemoryStockStore() });
    await stock.topUp('verbs');
    // the ledger's keys go to the ask with the avoided ones
    expect(calls[0].request.avoid).toEqual(['ledgered']);
    await stock.topUp('verbs', ['avoided']);
    expect(calls[1].request.avoid).toEqual(['avoided', 'ledgered', 'a']);
    expect(await stock.count('verbs')).toBe(3);
    expect([await stock.take('verbs'), await stock.take('verbs'), await stock.take('verbs')]).toEqual([q('a'), q('b'), q('c')]);
  });

  it('does not serve a kept item that has been asked since it was kept', async () => {
    const fresh = new MemoryFreshStore();
    const { ask } = answering(['a', 'b']);
    const stock = createStock<Q>({ ask, keyOf, fresh, store: new MemoryStockStore() });
    await stock.topUp('verbs');
    await markAsked(fresh, 'verbs', 'a');
    expect(await stock.take('verbs')).toEqual(q('b'));
    expect(await stock.count('verbs')).toBe(0);
  });

  it('keeps each idea apart', async () => {
    const { ask } = answering(['a'], ['x']);
    const stock = createStock<Q>({ ask, keyOf, store: new MemoryStockStore() });
    await stock.topUp('verbs');
    await stock.topUp('nouns');
    expect(await stock.take('nouns')).toEqual(q('x'));
    expect(await stock.count('verbs')).toBe(1);
  });
});

describe('createStock: one ask in flight', () => {
  it('shares one ask between two topUps, and says an ask is running', async () => {
    const m = manual();
    const stock = createStock<Q>({ ask: m.ask, keyOf, store: new MemoryStockStore() });
    expect(stock.inFlight('verbs')).toBe(false);
    const first = stock.topUp('verbs');
    const second = stock.topUp('verbs');
    expect(second).toBe(first);
    expect(stock.inFlight('verbs')).toBe(true);
    expect(stock.inFlight('nouns')).toBe(false);
    expect(stock.inFlight()).toBe(true);
    await new Promise((r) => setTimeout(r, 0));
    expect(m.calls).toHaveLength(1);
    m.release([q('a')]);
    expect(await first).toBe(1);
    expect(stock.inFlight('verbs')).toBe(false);
    expect(stock.inFlight()).toBe(false);
  });

  it('shares the one ask across ideas: a topUp of another idea while one runs returns the same promise', async () => {
    const m = manual();
    const stock = createStock<Q>({ ask: m.ask, keyOf, store: new MemoryStockStore() });
    const first = stock.topUp('verbs');
    expect(stock.topUp('nouns')).toBe(first);
    await new Promise((r) => setTimeout(r, 0));
    m.release([]);
    await first;
    expect(m.calls.map((c) => c.idea)).toEqual(['verbs']);
  });
});

describe('createStock: a failed or empty ask', () => {
  it('keeps the stock as it was when the ask throws, and does not retry', async () => {
    const { ask, calls } = answering(['a']);
    const stock = createStock<Q>({ ask, keyOf, cap: 3, lowWater: 0, store: new MemoryStockStore() });
    await stock.topUp('verbs');
    const failing = createStock<Q>({
      ask: async () => {
        calls.push({ idea: 'x', request: { count: 0, avoid: [] } });
        throw new Error('mill down');
      },
      keyOf,
      cap: 3,
      store: new MemoryStockStore({ kept: [['verbs', [q('a')]]] }),
    });
    expect(await failing.topUp('verbs')).toBe(0);
    await failing.settle();
    expect(await failing.count('verbs')).toBe(1);
    expect(calls.filter((c) => c.idea === 'x')).toHaveLength(1);
    expect(failing.inFlight('verbs')).toBe(false);
  });

  it('keeps the stock when the ask resolves to nothing, and stops', async () => {
    const { ask, calls } = answering(['a']);
    const stock = createStock<Q>({ ask, keyOf, store: new MemoryStockStore() });
    await stock.topUp('verbs');
    expect(await stock.topUp('verbs')).toBe(0); // the second ask resolves []
    expect(await stock.count('verbs')).toBe(1);
    stock.opened('verbs');
    await stock.settle();
    // one more ask from opened (the stock is low), and no loop of them
    expect(calls.length).toBe(3);
    await stock.settle();
    expect(calls.length).toBe(3);
  });
});

describe('createStock: the triggers', () => {
  it('opened asks when the stock is under the low-water mark, and not at or above it', async () => {
    const { ask, calls } = answering(['a'], ['b', 'c']);
    const stock = createStock<Q>({ ask, keyOf, lowWater: 2, cap: 6, store: new MemoryStockStore() });
    stock.opened('verbs');
    await stock.settle();
    expect(calls).toHaveLength(1); // none kept, under 2
    stock.opened('verbs');
    await stock.settle();
    expect(calls).toHaveLength(2); // one kept, under 2
    stock.opened('verbs');
    await stock.settle();
    expect(calls).toHaveLength(2); // three kept, at or above 2
  });

  it('opened at exactly the low-water mark asks nothing', async () => {
    const { ask, calls } = answering();
    const stock = createStock<Q>({ ask, keyOf, lowWater: 2, store: new MemoryStockStore({ kept: [['verbs', [q('a'), q('b')]]] }) });
    stock.opened('verbs');
    await stock.settle();
    expect(calls).toHaveLength(0);
  });

  it('take triggers served: serving the item that leaves the stock under the mark asks ahead', async () => {
    const { ask, calls } = answering(['c', 'd']);
    const stock = createStock<Q>({ ask, keyOf, lowWater: 2, store: new MemoryStockStore({ kept: [['verbs', [q('a'), q('b'), q('x')]]] }) });
    expect(await stock.take('verbs')).toEqual(q('a')); // two left: at the mark
    await stock.settle();
    expect(calls).toHaveLength(0);
    expect(await stock.take('verbs')).toEqual(q('b')); // one left: under it
    await stock.settle();
    expect(calls).toHaveLength(1);
    expect(calls[0].request.avoid).toEqual(['x']);
    expect(await stock.count('verbs')).toBe(3);
  });

  it('served is a method of its own, topping up under the mark', async () => {
    const { ask, calls } = answering(['a']);
    const stock = createStock<Q>({ ask, keyOf, store: new MemoryStockStore() });
    stock.served('verbs');
    await stock.settle();
    expect(calls).toHaveLength(1);
  });

  it('rightAfterMiss asks even when the stock is not low, and passes the keys to avoid', async () => {
    const { ask, calls } = answering(['f']);
    const stock = createStock<Q>({
      ask,
      keyOf,
      lowWater: 2,
      cap: 6,
      store: new MemoryStockStore({ kept: [['verbs', [q('a'), q('b'), q('c')]]] }),
    });
    stock.opened('verbs');
    await stock.settle();
    expect(calls).toHaveLength(0); // not low
    stock.rightAfterMiss('verbs', ['seen']);
    await stock.settle();
    expect(calls).toHaveLength(1);
    expect(calls[0].request).toEqual({ count: 3, avoid: ['seen', 'a', 'b', 'c'] });
  });
});

describe('createStock: nothing is awaited', () => {
  it('returns from take and the triggers before a pending ask settles', async () => {
    const m = manual();
    const stock = createStock<Q>({ ask: m.ask, keyOf, store: new MemoryStockStore({ kept: [['verbs', [q('a')]]] }) });
    expect(stock.opened('verbs')).toBeUndefined();
    expect(stock.rightAfterMiss('verbs')).toBeUndefined();
    expect(stock.served('verbs')).toBeUndefined();
    expect(await stock.take('verbs')).toEqual(q('a')); // the ask is still pending
    await new Promise((r) => setTimeout(r, 0));
    expect(m.calls).toHaveLength(1);
    expect(stock.inFlight('verbs')).toBe(true);
    expect(await stock.count('verbs')).toBe(0);
    m.release([q('b'), q('c')]);
    await stock.settle();
    expect(await stock.count('verbs')).toBe(2);
  });

  it('keeps an item taken while the ask was out, and the items the ask returns after it', async () => {
    const m = manual();
    const stock = createStock<Q>({ ask: m.ask, keyOf, cap: 3, lowWater: 0, store: new MemoryStockStore({ kept: [['verbs', [q('a'), q('b')]]] }) });
    const pending = stock.topUp('verbs');
    await new Promise((r) => setTimeout(r, 0));
    expect(await stock.take('verbs')).toEqual(q('a'));
    m.release([q('c'), q('d')]);
    await pending;
    expect([await stock.take('verbs'), await stock.take('verbs'), await stock.take('verbs')]).toEqual([q('b'), q('c'), q('d')]);
  });
});
