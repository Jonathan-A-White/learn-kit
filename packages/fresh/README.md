# @learn-kit/fresh

Proving on questions the learner has not seen, shared by Lampas and Kestrel. A learner who misses an idea and then answers it right
may only be remembering the answer, so this library keeps, for each idea, a ledger of the question keys he has been asked, and a
rule: a right answer after a miss counts as known only when a question he has not been asked before is right. Over an injected store
(`FreshStore`), so an app keeps the ledger and the marks in Dexie or in memory. No React, no Dexie, no subject: it declares no
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
