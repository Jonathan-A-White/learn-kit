// A goal: an id, a title and the nodes it aims at, checked against a graph; the nodes it covers, from the roots up; its progress, 0 to 1.
import { memoryStore, order, testOut } from 'learn-kit/graph';
import { describe, expect, it } from 'vitest';
import { GoalError, checkGoal, goalNodes, goalProblems, goalProgress, goalProgressFrom } from '../src/index.js';
import { GOAL, GOAL_PATH, GRAPH } from './fixtures.js';

describe('goalProblems and checkGoal', () => {
  it('finds nothing wrong with a goal whose targets are nodes of the graph', () => {
    expect(goalProblems(GOAL, GRAPH)).toEqual([]);
    expect(checkGoal(GOAL, GRAPH)).toBe(GOAL);
  });

  it('names every problem: no id, no title, no targets, a target twice, a target that is no node', () => {
    expect(goalProblems({ id: ' ', title: '', targets: [] }, GRAPH)).toEqual(['the goal has no id', 'the goal has no title', 'the goal has no targets']);
    expect(goalProblems({ id: 'g', title: 'G', targets: ['area', 'area', 'calculus'] }, GRAPH)).toEqual([
      'g aims at area twice',
      'g aims at calculus, which is not a node of the graph',
    ]);
  });

  it('throws a GoalError naming every problem', () => {
    const bad = { id: 'g', title: 'G', targets: ['calculus'] };
    expect(() => checkGoal(bad, GRAPH)).toThrow(GoalError);
    expect(() => checkGoal(bad, GRAPH)).toThrow('Not a goal of this graph: g aims at calculus, which is not a node of the graph');
  });
});

describe('goalNodes', () => {
  it('is the targets and every node they rest on, in teaching order, from the roots up', () => {
    expect(goalNodes(GOAL, GRAPH).map((n) => n.id)).toEqual(GOAL_PATH);
  });

  it('leaves out a node no target rests on', () => {
    expect(goalNodes(GOAL, GRAPH).map((n) => n.id)).not.toContain('proof');
  });

  it('is only the target for a target that needs nothing', () => {
    expect(goalNodes({ id: 'g', title: 'G', targets: ['shapes'] }, GRAPH).map((n) => n.id)).toEqual(['shapes']);
  });
});

describe('goalProgress', () => {
  it('is 0 for a learner with nothing solid', () => {
    expect(goalProgress(GOAL, GRAPH, new Set())).toBe(0);
  });

  it("is the share of the goal's nodes solid; a solid node outside the goal counts for nothing", () => {
    expect(goalProgress(GOAL, GRAPH, new Set(['count', 'shapes']))).toBe(2 / 8);
    expect(goalProgress(GOAL, GRAPH, new Set(['count', 'shapes', 'proof']))).toBe(2 / 8);
  });

  it('goes from 0 to 1, rising with each node made solid, and is 1 with every node solid', () => {
    const solid = new Set<string>();
    const seen = [goalProgress(GOAL, GRAPH, solid)];
    for (const id of order(GRAPH)) {
      solid.add(id);
      seen.push(goalProgress(GOAL, GRAPH, solid));
    }
    expect(seen[0]).toBe(0);
    expect(seen.at(-1)).toBe(1);
    for (let i = 1; i < seen.length; i += 1) expect(seen[i]).toBeGreaterThanOrEqual(seen[i - 1]);
    expect(new Set(seen).size).toBe(GOAL_PATH.length + 1);
  });

  it('reads the solid nodes from the store', async () => {
    const store = memoryStore();
    expect(await goalProgressFrom(store, GOAL, GRAPH)).toBe(0);
    for (const id of ['count', 'add', 'subtract', 'multiply']) await testOut(store, GRAPH, id, 1);
    expect(await goalProgressFrom(store, GOAL, GRAPH)).toBe(4 / 8);
  });

  it('throws a GoalError for a goal not of the graph', () => {
    expect(() => goalProgress({ id: 'g', title: 'G', targets: ['calculus'] }, GRAPH, new Set())).toThrow(GoalError);
  });
});
