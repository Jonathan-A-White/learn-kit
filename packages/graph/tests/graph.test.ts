// @learn-kit/graph: nodes and needs, validation, topological order and levels over a fixture graph, ported from Lampas's
// tests/unit/ladder-graph.test.ts and ladder-needs.test.ts with the Greek replaced by the fixture; and the rule that makes the
// package a Lego block: no React, no Dexie, no subject.
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  GRAPH_PACKAGE,
  GraphError,
  below,
  depthOf,
  graphProblems,
  layers,
  levelFromStep,
  needsOf,
  nodeOf,
  order,
  orderProblems,
  validate,
  type GraphNode,
} from '../src/index.js';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const srcDir = join(root, 'src');
const files = readdirSync(srcDir).filter((f) => /\.tsx?$/.test(f));
const read = (f: string): string => readFileSync(join(srcDir, f), 'utf-8');

// a (needs nothing) <- b, c <- d <- e, where e also rests directly on a: Lampas's FIVE
const FIVE = validate([
  { id: 'a', needs: [] },
  { id: 'b', needs: ['a'] },
  { id: 'c', needs: ['a'] },
  { id: 'd', needs: ['b', 'c'] },
  { id: 'e', needs: ['d', 'a'] },
]);

/** The fixture in place of the Greek ladder: a small subject built from 'knows nothing' upward, listed easy first, with a level and tags. */
const FIXTURE: GraphNode[] = [
  { id: 'count', needs: [], level: 1, tags: ['numbers'] },
  { id: 'compare', needs: ['count'], level: 1, tags: ['numbers'] },
  { id: 'add', needs: ['count'], level: 2, tags: ['operations'] },
  { id: 'subtract', needs: ['add', 'compare'], level: 2, tags: ['operations'] },
  { id: 'multiply', needs: ['add'], level: 3, tags: ['operations'] },
  { id: 'divide', needs: ['multiply', 'subtract'], level: 3, tags: ['operations'] },
  { id: 'fraction', needs: ['divide', 'compare'], level: 4, tags: ['numbers'] },
  { id: 'ratio', needs: ['fraction', 'multiply'], level: 4, tags: ['numbers'] },
];
const LADDER = validate(FIXTURE);
const ids = (nodes: readonly { id: string }[]): string[] => nodes.map((n) => n.id);

describe('validate', () => {
  it('takes a directed acyclic graph and keeps its nodes in their listed order, by id too', () => {
    expect(ids(LADDER.nodes)).toEqual(ids(FIXTURE));
    expect(LADDER.byId.get('divide')).toBe(FIXTURE[5]);
    expect(nodeOf(LADDER, 'ratio').tags).toEqual(['numbers']);
  });

  it('refuses a cycle, naming every node on it', () => {
    const cycle = [
      { id: 'a', needs: ['c'] },
      { id: 'b', needs: ['a'] },
      { id: 'c', needs: ['b'] },
    ];
    expect(() => validate(cycle)).toThrow(GraphError);
    expect(() => validate(cycle)).toThrow(/cycle: a needs c needs b needs a/);
    expect(graphProblems(cycle)).toEqual(['cycle: a needs c needs b needs a']);
  });

  it('refuses a node that needs itself, naming it', () => {
    expect(() => validate([{ id: 'loop', needs: ['loop'] }])).toThrow(/cycle: loop needs loop/);
  });

  it('refuses an unknown need, naming the node and the need', () => {
    expect(() => validate([{ id: 'a', needs: [] }, { id: 'b', needs: ['a', 'nowhere'] }])).toThrow(/b needs nowhere, which is not a node of the graph/);
  });

  it('refuses an id listed twice, and a need of a higher level than the node', () => {
    expect(graphProblems([{ id: 'a', needs: [] }, { id: 'a', needs: [] }])).toEqual(['a is listed twice']);
    expect(graphProblems([{ id: 'hard', needs: [], level: 3 }, { id: 'easy', needs: ['hard'], level: 1 }])).toEqual([
      'easy needs hard, which is of a higher level (3 above 1)',
    ]);
    expect(graphProblems([{ id: 'p', needs: [], level: 2 }, { id: 'q', needs: ['p'], level: 2 }])).toEqual([]);
  });

  it('names every problem at once, and carries them on the error', () => {
    let caught: unknown;
    try {
      validate([{ id: 'x', needs: ['y'] }, { id: 'x', needs: [] }, { id: 'z', needs: ['z'] }]);
    } catch (error) {
      caught = error;
    }
    expect(caught).toBeInstanceOf(GraphError);
    expect((caught as GraphError).problems).toEqual(['x is listed twice', 'x needs y, which is not a node of the graph', 'cycle: z needs z']);
    expect((caught as GraphError).message).toBe('Not a graph: x is listed twice; x needs y, which is not a node of the graph; cycle: z needs z');
  });

  it('refuses an id it does not have', () => {
    expect(() => nodeOf(LADDER, 'calculus')).toThrow('Unknown node: "calculus"');
  });
});

