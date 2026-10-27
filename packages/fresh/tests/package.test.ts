// The package's rules: the exports map resolves './fresh', no React, no Dexie, no subject, no import of any other library, and no module-level state.
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { FRESH_PACKAGE } from '../src/index.js';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const repo = resolve(root, '..', '..');
const srcDir = join(root, 'src');
const files = readdirSync(srcDir).filter((f) => /\.ts$/.test(f));
const read = (f: string): string => readFileSync(join(srcDir, f), 'utf-8');

describe('@learn-kit/fresh', () => {
  it('exports its own name', () => {
    expect(FRESH_PACKAGE).toBe('@learn-kit/fresh');
  });

  it("is mapped as './fresh' in the root exports, onto its dist, beside './drill'", () => {
    const pkg = JSON.parse(readFileSync(join(repo, 'package.json'), 'utf-8')) as { exports: Record<string, unknown>; scripts: Record<string, string> };
    expect(pkg.exports['./fresh']).toEqual({ types: './packages/fresh/dist/index.d.ts', default: './packages/fresh/dist/index.js' });
    expect(Object.keys(pkg.exports).indexOf('./fresh')).toBeGreaterThan(Object.keys(pkg.exports).indexOf('./drill'));
    expect(pkg.scripts.build).toContain('packages/fresh/tsconfig.build.json');
  });

  it('has source to check', () => {
    expect(files).toEqual(expect.arrayContaining(['index.ts', 'ledger.ts', 'confirm.ts', 'store.ts']));
  });

  it('imports nothing but its own files', () => {
    const specifiers = files.flatMap((f) => [...read(f).matchAll(/^(?:import|export)\b[^;]*?\bfrom\s*['"]([^'"]+)['"]|\bimport\s*\(?\s*['"]([^'"]+)['"]/gm)].map((m) => m[1] ?? m[2]));
    expect(specifiers.filter((s) => !s.startsWith('./'))).toEqual([]);
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

  it('does nothing at import: no call at the top level of a source file', () => {
    const calls = files.flatMap((f) =>
      read(f)
        .split('\n')
        .filter((line) => /^[A-Za-z_$][\w$.]*\(/.test(line) || /^(await|void)\b/.test(line))
        .map((line) => `${f}: ${line}`),
    );
    expect(calls).toEqual([]);
  });
});
