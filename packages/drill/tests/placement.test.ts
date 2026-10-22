// The placement (src/placement.ts): a bounded test that finds where a learner is on any graph and marks what he passes tested out.
// Ported from Lampas's tests/unit/placement.test.ts with the Greek replaced by the fixture ladder: two right answers on a node make
// it solid, one right the frontier, none not yet; it ends at the ceiling it finds, or pauses at the question limit and resumes.
// Where Lampas walks the ideas of an approach one by one, the kit bisects over the graph's levels and then confirms what is below.
import { frontier, learning, levelOf, memoryStore, solidOf, TESTED_OUT, validate, type GraphStore } from 'learn-kit/graph';
import { describe, expect, it } from 'vitest';
import {
  ANSWERS_PER_NODE,
  QUESTION_LIMIT,
  answerPlacement,
  applyPlacement,
  currentNode,
  maxProbes,
  placementResult,
  placementItem,
  questionSeed,
  resumePlacement,
  startPlacement,
  startPlacementFromStore,
  summarize,
  type PlacementState,
} from '../src/index.js';
import { DrillFormError, type ItemMaker } from '../src/index.js';
import { FORMS, LADDER, LEVELS, levelOfId } from './fixtures.js';

const NOW = Date.UTC(2026, 9, 12, 9, 0, 0);
const ids = (nodes: readonly { id: string }[]): string[] => nodes.map((n) => n.id);

/** Sits the placement with a learner who answers `knows(node)`; the nodes asked, one entry a question, in order. */
function sit(state: PlacementState, knows: (id: string) => boolean, resume = false): { state: PlacementState; asked: string[] } {
  const asked: string[] = [];
  for (let guard = 0; guard < 500; guard += 1) {
    if (state.done === 'paused' && resume) state = resumePlacement(state);
    const id = currentNode(state);
    if (id === null) break;
    asked.push(id);
    state = answerPlacement(LADDER, state, knows(id));
  }
  return { state, asked };
}

const upTo = (level: number) => (id: string) => levelOfId(id) <= level;

describe('a learner who knows levels 0 to 3', () => {
  const placed = sit(startPlacement(LADDER, []), upTo(3));

  it('finds the ceiling by bisecting over the levels, then confirms what is below it, in a handful of questions', () => {
    expect(placed.state.done).toBe('finished');
    // probes at levels 4 (fail), 2 and 3 (pass): a3 stands on everything of levels 0-2 and on a3's own needs; then b3 is confirmed
    expect(new Set(placed.asked)).toEqual(new Set(['a4', 'a2', 'a3', 'b3']));
    expect(placed.asked).toHaveLength(8);
    expect(placed.asked.length).toBeLessThanOrEqual(ANSWERS_PER_NODE * (maxProbes(LEVELS) + 1));
    expect(placed.asked.length).toBeLessThan(QUESTION_LIMIT);
  });

  it('marks every node of levels 0 to 3 passed: asked and right, or implied by a node that stands on it', () => {
    const result = placementResult(LADDER, placed.state);
    expect(result.testedOut).toEqual(ids(LADDER.nodes).filter((id) => levelOfId(id) <= 3));
    expect(result.implied).toEqual(['a0', 'b0', 'a1', 'b1', 'b2']);
    expect(result.implied).not.toContain('a2'); // a probe: asked, not implied
    expect(result.implied).not.toContain('a3');
    expect(result.notYet).toEqual(['a4']);
    expect(result.ceiling).toBe(3);
  });

  it('writes them tested out, and leaves the frontier at level 4', async () => {
    const store = memoryStore();
    await applyPlacement(store, LADDER, placed.state, NOW);
    for (const node of LADDER.nodes.filter((n) => n.level! <= 3)) {
      expect(await store.get(node.id)).toMatchObject({ level: 'solid', how: TESTED_OUT, since: NOW });
    }
    expect([...(await solidOf(store, LADDER))].sort()).toEqual(ids(LADDER.nodes).filter((id) => levelOfId(id) <= 3).sort());
    expect(ids(await frontier(store, LADDER))).toEqual(['a4', 'b4']);
    expect(ids(await learning(store, LADDER))).toEqual(['a4']);
    expect(await levelOf(store, 'a5')).toBe('notYet');
  });
});

