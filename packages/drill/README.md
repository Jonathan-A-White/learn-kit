# @learn-kit/drill

The drill engine and the placement test, shared by Lampas and Kestrel, over a `learn-kit/graph` graph and its store: a walk up
and down a node's steps of questions to find where the gap is, a plan for the gap, the drill forms an app registers, a sitting's
mix of the frontier and the reviews that are due, and a placement that finds where a learner is and marks what he passes tested
out. Generic over any subject: the app makes the questions (an injected item maker) and draws them (a form it registers). No
React, no Dexie, no subject: it declares no dependency, and a test holds that. It imports `learn-kit/graph` and nothing else.

## Install

From GitHub, by pinned commit (there is no registry; `prepare` builds the libraries on install). The repo's
[README](../../README.md#install) has the details.

```bash
npm install github:Jonathan-A-White/learn-kit#<full commit SHA>
```

```ts
import { startPlacement } from 'learn-kit/drill';
```

## Use

The example below is run by `tests/readme.test.ts`.

```ts
import { frontier, learning, memoryStore, validate } from 'learn-kit/graph';
import { DEFAULT_MIX, answerPlacement, applyPlacement, createForms, currentNode, placementItem, planDrill, startPlacement } from 'learn-kit/drill';

const graph = validate([
  { id: 'count', needs: [], level: 1 },
  { id: 'add', needs: ['count'], level: 2 },
  { id: 'subtract', needs: ['count'], level: 2 },
  { id: 'multiply', needs: ['add'], level: 3 },
  { id: 'divide', needs: ['multiply', 'subtract'], level: 4 },
]);

// the app's forms: an id and whatever the app draws it with; the library never reads the contract
const forms = createForms([
  { id: 'tap', render: 'pick one of four' },
  { id: 'type', render: 'type the answer' },
]);
// the app's item maker: items for a node, each in a registered form
const makeItems = (node, { count, seed }) =>
  Array.from({ length: count }, (_, i) => ({ key: `${node.id}:${seed}:${i}`, form: i % 2 === 0 ? 'tap' : 'type', payload: `a question about ${node.id}` }));

// the placement: bisect over the levels, then confirm what is below the ceiling
let state = startPlacement(graph, []);
while (currentNode(state) !== null) {
  const item = await placementItem(graph, state, makeItems, forms); // put this to the learner in its form
  state = answerPlacement(graph, state, learnerGotItRight(item)); // asked: multiply, divide, subtract, two questions each
}
const store = memoryStore();
await applyPlacement(store, graph, state); // count, add, subtract and multiply tested out
(await learning(store, graph)).map((n) => n.id); // ['divide']: where he is

// a sitting: the frontier and the reviews that are due, half and half
const plan = await planDrill({ graph, store, forms, make: makeItems, size: 2, mix: DEFAULT_MIX });
plan.entries.map((e) => [e.nodeId, e.role]); // [['divide', 'frontier'], ['count', 'due']] once count's review falls due
```

### forms

`createForms([{ id, render }])` is the registry: `has(id)`, `get(id)` and `ids()`. An item is `{ key, form, payload }`: its form is
named by id, and `checkItems(forms, items)` (which `planDrill`, `placementItem` and `numberSteps` call) throws a `DrillFormError`
naming the item and the ids the registry has for one whose form it does not hold. The forms are how a drill appeals differently to
different learners: the app's item maker chooses a form for the learner in front of it, from what it knows of them.

### the placement

`startPlacement(graph, known, options)` begins a placement that never asks the ids in `known` (`startPlacementFromStore` takes the
store's solid nodes). `currentNode(state)` is the node to ask, `placementItem` the item the app's maker makes for it, and
`answerPlacement(graph, state, right)` takes one answer. A node is asked `ANSWERS_PER_NODE` (2) questions: both right is solid
(passed), one right is the frontier, none is not yet.

The search bisects over the graph's levels (a node's own `level`, or its depth when it has none): it asks one node of the middle
level, the one standing on the most. A node passed marks every node it stands on passed too (`implied`) and raises the floor; a
node not passed lowers the ceiling. That finds the ceiling, the highest level passed, in at most `maxProbes(levels)` probes. Then it
confirms: every node below the ceiling not yet passed is asked, in the graph's order, except one standing on a node that was missed
(that one is left untested). So a gap below the ceiling is found, and it, not the level above, is where the learner starts.

A sitting is at most `QUESTION_LIMIT` (20) questions; then the state is `paused`, and `resumePlacement(state)` goes on another
day. The state is plain data (it survives `JSON.stringify`) and holds no graph. `placementResult(graph, state)` says where the
learner stands (`testedOut`, `implied`, `frontier`, `notYet`, `untested`, `ceiling`) and `summarize` counts it.

`applyPlacement(store, graph, state)` writes it through the graph's `place`: every node passed is tested out (solid at once, the
30-day step), every node missed is not yet, and the first missed node that is ready to learn is the frontier, how `'placement'`.

