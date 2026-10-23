// matchSequence: the words of a target heard in order against what was said. The longest common subsequence of the folded words, so order
// counts, while a word said twice or an extra word costs nothing.
import { fold as defaultFold } from './fold.js';

/** The share of the target's words that must be heard for a pass. */
export const DEFAULT_PASS = 0.9;

export interface MatchOptions {
  /** the share of the target's words heard in order that passes; DEFAULT_PASS (90%) by default */
  pass?: number;
  /** folds a word before it is compared; the package's fold by default */
  fold?: (word: string) => string;
}

export interface Match {
  /** hits / target.length; 1 for an empty target */
  score: number;
  /** the target's indexes heard, in order */
  hits: number[];
  /** the target's indexes not heard */
  misses: number[];
  /** the said words' indexes not used by a hit */
  extras: number[];
  /** whether score reaches the pass share */
  passed: boolean;
}

/**
 * Match what was said against a target, word by word. A word that folds to nothing is never a hit. An empty target scores 1 and passes;
 * nothing said scores 0.
 */
export function matchSequence(target: readonly string[], said: readonly string[], options: MatchOptions = {}): Match {
  const pass = options.pass ?? DEFAULT_PASS;
  const f = options.fold ?? defaultFold;
  const t = target.map(f);
  const s = said.map(f);
  const n = t.length;
  const m = s.length;

  // lcs[i][j]: the length of the longest common subsequence of t[i..] and s[j..]
  const lcs: number[][] = Array.from({ length: n + 1 }, () => new Array<number>(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      const same = t[i] !== '' && t[i] === s[j];
      lcs[i]![j] = same ? lcs[i + 1]![j + 1]! + 1 : Math.max(lcs[i + 1]![j]!, lcs[i]![j + 1]!);
    }
  }

  const hits: number[] = [];
  const used = new Set<number>();
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (t[i] !== '' && t[i] === s[j] && lcs[i]![j] === lcs[i + 1]![j + 1]! + 1) {
      hits.push(i);
      used.add(j);
      i++;
      j++;
    } else if (lcs[i + 1]![j]! >= lcs[i]![j + 1]!) i++;
    else j++;
  }

  const hit = new Set(hits);
  const misses = t.map((_, k) => k).filter((k) => !hit.has(k));
  const extras = s.map((_, k) => k).filter((k) => !used.has(k));
  const score = n === 0 ? 1 : hits.length / n;
  return { score, hits, misses, extras, passed: score >= pass - 1e-9 };
}
