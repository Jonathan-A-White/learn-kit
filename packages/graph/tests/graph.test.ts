// The placeholder test of an empty @learn-kit/graph: the package builds and exports one symbol until the graph is carved
// into it, and the package keeps the rule that makes it a Lego block: no React, no Dexie, no subject.
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { GRAPH_PACKAGE } from '../src/index.js';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const srcDir = join(root, 'src');
const files = readdirSync(srcDir).filter((f) => /\.tsx?$/.test(f));
const read = (f: string): string => readFileSync(join(srcDir, f), 'utf-8');

describe('@learn-kit/graph', () => {
  it('exports its placeholder, its own name', () => {
    expect(GRAPH_PACKAGE).toBe('@learn-kit/graph');
  });

  it('has source to check', () => {
    expect(files.length).toBeGreaterThan(0);
  });

  it('imports nothing from React or Dexie', () => {
    const specifiers = files.flatMap((f) => [...read(f).matchAll(/\b(?:from|import)\s*\(?\s*['"]([^'"]+)['"]/g)].map((m) => m[1]));
    expect(specifiers.filter((s) => /^(react|react-dom|dexie)(\/|$)/.test(s))).toEqual([]);
  });

  it('has no dependency on react or dexie, of any kind, in its package.json', () => {
    const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf-8')) as Record<string, Record<string, unknown> | undefined>;
    const kinds = ['dependencies', 'devDependencies', 'optionalDependencies', 'peerDependencies'];
    const declared = kinds.flatMap((k) => Object.keys(pkg[k] ?? {}));
    expect(declared.filter((name) => /^(react|react-dom|dexie)$/.test(name) || /^@types\/react/.test(name))).toEqual([]);
  });
});
