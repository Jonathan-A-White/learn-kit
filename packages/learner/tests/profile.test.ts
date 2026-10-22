// The learner profile: each value learned from talk with the turn it came from, and the merge rule, surer first and then newer.
import { describe, expect, it } from 'vitest';
import {
  NOTES_MAX,
  SURENESS,
  emptyProfile,
  learn,
  learnAll,
  mergeProfiles,
  outranks,
  valuesOf,
  type Profile,
  type ProfileAnswer,
} from '../src/index.js';

const told = (answer: Omit<ProfileAnswer, 'sure'>): ProfileAnswer => ({ ...answer, sure: 'told' }) as ProfileAnswer;

describe('emptyProfile', () => {
  it('knows nothing: no field and no note', () => {
    expect(emptyProfile()).toEqual({ notes: [] });
  });

  it('is a new object each time', () => {
    const a = emptyProfile();
    a.notes.push({ text: 'x', turn: 't1', when: 1 });
    expect(emptyProfile()).toEqual({ notes: [] });
  });
});

describe('learn', () => {
  it('keeps the value with the turn it came from, when, and how sure', () => {
    const { profile, result } = learn(emptyProfile(), { field: 'age', value: 9, turn: 'turn-3', when: 3, sure: 'told' });
    expect(result).toBe('learned');
    expect(profile.age).toEqual({ value: 9, turn: 'turn-3', when: 3, sure: 'told' });
  });

  it('takes an answer as told when it does not say how sure', () => {
    expect(learn(emptyProfile(), { field: 'gender', value: 'girl', turn: 't1', when: 1 }).profile.gender?.sure).toBe('told');
  });

  it('keeps each of the five fields', () => {
    const { profile } = learnAll(emptyProfile(), [
      { field: 'age', value: 9, turn: 't1', when: 1 },
      { field: 'gender', value: 'boy', turn: 't1', when: 1 },
      { field: 'experience', value: 'knows nothing yet', turn: 't2', when: 2 },
      { field: 'learnerKind', value: 'learns by doing', turn: 't2', when: 2 },
      { field: 'speed', value: 'slow', turn: 't3', when: 3 },
    ]);
    expect(valuesOf(profile)).toEqual({ age: 9, gender: 'boy', experience: 'knows nothing yet', learnerKind: 'learns by doing', speed: 'slow' });
    expect(profile.speed?.turn).toBe('t3');
  });

  it('lets a surer later answer win, and keeps its turn', () => {
    const guessed = learn(emptyProfile(), { field: 'age', value: 11, turn: 'turn-2', when: 2, sure: 'guessed' }).profile;
    const { profile, result } = learn(guessed, { field: 'age', value: 9, turn: 'turn-5', when: 5, sure: 'told' });
    expect(result).toBe('replaced');
    expect(profile.age).toEqual({ value: 9, turn: 'turn-5', when: 5, sure: 'told' });
  });

  it('lets a later answer as sure win', () => {
    const before = learn(emptyProfile(), told({ field: 'speed', value: 'steady', turn: 't2', when: 2 })).profile;
    const { profile, result } = learn(before, told({ field: 'speed', value: 'quick', turn: 't6', when: 6 }));
    expect(result).toBe('replaced');
    expect(profile.speed).toEqual({ value: 'quick', turn: 't6', when: 6, sure: 'told' });
  });

  it('keeps a surer answer over a later guess', () => {
    const before = learn(emptyProfile(), told({ field: 'gender', value: 'girl', turn: 't3', when: 3 })).profile;
    const { profile, result } = learn(before, { field: 'gender', value: 'boy', turn: 't8', when: 8, sure: 'guessed' });
    expect(result).toBe('kept');
    expect(profile).toBe(before);
    expect(profile.gender).toEqual({ value: 'girl', turn: 't3', when: 3, sure: 'told' });
  });

  it('keeps a newer answer over an older one as sure that arrives after it', () => {
    const before = learn(emptyProfile(), told({ field: 'experience', value: 'a year of lessons', turn: 't9', when: 9 })).profile;
    const { profile, result } = learn(before, told({ field: 'experience', value: 'knows nothing', turn: 't4', when: 4 }));
    expect(result).toBe('kept');
    expect(profile.experience?.turn).toBe('t9');
  });

  it('never lets talk replace a value set by hand', () => {
    const before = learn(emptyProfile(), { field: 'age', value: 10, turn: 'about-you', when: 1, sure: 'set' }).profile;
    expect(learn(before, told({ field: 'age', value: 12, turn: 't7', when: 7 })).result).toBe('kept');
  });

  it('leaves the profile it was given as it was', () => {
    const before = emptyProfile();
    learn(before, told({ field: 'age', value: 9, turn: 't1', when: 1 }));
    learn(before, { field: 'note', value: 'likes dragons', turn: 't1', when: 1 });
    expect(before).toEqual({ notes: [] });
  });

  it('ignores a value that is not one the field can have', () => {
    const bad = [
      { field: 'age', value: -1 },
      { field: 'age', value: Number.NaN },
      { field: 'age', value: '9' },
      { field: 'gender', value: 'dragon' },
      { field: 'speed', value: 'very fast' },
      { field: 'experience', value: '   ' },
      { field: 'learnerKind', value: 'x'.repeat(101) },
      { field: 'note', value: '' },
      { field: 'favourite', value: 'blue' },
    ];
    for (const answer of bad) {
      const out = learn(emptyProfile(), { ...answer, turn: 't1', when: 1 } as unknown as ProfileAnswer);
      expect(out.result, JSON.stringify(answer)).toBe('ignored');
      expect(out.profile).toEqual({ notes: [] });
    }
  });

  it('trims a text value', () => {
    expect(learn(emptyProfile(), told({ field: 'learnerKind', value: '  likes puzzles ', turn: 't1', when: 1 })).profile.learnerKind?.value).toBe('likes puzzles');
  });
});

