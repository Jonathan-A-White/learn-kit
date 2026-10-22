// The frontier and solid over a fixture graph, through the in-memory store: the frontier (the nodes not solid whose every need is
// solid) moves as nodes go solid; tested out makes a node solid at once; a review to the solid step makes it solid; and one node at
// a time is being learned (the frontier level), ported from Lampas's tests/unit/one-frontier.test.ts with the Greek replaced by the
// fixture (its genitive, dative and accusative are multiply, divide and subtract here; its letters and alphabet, count and add).
import { describe, expect, it } from 'vitest';
import {
  DAY,
  KNOWN_STEP,
  SOLID_STEP,
  TESTED_OUT,
  dueOf,
  frontier,
  frontierOf,
  learning,
  levelOf,
  memoryStore,
  place,
  review,
  setLevel,
  solidOf,
  teach,
  testOut,
  validate,
  type GraphStore,
  type Level,
  type NodeState,
} from '../src/index.js';

// count <- add <- multiply <- divide <- fractions, and count <- subtract <- divide; listed easy first
const GRAPH = validate([
  { id: 'count', needs: [] },
  { id: 'add', needs: ['count'] },
  { id: 'subtract', needs: ['count'] },
  { id: 'multiply', needs: ['add'] },
  { id: 'divide', needs: ['multiply', 'subtract'] },
  { id: 'fractions', needs: ['divide'] },
]);

const NOW = Date.UTC(2026, 9, 12, 9, 0, 0);

const ids = (nodes: readonly { id: string }[]): string[] => nodes.map((n) => n.id);
const put = (store: GraphStore, id: string, level: Level, state: Partial<NodeState> = {}): Promise<void> =>
  store.put(id, { level, since: NOW, how: 'sheet', ...state });
/** The nodes being learned now, by id. */
const learningNow = async (store: GraphStore): Promise<string[]> => ids(await learning(store, GRAPH));

describe('frontierOf: the nodes not solid whose every need is solid', () => {
  it('is the nodes that need nothing when nothing is solid, and moves up as nodes go solid, in the graph order', () => {
    expect(ids(frontierOf(GRAPH, new Set()))).toEqual(['count']);
    expect(ids(frontierOf(GRAPH, new Set(['count'])))).toEqual(['add', 'subtract']);
    expect(ids(frontierOf(GRAPH, new Set(['count', 'add'])))).toEqual(['subtract', 'multiply']);
    expect(ids(frontierOf(GRAPH, new Set(['count', 'add', 'multiply'])))).toEqual(['subtract']);
    expect(ids(frontierOf(GRAPH, new Set(['count', 'add', 'subtract', 'multiply'])))).toEqual(['divide']);
    expect(ids(frontierOf(GRAPH, new Set(GRAPH.nodes.map((n) => n.id))))).toEqual([]);
  });

  it('waits for every need: divide, with multiply solid and subtract not, is not at the frontier', () => {
    expect(ids(frontierOf(GRAPH, new Set(['count', 'add', 'multiply'])))).not.toContain('divide');
    expect(ids(frontierOf(GRAPH, new Set(['count', 'add', 'multiply', 'fractions'])))).toEqual(['subtract']);
  });
});

describe('the frontier through the store', () => {
  it('moves as nodes go solid, however each got there', async () => {
    const store = memoryStore();
    expect(ids(await frontier(store, GRAPH))).toEqual(['count']);
    await testOut(store, GRAPH, 'count', NOW);
    expect(ids(await frontier(store, GRAPH))).toEqual(['add', 'subtract']);
    await setLevel(store, GRAPH, 'add', 'solid', 'sheet', NOW);
    expect(ids(await frontier(store, GRAPH))).toEqual(['subtract', 'multiply']);
    expect([...(await solidOf(store, GRAPH))]).toEqual(['count', 'add']);
  });

  it('counts only solid as solid: a node being learned, or not yet, holds back what needs it', async () => {
    const store = memoryStore();
    await put(store, 'count', 'frontier');
    expect(ids(await frontier(store, GRAPH))).toEqual(['count']);
    await put(store, 'count', 'notYet');
    expect(ids(await frontier(store, GRAPH))).toEqual(['count']);
  });
});

