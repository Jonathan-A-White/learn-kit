# Changelog: @learn-kit/fresh

Newest first. Breaking changes come first in a release, each with its migration in one sentence.

## 0.2.0 (2026-10-27)

- New: the ask-ahead stock (mw-dglxgdz.2), carved from Lampas's `moreItems.ts` and `fetchedItems.ts`. `createStock({ ask, keyOf, store, fresh?,
  lowWater = 2, cap = 6 })` keeps fresh items per idea over an injected `StockStore` (`MemoryStockStore` for tests): `take` serves the oldest
  once, `count`, `topUp(idea, avoid)` asks for `cap - kept` (never a key in `avoid`, in the ledger, kept already or repeated; one ask in flight
  for the whole stock, a second call sharing its promise; a failed ask leaves the stock as it was) and `inFlight` says whether an ask runs.
- New: the triggers, never awaited: `opened`, `served` (which `take` calls) and `rightAfterMiss` top up when an idea has fewer than `lowWater`
  items, `rightAfterMiss` even when it has not. `settle()` is for tests. `STOCK_CAP` and `STOCK_LOW_WATER` are PROVISIONAL.

## 0.1.0 (2026-10-27)

- New: the fresh library, carved from Lampas (mw-dglxgdz.1), over an injected `FreshStore`, with no React, no Dexie and no subject.
- New: the seen ledger: `markAsked(store, idea, key)` keeps an idea's newest `LEDGER_CAP` (30, PROVISIONAL) question keys, a key
  asked again moving up and kept once; `asked` lists them oldest first; `isFresh` says whether a key is not in the ledger.
- New: the confirm-on-fresh rule: `recordAnswer(store, idea, key, right, { missedBefore })` returns `'known'` (a right answer on a
  fresh key), `'to-confirm'` (a right on a seen key after a miss; the idea is marked), `'seen'` (a right on a seen key, never missed)
  or `'missed'` (a wrong answer; the mark is cleared), and notes the key as asked. `toConfirm` and `isToConfirm` read the marks.
- New: `MemoryFreshStore`, for tests.
