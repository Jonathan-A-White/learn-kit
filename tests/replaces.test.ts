import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

// docs/replaces.md is the sweep of what learn-kit replaces in Lampas, spell-forge and legend (mw-79en7t.28): a table of rows,
// each a file:line and a verdict word. The files are in other repos, so this test holds the shape of the document, not the code.
const DOC = fileURLToPath(new URL('../docs/replaces.md', import.meta.url));
const GRAPH_INDEX = fileURLToPath(new URL('../packages/graph/src/index.ts', import.meta.url));

const VERDICTS = ['covered', 'not-covered', 'not-scheduler'];
const WHERE = /^`(lampas|spell-forge|legend)\/[\w./-]+\.(ts|tsx):[1-9]\d*(-[1-9]\d*)?`$/;

interface Row {
  where: string;
  verdict: string;
  why: string;
}

function rowsOf(text: string): Row[] {
  return text
    .split('\n')
    .filter((line) => line.startsWith('|') && !/^\|[\s:|-]+\|$/.test(line))
    .map((line) => line.split('|').slice(1, -1).map((cell) => cell.trim()))
    .filter((cells) => cells[0] !== 'Where')
    .map(([where, verdict, why]) => ({ where, verdict, why: why ?? '' }));
}

describe('docs/replaces.md', () => {
  it('exists', () => {
    expect(existsSync(DOC)).toBe(true);
  });

  const rows = existsSync(DOC) ? rowsOf(readFileSync(DOC, 'utf8')) : [];

  it('has rows', () => {
    expect(rows.length).toBeGreaterThan(20);
  });

  it('gives every row a file:line in lampas, spell-forge or legend', () => {
    expect(rows.filter((r) => !WHERE.test(r.where)).map((r) => r.where)).toEqual([]);
  });

  it('gives every row a verdict word and a reason', () => {
    expect(rows.filter((r) => !VERDICTS.includes(r.verdict)).map((r) => `${r.where}: ${r.verdict}`)).toEqual([]);
    expect(rows.filter((r) => r.why.length < 10).map((r) => r.where)).toEqual([]);
  });

  it('names an export of learn-kit/graph in every row it says learn-kit covers', () => {
    const covered = rows.filter((r) => r.verdict === 'covered');
    expect(covered.length).toBeGreaterThan(0);
    const exports = [...readFileSync(GRAPH_INDEX, 'utf8').matchAll(/export\s*\{([^}]*)\}/g)].flatMap((m) =>
      m[1].split(',').map((name) => name.trim().replace(/^type\s+/, '')).filter(Boolean),
    );
    const exported = new Set(exports);
    const named = (why: string): string[] => [...why.matchAll(/`(\w+)`/g)].map((m) => m[1]);
    expect(covered.filter((r) => !named(r.why).some((n) => exported.has(n))).map((r) => r.where)).toEqual([]);
  });

  it('lists the files the story names', () => {
    const files = new Set(rows.map((r) => r.where.replace(/:.*$/, '').replace(/^`/, '')));
    for (const file of [
      'lampas/src/data/grammar/pathGraph.ts',
      'lampas/src/data/grammar/ladder.ts',
      'lampas/src/data/grammar/placement.ts',
      'lampas/src/data/grammar/drillIt.ts',
      'lampas/src/data/schedule.ts',
      'lampas/src/data/repositories/grammarLevels.ts',
      'spell-forge/src/core/spaced-rep/scheduler.ts',
      'spell-forge/src/core/spaced-rep/buckets.ts',
      'spell-forge/src/core/spaced-rep/difficulty.ts',
      'spell-forge/src/core/spaced-rep/test-demotion.ts',
      'spell-forge/src/core/adaptive/engine.ts',
      'spell-forge/src/core/learning/engine.ts',
    ]) {
      expect(files.has(file), file).toBe(true);
    }
    expect([...files].some((f) => f.startsWith('legend/'))).toBe(true);
  });
});