describe('tested out', () => {
  it('makes a node solid at once, how tested out, since now, on the schedule at the 30-day step; it leaves the frontier', async () => {
    const store = memoryStore();
    await testOut(store, GRAPH, 'count', NOW);
    expect(await store.get('count')).toEqual({
      level: 'solid',
      since: NOW,
      how: TESTED_OUT,
      review: { step: KNOWN_STEP, due: NOW + 30 * DAY, lastWhen: NOW, lapses: 0, rights: 0 },
    });
    expect(TESTED_OUT).toBe('tested-out');
    expect(ids(await frontier(store, GRAPH))).not.toContain('count');
  });

  it('makes solid a node whose needs are not: the nodes it holds up wait for the others', async () => {
    const store = memoryStore();
    await testOut(store, GRAPH, 'multiply', NOW);
    expect(await levelOf(store, 'multiply')).toBe('solid');
    expect(ids(await frontier(store, GRAPH))).toEqual(['count']);
  });

  it('keeps the lapses and rights of a schedule it had', async () => {
    const store = memoryStore();
    await put(store, 'add', 'frontier', { review: { step: 1, due: NOW, lastWhen: NOW - DAY, lapses: 2, rights: 1 } });
    await testOut(store, GRAPH, 'add', NOW);
    expect((await store.get('add'))?.review).toEqual({ step: KNOWN_STEP, due: NOW + 30 * DAY, lastWhen: NOW, lapses: 2, rights: 1 });
  });

  it('refuses a node the graph does not have, writing nothing', async () => {
    const store = memoryStore();
    await expect(testOut(store, GRAPH, 'algebra', NOW)).rejects.toThrow('Unknown node: "algebra"');
    expect((await store.entries()).size).toBe(0);
  });
});

describe('solid by review', () => {
  it('makes a node solid when its reviews reach the solid step (the 14-day gap), and frontier below it', async () => {
    const store = memoryStore();
    const levels: Level[] = [];
    for (let i = 0; i < 6; i += 1) levels.push(await review(store, GRAPH, 'count', true, NOW + i * DAY));
    expect(levels).toEqual(['frontier', 'frontier', 'frontier', 'frontier', 'frontier', 'solid']);
    expect((await store.get('count'))?.review?.step).toBe(SOLID_STEP);
    expect(await store.get('count')).toMatchObject({ level: 'solid', since: NOW + 5 * DAY, how: 'review' });
    expect(ids(await frontier(store, GRAPH))).toEqual(['add', 'subtract']);
  });

  it('drops a solid node back to the frontier when a wrong takes it below the solid step, and keeps a level that does not change', async () => {
    const store = memoryStore();
    await put(store, 'count', 'solid', { how: 'review', review: { step: SOLID_STEP, due: NOW, lastWhen: NOW - DAY, lapses: 0, rights: 0 } });
    expect(await review(store, GRAPH, 'count', true, NOW)).toBe('solid');
    expect(await store.get('count')).toMatchObject({ level: 'solid', since: NOW, how: 'review' });
    expect(await review(store, GRAPH, 'count', false, NOW + DAY)).toBe('frontier');
    expect(await store.get('count')).toMatchObject({ level: 'frontier', since: NOW + DAY, how: 'review', review: { step: 1, lapses: 1 } });
    expect(ids(await frontier(store, GRAPH))).toEqual(['count']);
  });

  it('never lowers by a right a node made solid by hand, though its schedule is short', async () => {
    const store = memoryStore();
    await put(store, 'count', 'solid');
    expect(await review(store, GRAPH, 'count', true, NOW)).toBe('solid');
    expect(await store.get('count')).toMatchObject({ level: 'solid', how: 'sheet', review: { step: 0, rights: 1 } });
  });

  it('refuses a node the graph does not have, writing nothing', async () => {
    const store = memoryStore();
    await expect(review(store, GRAPH, 'algebra', true, NOW)).rejects.toThrow('Unknown node: "algebra"');
    expect((await store.entries()).size).toBe(0);
  });
});