### the drill plan

`planDrill({ graph, store, forms, make, size, mix, itemsPerNode, seed, now })` picks a sitting's nodes: the nodes at the frontier
(the one being learned first, then the others ready to learn) and the reviews that are due (the longest overdue first), in the
stated mix, each node once. `mix` is the proportion `{ frontier, due }` (`DEFAULT_MIX`, one to one), `size` the nodes in the sitting
(6). A kind that runs short is filled from the other, unless the other's share is 0. It asks the item maker for `itemsPerNode` (2)
items of each and refuses any in a form the registry does not hold. The plan is `{ entries: [{ nodeId, role, items }], items }`, the
frontier and the reviews alternating.

Given `fresh` (a `FreshStore` of `learn-kit/fresh`, or anything with `getAsked(idea)`), the plan tells the maker the keys already asked on
each node in `ask.avoid`; a maker may ignore it. `stockThenMaker(stock, maker)` makes an `ItemMaker` that takes from an ask-ahead
`Stock` first and fills the rest from `maker`: `planDrill({ ..., make: stockThenMaker(stock, makeItems), fresh })`.

### the walk

For one node, `numberSteps(rawSteps, forms)` numbers the app's questions in steps of rising difficulty, each question tagged with a
facet (`{ id, label }`: what a miss says the learner has not got). `startWalk(graph, nodeId, levels, steps, options)` begins at
step 1, or answers `{ needs: id }`, the lowest need that is not solid, instead of testing a need. `answerWalk(walk, right, hinted)`
goes up a step on a right answer and back halfway (rounded down) between the highest step held and the one missed on a miss; a
hinted right neither moves nor counts toward proved. The walk ends `'proved'` (`PROVED_STREAK`, 2, unhinted rights in a row at the
top step), at its `'edge'` (the step held has the step above it failed) or at the `'limit'` (`MAX_QUESTIONS`, 14). `resultOf(walk)`
names the strong and weak facets. A step with `retryFirstMiss` asks the same facet again after a first miss; `options.required` are
facets that must each be answered right, unhinted, before the node is proved. `options.isFresh(key)` (a function the app makes of `learn-kit/fresh`'s ledger, read by
the app) makes the proof rest on questions not asked before: a right on a key that is not fresh neither counts toward the streak nor
breaks it, so a walk over seen questions goes on to the limit and does not prove the node.

### the plan for a gap

`planFrom(result, at)` turns a run that did not prove its node into a plan: one short drill for each weak facet, the easiest first,
then `PROVE_ID`, a full walk. `facetQuestions(steps, item)` is a facet drill's 4 to 6 questions at and below the run's edge,
`facetPassed(right, asked)` whether one is done (one miss allowed), `toGo` and `nextItem` the plan's progress. Keeping and
scheduling a plan is the app's.

## Where this came from: the sweep of Lampas

