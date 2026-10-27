#!/usr/bin/env bash
# The consumer smoke test: installs learn-kit the way an app does, `npm install git+file://<a fresh clone>`, into a scratch
# directory, and checks from there what a git install must deliver:
#   - the exports map names the entry points (learn-kit/graph, learn-kit/drill, learn-kit/fresh, learn-kit/learner, learn-kit/recall) and package.json, nothing else;
#   - each is packed and imports; the graph's import graph reaches no other learn-kit library, React or Dexie, and the drill's and the
#     learner's reach no learn-kit library but learn-kit/graph, and the fresh's and the recall's reach none; none reaches React or Dexie.
# The "fresh clone" is the working tree as it stands (tracked and untracked files, minus what git ignores), committed into a
# scratch repository, so an edit not yet committed is smoke-tested too.
# Run: npm run smoke   (needs the network or a warm npm cache: the install runs the build with devDependencies)
set -euo pipefail

root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
scratch="$(mktemp -d "${TMPDIR:-/tmp}/learn-kit-smoke-XXXXXX")"
trap 'rm -rf "$scratch"' EXIT

# 1. A fresh clone of the tree.
clone="$scratch/clone"
mkdir "$clone"
(
  cd "$root"
  git ls-files -z --cached --others --exclude-standard | while IFS= read -r -d '' f; do
    [ -e "$f" ] || continue # deleted in the working tree
    mkdir -p "$clone/$(dirname "$f")"
    cp -p "$f" "$clone/$f"
  done
)
git_clone() { git -C "$clone" -c user.name=smoke -c user.email=smoke@example.invalid "$@"; }
git_clone init -q -b main
git_clone add -A
git_clone commit -q -m smoke

# 2. An app's scratch directory that installs it.
app="$scratch/app"
mkdir "$app"
echo '{ "name": "smoke-app", "private": true, "type": "module" }' > "$app/package.json"
echo 'installing learn-kit from a fresh clone ...'
(cd "$app" && npm install --no-audit --no-fund "git+file://$clone" > "$scratch/install.log" 2>&1) || { cat "$scratch/install.log" >&2; exit 1; }

# 3. The exports map, the packed files, and 'learn-kit/graph', 'learn-kit/drill', 'learn-kit/fresh', 'learn-kit/learner' and 'learn-kit/recall' imported by an app.
cat > "$app/graph.mjs" <<'JS'
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { createRequire } from 'node:module';
import { GRAPH_PACKAGE } from 'learn-kit/graph';
import { DRILL_PACKAGE } from 'learn-kit/drill';
import { FRESH_PACKAGE } from 'learn-kit/fresh';
import { LEARNER_PACKAGE } from 'learn-kit/learner';
import { RECALL_PACKAGE } from 'learn-kit/recall';

const installed = join(process.cwd(), 'node_modules', 'learn-kit');

// The exports map names the entry points (and package.json), nothing else: no deep imports.
const entries = Object.keys(JSON.parse(readFileSync(join(installed, 'package.json'), 'utf-8')).exports).sort();
if (JSON.stringify(entries) !== JSON.stringify(['./drill', './fresh', './graph', './learner', './package.json', './recall'])) throw new Error('exports: ' + entries.join(', '));
console.log('the exports map names the entry points');

for (const lib of ['graph', 'drill', 'fresh', 'learner', 'recall']) {
  for (const file of ['index.js', 'index.d.ts']) {
    if (!existsSync(join(installed, 'packages', lib, 'dist', file))) throw new Error(`packages/${lib}/dist/${file} is not packed`);
  }
}

// Each library stands alone: walk the installed entry point's import graph and fail on another learn-kit library (but the drill and the
// learner may import the graph they work over), React or Dexie.
const specifier = /\b(?:import|export)\s[^'"`;]*?\bfrom\s*['"]([^'"]+)['"]|\bimport\s*['"]([^'"]+)['"]|\bimport\s*\(\s*['"]([^'"]+)['"]\s*\)/g;
const walk = (file, allowed, seen = new Set()) => {
  if (seen.has(file)) return;
  seen.add(file);
  for (const m of readFileSync(file, 'utf-8').matchAll(specifier)) {
    const s = m[1] ?? m[2] ?? m[3];
    if (allowed.includes(s)) continue;
    if (/^(@learn-kit\/|learn-kit\/|react(-dom)?(\/|$)|dexie(\/|$))/.test(s)) throw new Error(`${relative(installed, file)} imports ${s}`);
    if (s.startsWith('.')) walk(resolve(dirname(file), s), allowed, seen);
  }
};
walk(createRequire(import.meta.url).resolve('learn-kit/graph'), []);
walk(createRequire(import.meta.url).resolve('learn-kit/drill'), ['learn-kit/graph']);
walk(createRequire(import.meta.url).resolve('learn-kit/fresh'), []);
walk(createRequire(import.meta.url).resolve('learn-kit/learner'), ['learn-kit/graph']);
walk(createRequire(import.meta.url).resolve('learn-kit/recall'), []);

if (GRAPH_PACKAGE !== '@learn-kit/graph') throw new Error('GRAPH_PACKAGE: ' + GRAPH_PACKAGE);
console.log('learn-kit/graph imports');
if (DRILL_PACKAGE !== '@learn-kit/drill') throw new Error('DRILL_PACKAGE: ' + DRILL_PACKAGE);
console.log('learn-kit/drill imports');
if (FRESH_PACKAGE !== '@learn-kit/fresh') throw new Error('FRESH_PACKAGE: ' + FRESH_PACKAGE);
console.log('learn-kit/fresh imports');
if (LEARNER_PACKAGE !== '@learn-kit/learner') throw new Error('LEARNER_PACKAGE: ' + LEARNER_PACKAGE);
console.log('learn-kit/learner imports');
if (RECALL_PACKAGE !== '@learn-kit/recall') throw new Error('RECALL_PACKAGE: ' + RECALL_PACKAGE);
console.log('learn-kit/recall imports');
JS
(cd "$app" && node graph.mjs)
echo 'consumer smoke test passed'
