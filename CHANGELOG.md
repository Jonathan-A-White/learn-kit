# Changelog: learn-kit

Newest first. Breaking changes come first in a release, each with its migration in one sentence.

Each library keeps its own changelog; this one records the repo's releases and points at them:

- [@learn-kit/graph](packages/graph/CHANGELOG.md)
- [@learn-kit/drill](packages/drill/CHANGELOG.md)
- [@learn-kit/learner](packages/learner/CHANGELOG.md)

## 0.1.6 (2026-10-22, not yet tagged)

- New: `@learn-kit/learner` 0.1.0 (`learn-kit/learner`), the learner profile and a goal with its scaffolding (mw-79en7t.4): age,
  boy or girl, experience, the kind of learner, speed and notes, each learned from talk with the turn it came from and merged surer
  first, then newer; a goal `{ id, title, targets }` over a graph, its scaffold from the roots up with each node's supports until it
  is solid, and its progress, 0 to 1. The commit that lands it is the one apps pin.
- Changed: the consumer smoke test also installs and imports `learn-kit/learner`, and lets it import `learn-kit/graph` and nothing
  else of the kit.
- Package versions: graph 0.3.0, drill 0.1.0, learner 0.1.0.

## 0.1.5 (2026-10-22, not yet tagged)

- New: `@learn-kit/drill` 0.1.0 (`learn-kit/drill`), the drill engine and the placement (mw-79en7t.3): the drill walk and the plan
  for a gap, drill forms an app registers, a sitting's mix of the frontier and the reviews due, and the placement that bisects
  over the graph's levels and marks what a learner passes tested out. The commit that lands it is the one apps pin.
- Changed: the consumer smoke test also installs and imports `learn-kit/drill`, and lets it import `learn-kit/graph` and nothing
  else of the kit.
- Package versions: graph 0.3.0, drill 0.1.0.

## 0.1.3 (2026-10-22, not yet tagged)

- New: `@learn-kit/graph` 0.3.0, the graph's core complete (mw-79en7t.27): the frontier, solid and tested out, one node learned at a
  time, and the review schedule, over the injected store. The commit that lands it is the one apps pin.
- Package versions: graph 0.3.0.

## 0.1.0 (2026-10-22, not yet tagged)

- New: the repo's shape: npm workspaces, strict ESM TypeScript, lint, typecheck, test and build, `check:personal`, and a
  consumer smoke test that installs the repo by commit into a scratch app (mw-79en7t.25).
- New: `learn-kit/graph`, an empty `@learn-kit/graph` that builds and exports one placeholder, `GRAPH_PACKAGE`.
- Package versions: graph 0.1.0.
