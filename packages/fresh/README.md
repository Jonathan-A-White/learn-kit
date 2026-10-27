# @learn-kit/fresh

Proving on questions the learner has not seen, shared by Lampas and Kestrel. A learner who misses an idea and then answers it right
may only be remembering the answer, so this library keeps, for each idea, a ledger of the question keys he has been asked, and a
rule: a right answer after a miss counts as known only when a question he has not been asked before is right. It also keeps fresh questions ready
ahead of need (the ask-ahead stock), so a drill never waits for a mill. Over injected stores (`FreshStore`, `StockStore`), so an app
keeps the ledger, the marks and the stock in Dexie or in memory. No React, no Dexie, no subject: it declares no
dependency and imports no other kit library, and a test holds that.

## Install

From GitHub, by pinned commit (there is no registry; `prepare` builds the libraries on install). The repo's
[README](../../README.md#install) has the details.

```bash
npm install github:Jonathan-A-White/learn-kit#<full commit SHA>
```

```ts
import { recordAnswer } from 'learn-kit/fresh';
```

## Use

The examples below are run by `tests/readme.test.ts`.

A question key is any string the app makes of a question (its prompt and its reference, say); the library never reads it.

### the ledger: `markAsked`, `asked`, `isFresh`, `LEDGER_CAP`

```ts
import { LEDGER_CAP, MemoryFreshStore, asked, isFresh, markAsked } from 'learn-kit/fresh';

const store = new MemoryFreshStore(); // an app injects its own FreshStore
await markAsked(store, 'verbs', 'q1');
await markAsked(store, 'verbs', 'q2');
await markAsked(store, 'verbs', 'q1'); // asked again: it moves up, and is kept once
await asked(store, 'verbs'); // ['q2', 'q1'], oldest first
await isFresh(store, 'verbs', 'q3'); // true: never asked
await isFresh(store, 'verbs', 'q1'); // false
```

An idea keeps its newest `LEDGER_CAP` keys (30, PROVISIONAL) and drops the oldest.

### a drill that records an answer: `recordAnswer`, `toConfirm`, `isToConfirm`

```ts
import { MemoryFreshStore, isToConfirm, recordAnswer, toConfirm } from 'learn-kit/fresh';

const store = new MemoryFreshStore();
// missedBefore is the app's reading of its own rows: a lapse, or a miss among the idea's last answers
const verdict = await recordAnswer(store, 'verbs', 'q1', true, { missedBefore: true });
// 'known'      a right answer to count: advance the row as for any right answer (the mark is cleared)
// 'to-confirm' a right on a seen key after a miss: do not advance, ask for fresh questions (the idea is marked)
// 'seen'       a right on a seen key, the idea never missed: counts for nothing, no advance, no mark change
// 'missed'     a wrong answer: write the miss as before (the mark is cleared)
// here the key was fresh, so: 'known'
await recordAnswer(store, 'verbs', 'q1', true, { missedBefore: true }); // 'to-confirm': q1 is seen now
await isToConfirm(store, 'verbs'); // true
await toConfirm(store); // ['verbs']
await recordAnswer(store, 'verbs', 'q2', true, { missedBefore: true }); // 'known': a fresh right clears the mark
```

The loop an app runs: a miss (`'missed'`), a right on the same question (`'to-confirm'`, ask for fresh ones), then a fresh right
(`'known'`) or a fresh wrong (`'missed'` again). Every answer, right or wrong, notes its key as asked; freshness is read before the
key is written, so the first answer on a key is on a fresh key. A fresh right is `'known'` whether or not the idea was missed or
marked. A hinted right answer confirms nothing: the app does not record it.

### the ask-ahead stock: `createStock`

```ts
import { MemoryFreshStore, MemoryStockStore, createStock } from 'learn-kit/fresh';

// the app's ask: its mill call, its check, its item shape. It resolves [] when it cannot ask (offline, no key, no licence).
const ask = async (idea, { count, avoid }) => {
  const made = await callMill({ idea, count, avoid }); // the app's, never the kit's
  return made.filter(itemPassesTheCheck); // the app's
};
const stock = createStock({
  ask,
  keyOf: (item) => item.prompt, // the item's question key
  store: new MemoryStockStore(), // an app injects its own StockStore
  fresh: new MemoryFreshStore(), // optional: the ledger; a key in it is never kept or served
  lowWater: 2, // under this many kept items an idea is topped up (the default)
  cap: 6, // most kept per idea (the default)
});

stock.opened('verbs'); // a drill, a Review round or Prove it opens on the idea: tops up when low. Returns at once.
const item = await stock.take('verbs'); // the oldest kept item, served once; undefined when none. Tops up when low.
stock.rightAfterMiss('verbs'); // the 'to-confirm' verdict: a fresh question is needed next, so tops up even when not low
stock.inFlight('verbs'); // true while an ask runs: 'More questions are on their way'
```

`topUp(idea, avoid)` asks for `cap - kept` items and keeps what comes back up to the newest `cap`, dropping a returned item whose key is
in `avoid`, in the ledger, already kept or repeated. The ask is told those same keys to avoid. One ask is in flight for the whole stock:
a `topUp` while one runs returns the same promise. A failed ask (a rejection) leaves the stock as it was and is not retried by the kit; an ask
that resolves `[]` keeps nothing and stops. `opened`, `served` (which `take` calls) and `rightAfterMiss` return at once and are never awaited;
`settle()` waits for the ask in flight, and is for tests. An app draws with `stockThenMaker(stock, maker)` from `learn-kit/drill`: items from
the stock first, the rest from the app's maker.

### a walk that proves on fresh questions: `isFresh` with `learn-kit/drill`

```ts
import { answerWalk, currentQuestion, numberSteps, startWalk } from 'learn-kit/drill';
import { asked } from 'learn-kit/fresh';

// `store` and `asked` as above; read the ledger first (the walk's option is synchronous), then hand the walk a plain function
const seen = new Set(await asked(store, 'verbs'));
let walk = startWalk(graph, 'verbs', levels, numberSteps(rawSteps), { isFresh: (key) => !seen.has(key) });
// a right answer on a key in `seen` neither counts toward the proved streak nor breaks it
walk = answerWalk(walk, true, false);
```

## Provisional constants

| Name | Value | What |
| --- | --- | --- |
| `LEDGER_CAP` | 30 | Keys kept per idea; the oldest is dropped past it. |
| `STOCK_CAP` | 6 | Items the stock keeps per idea at most; a top-up asks for the room that is left. |
| `STOCK_LOW_WATER` | 2 | An idea with fewer kept items than this is topped up in the background. |
