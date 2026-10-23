# @learn-kit/recall

Saying a text from memory, shared by Lampas and Kestrel: the folding that makes what was said comparable with what was meant, the
words of a text, a matcher that hears a target's words in order, and which words of a target a rung hides. Generic over any
language and any subject: the app brings the target and what was heard. No React, no Dexie, no subject: it declares no dependency
and imports no other learn-kit library, and a test holds that.

## Install

From GitHub, by pinned commit (there is no registry; `prepare` builds the libraries on install). The repo's
[README](../../README.md#install) has the details.

```bash
npm install github:Jonathan-A-White/learn-kit#<full commit SHA>
```

```ts
import { matchSequence } from 'learn-kit/recall';
```

## Use

The example below is run by `tests/readme.test.ts`.

```ts
import { DEFAULT_PASS, RECALL_PACKAGE, fold, foldWords, hideWords, matchSequence } from 'learn-kit/recall';

// fold: accents, breathings, case, final sigma and punctuation off
fold('Οἴδαμεν δὲ ὅτι'); // 'οιδαμεν δε οτι'
fold('λόγος'); // 'λογοσ'
fold('Blessed,'); // 'blessed'
foldWords('For God so  loved'); // ['for', 'god', 'so', 'loved']

// matchSequence: the words of a target heard in order against what was said
const target = foldWords('We know that all things work together for good');
const heard = matchSequence(target, foldWords('we know that all things work for good um'));
heard.score; // 8 / 9 hit: 0.888...
heard.hits; // [0, 1, 2, 3, 4, 5, 7, 8]
heard.misses; // [6]: 'together'
heard.extras; // [8]: 'um' costs nothing
heard.passed; // false: a pass is 90% (DEFAULT_PASS), and 8 of 9 is 89%
matchSequence(target, foldWords('we know that all things work for good'), { pass: 0.8 }).passed; // true

// hideWords: the indexes a rung hides, spread evenly, never two neighbours while a gap is free, the same for the same seed
const shown = target.map((word, i) => (hideWords(target.length, 0.5, 7).has(i) ? '_'.repeat(word.length) : word));
```

## The pieces

| Export | What it is |
| --- | --- |
| `fold(text)` | The text with accents and breathings off (NFD, then every mark removed), lower case, a final sigma `ς` as `σ`, and everything but letters, digits and white space dropped; white space is kept as single spaces. |
| `foldWords(text)` | The folded words of a text, split on any white space, empties dropped. |
| `matchSequence(target, said, { pass, fold })` | The longest common subsequence of the folded words: `{ score, hits, misses, extras, passed }`. Order counts; a word said twice or an extra word costs nothing. An empty target scores 1 and passes; nothing said scores 0. `pass` is 0.9 by default (`DEFAULT_PASS`). |
| `hideWords(count, share, seed)` | A `Set` of `round(count * share)` indexes to hide, spread evenly, never two neighbours while a gap is free, deterministic for a seed (mulberry32). Share 0 hides none, 1 hides all. |
| `RECALL_PACKAGE` | The package's name, `'@learn-kit/recall'`. |