The rules of Lampas's placement and drill (`placement.ts`, `placementQuestion.ts`, `quickRound.ts`, `placementKeep.ts`, `drillIt.ts`,
`drillItems.ts`, `drillPlan.ts`), each with where it went. Lampas has no rule for mixing the frontier and the reviews in a sitting:
a drill there is of one idea, from that idea's screen, and the 'Move it' rule that moves New words between frontier and solid
grammar (`move.ts`) is about the vocabulary picker, not the drill. So the mix of `planDrill` is the kit's own.

| Lampas rule | Verdict |
| --- | --- |
| Two questions an idea; both right solid, one right frontier, none not yet | In the kit: `ANSWERS_PER_NODE`, `levelOfAnswers` |
| The walk takes the ideas of the chosen approach in order, up on a pass | Replaced: the kit bisects over the graph's levels (no approach order in a graph) |
| A miss steps back to the idea before it; two ideas missed in a row: nothing above is asked | Replaced: a node not passed lowers the ceiling, and nothing above it is asked; the confirm walks below it |
| It ends when a step down lands on a solid idea (the ceiling is found), or when no idea is left | In the kit: the ceiling of the bisection; finished when nothing is left to ask |
| `QUESTION_LIMIT` 20 a sitting, then `'paused'`, `resumePlacement` | In the kit, the limit an option |
| Starts at the first idea past the foundation that is not solid, skips nothing below it | Replaced: nodes solid at the start are never asked, and the confirm asks every other node below the ceiling |
| The letters, sounds and marks are always on the walk, below what the goal needs | Greek-only (the kit's confirm covers whatever lies below the ceiling) |
| What right answers show: a form read right credits its letters, sounds and marks, enough right is solid (inferred); a miss steps down to the foundation of the forms missed | Greek-only (forms and their letters); the kit's general version is that a passed node marks the nodes it stands on passed (`implied`) |
| The quick round: one tap on each letter, pair and breathing not yet solid, `QUICK_LIMIT` 40 | Greek-only |
| `questionSeed` (a seed per question), and a second question on an idea differs from the first (up to five tries) | In the kit: `questionSeed`, `placementItem` |
| `summarize`: counts by level, listed by tier | Counts in the kit; the tiers are Greek-only |
| `placementKeep` keeps the state in `localStorage`; `placementWrite` writes each answer to the schedule | The app's: the kit's state is plain data, and `applyPlacement` writes through the graph's `place` |
| Drill walk: steps of rising difficulty, each question with a facet | In the kit: `numberSteps`; the steps themselves (`drillSteps`, `drillItems`: letters, pairs, endings, passages) are Greek-only, the app's item maker |
| Start at step 1, up on a right, back halfway rounded down on a miss | In the kit: `answerWalk` |
| A hinted right is neither a right nor a miss, and never counts toward proved | In the kit |
| Ends proved (2 unhinted rights in a row at the top), at the edge, or at 14 questions | In the kit: `PROVED_STREAK`, `MAX_QUESTIONS`, both options |
| A first miss on a step of words asks the same target with another word, a second goes back | In the kit: `retryFirstMiss` |
| A facet is weak when missed and right fewer than twice, or missed on a word step | In the kit |
| A sound rule's sides must each be answered right before proved; a hinted right asks that side again | In the kit as `required` facets; the sound rules themselves are Greek-only |
| Prerequisites are assumed solid; the lowest that is not is returned instead of a walk | In the kit: `unmetNeed`; the claim that makes a whole item group solid is Greek-only |
| Your drill plan: a weak facet each, easiest first, then Prove it; `facetQuestions` 4 to 6; `FACET_PASS` 0.75 | In the kit: `planFrom`, `facetQuestions`, `facetPassed`, `toGo`, `nextItem` |
| A plan's schedule row ids (`rowId`, `parseRowId`, `PLAN_KIND`) | The app's: they key Lampas's own table |
| Drill mix of the frontier and due reviews | None in Lampas; the kit's `planDrill` mix is new |
