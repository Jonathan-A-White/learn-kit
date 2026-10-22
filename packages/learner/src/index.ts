// @learn-kit/learner: the learner and the goal. The learner profile (age, boy or girl, experience, the kind of learner, speed, notes), each value
// learned from talk and kept with the turn it came from, merged surer first and then newer; and a goal chosen with the tutor over a
// learn-kit/graph graph, with its scaffold: the path from the roots to its targets, each node with its supports until it is solid, and its
// progress, 0 to 1. Data only: no React, no Dexie, no subject.

/** The package's own name. */
export const LEARNER_PACKAGE = '@learn-kit/learner';

export {
  AGE_MAX,
  GENDERS,
  NOTES_MAX,
  PROFILE_FIELDS,
  SPEEDS,
  SURENESS,
  VALUE_MAX,
  emptyProfile,
  learn,
  learnAll,
  mergeProfiles,
  outranks,
  valuesOf,
  type Gender,
  type LearnResult,
  type Learned,
  type Profile,
  type ProfileAnswer,
  type ProfileField,
  type ProfileNote,
  type ProfileValues,
  type Speed,
  type Sureness,
} from './profile.js';
export { GoalError, checkGoal, goalNodes, goalProblems, goalProgress, goalProgressFrom, type Goal } from './goal.js';
export {
  DEFAULT_SUPPORTS,
  HINTS,
  SLOWER_PACE,
  scaffold,
  scaffoldFrom,
  supportsFor,
  type GoalScaffold,
  type ScaffoldOptions,
  type ScaffoldStep,
  type Support,
  type SupportContext,
} from './scaffold.js';
