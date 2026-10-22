// The store: a node's state (its level, since when, and what set it) kept through an injected store, the in-memory one here. The store
// is the only state the graph functions touch: there is no module-level state, so two stores never see each other.
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { levelOf, levelsOf, memoryStore, setLevel, validate, type GraphStore, type NodeState } from '../src/index.js';

const GRAPH = validate([
  { id: 'count', needs: [] },
  { id: 'add', needs: ['count'] },
  { id: 'multiply', needs: ['add'] },
]);

const SOLID: NodeState = { level: 'solid', since: 1_000, how: 'tested-out' };

describe('memoryStore', () => {
  it('round-trips a node state: what is put is what is got, and listed', async () => {
    const store = memoryStore();
    expect(await store.get('count')).toBeUndefined();
    await store.put('count', SOLID);
    expect(await store.get('count')).toEqual(SOLID);
    await store.put('add', { level: 'frontier', since: 2_000, how: 'review' });
    expect(await store.entries()).toEqual(new Map([['count', SOLID], ['add', { level: 'frontier', since: 2_000, how: 'review' }]]));
    await store.delete('count');
    expect(await store.get('count')).toBeUndefined();
    expect([...(await store.entries()).keys()]).toEqual(['add']);
  });

  it('starts from the states it is given, and keeps copies: changing what was put or got changes nothing stored', async () => {
    const given: NodeState = { ...SOLID };
    const store = memoryStore([['count', given]]);
    given.level = 'notYet';
    const got = (await store.get('count'))!;
    got.level = 'frontier';
    (await store.entries()).get('count')!.level = 'frontier';
    expect(await store.get('count')).toEqual(SOLID);
  });

  it('keeps copies of a review schedule too: changing the one put or got changes nothing stored', async () => {
    const review = { step: 1, due: 2_000, lastWhen: 1_000, lapses: 0, rights: 1 };
    const store = memoryStore([['count', { ...SOLID, review }]]);
    review.step = 5;
    (await store.get('count'))!.review!.step = 5;
    (await store.entries()).get('count')!.review!.step = 5;
    const put = { ...SOLID, review: { ...review, step: 2 } };
    await store.put('add', put);
    put.review.step = 5;
    expect((await store.get('count'))?.review?.step).toBe(1);
    expect((await store.get('add'))?.review?.step).toBe(2);
  });

  it('keeps each store to itself: two stores do not see each other', async () => {
    const mine = memoryStore();
    const yours = memoryStore();
    await mine.put('count', SOLID);
    expect(await yours.get('count')).toBeUndefined();
    expect((await yours.entries()).size).toBe(0);
    await setLevel(yours, GRAPH, 'add', 'frontier', 'sheet', 3_000);
    expect(await mine.get('add')).toBeUndefined();
    expect(await levelsOf(mine, GRAPH)).toEqual(new Map([['count', 'solid'], ['add', 'notYet'], ['multiply', 'notYet']]));
    expect(await levelsOf(yours, GRAPH)).toEqual(new Map([['count', 'notYet'], ['add', 'frontier'], ['multiply', 'notYet']]));
  });
});

describe('levels through a store', () => {
  it('writes a node level with when and how, and reads it back; a node with no state is not yet', async () => {
    const store = memoryStore();
    expect(await levelOf(store, 'multiply')).toBe('notYet');
    await setLevel(store, GRAPH, 'multiply', 'solid', 'tested-out', 5_000);
    expect(await store.get('multiply')).toEqual({ level: 'solid', since: 5_000, how: 'tested-out' });
    expect(await levelOf(store, 'multiply')).toBe('solid');
  });

  it('keeps the node review schedule when it sets the level', async () => {
    const review = { step: 2, due: 9_000, lastWhen: 4_000, lapses: 1, rights: 1 };
    const store = memoryStore([['add', { level: 'frontier', since: 1, how: 'review', review }]]);
    await setLevel(store, GRAPH, 'add', 'notYet', 'sheet', 5_000);
    expect(await store.get('add')).toEqual({ level: 'notYet', since: 5_000, how: 'sheet', review });
  });

  it('refuses a node the graph does not have, writing nothing', async () => {
    const store = memoryStore();
    await expect(setLevel(store, GRAPH, 'divide', 'solid', 'sheet', 1)).rejects.toThrow('Unknown node: "divide"');
    expect((await store.entries()).size).toBe(0);
  });

  it('reads the level of every node of the graph in its order, leaving out states of nodes it does not have', async () => {
    const store = memoryStore([['retired', SOLID], ['add', { level: 'frontier', since: 1, how: 'review' }]]);
    expect([...(await levelsOf(store, GRAPH)).entries()]).toEqual([['count', 'notYet'], ['add', 'frontier'], ['multiply', 'notYet']]);
  });

  it('goes only through the store it is given: a store that records its calls sees every read and write', async () => {
    const inner = memoryStore();
    const calls: string[] = [];
    const watched: GraphStore = {
      get: (id) => (calls.push(`get ${id}`), inner.get(id)),
      put: (id, state) => (calls.push(`put ${id}`), inner.put(id, state)),
      delete: (id) => (calls.push(`delete ${id}`), inner.delete(id)),
      entries: () => (calls.push('entries'), inner.entries()),
    };
    await setLevel(watched, GRAPH, 'add', 'solid', 'review', 1);
    expect(await levelOf(watched, 'add')).toBe('solid');
    expect(await levelsOf(watched, GRAPH)).toEqual(new Map([['count', 'notYet'], ['add', 'solid'], ['multiply', 'notYet']]));
    expect(calls).toEqual(['get add', 'put add', 'get add', 'entries']);
  });
});

describe('no module-level state in the package', () => {
  const srcDir = join(resolve(dirname(fileURLToPath(import.meta.url)), '..'), 'src');
  const files = readdirSync(srcDir).filter((f) => /\.ts$/.test(f));

  it('declares no top-level let or var, and no top-level Map, Set or array it could fill', () => {
    const found = files.flatMap((f) =>
      readFileSync(join(srcDir, f), 'utf-8')
        .split('\n')
        .filter((line) => /^(export\s+)?(let|var)\s/.test(line) || /^(export\s+)?const\s+\w+(\s*:[^=]+)?=\s*(new\s+(Map|Set|WeakMap|Array)\b|\[)/.test(line))
        .map((line) => `${f}: ${line}`),
    );
    expect(found).toEqual([]);
  });
});
