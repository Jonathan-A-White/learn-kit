// @learn-kit/fresh: proving on questions the learner has not seen. A capped ledger of the question keys asked on each idea, and the confirm-on-fresh
// rule: a right answer after a miss may be only remembering, so it counts as known when a fresh question is right. Over an injected store. No React,
// no Dexie, no subject.

/** The package's own name. */
export const FRESH_PACKAGE = '@learn-kit/fresh';

export { LEDGER_CAP, asked, isFresh, markAsked } from './ledger.js';
export { isToConfirm, recordAnswer, toConfirm, type AnswerOptions, type Verdict } from './confirm.js';
export { MemoryFreshStore, type FreshStore, type MemoryFreshInitial } from './store.js';
