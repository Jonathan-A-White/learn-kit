# @learn-kit/graph

The learning graph, shared by Lampas and Kestrel: nodes and the nodes each one needs, validated as a directed acyclic graph, in
topological order and by depth, and where each node stands for the learner (solid, at the frontier, or not yet), kept through a store
the app injects. Generic over any subject: a graph is data, built from "knows nothing" upward. No React, no Dexie, no subject: it has
no dependency of any kind, and a test holds that.

## Install

From GitHub, by pinned commit (there is no registry; `prepare` builds the libraries on install). The repo's
[README](../../README.md#install) has the details.

```bash
npm install github:Jonathan-A-White/learn-kit#<full commit SHA>
```

## Use

A node is `{ id, needs, level?, tags? }`: its id, the ids it rests on, optionally the subject's own level for it (easy low; a node may
not need one of a higher level) and tags the graph carries for the subject and never reads.

### validate

`validate(nodes)` returns the graph, its nodes in their listed order and by id, or throws a `GraphError` naming every problem: an id
listed twice, a need that names no node, a need of a higher level, a cycle. `graphProblems(nodes)` lists the same problems without
throwing.

```ts
import { GraphError, validate } from 'learn-kit/graph';

const graph = validate([
  { id: 'count', needs: [], level: 1 },
  { id: 'add', needs: ['count'], level: 2, tags: ['operations'] },
  { id: 'multiply', needs: ['add'], level: 3 },
]);

try {
  validate([{ id: 'a', needs: ['b'] }, { id: 'b', needs: ['a'] }]);
} catch (error) {
  if (error instanceof GraphError) console.log(error.problems); // ['cycle: a needs b needs a']
}
```

`nodeOf(graph, id)`, `needsOf(graph, id)` (what a node rests on directly) and `below(graph, id)` (however far down) read the graph.

### order

`order(graph)` is a topological order: every node after every node it needs, and of the nodes ready at each turn the one listed
first, so a graph listed easy first comes back as listed. `orderProblems(graph, ids)` names each node a teaching order puts before
what it needs.

```ts
import { order, orderProblems } from 'learn-kit/graph';

order(graph); // ['count', 'add', 'multiply']
orderProblems(graph, ['add', 'count', 'multiply']); // ['add before count']
```

### levels

A node's depth is 0 when it needs nothing, else one more than the deepest node it needs; `layers(graph)` is the graph by depth. A
node's level for the learner is `'solid'`, `'frontier'` or `'notYet'`; `levelFromStep(step)` is the level a node at a review step
has (solid from `SOLID_STEP`, 3, up).

```ts
import { depthOf, layers, levelFromStep } from 'learn-kit/graph';

depthOf(graph, 'multiply'); // 2
layers(graph); // [['count'], ['add'], ['multiply']]
levelFromStep(1); // 'frontier'
```

### the store

Where each node stands is kept in a `GraphStore` the app injects (`get`, `put`, `delete`, `entries`, all asynchronous, so a database
can stand behind it); `memoryStore()` is one in memory. The graph functions keep no state of their own: two stores never see each
other.

```ts
import { levelOf, levelsOf, memoryStore, setLevel } from 'learn-kit/graph';

const store = memoryStore();
await setLevel(store, graph, 'count', 'solid', 'tested-out');
await levelOf(store, 'count'); // 'solid'
await levelsOf(store, graph); // Map { 'count' => 'solid', 'add' => 'notYet', 'multiply' => 'notYet' }
await store.get('count'); // { level: 'solid', since: <ms>, how: 'tested-out' }
```
