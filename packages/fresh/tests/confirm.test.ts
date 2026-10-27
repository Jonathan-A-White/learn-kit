// The confirm-on-fresh rule (src/confirm.ts): what one answer does to an idea's 'to confirm' mark, and the verdict the app acts on.
import { describe, expect, it } from 'vitest';
import { MemoryFreshStore, asked, isFresh, isToConfirm, markAsked, recordAnswer, toConfirm } from '../src/index.js';

const missed = { missedBefore: true };
const clean = { missedBefore: false };

describe('a right answer on a fresh key', () => {
  it('is known when the idea was never missed, and marks nothing', async () => {
    const store = new MemoryFreshStore();
    expect(await recordAnswer(store, 'verbs', 'q1', true, clean)).toBe('known');
    expect(await isToConfirm(store, 'verbs')).toBe(false);
  });

  it('is known when the idea is to confirm, and clears the mark', async () => {
    const store = new MemoryFreshStore({ toConfirm: ['verbs'] });
    expect(await recordAnswer(store, 'verbs', 'q1', true, missed)).toBe('known');
    expect(await isToConfirm(store, 'verbs')).toBe(false);
  });

  it('is known when the idea was missed but is not marked yet (a fresh right confirms it)', async () => {
    const store = new MemoryFreshStore();
    expect(await recordAnswer(store, 'verbs', 'q1', true, missed)).toBe('known');
    expect(await toConfirm(store)).toEqual([]);
  });
});

describe('a right answer on a seen key', () => {
  it("is 'to-confirm' when the idea was missed before, and sets the mark", async () => {
    const store = new MemoryFreshStore();
    await markAsked(store, 'verbs', 'q1');
    expect(await recordAnswer(store, 'verbs', 'q1', true, missed)).toBe('to-confirm');
    expect(await isToConfirm(store, 'verbs')).toBe(true);
    expect(await toConfirm(store)).toEqual(['verbs']);
  });

  it('keeps one mark when it is marked already', async () => {
    const store = new MemoryFreshStore({ toConfirm: ['verbs'] });
    await markAsked(store, 'verbs', 'q1');
    expect(await recordAnswer(store, 'verbs', 'q1', true, missed)).toBe('to-confirm');
    expect(await toConfirm(store)).toEqual(['verbs']);
  });

  it("is 'seen' when the idea was never missed: no advance, no mark", async () => {
    const store = new MemoryFreshStore();
    await markAsked(store, 'verbs', 'q1');
    expect(await recordAnswer(store, 'verbs', 'q1', true, clean)).toBe('seen');
    expect(await isToConfirm(store, 'verbs')).toBe(false);
  });
});

describe('a wrong answer', () => {
  it("is 'missed' on a fresh key and on a seen one", async () => {
    const store = new MemoryFreshStore();
    await markAsked(store, 'verbs', 'q1');
    expect(await recordAnswer(store, 'verbs', 'q1', false, clean)).toBe('missed');
    expect(await recordAnswer(store, 'verbs', 'q2', false, missed)).toBe('missed');
  });

  it('clears the mark', async () => {
    const store = new MemoryFreshStore({ toConfirm: ['verbs', 'nouns'] });
    expect(await recordAnswer(store, 'verbs', 'q1', false, missed)).toBe('missed');
    expect(await toConfirm(store)).toEqual(['nouns']);
  });
});

describe('the ledger', () => {
  it('has the key once an answer is recorded, right or wrong', async () => {
    const store = new MemoryFreshStore();
    await recordAnswer(store, 'verbs', 'q1', true, clean);
    await recordAnswer(store, 'verbs', 'q2', false, clean);
    expect(await asked(store, 'verbs')).toEqual(['q1', 'q2']);
    expect(await isFresh(store, 'verbs', 'q1')).toBe(false);
  });

  it('is read before the key is written: the first answer on a key is on a fresh key', async () => {
    const store = new MemoryFreshStore();
    expect(await recordAnswer(store, 'verbs', 'q1', true, missed)).toBe('known');
    expect(await recordAnswer(store, 'verbs', 'q1', true, missed)).toBe('to-confirm');
  });
});

describe('the loop', () => {
  it('miss, right on a seen key, right on a fresh key: missed, to-confirm, known', async () => {
    const store = new MemoryFreshStore();
    await markAsked(store, 'verbs', 'q1');
    expect(await recordAnswer(store, 'verbs', 'q1', false, clean)).toBe('missed');
    expect(await recordAnswer(store, 'verbs', 'q1', true, missed)).toBe('to-confirm');
    expect(await isToConfirm(store, 'verbs')).toBe(true);
    expect(await recordAnswer(store, 'verbs', 'q2', true, missed)).toBe('known');
    expect(await isToConfirm(store, 'verbs')).toBe(false);
  });

  it('miss, right on a seen key, wrong on a fresh key: back to missed, the mark off', async () => {
    const store = new MemoryFreshStore();
    await markAsked(store, 'verbs', 'q1');
    expect(await recordAnswer(store, 'verbs', 'q1', true, missed)).toBe('to-confirm');
    expect(await recordAnswer(store, 'verbs', 'q2', false, missed)).toBe('missed');
    expect(await isToConfirm(store, 'verbs')).toBe(false);
  });

  it('keeps each idea its own mark', async () => {
    const store = new MemoryFreshStore();
    await markAsked(store, 'verbs', 'q1');
    await recordAnswer(store, 'verbs', 'q1', true, missed);
    expect(await isToConfirm(store, 'nouns')).toBe(false);
  });
});
