// @learn-kit/fresh: proving on questions the learner has not seen. A capped ledger of the question keys asked on each idea, and the confirm-on-fresh
// rule: a right answer after a miss may be only remembering, so it counts as known when a fresh question is right; and the ask-ahead stock that keeps fresh
// questions ready so nothing waits. Over injected stores. No React, no Dexie, no subject.

/** The package's own name. */
export const FRESH_PACKAGE = '@learn-kit/fresh';

export { LEDGER_CAP, asked, isFresh, markAsked } from './ledger.js';
export { isToConfirm, recordAnswer, toConfirm, type AnswerOptions, type Verdict } from './confirm.js';
export { MemoryFreshStore, MemoryStockStore, type FreshStore, type MemoryFreshInitial, type MemoryStockInitial, type StockStore } from './store.js';
export { STOCK_CAP, STOCK_LOW_WATER, createStock, type AskRequest, type Stock, type StockOptions } from './stock.js';
