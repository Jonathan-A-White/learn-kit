# learn-kit

The learning graph, levels, schedule, drills and learner profile shared by Lampas and Kestrel: small, framework-free
TypeScript libraries (npm workspaces, `packages/*`), shaped like pwa-kit. Public repo, MIT licensed.

## The gate

All of it must pass before a change lands:

```bash
npm ci --no-audit --no-fund && npm run lint && npm run typecheck && npm test && npm run build
```

- lint: `npm run lint` (ESLint, no explicit `any`)
- typecheck: `npm run typecheck`
- test: `npm test` (the packages' tests, `check:personal`, and the smoke below)
- build: `npm run build` (each package to its own `dist/`)
- smoke: `npm run smoke` (`scripts/consumer-smoke.sh`) installs the repo by commit into a scratch app and imports
  `learn-kit/graph`; `npm test` runs it too. It needs the network or a warm npm cache; `LEARN_KIT_SKIP_SMOKE=1` skips it offline.

## Rules

- **No React, no Dexie, no subject in packages/graph.** It imports neither, declares neither in `package.json`, and holds
  nothing about a subject (no Spanish, no Hebrew, no app). A test in `packages/graph/tests/graph.test.ts` holds this.
- **Nothing personal.** No host name, home-directory path or full public key in a tracked file (`npm run check:personal`).
- **Strict TypeScript and ESM.** Relative imports end in `.js`.
- **A test first, a changelog line.** A change to a package's behaviour adds an entry, newest first, to that package's
  `CHANGELOG.md` and raises its version in `package.json` and `package-lock.json`.
- **Entry points** are mapped in the root `package.json` `exports` (`learn-kit/graph`) onto `packages/*/dist`; add the
  build, typecheck, vitest alias and smoke check for a new package in the same change.
