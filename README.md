# learn-kit

The learning graph, levels, schedule, drills, learner profile, recall and fresh questions shared by Lampas and Kestrel. Small, framework-free
TypeScript libraries in one repo, each good at one thing, so an app takes the blocks it needs and writes no custom
version of them. MIT licensed.

| Library | What it is | Status |
| --- | --- | --- |
| [`@learn-kit/graph`](packages/graph/README.md) (`learn-kit/graph`) | The learning graph. | Nodes and needs, validation, topological order, levels and an injected store; the frontier, solid and tested out, and the review schedule. |
| [`@learn-kit/drill`](packages/drill/README.md) (`learn-kit/drill`) | The drill engine and the placement. | The drill walk and plan for a gap, drill forms, a sitting's mix of the frontier and due reviews, and the placement that marks what a learner passes tested out. |
| [`@learn-kit/fresh`](packages/fresh/README.md) (`learn-kit/fresh`) | Proving on questions the learner has not seen. | A capped ledger of the question keys asked on each idea (`markAsked`, `asked`, `isFresh`); `recordAnswer`, the confirm-on-fresh rule (a right answer after a miss counts as known only on a fresh question), over an injected store; with `learn-kit/drill`'s `isFresh` option the walk is proved on fresh keys only. |
| [`@learn-kit/learner`](packages/learner/README.md) (`learn-kit/learner`) | The learner profile and the goal. | The profile (age, boy or girl, experience, kind of learner, speed, notes), each value learned from talk with its turn and merged surer first; a goal over a graph, its scaffold from the roots up with supports until each node is solid, and its progress. |
| [`@learn-kit/recall`](packages/recall/README.md) (`learn-kit/recall`) | Saying a text from memory. | `fold` (accents, breathings, case, final sigma and punctuation off) and `foldWords`; `matchSequence`, the words of a target heard in order against what was said, passing at 90% by default; `hideWords`, which words of a target a rung hides, spread evenly and seeded. |

## Install

From GitHub, by pinned commit (there is no registry; `prepare` builds the libraries on install):

```bash
npm install github:Jonathan-A-White/learn-kit#<full commit SHA>
```

```ts
import { GRAPH_PACKAGE } from 'learn-kit/graph';
import { DRILL_PACKAGE } from 'learn-kit/drill';
import { FRESH_PACKAGE } from 'learn-kit/fresh';
import { LEARNER_PACKAGE } from 'learn-kit/learner';
import { RECALL_PACKAGE } from 'learn-kit/recall';
```

The root `package.json` maps each entry point (`learn-kit/graph`, `learn-kit/drill`, `learn-kit/fresh`, `learn-kit/learner`, `learn-kit/recall`) onto a package's `dist/` folder; there are no deep
imports. Apps install by tag or by full commit SHA, never by branch. On npm 11 the install's `prepare` script may need
`allowScripts` for the package.

## Build and test

Node 20 or later. From a clone:

```bash
npm ci --no-audit --no-fund && npm run lint && npm run typecheck && npm test && npm run build
```

`npm test` runs every package's tests, the check that no tracked file holds anything personal
(`npm run check:personal`) and the consumer smoke test (`npm run smoke`): it installs the repo by commit into a scratch app
and imports `learn-kit/graph`, `learn-kit/drill`, `learn-kit/fresh`, `learn-kit/learner` and `learn-kit/recall` from there. The smoke test needs the network or a warm npm cache; `LEARN_KIT_SKIP_SMOKE=1`
leaves it out offline.

## Layout

- `packages/<name>`: one library each, with `src/`, `tests/`, a README and a CHANGELOG. Each builds to its own `dist/`
  (`tsconfig.build.json`).
- `scripts/`: `check-personal.mjs` and `consumer-smoke.sh`, each run by `npm test`.
- `tsconfig.base.json` is shared; `vitest.config.ts` aliases the entry points to source so the tests run without a build.

The repo is shaped like [pwa-kit](https://github.com/Jonathan-A-White/pwa-kit): npm workspaces, ESM, strict TypeScript,
an exports map, a changelog per package.
