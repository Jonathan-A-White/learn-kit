// The learner profile: what the tutor knows of the learner as a person, age, boy or girl, experience, the kind of learner and speed, and a
// short list of notes. Every field is optional and starts unknown: each is learned from talk and kept with the turn it came from, when, and
// how sure it is (guessed from how the learner writes, told in so many words, or set by hand on a screen). A later answer replaces a kept
// one by the merge rule, surer first and then newer (outranks). Pure data: the functions return a new profile and change none, and a
// profile survives JSON, so the app keeps it where it likes.

/** How sure a value is, least first: guessed (from how the learner writes and talks), told (in so many words), set (by hand on a screen). */
export const SURENESS = Object.freeze(['guessed', 'told', 'set'] as const);
export type Sureness = (typeof SURENESS)[number];

export const GENDERS = Object.freeze(['boy', 'girl'] as const);
export type Gender = (typeof GENDERS)[number];

export const SPEEDS = Object.freeze(['quick', 'steady', 'slow'] as const);
export type Speed = (typeof SPEEDS)[number];

/** The value of each field: age in years; experience and the kind of learner in the tutor's words ('knows nothing yet', 'learns by doing'). */
export interface ProfileValues {
  age: number;
  gender: Gender;
  experience: string;
  learnerKind: string;
  speed: Speed;
}
export type ProfileField = keyof ProfileValues;

/** The fields, in the order they are kept and listed. */
export const PROFILE_FIELDS: readonly ProfileField[] = Object.freeze(['age', 'gender', 'experience', 'learnerKind', 'speed'] as const);

/** The longest a text value or a note is, in characters; the most notes kept. */
export const VALUE_MAX = 100;
export const NOTES_MAX = 12;
/** The oldest age taken: a larger one is a mistake. */
export const AGE_MAX = 120;

/** A value as learned: the turn of the talk it came from, when (ms), and how sure. */
export interface Learned<V> {
  value: V;
  turn: string;
  when: number;
  sure: Sureness;
}

/** A note the tutor learned, with the turn it came from and when. */
export interface ProfileNote {
  text: string;
  turn: string;
  when: number;
}

/** What is known of the learner; a field not known is missing. */
export interface Profile {
  age?: Learned<number>;
  gender?: Learned<Gender>;
  experience?: Learned<string>;
  learnerKind?: Learned<string>;
  speed?: Learned<Speed>;
  notes: ProfileNote[];
}

/** One thing learned in a turn of talk: a value for a field (told, unless it says how sure), or a note. */
export type ProfileAnswer =
  | { [F in ProfileField]: { field: F; value: ProfileValues[F]; turn: string; when: number; sure?: Sureness } }[ProfileField]
  | { field: 'note'; value: string; turn: string; when: number };

/**
 * What became of an answer: learned (the field was unknown), replaced (it outranked the value kept), kept (the value kept outranks it),
 * noted (a new note), already (that note is kept), full (NOTES_MAX notes are kept), ignored (not a value the field can have).
 */
export type LearnResult = 'learned' | 'replaced' | 'kept' | 'noted' | 'already' | 'full' | 'ignored';

/** A profile that knows nothing. */
export const emptyProfile = (): Profile => ({ notes: [] });

const rank = (sure: Sureness): number => SURENESS.indexOf(sure);

/** The merge rule: `a` replaces `b` when it is surer, or as sure and no older (a tie goes to `a`, the one coming in). */
export function outranks(a: Pick<Learned<unknown>, 'sure' | 'when'>, b: Pick<Learned<unknown>, 'sure' | 'when'>): boolean {
  return rank(a.sure) > rank(b.sure) || (rank(a.sure) === rank(b.sure) && a.when >= b.when);
}

const text = (value: unknown, max: number): string | undefined => {
  const t = typeof value === 'string' ? value.trim() : '';
  return t.length > 0 && t.length <= max ? t : undefined;
};

/** The value as the field keeps it, or undefined when it is not one the field can have. */
function valueFor(field: string, value: unknown): ProfileValues[ProfileField] | undefined {
  switch (field) {
    case 'age':
      return typeof value === 'number' && Number.isFinite(value) && value > 0 && value <= AGE_MAX ? value : undefined;
    case 'gender':
      return GENDERS.find((g) => g === value);
    case 'speed':
      return SPEEDS.find((s) => s === value);
    case 'experience':
    case 'learnerKind':
      return text(value, VALUE_MAX);
    default:
      return undefined;
  }
}

const isField = (field: string): field is ProfileField => PROFILE_FIELDS.some((f) => f === field);

/** Keeps one answer by the merge rule, with its turn. Returns the new profile, or the one given when nothing changed, and what became of the answer. */
export function learn(profile: Profile, answer: ProfileAnswer): { profile: Profile; result: LearnResult } {
  const unchanged = (result: LearnResult) => ({ profile, result });
  const { field, turn, when } = answer as { field: string; turn: unknown; when: unknown };
  if (typeof turn !== 'string' || turn.length === 0 || typeof when !== 'number' || !Number.isFinite(when)) return unchanged('ignored');
  if (field === 'note') {
    const line = text(answer.value, VALUE_MAX);
    if (line === undefined) return unchanged('ignored');
    if (profile.notes.some((n) => n.text === line)) return unchanged('already');
    if (profile.notes.length >= NOTES_MAX) return unchanged('full');
    return { profile: { ...profile, notes: [...profile.notes, { text: line, turn, when }] }, result: 'noted' };
  }
  const sure = 'sure' in answer && answer.sure !== undefined ? answer.sure : 'told';
  const value = valueFor(field, answer.value);
  if (!isField(field) || value === undefined || !SURENESS.includes(sure)) return unchanged('ignored');
  const item: Learned<unknown> = { value, turn, when, sure };
  const kept = profile[field];
  if (kept && !outranks(item, kept)) return unchanged('kept');
  return { profile: { ...profile, [field]: item }, result: kept ? 'replaced' : 'learned' };
}

/** Keeps the answers of a talk in turn, each by learn. */
export function learnAll(profile: Profile, answers: readonly ProfileAnswer[]): { profile: Profile; results: LearnResult[] } {
  const results: LearnResult[] = [];
  let at = profile;
  for (const answer of answers) {
    const done = learn(at, answer);
    at = done.profile;
    results.push(done.result);
  }
  return { profile: at, results };
}

/**
 * Two profiles as one (the same learner's, kept in two places): each field the value that outranks the other's (a tie to `incoming`), and the
 * notes of both, a note told by its text and kept with its earliest turn, oldest first, at most NOTES_MAX.
 */
export function mergeProfiles(kept: Profile, incoming: Profile): Profile {
  const merged: Profile = { ...kept, notes: [] };
  for (const field of PROFILE_FIELDS) {
    const theirs = incoming[field];
    const mine = kept[field];
    if (theirs && (!mine || outranks(theirs, mine))) Object.assign(merged, { [field]: theirs });
  }
  const byText = new Map<string, ProfileNote>();
  for (const note of [...kept.notes, ...incoming.notes]) {
    const first = byText.get(note.text);
    if (!first || note.when < first.when) byText.set(note.text, note);
  }
  merged.notes = [...byText.values()].sort((a, b) => a.when - b.when).slice(0, NOTES_MAX);
  return merged;
}

/** The values known, without their turns: what the tutor is told of the learner. */
export function valuesOf(profile: Profile): Partial<ProfileValues> {
  const values: Partial<ProfileValues> = {};
  for (const field of PROFILE_FIELDS) {
    const item = profile[field];
    if (item) Object.assign(values, { [field]: item.value });
  }
  return values;
}