describe('the other learners', () => {
  it('who knows nothing: bisects down to level 0 in at most one probe a halving, and the frontier is the first node', async () => {
    const placed = sit(startPlacement(LADDER, []), () => false);
    expect(placed.state.done).toBe('finished');
    expect(placed.asked).toHaveLength(ANSWERS_PER_NODE * maxProbes(LEVELS));
    expect(new Set(placed.asked)).toEqual(new Set(['a4', 'a2', 'a1', 'a0']));
    const result = placementResult(LADDER, placed.state);
    expect(result.testedOut).toEqual([]);
    expect(result.ceiling).toBeNull();
    const store = memoryStore();
    await applyPlacement(store, LADDER, placed.state, NOW);
    expect(ids(await learning(store, LADDER))).toEqual(['a0']);
    expect(await store.get('a0')).toMatchObject({ level: 'frontier', how: 'placement' });
  });

  it('who knows everything: passes every level and nothing is left to learn', async () => {
    const placed = sit(startPlacement(LADDER, []), () => true);
    expect(placed.asked).toHaveLength(8); // a4, a6, a7, then b7
    const result = placementResult(LADDER, placed.state);
    expect(result.testedOut).toEqual(ids(LADDER.nodes));
    expect(result.ceiling).toBe(7);
    const store = memoryStore();
    await applyPlacement(store, LADDER, placed.state, NOW);
    expect(await frontier(store, LADDER)).toEqual([]);
    expect(await learning(store, LADDER)).toEqual([]);
  });

  it('with a gap below the ceiling: the confirm finds b3, and the frontier is the gap, not level 4', async () => {
    const placed = sit(startPlacement(LADDER, []), (id) => levelOfId(id) <= 3 && id !== 'b3');
    const result = placementResult(LADDER, placed.state);
    expect(result.ceiling).toBe(3);
    expect(result.notYet).toEqual(expect.arrayContaining(['b3']));
    expect(result.testedOut).not.toContain('b3');
    expect(result.testedOut).toContain('a3');
    const store = memoryStore();
    await applyPlacement(store, LADDER, placed.state, NOW);
    expect(ids(await learning(store, LADDER))).toEqual(['b3']);
  });

  it('a node whose needs failed is not asked, and is left untested', async () => {
    // r <- x <- y, r <- z <- top: the learner has r, z and top, but not x
    const graph = validate([
      { id: 'r', needs: [], level: 0 },
      { id: 'x', needs: ['r'], level: 1 },
      { id: 'y', needs: ['x'], level: 1 },
      { id: 'z', needs: ['r'], level: 2 },
      { id: 'top', needs: ['z'], level: 3 },
    ]);
    let state = startPlacement(graph, []);
    const asked: string[] = [];
    for (let guard = 0; guard < 50 && currentNode(state) !== null; guard += 1) {
      const id = currentNode(state)!;
      asked.push(id);
      state = answerPlacement(graph, state, id !== 'x');
    }
    expect(new Set(asked)).toEqual(new Set(['z', 'top', 'x'])); // y stands on x, which failed: not asked
    const result = placementResult(graph, state);
    expect(result.notYet).toEqual(['x']);
    expect(result.untested).toEqual(['y']);
    expect(result.testedOut).toEqual(['r', 'z', 'top']);
    const store = memoryStore();
    await applyPlacement(store, graph, state, NOW);
    expect(await store.get('y')).toBeUndefined();
    expect(ids(await learning(store, graph))).toEqual(['x']);
  });

  it('does not ask a node he already has solid, and passes a level of solid nodes without a question', () => {
    const known = LADDER.nodes.filter((n) => n.level! <= 2).map((n) => n.id);
    const placed = sit(startPlacement(LADDER, known), upTo(3));
    for (const id of known) expect(placed.asked).not.toContain(id);
    const result = placementResult(LADDER, placed.state);
    expect(result.testedOut).toEqual(ids(LADDER.nodes).filter((id) => levelOfId(id) <= 3 && !known.includes(id)));
    expect(result.ceiling).toBe(3);
  });

  it('is finished at once when everything is solid already', () => {
    const state = startPlacement(LADDER, ids(LADDER.nodes));
    expect(state.done).toBe('finished');
    expect(currentNode(state)).toBeNull();
  });

  it('takes a node with no level at its depth in the graph', () => {
    const stripped = {
      nodes: LADDER.nodes.map((n) => ({ id: n.id, needs: n.needs })),
      byId: new Map(LADDER.nodes.map((n) => [n.id, { id: n.id, needs: n.needs }])),
    };
    // depths: a(N) and b(N) are at depth N, as their levels were
    let state = startPlacement(stripped, []);
    const asked: string[] = [];
    for (let guard = 0; guard < 100 && currentNode(state) !== null; guard += 1) {
      const id = currentNode(state)!;
      asked.push(id);
      state = answerPlacement(stripped, state, levelOfId(id) <= 3);
    }
    expect(placementResult(stripped, state).ceiling).toBe(3);
    expect(new Set(asked)).toEqual(new Set(['a4', 'a2', 'a3', 'b3']));
  });
});

