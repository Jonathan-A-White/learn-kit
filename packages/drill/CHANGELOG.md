# Changelog: @learn-kit/drill

Newest first. Breaking changes come first in a release, each with its migration in one sentence.

## 0.2.0 (2026-10-27)

- New: `WalkOptions.isFresh(key)` (mw-dglxgdz.1). When given, a right answer on a key that is not fresh neither counts toward
  `PROVED_STREAK` nor breaks the streak at the top step: the walk goes on and the asked list still grows, so a node is proved only on
  questions the learner has not been asked before. Make it from the ledger of `learn-kit/fresh`. Absent, the walk behaves as before.

## 0.1.0 (2026-10-22)

- New: the drill engine and the placement, carved from Lampas (mw-79en7t.3), over a `learn-kit/graph` graph and its store, with no
  React, no Dexie and no subject.
- New: the placement. `startPlacement`, `answerPlacement`, `currentNode`, `resumePlacement` and `placementResult` bisect over the
  graph's levels to find the ceiling, then confirm every node below it, two questions a node, in at most `QUESTION_LIMIT` questions
  a sitting; `applyPlacement` writes what he passed tested out through the graph's `place`. `placementItem` asks the app's item maker
  for the question.
- New: the drill walk, from Lampas's `drillIt.ts`: `numberSteps`, `startWalk`, `answerWalk`, `resultOf` and `unmetNeed`, up a step on
  a right and back halfway on a miss, ending proved, at the edge or at the limit.
- New: the plan for a gap, from Lampas's `drillPlan.ts`: `planFrom`, `facetQuestions`, `facetPassed`, `toGo` and `nextItem`.
- New: drill forms: `createForms` holds an app's forms by id, and an item in a form it does not hold is refused with a
  `DrillFormError`.
- New: `planDrill` picks a sitting's nodes from the frontier and the due reviews in a stated mix (`DEFAULT_MIX`) and asks an
  injected item maker for their items. The mix is the kit's own: Lampas has none.
