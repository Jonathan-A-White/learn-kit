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

### the frontier

The frontier is the nodes not solid whose every need is solid: what is ready to learn now. `frontierOf(graph, solid)` works it out
from a set of solid ids; `frontier(store, graph)` from the store, and `solidOf(store, graph)` is the solid ids. It moves as nodes go
solid.

```ts
import { frontier, frontierOf, memoryStore } from 'learn-kit/graph';

frontierOf(graph, new Set(['count'])).map((n) => n.id); // ['add']
const store = memoryStore();
(await frontier(store, graph)).map((n) => n.id); // ['count']
```

### solid and tested out

A node is solid when it is tested out, at once, or reviewed to the solid step (`SOLID_STEP`, the 14-day gap). `testOut` makes it
solid how `TESTED_OUT` (`'tested-out'`) and puts it on the schedule at the 30-day step; `review` records one answer and moves the
level from the new step (a wrong that drops a solid node below the step makes it the frontier again). A node's schedule is kept in
its state, `review`.

```ts
import { review, solidOf, testOut } from 'learn-kit/graph';

await testOut(store, graph, 'count');
await solidOf(store, graph); // Set { 'count' }
(await frontier(store, graph)).map((n) => n.id); // ['add']
await review(store, graph, 'add', true); // 'frontier': right once, step 0; six rights in a row reach step 3, 'solid'
```

### one node at a time

One node at a time is being learned, at the `'frontier'` level; `learning(store, graph)` is it. `teach` starts the learner on a node
and, while another is being learned, writes nothing and answers `'busy'` until it is told `'switch'` (the other goes back to not yet,
its schedule kept) or `'keep'`. A review never makes a second one, and proving the node being learned moves it on to the first ready
node not yet. `place(store, graph, id, passed)` writes one placement result: a pass is tested out, and of the nodes not passed the
first in the graph's order is the frontier.

```ts
import { learning, memoryStore, teach, testOut } from 'learn-kit/graph';

const store = memoryStore();
await testOut(store, graph, 'count');
await teach(store, graph, 'add'); // { status: 'taught' }
await teach(store, graph, 'multiply'); // { status: 'busy', other: 'add' }
await testOut(store, graph, 'add');
(await learning(store, graph)).map((n) => n.id); // ['multiply']
```

### the schedule

The gaps are `STEP_DAYS`, 1, 3, 7, 14, 30 and 60 days, then a rare check every 90 (`RARE_CHECK_DAYS`). Right twice in a row moves a
node up a step, a single right keeps its step, and one wrong drops it two steps and makes it due tomorrow. `nextReview(schedule,
answer, now)` is the schedule after one answer (`undefined` for a node not scheduled yet), `isDue(schedule, now)` whether it is due,
`gapOf(step)` a step's gap in ms, and `dueOf(store, graph, now)` the nodes due.

An answer is a `Grade` (`'well' | 'some' | 'not'`) or a boolean. `'well'` (knows it well) moves the node up a step at once, due after
that step's gap, with its rights back to 0. `'some'` (kind of knows it) is a right: two in a row move it up a step, a single one
keeps its step. `'not'` (does not know it) is a wrong: two steps down, due tomorrow, a lapse. A boolean keeps its old meaning,
`true` is `'some'` and `false` is `'not'`, so a caller that passes one is unchanged.

```ts
import { DAY, dueOf, isDue, nextReview } from 'learn-kit/graph';

const now = Date.UTC(2026, 9, 8, 9);
const first = nextReview(undefined, true, now); // { step: 0, due: now + DAY, lastWhen: now, lapses: 0, rights: 1 }
const second = nextReview(first, true, now + DAY); // { step: 1, due: now + 4 * DAY, lastWhen: now + DAY, lapses: 0, rights: 0 }
nextReview(first, 'well', now + DAY); // { step: 1, due: now + 4 * DAY, lastWhen: now + DAY, lapses: 0, rights: 0 }: up a step at once
isDue(second, now + 4 * DAY); // true
nextReview(second, false, now + 4 * DAY); // { step: 0, due: now + 5 * DAY, lastWhen: now + 4 * DAY, lapses: 1, rights: 0 }
(await dueOf(store, graph, Date.now() + DAY)).map((n) => n.id); // ['multiply']: being learned, due after the first gap
```
