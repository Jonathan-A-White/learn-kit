// The seen ledger: the question keys the learner has been asked on each idea, so a question can be told fresh (never asked) from seen. A key is
// whatever string the app makes of a question (its prompt and its reference, say).
import type { FreshStore } from './store.js';

/** Keys kept per idea; the oldest is dropped past it. PROVISIONAL. */
export const LEDGER_CAP = 30;

/** The keys asked on the idea, oldest first. A copy: changing it changes nothing stored. */
export async function asked(store: FreshStore, idea: string): Promise<string[]> {
  return [...(await store.getAsked(idea))];
}

/** Whether the key has not been asked on the idea (is not in its ledger). */
export async function isFresh(store: FreshStore, idea: string, key: string): Promise<boolean> {
  return !(await store.getAsked(idea)).includes(key);
}

/** Notes that the key was asked: it becomes the newest of its idea (asked again, it moves up, kept once) and the idea keeps its newest LEDGER_CAP. */
export async function markAsked(store: FreshStore, idea: string, key: string): Promise<void> {
  const kept = (await store.getAsked(idea)).filter((k) => k !== key);
  await store.putAsked(idea, [...kept, key].slice(-LEDGER_CAP));
}
