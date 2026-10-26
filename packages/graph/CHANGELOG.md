# Changelog: @learn-kit/graph

Newest first. Breaking changes come first in a release, each with its migration in one sentence.

## 0.4.0 (2026-10-26)

- New: `nextReview` takes a grade as well as a boolean (mw-5r3p30.786): `Grade` is `'well'` (knows it well: up a step at once, due after
  that step's gap, rights back to 0), `'some'` (kind of knows it: today's right, two in a row move it up a step) or `'not'` (does
  not know it: today's wrong, two steps down, due tomorrow, a lapse). A boolean keeps its meaning (`true` is `'some'`, `false` is
  `'not'`), so no caller changes.

## 0.3.0 (2026-10-22)

- New: the frontier and solid, carved from Lampas (mw-79en7t.27): `frontierOf` (the nodes not solid whose every need is solid) and,
  through the store, `frontier`, `solidOf`, `learning` (the node being learned now) and `dueOf`; `testOut` (solid at once, how
  `TESTED_OUT`, at the 30-day step), `review` (solid at the solid step, back to the frontier below it), `teach` (with `'switch'` or
  `'keep'` when another node is being learned) and `place` (a placement result), which together keep one node at the frontier and
  move it on when it is proved.
- New: the review schedule, carved from Lampas: `STEP_DAYS` (1, 3, 7, 14, 30, 60), `RARE_CHECK_DAYS`, `RARE_STEP`, `KNOWN_STEP`,
  `DAY`, `Schedule`, `nextReview`, `isDue`, `gapOf`, `startSchedule` and `knownSchedule`, the same dates as Lampas's.
- Changed: `NodeState` has an optional `review` (the node's `Schedule`), which `memoryStore` copies too, and `setLevel` keeps it
  (it reads the node's state before it writes).

## 0.2.0 (2026-10-22)

- New: the graph, carved from Lampas (mw-79en7t.26): `validate` (and `graphProblems`, `GraphError`) refuses an id listed twice, an
  unknown need, a need of a higher level and a cycle, each naming its node; `order` (a topological order keeping the listed order)
  and `orderProblems`; `nodeOf`, `needsOf`, `below`; `depthOf` and `layers` (the graph by depth); the learner's `Level`,
  `SOLID_STEP` and `levelFromStep`; and the injected `GraphStore` with `memoryStore`, read and written by `levelOf`, `setLevel` and
  `levelsOf`. `GRAPH_PACKAGE` stays.

## 0.1.0 (2026-10-22)

- New: an empty package that builds, with one placeholder export, `GRAPH_PACKAGE` (mw-79en7t.25). The graph is carved into
  it later; the placeholder goes then.
