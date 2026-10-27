// The seen ledger (src/ledger.ts): the keys asked on an idea, newest kept up to LEDGER_CAP, oldest first.
import { describe, expect, it } from 'vitest';
import { LEDGER_CAP, MemoryFreshStore, asked, isFresh, markAsked } from '../src/index.js';

describe('the ledger', () => {
  it('holds 30 keys at most (PROVISIONAL)', () => {
    expect(LEDGER_CAP).toBe(30);
  });

  it('is empty for an idea nothing was asked on, and every key is fresh', async () => {
    const store = new MemoryFreshStore();
    expect(await asked(store, 'verbs')).toEqual([]);
    expect(await isFresh(store, 'verbs', 'q1')).toBe(true);
  });

  it('keeps the keys oldest first', async () => {
    const store = new MemoryFreshStore();
    for (const key of ['q1', 'q2', 'q3']) await markAsked(store, 'verbs', key);
    expect(await asked(store, 'verbs')).toEqual(['q1', 'q2', 'q3']);
  });

  it('says a key is fresh until it is asked, and not fresh after', async () => {
    const store = new MemoryFreshStore();
    await markAsked(store, 'verbs', 'q1');
    expect(await isFresh(store, 'verbs', 'q1')).toBe(false);
    expect(await isFresh(store, 'verbs', 'q2')).toBe(true);
  });

  it('keeps each idea its own ledger', async () => {
    const store = new MemoryFreshStore();
    await markAsked(store, 'verbs', 'q1');
    expect(await isFresh(store, 'nouns', 'q1')).toBe(true);
    expect(await asked(store, 'nouns')).toEqual([]);
  });

  it('keeps a key asked twice once, as the newest', async () => {
    const store = new MemoryFreshStore();
    for (const key of ['q1', 'q2', 'q1']) await markAsked(store, 'verbs', key);
    expect(await asked(store, 'verbs')).toEqual(['q2', 'q1']);
  });

  it('drops the oldest past the cap', async () => {
    const store = new MemoryFreshStore();
    for (let i = 0; i < LEDGER_CAP + 5; i += 1) await markAsked(store, 'verbs', `q${i}`);
    const kept = await asked(store, 'verbs');
    expect(kept).toHaveLength(LEDGER_CAP);
    expect(kept[0]).toBe('q5');
    expect(kept[LEDGER_CAP - 1]).toBe(`q${LEDGER_CAP + 4}`);
    expect(await isFresh(store, 'verbs', 'q0')).toBe(true);
  });

  it('hands out a copy: changing what asked returned changes nothing stored', async () => {
    const store = new MemoryFreshStore();
    await markAsked(store, 'verbs', 'q1');
    (await asked(store, 'verbs')).push('q2');
    expect(await asked(store, 'verbs')).toEqual(['q1']);
  });
});
