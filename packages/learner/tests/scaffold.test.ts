// The scaffold: the path from the roots to a goal's targets that is still to go, each node with its supports (hints, a slower pace) until
// it is solid; built from 'knows nothing' upward, and falling away as nodes go solid.
import { memoryStore, solidOf, teach, testOut } from 'learn-kit/graph';
import { describe, expect, it } from 'vitest';
import { DEFAULT_SUPPORTS, GoalError, HINTS, SLOWER_PACE, scaffold, scaffoldFrom, supportsFor } from '../src/index.js';
import { GOAL, GOAL_PATH, GRAPH } from './fixtures.js';

const ids = (s: ReturnType<typeof scaffold>): string[] => s.steps.map((step) => step.node.id);

describe('scaffold', () => {
  it('starts from the roots for a learner with nothing solid: the whole path, in teaching order', () => {
    const s = scaffold(GOAL, GRAPH, new Set());
    expect(ids(s)).toEqual(GOAL_PATH);
    expect(s.steps[0].node.needs).toEqual([]);
    expect(s.solid).toEqual([]);
    expect(s.progress).toBe(0);
    expect(s.goal).toBe(GOAL);
  });

  it('marks the steps ready to learn now (every need solid) and the targets', () => {
    const s = scaffold(GOAL, GRAPH, new Set());
    expect(s.steps.filter((step) => step.ready).map((step) => step.node.id)).toEqual(['count', 'shapes']);
    expect(s.steps.filter((step) => step.target).map((step) => step.node.id)).toEqual(['area', 'algebra']);
  });

  it('is shorter for a learner with levels solid: it starts where the solid nodes end', () => {
    const solid = new Set(['count', 'shapes', 'add', 'subtract', 'multiply']);
    const s = scaffold(GOAL, GRAPH, solid);
    expect(ids(s)).toEqual(['fractions', 'area', 'algebra']);
    expect(s.solid).toEqual(['count', 'shapes', 'add', 'subtract', 'multiply']);
    expect(s.steps.filter((step) => step.ready).map((step) => step.node.id)).toEqual(['fractions', 'area']);
    expect(s.progress).toBe(5 / 8);
  });

  it('is empty, with progress 1, when every node of the goal is solid', () => {
    const s = scaffold(GOAL, GRAPH, new Set(GOAL_PATH));
    expect(s.steps).toEqual([]);
    expect(s.progress).toBe(1);
  });

  it('shows the supports, hints and a slower pace, on every node not solid', () => {
    expect(DEFAULT_SUPPORTS).toEqual([HINTS, SLOWER_PACE]);
    for (const step of scaffold(GOAL, GRAPH, new Set()).steps) expect(step.supports).toEqual([HINTS, SLOWER_PACE]);
  });

  it("drops a node's scaffold once it is solid", () => {
    const before = scaffold(GOAL, GRAPH, new Set(['count']));
    expect(supportsFor(before, 'add')).toEqual([HINTS, SLOWER_PACE]);
    const after = scaffold(GOAL, GRAPH, new Set(['count', 'add']));
    expect(supportsFor(after, 'add')).toEqual([]);
    expect(ids(after)).not.toContain('add');
    expect(supportsFor(after, 'multiply')).toEqual([HINTS, SLOWER_PACE]);
  });

  it('has no supports for a node outside the goal', () => {
    expect(supportsFor(scaffold(GOAL, GRAPH, new Set()), 'proof')).toEqual([]);
  });

  it("takes the app's supports for each node, told whether it is ready and a target", () => {
    const seen: string[] = [];
    const s = scaffold(GOAL, GRAPH, new Set(['count']), {
      supports: (node, { ready, target }) => {
        seen.push(node.id);
        return ready ? [HINTS, SLOWER_PACE, 'worked-example'] : target ? [HINTS, 'a picture'] : [HINTS];
      },
    });
    expect(seen).toEqual(GOAL_PATH.filter((id) => id !== 'count'));
    expect(supportsFor(s, 'add')).toEqual([HINTS, SLOWER_PACE, 'worked-example']);
    expect(supportsFor(s, 'multiply')).toEqual([HINTS]);
    expect(supportsFor(s, 'algebra')).toEqual([HINTS, 'a picture']);
  });

  it('throws a GoalError for a goal not of the graph', () => {
    expect(() => scaffold({ id: 'g', title: 'G', targets: ['calculus'] }, GRAPH, new Set())).toThrow(GoalError);
  });
});

describe('scaffoldFrom', () => {
  it('reads the solid nodes from the store; a node being learned keeps its supports', async () => {
    const store = memoryStore();
    for (const id of ['count', 'add']) await testOut(store, GRAPH, id, 1);
    await teach(store, GRAPH, 'subtract', 2);
    const s = await scaffoldFrom(store, GOAL, GRAPH);
    expect(s).toEqual(scaffold(GOAL, GRAPH, await solidOf(store, GRAPH)));
    expect(ids(s)).toEqual(['shapes', 'subtract', 'multiply', 'fractions', 'area', 'algebra']);
    expect(supportsFor(s, 'subtract')).toEqual([HINTS, SLOWER_PACE]);
  });
});