describe('answering', () => {
  it('two rights make the node solid, one right the frontier, none not yet', () => {
    let state = startPlacement(LADDER, []);
    const probe = currentNode(state)!;
    expect(probe).toBe('a4'); // the middle level, the node standing on the most
    state = answerPlacement(LADDER, state, true);
    expect(currentNode(state)).toBe(probe); // ANSWERS_PER_NODE questions a node
    expect(ANSWERS_PER_NODE).toBe(2);
    state = answerPlacement(LADDER, state, false);
    expect(placementResult(LADDER, state).frontier).toEqual([probe]); // one right: not passed, not nothing
    expect(currentNode(state)).not.toBe(probe);
  });

  it('records every answer in order and counts the questions left', () => {
    let state = startPlacement(LADDER, []);
    state = answerPlacement(LADDER, answerPlacement(LADDER, state, true), false);
    expect(state.asked).toEqual([{ nodeId: 'a4', right: true }, { nodeId: 'a4', right: false }]);
    expect(state.questionsLeft).toBe(QUESTION_LIMIT - 2);
  });

  it('gives each question its own seed, and the same state the same one', () => {
    const state = startPlacement(LADDER, [], { seed: 7 });
    const next = answerPlacement(LADDER, state, true);
    expect(questionSeed(state)).toBe(questionSeed(startPlacement(LADDER, [], { seed: 7 })));
    expect(questionSeed(next)).not.toBe(questionSeed(state));
  });

  it('does not change a placement that is over', () => {
    const { state } = sit(startPlacement(LADDER, []), () => false);
    expect(answerPlacement(LADDER, state, true)).toBe(state);
  });

  it('is plain data: it survives a round trip through JSON', () => {
    let state = startPlacement(LADDER, ['a0']);
    state = answerPlacement(LADDER, answerPlacement(LADDER, state, true), true);
    const copy = JSON.parse(JSON.stringify(state)) as PlacementState;
    expect(sit(copy, upTo(3)).asked).toEqual(sit(state, upTo(3)).asked);
  });
});

describe('where the placement stops', () => {
  it('the question after the limit is not asked: the state is paused, and resuming asks the next question', () => {
    const start = startPlacement(LADDER, [], { limit: 3 });
    let state = start;
    for (let i = 0; i < 3; i += 1) state = answerPlacement(LADDER, state, true);
    expect(state.done).toBe('paused');
    expect(state.questionsLeft).toBe(0);
    expect(currentNode(state)).toBeNull();
    const resumed = resumePlacement(state);
    expect(resumed.done).toBeNull();
    expect(resumed.questionsLeft).toBe(3);
    expect(currentNode(resumed)).not.toBeNull();
  });

  it('a paused placement, resumed, ends where the uninterrupted one does', () => {
    const whole = sit(startPlacement(LADDER, []), upTo(3));
    const split = sit(startPlacement(LADDER, [], { limit: 3 }), upTo(3), true);
    expect(split.asked).toEqual(whole.asked);
    expect(placementResult(LADDER, split.state)).toEqual(placementResult(LADDER, whole.state));
  });

  it('does not resume a finished state', () => {
    const { state } = sit(startPlacement(LADDER, []), () => false);
    expect(resumePlacement(state)).toBe(state);
  });

  it('finishes rather than pauses when the last question is the limit', () => {
    const exact = sit(startPlacement(LADDER, []), () => false);
    const state = sit(startPlacement(LADDER, [], { limit: exact.asked.length }), () => false).state;
    expect(state.done).toBe('finished');
  });

  it('asks no node twice, however it is answered, and no sitting goes past its limit', () => {
    for (const knows of [() => true, () => false, upTo(3), upTo(5), (id: string) => levelOfId(id) % 2 === 0]) {
      const { asked } = sit(startPlacement(LADDER, []), knows, true);
      expect(asked.length).toBeLessThanOrEqual(ANSWERS_PER_NODE * LADDER.nodes.length);
      expect(new Set(asked).size * ANSWERS_PER_NODE).toBe(asked.length);
    }
  });

  it('bounds the probes by the halvings of the levels', () => {
    expect(maxProbes(0)).toBe(0);
    expect(maxProbes(1)).toBe(1);
    expect(maxProbes(7)).toBe(3);
    expect(maxProbes(8)).toBe(4);
    expect(maxProbes(100)).toBe(7);
  });

  it('refuses a limit or answers-per-node that is not a positive whole number', () => {
    expect(() => startPlacement(LADDER, [], { limit: 0 })).toThrow(/limit/);
    expect(() => startPlacement(LADDER, [], { answersPerNode: 1.5 })).toThrow(/answersPerNode/);
    expect(() => startPlacement(LADDER, ['nope'])).toThrow(/nope/);
  });

  it('asks one question a node when answersPerNode is 1: a right is solid, a wrong not yet', () => {
    const { asked, state } = sit(startPlacement(LADDER, [], { answersPerNode: 1 }), upTo(3));
    expect(asked).toEqual(['a4', 'a2', 'a3', 'b3']);
    expect(placementResult(LADDER, state).ceiling).toBe(3);
    expect(placementResult(LADDER, state).frontier).toEqual([]);
  });
});

