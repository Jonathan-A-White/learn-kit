# Changelog: @learn-kit/recall

Newest first. Breaking changes come first in a release, each with its migration in one sentence.

## 0.1.0 (2026-10-23)

- New: the recall library (mw-fu7dqf.2), with no React, no Dexie and no subject.
- New: `fold` and `foldWords`, the folding Lampas wrote twice (`bare()` and `normalWord`) as one: accents and breathings off (NFD, then
  every mark removed), lower case, a final sigma as `σ`, punctuation off.
- New: `matchSequence`, the words of a target heard in order against what was said (the longest common subsequence of the folded
  words): `score`, `hits`, `misses` by target index, `extras` by said index, and `passed` at a share, 90% by default.
- New: `hideWords`, which words of a target a rung hides: `round(count * share)` of them, spread evenly, seeded.
