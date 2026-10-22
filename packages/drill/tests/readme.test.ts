// The README's example, run: what it says it prints is what it prints.
import { frontier, learning, memoryStore, validate } from 'learn-kit/graph';
import { expect, it } from 'vitest';
import { DEFAULT_MIX, answerPlacement, applyPlacement, createForms, currentNode, placementItem, placementResult, planDrill, startPlacement, type ItemMaker } from '../src/index.js';

it('runs the README example', async () => {
  const graph = validate([
    { id: 'count', needs: [], level: 1 },
    { id: 'add', needs: ['count'], level: 2 },
    { id: 'subtract', needs: ['count'], level: 2 },
    { id: 'multiply', needs: ['add'], level: 3 },
    { id: 'divide', needs: ['multiply', 'subtract'], level: 4 },
  ]);
  const forms = createForms([
    { id: 'tap', render: 'pick one of four' },
    { id: 'type', render: 'type the answer' },
  ]);
  const makeItems: ItemMaker<string> = (node, { count, seed }) =>
    Array.from({ length: count }, (_, i) => ({ key: `${node.id}:${seed}:${i}`, form: i % 2 === 0 ? 'tap' : 'type', payload: `a question about ${node.id}` }));

  // the placement: bisect over the levels, then confirm what is below the ceiling
  const knows = new Set(['count', 'add', 'subtract', 'multiply']);
  let state = startPlacement(graph, []);
  const asked: string[] = [];
  while (currentNode(state) !== null) {
    const id = currentNode(state)!;
    const item = await placementItem(graph, state, makeItems, forms); // put this to the learner in its form
    expect(item?.payload).toBe(`a question about ${id}`);
    asked.push(id);
    state = answerPlacement(graph, state, knows.has(id)); // whether he got it right
  }
  expect([...new Set(asked)]).toEqual(['multiply', 'divide', 'subtract']); // 3 nodes, 2 questions each
  expect(placementResult(graph, state)).toMatchObject({ testedOut: ['count', 'add', 'subtract', 'multiply'], notYet: ['divide'], ceiling: 3 });

  const store = memoryStore();
  await applyPlacement(store, graph, state);
  expect((await learning(store, graph)).map((n) => n.id)).toEqual(['divide']);
  expect((await frontier(store, graph)).map((n) => n.id)).toEqual(['divide']);

  // a sitting: the frontier and the reviews due, half and half
  const plan = await planDrill({ graph, store, forms, make: makeItems, size: 2, mix: DEFAULT_MIX, now: Date.now() + 31 * 24 * 60 * 60 * 1000 });
  expect(plan.entries.map((e) => [e.nodeId, e.role])).toEqual([
    ['divide', 'frontier'],
    ['count', 'due'],
  ]);
});
