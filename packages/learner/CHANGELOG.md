# Changelog: @learn-kit/learner

Newest first. Breaking changes come first in a release, each with its migration in one sentence.

## 0.1.0 (2026-10-22)

- New: the learner profile and the goal with its scaffolding (mw-79en7t.4), over a `learn-kit/graph` graph and its store, with no
  React, no Dexie and no subject.
- New: the profile. `Profile` holds age, gender (boy or girl), experience, the kind of learner, speed and notes, each optional and
  each kept with the turn of talk it came from, when and how sure (`SURENESS`: guessed, told, set). `learn` and `learnAll` keep a
  talk's answers by the merge rule `outranks` (surer first, then newer), `mergeProfiles` makes two profiles one, `valuesOf` gives the
  values alone. From Lampas's About you (`profile.ts`).
- New: the goal. `Goal` `{ id, title, targets }`, checked against a graph by `goalProblems` and `checkGoal` (`GoalError`);
  `goalNodes`, the targets and all they rest on from the roots up; `goalProgress` and `goalProgressFrom`, 0 to 1.
- New: the scaffold. `scaffold` and `scaffoldFrom` give the path still to go from the roots to a goal's targets, each node with its
  supports (`DEFAULT_SUPPORTS`: `HINTS`, `SLOWER_PACE`, or the app's own) until it is solid; `supportsFor` is `[]` once it is. The
  general form of Lampas's Weave.
