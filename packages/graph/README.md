# @learn-kit/graph

The learning graph, shared by Lampas and Kestrel. **Empty for now**: the package builds, tests and installs, and exports one
placeholder until the graph is carved into it. No React, no Dexie, no subject: it has no dependency of any kind, and a test
holds that.

## Install

From GitHub, by pinned commit (there is no registry; `prepare` builds the libraries on install). The repo's
[README](../../README.md#install) has the details.

```bash
npm install github:Jonathan-A-White/learn-kit#<full commit SHA>
```

## Use

```ts
import { GRAPH_PACKAGE } from 'learn-kit/graph';

console.log(GRAPH_PACKAGE); // '@learn-kit/graph'
```