describe('levels: an idea at its depth, one row below the deepest idea it needs (Lampas layoutPath)', () => {
  it('puts each node of FIVE at the depth Lampas drew it', () => {
    expect(ids(FIVE.nodes).map((id) => [id, depthOf(FIVE, id)])).toEqual([['a', 0], ['b', 1], ['c', 1], ['d', 2], ['e', 3]]);
    expect(layers(FIVE)).toEqual([['a'], ['b', 'c'], ['d'], ['e']]);
  });

  it('keeps a node below all it needs and every node once over the fixture', () => {
    const rows = layers(LADDER);
    expect(rows).toEqual([['count'], ['compare', 'add'], ['subtract', 'multiply'], ['divide'], ['fraction'], ['ratio']]);
    expect(rows.flat().sort()).toEqual(ids(FIXTURE).sort());
    for (const node of LADDER.nodes) for (const need of node.needs) expect(depthOf(LADDER, node.id)).toBeGreaterThan(depthOf(LADDER, need));
  });

  it('is deterministic', () => {
    expect(layers(validate(FIXTURE))).toEqual(layers(LADDER));
  });
});

describe('order: a topological order', () => {
  it('is the listed order when the list is easy first already, as the ladder is', () => {
    expect(order(LADDER)).toEqual(ids(FIXTURE));
    expect(order(FIVE)).toEqual(['a', 'b', 'c', 'd', 'e']);
  });

  it('puts every node after every node it needs, however it was listed, keeping the listed order where it can', () => {
    const shuffled = validate([...FIXTURE].reverse());
    const sorted = order(shuffled);
    expect(sorted).toEqual(['count', 'add', 'multiply', 'compare', 'subtract', 'divide', 'fraction', 'ratio']);
    expect(orderProblems(shuffled, sorted)).toEqual([]);
  });

  it('names each node an order teaches before what it needs (no approach teaches an idea before what it needs)', () => {
    expect(orderProblems(LADDER, order(LADDER))).toEqual([]);
    expect(orderProblems(LADDER, ['add', 'count', 'compare', 'subtract', 'multiply', 'divide', 'fraction', 'ratio'])).toEqual(['add before count']);
    expect(orderProblems(FIVE, ['a', 'b', 'c', 'd'])).toEqual(['e is not in the order']);
  });
});

describe('needs and below (Lampas needsIn, belowIn)', () => {
  it('lists what a node rests on directly, in the graph order', () => {
    expect(ids(needsOf(LADDER, 'divide'))).toEqual(['subtract', 'multiply']);
    expect(needsOf(LADDER, 'count')).toEqual([]);
  });

  it('lists what a node rests on however far down, in the graph order: fraction rests on count, compare and add', () => {
    expect(ids(below(LADDER, 'fraction'))).toEqual(['count', 'compare', 'add', 'subtract', 'multiply', 'divide']);
    expect(ids(below(FIVE, 'e'))).toEqual(['a', 'b', 'c', 'd']);
    expect(below(LADDER, 'count')).toEqual([]);
  });
});

describe('levelFromStep: the level a node at a review step has (Lampas grammarLevels)', () => {
  it('is solid from the solid step up, frontier below it', () => {
    expect([0, 1, 2, 3, 4, 6].map((step) => levelFromStep(step))).toEqual(['frontier', 'frontier', 'frontier', 'solid', 'solid', 'solid']);
    expect(levelFromStep(2, 2)).toBe('solid');
  });
});

describe('@learn-kit/graph', () => {
  it('still exports its own name', () => {
    expect(GRAPH_PACKAGE).toBe('@learn-kit/graph');
  });

  it('has source to check', () => {
    expect(files.length).toBeGreaterThan(0);
  });

  it('imports nothing from React or Dexie', () => {
    const specifiers = files.flatMap((f) => [...read(f).matchAll(/\b(?:from|import)\s*\(?\s*['"]([^'"]+)['"]/g)].map((m) => m[1]));
    expect(specifiers.filter((s) => /^(react|react-dom|dexie)(\/|$)/.test(s))).toEqual([]);
  });

  it('holds nothing about a subject or an app', () => {
    const named = files.flatMap((f) => [...read(f).matchAll(/\b(greek|spanish|hebrew|chemistry|grammar|lampas|kestrel)\b/gi)].map((m) => `${f}: ${m[0]}`));
    expect(named).toEqual([]);
  });

  it('has no dependency on react or dexie, of any kind, in its package.json', () => {
    const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf-8')) as Record<string, Record<string, unknown> | undefined>;
    const kinds = ['dependencies', 'devDependencies', 'optionalDependencies', 'peerDependencies'];
    const declared = kinds.flatMap((k) => Object.keys(pkg[k] ?? {}));
    expect(declared.filter((name) => /^(react|react-dom|dexie)$/.test(name) || /^@types\/react/.test(name))).toEqual([]);
  });
});
