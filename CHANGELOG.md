# Changelog: learn-kit

Newest first. Breaking changes come first in a release, each with its migration in one sentence.

Each library keeps its own changelog; this one records the repo's releases and points at them:

- [@learn-kit/graph](packages/graph/CHANGELOG.md)

## 0.1.3 (2026-10-22, not yet tagged)

- New: `@learn-kit/graph` 0.3.0, the graph's core complete (mw-79en7t.27): the frontier, solid and tested out, one node learned at a
  time, and the review schedule, over the injected store. The commit that lands it is the one apps pin.
- Package versions: graph 0.3.0.

## 0.1.0 (2026-10-22, not yet tagged)

- New: the repo's shape: npm workspaces, strict ESM TypeScript, lint, typecheck, test and build, `check:personal`, and a
  consumer smoke test that installs the repo by commit into a scratch app (mw-79en7t.25).
- New: `learn-kit/graph`, an empty `@learn-kit/graph` that builds and exports one placeholder, `GRAPH_PACKAGE`.
- Package versions: graph 0.1.0.
