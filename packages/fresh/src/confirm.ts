// The confirm-on-fresh rule: an idea he missed before and then answers right is not yet known,
// because he may only be remembering the answer; it counts as known when a question he has not been asked before is right, and a miss on one
// returns it to missed. The rule decides; the app writes its own rows from the verdict.
import { isFresh, markAsked } from './ledger.js';
import type { FreshStore } from './store.js';

/**
 * What the app does with an answer:
 *   'known'      a right answer to count: advance the row as for any right answer (the mark is cleared);
 *   'to-confirm' a right answer on a seen question after a miss: do not advance, ask for fresh questions (the idea is marked);
 *   'seen'       a right answer on a seen question, the idea never missed: counts for nothing, no advance, no mark change;
 *   'missed'     a wrong answer: write the miss as before (the mark is cleared).
 */
export type Verdict = 'known' | 'to-confirm' | 'seen' | 'missed';

export interface AnswerOptions {
  /** The app's reading of its own rows before this answer: a lapse, or a miss among the idea's last answers, that is not made good since. */
  missedBefore: boolean;
}

/** The ideas marked to confirm. */
export async function toConfirm(store: FreshStore): Promise<string[]> {
  return [...(await store.listToConfirm())];
}

/** Whether the idea is marked to confirm. */
export async function isToConfirm(store: FreshStore, idea: string): Promise<boolean> {
  return (await store.listToConfirm()).includes(idea);
}

/**
 * Records one answer to a question (its key) on an idea, and returns the verdict. Every answer, right or wrong, notes the key as asked, after
 * freshness is read, so the first answer on a key is on a fresh key. A right answer on a fresh key is 'known' (and clears the mark); on a seen
 * key it is 'to-confirm' (and sets the mark) when the idea was missed before, else 'seen'. A wrong answer is 'missed' and clears the mark.
 * A hinted right answer is the app's to leave out: it confirms nothing.
 */
export async function recordAnswer(store: FreshStore, idea: string, key: string, right: boolean, options: AnswerOptions): Promise<Verdict> {
  const fresh = await isFresh(store, idea, key);
  await markAsked(store, idea, key);
  if (!right) {
    await store.clearToConfirm(idea);
    return 'missed';
  }
  if (fresh) {
    await store.clearToConfirm(idea);
    return 'known';
  }
  if (!options.missedBefore) return 'seen';
  await store.markToConfirm(idea);
  return 'to-confirm';
}