describe('summarize', () => {
  it('counts the nodes by level, and what is untested', () => {
    const { state } = sit(startPlacement(LADDER, []), upTo(3));
    expect(summarize(LADDER, state)).toEqual({ solid: 8, frontier: 0, notYet: 1, untested: 7, total: 16 });
  });
});

describe('applyPlacement', () => {
  it('writes nothing a second time that is already as written, and keeps a known node as it was', async () => {
    const store: GraphStore = memoryStore([['a0', { level: 'solid', since: 1, how: 'sheet' }]]);
    const { state } = sit(startPlacement(LADDER, ['a0']), upTo(3));
    await applyPlacement(store, LADDER, state, NOW);
    expect(await store.get('a0')).toEqual({ level: 'solid', since: 1, how: 'sheet' });
    expect(await store.get('b0')).toMatchObject({ level: 'solid', how: TESTED_OUT });
  });

  it('writes a paused placement\'s answers so far, and the rest when it is done', async () => {
    const store = memoryStore();
    let state = startPlacement(LADDER, [], { limit: 4 });
    for (let i = 0; i < 4; i += 1) state = answerPlacement(LADDER, state, true);
    expect(state.done).toBe('paused');
    await applyPlacement(store, LADDER, state, NOW);
    expect((await solidOf(store, LADDER)).size).toBeGreaterThan(0);
  });
});

describe('startPlacementFromStore', () => {
  it('does not ask what the store has solid', async () => {
    const store = memoryStore();
    await applyPlacement(store, LADDER, sit(startPlacement(LADDER, []), upTo(3)).state, NOW);
    const again = await startPlacementFromStore(LADDER, store);
    expect(again.known.sort()).toEqual(ids(LADDER.nodes).filter((id) => levelOfId(id) <= 3).sort());
    const { asked } = sit(again, upTo(5));
    expect(asked.every((id) => levelOfId(id) >= 4)).toBe(true);
  });
});

describe('placementItem', () => {
  const make: ItemMaker<string> = (node, ask) => [{ key: `${node.id}/${ask.seed % 2}`, form: 'tap', payload: String(ask.seed) }];

  it('asks the item maker for one item of the node being asked, with the question seed', async () => {
    const state = startPlacement(LADDER, [], { seed: 5 });
    const item = await placementItem(LADDER, state, make, FORMS);
    expect(item).toMatchObject({ form: 'tap', payload: String(questionSeed(state)) });
    expect(item!.key.startsWith('a4/')).toBe(true);
  });

  it('gives a second question on a node that is not the one before it', async () => {
    const state = startPlacement(LADDER, [], { seed: 5 });
    const first = (await placementItem(LADDER, state, make, FORMS))!;
    const second = (await placementItem(LADDER, answerPlacement(LADDER, state, true), make, FORMS, first))!;
    expect(second.key).not.toBe(first.key);
  });

  it('is null once the placement is over, and refuses an item in a form the registry does not hold', async () => {
    const over = sit(startPlacement(LADDER, []), () => false).state;
    expect(await placementItem(LADDER, over, make, FORMS)).toBeNull();
    const bad: ItemMaker<string> = (node) => [{ key: node.id, form: 'juggle', payload: '' }];
    await expect(placementItem(LADDER, startPlacement(LADDER, []), bad, FORMS)).rejects.toBeInstanceOf(DrillFormError);
  });
});
