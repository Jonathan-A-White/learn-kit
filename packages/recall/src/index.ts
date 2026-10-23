// @learn-kit/recall: saying a text from memory. The folding that makes what was said comparable with what was meant, the words of a text, a
// matcher that hears a target's words in order, and which words of a target a rung hides. No React, no Dexie, no subject.

/** The package's own name. */
export const RECALL_PACKAGE = '@learn-kit/recall';

export { fold, foldWords } from './fold.js';
export { DEFAULT_PASS, matchSequence, type Match, type MatchOptions } from './match.js';
export { hideWords } from './hide.js';
