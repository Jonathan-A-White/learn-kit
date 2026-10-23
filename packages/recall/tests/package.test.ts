// The package's rules: no React, no Dexie, no subject, no other learn-kit library, no dependency, and no module-level state.
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { RECALL_PACKAGE } from '../src/index.js';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const srcDir = join(root, 'src');
const files = readdirSync(srcDir).filter((f) => /\.ts$/.test(f));
const read = (f: string): string => readFileSync(join(srcDir, f), 'utf-8');

describe('@learn-kit/recall', () => {
  it('exports its own name', () => {
    expect(RECALL_PACKAGE).toBe('@learn-kit/recall');
  });

  it('imports nothing but its own files', () => {
    const specifiers = files.flatMap((f) => [...read(f).matchAll(/^(?:import|export)\b[^;]*?\bfrom\s*['"]([^'"]+)['"]|\bimport\s*\(?\s*['"]([^'"]+)['"]/gm)].map((m) => m[1] ?? m[2]));
    expect(specifiers.filter((s) => !s.startsWith('./'))).toEqual([]);
  });

  it('has no dependency of any kind in its package.json', () => {
    const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf-8')) as Record<string, Record<string, unknown> | undefined>;
    const kinds = ['dependencies', 'devDependencies', 'optionalDependencies', 'peerDependencies'];
    expect(kinds.flatMap((k) => Object.keys(pkg[k] ?? {}))).toEqual([]);
  });

  it('declares no top-level let or var, and no top-level Map, Set or array it could fill', () => {
    const found = files.flatMap((f) =>
      read(f)
        .split('\n')
        .filter((line) => /^(export\s+)?(let|var)\s/.test(line) || /^(export\s+)?const\s+\w+(\s*:[^=]+)?=\s*(new\s+(Map|Set|WeakMap|Array)\b|\[)/.test(line))
        .map((line) => `${f}: ${line}`),
    );
    expect(found).toEqual([]);
  });
});
