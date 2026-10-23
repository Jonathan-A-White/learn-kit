// fold: the one folding for comparing what was said with what was meant, whatever the language. Accents and breathings go (NFD, then every
// mark removed), case goes, a final sigma is a sigma, and everything that is not a letter, a digit or white space goes (white space is kept,
// as single spaces, so a whole phrase folds to a phrase). It is the union of the two foldings Lampas wrote, one for single words and one for
// readings.

/** A text folded for comparison: 'Οἴδαμεν δὲ' -> 'οιδαμεν δε', 'λόγος' -> 'λογοσ', 'Blessed,' -> 'blessed'. */
export function fold(text: string): string {
  return text
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/ς/g, 'σ')
    .replace(/[^\p{L}\p{N}\s]/gu, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** The folded words of a text, split on white space, with those that fold to nothing (a lone dash, say) dropped. */
export function foldWords(text: string): string[] {
  return text
    .split(/\s+/)
    .map(fold)
    .filter((w) => w !== '');
}