describe('notes', () => {
  it('keeps a note with the turn it came from, once', () => {
    const first = learn(emptyProfile(), { field: 'note', value: 'likes dragons', turn: 'turn-4', when: 4 });
    expect(first.result).toBe('noted');
    expect(first.profile.notes).toEqual([{ text: 'likes dragons', turn: 'turn-4', when: 4 }]);
    const again = learn(first.profile, { field: 'note', value: ' likes dragons ', turn: 'turn-9', when: 9 });
    expect(again.result).toBe('already');
    expect(again.profile.notes).toEqual([{ text: 'likes dragons', turn: 'turn-4', when: 4 }]);
  });

  it(`keeps at most ${NOTES_MAX} notes`, () => {
    let profile: Profile = emptyProfile();
    for (let i = 0; i < NOTES_MAX; i += 1) profile = learn(profile, { field: 'note', value: `note ${i}`, turn: `t${i}`, when: i }).profile;
    const out = learn(profile, { field: 'note', value: 'one more', turn: 'tx', when: 99 });
    expect(out.result).toBe('full');
    expect(out.profile.notes).toHaveLength(NOTES_MAX);
  });
});

describe('the merge rule', () => {
  it('ranks guessed below told below set', () => {
    expect(SURENESS).toEqual(['guessed', 'told', 'set']);
  });

  it('puts the surer first, then the newer, and a tie to the one coming in', () => {
    const at = (sure: (typeof SURENESS)[number], when: number) => ({ sure, when });
    expect(outranks(at('told', 1), at('guessed', 9))).toBe(true);
    expect(outranks(at('guessed', 9), at('told', 1))).toBe(false);
    expect(outranks(at('told', 5), at('told', 4))).toBe(true);
    expect(outranks(at('told', 4), at('told', 5))).toBe(false);
    expect(outranks(at('told', 4), at('told', 4))).toBe(true);
  });

  it('merges two profiles field by field by the rule, keeping each winner\'s turn', () => {
    const phone: Profile = {
      age: { value: 9, turn: 'p1', when: 1, sure: 'told' },
      speed: { value: 'slow', turn: 'p2', when: 2, sure: 'guessed' },
      notes: [{ text: 'likes dragons', turn: 'p1', when: 1 }],
    };
    const laptop: Profile = {
      age: { value: 10, turn: 'l5', when: 5, sure: 'guessed' },
      speed: { value: 'steady', turn: 'l4', when: 4, sure: 'told' },
      gender: { value: 'girl', turn: 'l3', when: 3, sure: 'told' },
      notes: [
        { text: 'counts on her fingers', turn: 'l2', when: 2 },
        { text: 'likes dragons', turn: 'l6', when: 6 },
      ],
    };
    expect(mergeProfiles(phone, laptop)).toEqual({
      age: { value: 9, turn: 'p1', when: 1, sure: 'told' },
      speed: { value: 'steady', turn: 'l4', when: 4, sure: 'told' },
      gender: { value: 'girl', turn: 'l3', when: 3, sure: 'told' },
      notes: [
        { text: 'likes dragons', turn: 'p1', when: 1 },
        { text: 'counts on her fingers', turn: 'l2', when: 2 },
      ],
    });
  });

  it('survives JSON: a profile is plain data', () => {
    const { profile } = learnAll(emptyProfile(), [told({ field: 'age', value: 9, turn: 't1', when: 1 }), { field: 'note', value: 'likes dragons', turn: 't1', when: 1 }]);
    expect(JSON.parse(JSON.stringify(profile))).toEqual(profile);
  });
});
