// fold and foldWords (src/fold.ts): the one folding Lampas wrote twice, in bare() and normalWord.
import { describe, expect, it } from 'vitest';
import { fold, foldWords } from '../src/index.js';

describe('fold', () => {
  it('takes off accents, breathings and case', () => {
    expect(fold('Οἴδαμεν δὲ ὅτι')).toBe('οιδαμεν δε οτι');
  });

  it('folds a final sigma to σ', () => {
    expect(fold('λόγος')).toBe('λογοσ');
    expect(fold('λόγοσ')).toBe('λογοσ');
  });

  it('folds NFC and NFD spellings alike', () => {
    const nfc = 'σβέννυτε'.normalize('NFC');
    const nfd = 'σβέννυτε'.normalize('NFD');
    expect(nfc).not.toBe(nfd);
    expect(fold(nfc)).toBe(fold(nfd));
    expect(fold(nfc)).toBe('σβεννυτε');
  });

  it('keeps English letters and digits and drops punctuation and case', () => {
    expect(fold('Blessed,')).toBe('blessed');
    expect(fold('“Rom. 8:28”')).toBe('rom 828');
    expect(fold('  so   loved \n')).toBe('so loved');
    expect(fold('')).toBe('');
  });
});

describe('foldWords', () => {
  it('splits on any white space and drops empties', () => {
    expect(foldWords('  For God\tso loved\n the   world, ')).toEqual(['for', 'god', 'so', 'loved', 'the', 'world']);
  });

  it('drops a word that is only punctuation', () => {
    expect(foldWords('Blessed — are the meek')).toEqual(['blessed', 'are', 'the', 'meek']);
  });

  it('folds Greek words', () => {
    expect(foldWords('Οἴδαμεν δὲ ὅτι')).toEqual(['οιδαμεν', 'δε', 'οτι']);
  });
});