describe('the nodes due for review', () => {
  it('are the nodes whose schedule falls due by now, in the graph order; a node with no schedule is never due', async () => {
    const store = memoryStore();
    await put(store, 'subtract', 'frontier', { review: { step: 0, due: NOW, lastWhen: NOW - DAY, lapses: 0, rights: 0 } });
    await put(store, 'count', 'solid', { review: { step: 4, due: NOW - 1, lastWhen: NOW - 30 * DAY, lapses: 0, rights: 0 } });
    await put(store, 'add', 'frontier', { review: { step: 0, due: NOW + 1, lastWhen: NOW, lapses: 0, rights: 0 } });
    await put(store, 'multiply', 'solid');
    await store.put('retired', { level: 'solid', since: NOW, how: 'review', review: { step: 0, due: 0, lastWhen: 0, lapses: 0, rights: 0 } });
    expect(ids(await dueOf(store, GRAPH, NOW))).toEqual(['count', 'subtract']);
    expect(ids(await dueOf(store, GRAPH, NOW + 1))).toEqual(['count', 'add', 'subtract']);
  });
});

describe('making a second node the frontier (one at a time)', () => {
  const learningMultiply = async (): Promise<GraphStore> => {
    const store = memoryStore();
    expect(await teach(store, GRAPH, 'multiply', NOW)).toEqual({ status: 'taught' });
    const state = (await store.get('multiply'))!;
    await store.put('multiply', { ...state, review: { ...state.review!, rights: 4, lapses: 1, step: 2 } });
    return store;
  };

  it('teaching puts the node at the frontier, on the schedule at step 0, due after the first gap', async () => {
    const store = memoryStore();
    await teach(store, GRAPH, 'count', NOW);
    expect(await store.get('count')).toEqual({
      level: 'frontier',
      since: NOW,
      how: 'taught',
      review: { step: 0, due: NOW + DAY, lastWhen: NOW, lapses: 0, rights: 0 },
    });
  });

  it('asks the caller to choose, and changes nothing until it does', async () => {
    const store = await learningMultiply();
    const before = await store.entries();
    expect(await teach(store, GRAPH, 'divide', NOW + DAY)).toEqual({ status: 'busy', other: 'multiply' });
    expect(await learningNow(store)).toEqual(['multiply']);
    expect(await store.get('divide')).toBeUndefined();
    expect(await store.entries()).toEqual(before);
  });

  it('with keep, leaves everything as it was', async () => {
    const store = await learningMultiply();
    const before = await store.entries();
    expect(await teach(store, GRAPH, 'divide', NOW + DAY, 'keep')).toEqual({ status: 'kept', other: 'multiply' });
    expect(await store.entries()).toEqual(before);
  });

  it('with switch, leaves exactly one frontier: the new node; the old one is not yet, its schedule unchanged', async () => {
    const store = await learningMultiply();
    const kept = (await store.get('multiply'))!.review;
    expect(await teach(store, GRAPH, 'divide', NOW + DAY, 'switch')).toEqual({ status: 'taught' });
    expect(await learningNow(store)).toEqual(['divide']);
    expect(await store.get('multiply')).toMatchObject({ level: 'notYet', review: kept });
    expect((await store.get('divide'))?.review).toBeDefined();
  });

  it('teaching the node that already is the frontier is no second one', async () => {
    const store = await learningMultiply();
    expect(await teach(store, GRAPH, 'multiply', NOW + DAY)).toEqual({ status: 'taught' });
    expect(await learningNow(store)).toEqual(['multiply']);
  });

  it('a review answer neither promotes a not-yet node nor drops a solid one to a second frontier', async () => {
    const store = await learningMultiply();
    expect(await review(store, GRAPH, 'divide', true, NOW + DAY)).toBe('notYet');
    expect(await learningNow(store)).toEqual(['multiply']);
    expect((await store.get('divide'))?.review).toMatchObject({ step: 0 });
    await put(store, 'subtract', 'solid');
    expect(await review(store, GRAPH, 'subtract', false, NOW + DAY)).toBe('solid');
    expect(await levelOf(store, 'subtract')).toBe('solid');
    expect(await learningNow(store)).toEqual(['multiply']);
  });

  it('testing out a node that was not the frontier changes no frontier', async () => {
    const store = await learningMultiply();
    await testOut(store, GRAPH, 'divide', NOW + DAY);
    expect(await learningNow(store)).toEqual(['multiply']);
  });
});

