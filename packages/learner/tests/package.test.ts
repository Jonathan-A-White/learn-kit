// The package's rules: no React, no Dexie, no subject, and no module-level state (the profile and the goal are the caller's data).
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { LEARNER_PACKAGE } from '../src/index.js';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const srcDir = join(root, 'src');
const files = readdirSync(srcDir).filter((f) => /\.ts$/.test(f));
const read = (f: string): string => readFileSync(join(srcDir, f), 'utf-8');

describe('@learn-kit/learner', () => {
  it('exports its own name', () => {
    expect(LEARNER_PACKAGE).toBe('@learn-kit/learner');
  });

  it('has source to check', () => {
    expect(files).toEqual(expect.arrayContaining(['index.ts', 'profile.ts', 'goal.ts', 'scaffold.ts']));
  });

  it('imports nothing but learn-kit/graph and its own files', () => {
    const specifiers = files.flatMap((f) => [...read(f).matchAll(/^(?:import|export)\b[^;]*?\bfrom\s*['"]([^'"]+)['"]|\bimport\s*\(?\s*['"]([^'"]+)['"]/gm)].map((m) => m[1] ?? m[2]));
    expect(specifiers).toContain('learn-kit/graph');
    expect(specifiers.filter((s) => s !== 'learn-kit/graph' && !s.startsWith('./'))).toEqual([]);
  });

  it('holds nothing about a subject or an app', () => {
    const named = files.flatMap((f) => [...read(f).matchAll(/\b(greek|spanish|hebrew|maths?|spelling|sat|grammar|lampas|kestrel)\b/gi)].map((m) => `${f}: ${m[0]}`));
    expect(named).toEqual([]);
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
