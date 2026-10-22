# Changelog: @learn-kit/graph

Newest first. Breaking changes come first in a release, each with its migration in one sentence.

## 0.2.0 (2026-10-22)

- New: the graph, carved from Lampas (mw-79en7t.26): `validate` (and `graphProblems`, `GraphError`) refuses an id listed twice, an
  unknown need, a need of a higher level and a cycle, each naming its node; `order` (a topological order keeping the listed order)
  and `orderProblems`; `nodeOf`, `needsOf`, `below`; `depthOf` and `layers` (the graph by depth); the learner's `Level`,
  `SOLID_STEP` and `levelFromStep`; and the injected `GraphStore` with `memoryStore`, read and written by `levelOf`, `setLevel` and
  `levelsOf`. `GRAPH_PACKAGE` stays.

## 0.1.0 (2026-10-22)

- New: an empty package that builds, with one placeholder export, `GRAPH_PACKAGE` (mw-79en7t.25). The graph is carved into
  it later; the placeholder goes then.
