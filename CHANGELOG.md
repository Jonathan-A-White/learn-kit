# Changelog: learn-kit

Newest first. Breaking changes come first in a release, each with its migration in one sentence.

Each library keeps its own changelog; this one records the repo's releases and points at them:

- [@learn-kit/graph](packages/graph/CHANGELOG.md)
- [@learn-kit/drill](packages/drill/CHANGELOG.md)
- [@learn-kit/fresh](packages/fresh/CHANGELOG.md)
- [@learn-kit/learner](packages/learner/CHANGELOG.md)
- [@learn-kit/recall](packages/recall/CHANGELOG.md)

## 0.1.9 (2026-10-27, not yet tagged)

- New: `@learn-kit/fresh` 0.1.0 (`learn-kit/fresh`), proving on questions the learner has not seen (mw-dglxgdz.1): a ledger of the
  question keys asked on each idea (`markAsked`, `asked`, `isFresh`, newest `LEDGER_CAP` kept) and the confirm-on-fresh rule
  (`recordAnswer` returns `known`, `to-confirm`, `seen` or `missed`; `toConfirm`, `isToConfirm`), over an injected `FreshStore`, with a
  `MemoryFreshStore` for tests. The commit that lands it is the one apps pin.
- New: `@learn-kit/drill` 0.2.0, `WalkOptions.isFresh`: a right answer on a seen key neither counts toward the proved streak nor breaks it.
- Changed: the consumer smoke test also installs and imports `learn-kit/fresh`, and lets it import no other kit library.
- Package versions: graph 0.4.0, drill 0.2.0, fresh 0.1.0, learner 0.1.0, recall 0.1.0.

## 0.1.8 (2026-10-23, not yet tagged)

- Changed: `@learn-kit/graph` 0.4.0, `nextReview` takes a grade (see its changelog). Package versions: graph 0.4.0, drill 0.1.0,
  learner 0.1.0, recall 0.1.0.

## 0.1.7 (2026-10-23, not yet tagged)

- New: `@learn-kit/recall` 0.1.0 (`learn-kit/recall`), saying a text from memory (mw-fu7dqf.2): `fold` and `foldWords`, the folding
  Lampas wrote twice as one; `matchSequence`, the words of a target heard in order against what was said (score, hits, misses by
  index, extras, passing at 90% by default); and `hideWords`, which words of a target a rung hides, spread evenly and seeded. The
  commit that lands it is the one apps pin.
- Changed: the consumer smoke test also installs and imports `learn-kit/recall`, and lets it import no other kit library.
- Package versions: graph 0.3.0, drill 0.1.0, learner 0.1.0, recall 0.1.0.

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
