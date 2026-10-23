// hideWords: which words of a target a rung hides. The hidden words are spread evenly across the text, never two neighbours while a gap is
// free, and the same seed hides the same words.

/** mulberry32: a small seeded generator, 0 <= x < 1. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** k indexes of 0..n-1, no two neighbours, one at random from each of k even slots (needs 2k - 1 <= n). */
function spread(n: number, k: number, rand: () => number): number[] {
  const room = n - (k - 1); // squeeze a free gap in after each pick, then widen it back
  const picks: number[] = [];
  for (let j = 0; j < k; j++) {
    const lo = Math.floor((j * room) / k);
    const hi = Math.floor(((j + 1) * room) / k);
    picks.push(lo + Math.floor(rand() * (hi - lo)) + j);
  }
  return picks;
}

/**
 * The indexes a rung hides: round(count * share) of 0..count-1, spread evenly and seeded. Share 0 hides none, 1 hides all; above a half
 * it is the words left showing that are kept apart.
 */
export function hideWords(count: number, share: number, seed: number): Set<number> {
  const n = Math.max(0, Math.floor(count));
  const k = Math.min(n, Math.max(0, Math.round(n * Math.min(1, Math.max(0, share)))));
  const rand = mulberry32(seed);
  if (2 * k - 1 <= n) return new Set(spread(n, k, rand));
  const shown = new Set(spread(n, n - k, rand));
  return new Set(Array.from({ length: n }, (_, i) => i).filter((i) => !shown.has(i)));
}