describe('proving the frontier moves it on', () => {
  const learningAdd = async (): Promise<GraphStore> => {
    const store = memoryStore();
    await put(store, 'count', 'solid');
    await put(store, 'add', 'frontier');
    return store;
  };

  it('makes the first not-yet node whose needs are all solid the new frontier, on the schedule', async () => {
    const store = await learningAdd();
    await testOut(store, GRAPH, 'add', NOW);
    expect(await levelOf(store, 'add')).toBe('solid');
    // subtract and multiply are both ready now; subtract is listed first
    expect(await learningNow(store)).toEqual(['subtract']);
    expect(await store.get('subtract')).toMatchObject({ level: 'frontier', how: 'next', review: { step: 0, due: NOW + DAY } });
  });

  it('works when the review of the frontier takes it to solid', async () => {
    const store = memoryStore();
    await put(store, 'count', 'solid');
    await put(store, 'add', 'solid');
    await put(store, 'multiply', 'frontier', { review: { step: 2, due: NOW, lastWhen: NOW, lapses: 0, rights: 3 } });
    expect(await review(store, GRAPH, 'multiply', true, NOW)).toBe('solid');
    expect(await learningNow(store)).toEqual(['subtract']);
  });

  it('keeps the schedule a node had when it becomes the frontier again', async () => {
    const store = await learningAdd();
    const kept = { step: 2, due: NOW - DAY, lastWhen: NOW - 7 * DAY, lapses: 1, rights: 1 };
    await put(store, 'subtract', 'notYet', { review: kept });
    await testOut(store, GRAPH, 'add', NOW);
    expect(await store.get('subtract')).toMatchObject({ level: 'frontier', review: kept });
  });

  it('moves on to nothing when no node is ready', async () => {
    const store = memoryStore();
    for (const id of ['count', 'add', 'subtract', 'multiply', 'divide']) await put(store, id, 'solid');
    await put(store, 'fractions', 'frontier');
    await testOut(store, GRAPH, 'fractions', NOW);
    expect(await learningNow(store)).toEqual([]);
    expect(ids(await frontier(store, GRAPH))).toEqual([]);
  });
});

describe('the placement', () => {
  it('leaves exactly one frontier: the first unproved node, the rest not yet, the ones passed tested out', async () => {
    const store = memoryStore();
    await place(store, GRAPH, 'divide', false, NOW);
    await place(store, GRAPH, 'fractions', false, NOW);
    await place(store, GRAPH, 'subtract', true, NOW);
    await place(store, GRAPH, 'add', false, NOW);
    await place(store, GRAPH, 'multiply', false, NOW);
    expect(await learningNow(store)).toEqual(['add']);
    for (const id of ['divide', 'fractions', 'multiply']) expect(await store.get(id)).toMatchObject({ level: 'notYet', how: 'placement' });
    expect(await store.get('subtract')).toMatchObject({ level: 'solid', how: TESTED_OUT });
  });

  it('makes an unproved node the frontier when it comes first, putting the old one back', async () => {
    const store = memoryStore();
    await place(store, GRAPH, 'multiply', false, NOW);
    expect(await learningNow(store)).toEqual(['multiply']);
    await place(store, GRAPH, 'add', false, NOW);
    expect(await learningNow(store)).toEqual(['add']);
    expect(await levelOf(store, 'multiply')).toBe('notYet');
  });

  it('keeps its schedule when it puts a node back', async () => {
    const store = memoryStore();
    await review(store, GRAPH, 'multiply', true, NOW);
    const kept = (await store.get('multiply'))!.review;
    await place(store, GRAPH, 'add', false, NOW);
    expect(await learningNow(store)).toEqual(['add']);
    expect((await store.get('multiply'))?.review).toEqual(kept);
  });

  it('does not move the frontier on when it marks the frontier passed: the placement settles it', async () => {
    const store = memoryStore();
    await place(store, GRAPH, 'count', false, NOW);
    await place(store, GRAPH, 'count', true, NOW);
    expect(await learningNow(store)).toEqual([]);
  });
});
