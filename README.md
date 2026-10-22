# learn-kit

The learning graph, levels, schedule, drills and learner profile shared by Lampas and Kestrel. Small, framework-free
TypeScript libraries in one repo, each good at one thing, so an app takes the blocks it needs and writes no custom
version of them. MIT licensed.

| Library | What it is | Status |
| --- | --- | --- |
| [`@learn-kit/graph`](packages/graph/README.md) (`learn-kit/graph`) | The learning graph. | Nodes and needs, validation, topological order, levels and an injected store; the frontier, solid and tested out, and the review schedule. |

## Install

From GitHub, by pinned commit (there is no registry; `prepare` builds the libraries on install):

```bash
npm install github:Jonathan-A-White/learn-kit#<full commit SHA>
```

```ts
import { GRAPH_PACKAGE } from 'learn-kit/graph';
```

The root `package.json` maps each entry point (`learn-kit/graph`, ...) onto a package's `dist/` folder; there are no deep
imports. Apps install by tag or by full commit SHA, never by branch. On npm 11 the install's `prepare` script may need
`allowScripts` for the package.

## Build and test

Node 20 or later. From a clone:

```bash
npm ci --no-audit --no-fund && npm run lint && npm run typecheck && npm test && npm run build
```

`npm test` runs every package's tests, the check that no tracked file holds anything personal
(`npm run check:personal`) and the consumer smoke test (`npm run smoke`): it installs the repo by commit into a scratch app
and imports `learn-kit/graph` from there. The smoke test needs the network or a warm npm cache; `LEARN_KIT_SKIP_SMOKE=1`
leaves it out offline.

## Layout

- `packages/<name>`: one library each, with `src/`, `tests/`, a README and a CHANGELOG. Each builds to its own `dist/`
  (`tsconfig.build.json`).
- `scripts/`: `check-personal.mjs` and `consumer-smoke.sh`, each run by `npm test`.
- `tsconfig.base.json` is shared; `vitest.config.ts` aliases the entry points to source so the tests run without a build.

The repo is shaped like [pwa-kit](https://github.com/Jonathan-A-White/pwa-kit): npm workspaces, ESM, strict TypeScript,
an exports map, a changelog per package.
