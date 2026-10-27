// The drill plan (src/drillPlan.ts): which nodes a sitting drills, the frontier and the reviews that are due in a stated mix, and
// the items each is asked by, every item in a form the app has registered.
import { memoryStore, testOut, teach, review, type GraphStore } from 'learn-kit/graph';
import { describe, expect, it } from 'vitest';
import { DEFAULT_MIX, DrillFormError, planDrill, stockThenMaker, type ItemAsk, type ItemMaker } from '../src/index.js';
import { FORMS, LADDER } from './fixtures.js';

const NOW = Date.UTC(2026, 9, 12, 9, 0, 0);
const DAY = 24 * 60 * 60 * 1000;

/** a0..a2, b0..b2 solid and reviewed 40 days ago (due now); a3 and b3 are ready to learn */
async function seeded(): Promise<GraphStore> {
  const store = memoryStore();
  for (const id of ['a0', 'b0', 'a1', 'b1', 'a2', 'b2']) await testOut(store, LADDER, id, NOW - 40 * DAY);
  return store;
}

const maker: ItemMaker<string> = (node, ask) =>
  Array.from({ length: ask.count }, (_, i) => ({ key: `${node.id}#${i}`, form: ['tap', 'type'][i % 2], payload: `${node.id} ${ask.seed}` }));

const ids = (plan: { entries: { nodeId: string }[] }): string[] => plan.entries.map((e) => e.nodeId);

describe('planDrill', () => {
  it('takes the frontier and the due reviews in the stated mix, the frontier first, each node once', async () => {
    const plan = await planDrill({ graph: LADDER, store: await seeded(), forms: FORMS, make: maker, size: 4, mix: { frontier: 1, due: 1 }, now: NOW });
    expect(plan.entries.map((e) => [e.nodeId, e.role])).toEqual([
      ['a3', 'frontier'],
      ['a0', 'due'],
      ['b3', 'frontier'],
      ['b0', 'due'],
    ]);
  });

  it('follows the mix: three parts due to one part frontier', async () => {
    const plan = await planDrill({ graph: LADDER, store: await seeded(), forms: FORMS, make: maker, size: 4, mix: { frontier: 1, due: 3 }, now: NOW });
    expect(plan.entries.filter((e) => e.role === 'frontier')).toHaveLength(1);
    expect(plan.entries.filter((e) => e.role === 'due')).toHaveLength(3);
  });

  it('the default mix is half and half', () => {
    expect(DEFAULT_MIX).toEqual({ frontier: 1, due: 1 });
  });

  it('puts the node being learned first among the frontier, and the longest overdue first among the reviews', async () => {
    const store = await seeded();
    await teach(store, LADDER, 'b3', NOW);
    await review(store, LADDER, 'a2', true, NOW - 100 * DAY); // a2 is the one overdue the longest
    const plan = await planDrill({ graph: LADDER, store, forms: FORMS, make: maker, size: 4, mix: { frontier: 1, due: 1 }, now: NOW + 100 * DAY });
    const frontier = plan.entries.filter((e) => e.role === 'frontier').map((e) => e.nodeId);
    const due = plan.entries.filter((e) => e.role === 'due').map((e) => e.nodeId);
    expect(frontier[0]).toBe('b3');
    expect(due[0]).toBe('a2');
  });

  it('fills with the other kind when one runs short, and is shorter than the size when both do', async () => {
    const fresh = memoryStore(); // nothing due, the frontier is a0 and b0
    const noDue = await planDrill({ graph: LADDER, store: fresh, forms: FORMS, make: maker, size: 4, now: NOW });
    expect(ids(noDue)).toEqual(['a0', 'b0']);
    const store = await seeded();
    const onlyDue = await planDrill({ graph: LADDER, store, forms: FORMS, make: maker, size: 5, mix: { frontier: 0, due: 1 }, now: NOW });
    expect(onlyDue.entries.every((e) => e.role === 'due')).toBe(true);
    expect(ids(onlyDue)).toHaveLength(5);
    const empty = await planDrill({ graph: LADDER, store: memoryStore(), forms: FORMS, make: maker, size: 4, mix: { frontier: 0, due: 1 }, now: NOW });
    expect(empty.entries).toEqual([]);
  });

  it('counts a node that is both due and at the frontier once, as frontier', async () => {
    const store = await seeded();
    await teach(store, LADDER, 'a3', NOW - 5 * DAY); // at the frontier, scheduled one day out: due now
    const plan = await planDrill({ graph: LADDER, store, forms: FORMS, make: maker, size: 20, now: NOW });
    expect(ids(plan).filter((id) => id === 'a3')).toHaveLength(1);
    expect(plan.entries.find((e) => e.nodeId === 'a3')!.role).toBe('frontier');
  });

  it('asks the maker for itemsPerNode items of each node, with a seed, and stamps the node on each', async () => {
    const calls: string[] = [];
    const spy: ItemMaker<string> = (node, ask) => {
      calls.push(`${node.id}:${ask.count}`);
      return maker(node, ask);
    };
    const plan = await planDrill({ graph: LADDER, store: await seeded(), forms: FORMS, make: spy, size: 2, itemsPerNode: 3, seed: 9, now: NOW });
    expect(calls).toEqual(['a3:3', 'a0:3']);
    for (const entry of plan.entries) {
      expect(entry.items).toHaveLength(3);
      for (const item of entry.items) expect(item.nodeId).toBe(entry.nodeId);
    }
    expect(plan.items).toHaveLength(6);
  });

  it('accepts an asynchronous item maker', async () => {
    const plan = await planDrill({ graph: LADDER, store: await seeded(), forms: FORMS, make: async (node, ask) => maker(node, ask) as never, size: 2, now: NOW });
    expect(ids(plan)).toHaveLength(2);
  });

  it('refuses an item whose form id is not registered, naming it', async () => {
    const bad: ItemMaker<string> = (node) => [{ key: `${node.id}#0`, form: 'juggle', payload: '' }];
    await expect(planDrill({ graph: LADDER, store: await seeded(), forms: FORMS, make: bad, now: NOW })).rejects.toBeInstanceOf(DrillFormError);
    await expect(planDrill({ graph: LADDER, store: await seeded(), forms: FORMS, make: bad, now: NOW })).rejects.toThrow(/juggle/);
  });

  it('refuses a mix that is negative or empty, and a size that is not a whole number', async () => {
    const base = { graph: LADDER, store: memoryStore(), forms: FORMS, make: maker, now: NOW };
    await expect(planDrill({ ...base, mix: { frontier: -1, due: 1 } })).rejects.toThrow(/mix/);
    await expect(planDrill({ ...base, mix: { frontier: 0, due: 0 } })).rejects.toThrow(/mix/);
    await expect(planDrill({ ...base, size: 2.5 })).rejects.toThrow(/size/);
  });
});

describe('planDrill: the keys to avoid', () => {
  it('passes the ledger keys of each node to the maker as avoid, when it is given a store of what was asked', async () => {
    const seen: [string, ItemAsk][] = [];
    const make: ItemMaker<string> = (node, ask) => {
      seen.push([node.id, ask]);
      return maker(node, ask);
    };
    const fresh = { getAsked: async (idea: string): Promise<readonly string[]> => (idea === 'a3' ? ['k1', 'k2'] : []) };
    await planDrill({ graph: LADDER, store: await seeded(), forms: FORMS, make, size: 2, fresh, now: NOW });
    expect(seen.map(([id]) => id)).toEqual(['a3', 'a0']);
    expect(seen[0][1].avoid).toEqual(['k1', 'k2']);
    expect(seen[1][1].avoid).toEqual([]);
  });

  it('leaves avoid off when it is given no such store, and a maker that ignores it is unchanged', async () => {
    const asks: ItemAsk[] = [];
    const make: ItemMaker<string> = (node, ask) => {
      asks.push(ask);
      return maker(node, ask);
    };
    const plain = await planDrill({ graph: LADDER, store: await seeded(), forms: FORMS, make, size: 2, now: NOW });
    expect(asks.every((a) => !('avoid' in a))).toBe(true);
    const withFresh = await planDrill({ graph: LADDER, store: await seeded(), forms: FORMS, make: maker, size: 2, fresh: { getAsked: async () => ['k'] }, now: NOW });
    expect(withFresh.items).toEqual(plain.items);
  });
});

describe('stockThenMaker', () => {
  const kept = (...keys: string[]) => {
    const list = keys.map((key) => ({ key, form: 'tap', payload: `kept ${key}` }));
    return { take: async (): Promise<(typeof list)[number] | undefined> => list.shift() };
  };

  it('takes from the stock first, in its order, and fills the rest from the maker', async () => {
    const asks: ItemAsk[] = [];
    const make: ItemMaker<string> = (node, ask) => {
      asks.push(ask);
      return maker(node, ask);
    };
    const plan = await planDrill({ graph: LADDER, store: await seeded(), forms: FORMS, make: stockThenMaker(kept('k1'), make), size: 1, itemsPerNode: 3, now: NOW });
    expect(plan.items.map((i) => i.key)).toEqual(['k1', 'a3#0', 'a3#1']);
    expect(asks.map((a) => a.count)).toEqual([2]);
  });

  it('asks the maker for nothing when the stock fills the draw', async () => {
    let called = 0;
    const make: ItemMaker<string> = (node, ask) => {
      called += 1;
      return maker(node, ask);
    };
    const plan = await planDrill({ graph: LADDER, store: await seeded(), forms: FORMS, make: stockThenMaker(kept('k1', 'k2', 'k3'), make), size: 1, now: NOW });
    expect(plan.items.map((i) => i.key)).toEqual(['k1', 'k2']);
    expect(called).toBe(0);
  });

  it('passes the maker its seed and avoid, and takes by the node id', async () => {
    const taken: string[] = [];
    const stock = { take: (idea: string) => (taken.push(idea), undefined) };
    let got: ItemAsk | undefined;
    const make: ItemMaker<string> = (node, ask) => {
      got = ask;
      return maker(node, ask);
    };
    await stockThenMaker(stock, make)(LADDER.byId.get('a3')!, { count: 1, seed: 5, avoid: ['z'] });
    expect(taken).toEqual(['a3']);
    expect(got).toEqual({ count: 1, seed: 5, avoid: ['z'] });
  });
});
