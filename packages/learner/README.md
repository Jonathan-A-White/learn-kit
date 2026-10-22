# @learn-kit/learner

The learner and the goal, shared by Lampas and Kestrel: the learner profile (age, boy or girl, experience, the kind of learner,
speed, and a few notes), each value learned from talk and kept with the turn it came from, and a goal chosen with the tutor over a
`learn-kit/graph` graph with its scaffold: the path from the roots to the goal's targets, built from 'knows nothing' upward, each
node with its supports (hints, a slower pace) until it is solid, and the goal's progress, 0 to 1. Data only: no React, no Dexie,
no subject. It declares no dependency, imports `learn-kit/graph` and nothing else, and a test holds that. The tutor fills it.

## Install

From GitHub, by pinned commit (there is no registry; `prepare` builds the libraries on install). The repo's
[README](../../README.md#install) has the details.

```bash
npm install github:Jonathan-A-White/learn-kit#<full commit SHA>
```

```ts
import { learnAll, scaffold } from 'learn-kit/learner';
```

## Use

The example below is run by `tests/readme.test.ts`. Its graph and its two goals, `sat-maths-800` and `competition`, are fixtures
that show the shape; the subject graphs and their goals are the apps'.

```ts
import { memoryStore, testOut, validate } from 'learn-kit/graph';
import { HINTS, SLOWER_PACE, checkGoal, emptyProfile, goalProgress, learnAll, scaffold, scaffoldFrom, supportsFor, valuesOf } from 'learn-kit/learner';

// what the tutor learned in a talk, each with the turn it came from
const { profile, results } = learnAll(emptyProfile(), [
  { field: 'age', value: 15, turn: 'turn-3', when: 3, sure: 'guessed' },
  { field: 'experience', value: 'knows nothing past fractions', turn: 'turn-3', when: 3 },
  { field: 'age', value: 14, turn: 'turn-5', when: 5, sure: 'told' }, // surer: it replaces the guess
  { field: 'speed', value: 'slow', turn: 'turn-6', when: 6 },
  { field: 'note', value: 'wants to beat his brother', turn: 'turn-6', when: 6 },
]);
results; // ['learned', 'learned', 'replaced', 'learned', 'noted']
valuesOf(profile); // { age: 14, experience: 'knows nothing past fractions', speed: 'slow' }
profile.age; // { value: 14, turn: 'turn-5', when: 5, sure: 'told' }

const graph = validate([
  { id: 'counting', needs: [], level: 0 },
  { id: 'arithmetic', needs: ['counting'], level: 1 },
  { id: 'fractions', needs: ['arithmetic'], level: 2 },
  { id: 'shapes', needs: ['counting'], level: 1 },
  { id: 'algebra', needs: ['fractions'], level: 3 },
  { id: 'geometry', needs: ['shapes', 'fractions'], level: 3 },
  { id: 'functions', needs: ['algebra'], level: 4 },
  { id: 'statistics', needs: ['fractions'], level: 3 },
  { id: 'number-theory', needs: ['arithmetic'], level: 3 },
  { id: 'combinatorics', needs: ['arithmetic'], level: 3 },
  { id: 'proof', needs: ['algebra'], level: 4 },
]);
const sat = checkGoal({ id: 'sat-maths-800', title: 'An 800 on the maths SAT', targets: ['functions', 'geometry', 'statistics'] }, graph);
const competition = checkGoal({ id: 'competition', title: 'A maths competition', targets: ['number-theory', 'combinatorics', 'proof'] }, graph);

// knows nothing: the whole path, from the roots
scaffold(sat, graph, new Set()).steps.map((s) => s.node.id);
// ['counting', 'arithmetic', 'fractions', 'shapes', 'algebra', 'geometry', 'functions', 'statistics'], progress 0
scaffold(competition, graph, new Set()).steps.map((s) => s.node.id);
// ['counting', 'arithmetic', 'fractions', 'algebra', 'number-theory', 'combinatorics', 'proof']

// placed past fractions: the path is shorter, and the scaffolds of what is solid are gone
const store = memoryStore();
for (const id of ['counting', 'arithmetic', 'fractions']) await testOut(store, graph, id);
const placed = await scaffoldFrom(store, sat, graph);
placed.steps.map((s) => s.node.id); // ['shapes', 'algebra', 'geometry', 'functions', 'statistics']
placed.steps.filter((s) => s.ready).map((s) => s.node.id); // ['shapes', 'algebra', 'statistics']: ready to learn now
supportsFor(placed, 'fractions'); // []: solid
supportsFor(placed, 'algebra'); // ['hints', 'slower-pace']
placed.progress; // 3 / 8
goalProgress(competition, graph, new Set(['counting', 'arithmetic', 'fractions'])); // 3 / 7

// the app chooses the supports, from the profile, say: a slower pace only for a slow learner
const slow = valuesOf(profile).speed === 'slow';
scaffold(sat, graph, new Set(['counting', 'arithmetic', 'fractions']), { supports: () => (slow ? [HINTS, SLOWER_PACE] : [HINTS]) });
```

### the profile

A `Profile` is `{ age?, gender?, experience?, learnerKind?, speed?, notes }`. Every field starts unknown (`emptyProfile()`); each
known one is `{ value, turn, when, sure }`: the value, the turn of the talk it came from, when (ms) and how sure (`SURENESS`, least
first: `'guessed'` from how the learner writes and talks, `'told'` in so many words, `'set'` by hand on a screen). `age` is a
number of years (up to `AGE_MAX`), `gender` `'boy'` or `'girl'` (`GENDERS`), `speed` `'quick'`, `'steady'` or `'slow'`
(`SPEEDS`), and `experience` and `learnerKind` are the tutor's words ('knows nothing yet', 'learns by doing'), at most
`VALUE_MAX` (100) characters. A note is `{ text, turn, when }`, at most `NOTES_MAX` (12) of them.

`learn(profile, answer)` keeps one answer, `{ field, value, turn, when, sure? }` (told when it does not say), and returns the new
profile and what became of it: `'learned'`, `'replaced'`, `'kept'`, `'noted'`, `'already'`, `'full'` or `'ignored'` (not a value
the field can have). It changes nothing it was given; a profile is plain data and survives `JSON.stringify`. `learnAll` keeps a
talk's answers in turn.

The merge rule is `outranks(a, b)`: the surer wins, and of two as sure the newer, a tie going to the one coming in. So a told
answer replaces a guess, a guess never replaces a told answer, a newer answer as sure replaces an older one, and talk never
replaces a value set by hand (the app may show it as a suggestion). `mergeProfiles(kept, incoming)` is the same learner's profile
kept in two places as one: each field by the rule, and the notes of both, each kept once with its earliest turn. `valuesOf(profile)`
is the values alone, what the tutor is told.

### the goal

A `Goal` is `{ id, title, targets }`: the ids of the nodes it aims at. `goalProblems(goal, graph)` names what is wrong with it (no
id, title or targets; a target twice; a target that is no node), and `checkGoal` throws a `GoalError` naming them. `goalNodes` is
what the goal covers: the targets and every node they rest on, in the graph's teaching order (`order`), from the roots up.
`goalProgress(goal, graph, solid)` is the share of those that are solid, 0 to 1; `goalProgressFrom` reads the solid nodes from the
store.

### the scaffold

`scaffold(goal, graph, solid, { supports })` is `{ goal, steps, solid, progress }`. `steps` are the goal's nodes not solid, in
teaching order: for a learner with nothing solid the whole path, starting at the roots; for one with levels solid it starts where
they end. Each step is `{ node, ready, target, supports }`: `ready` when every need is solid (what can be learned now), `target`
when it is one of the goal's, and the supports shown with it, `DEFAULT_SUPPORTS` (`HINTS`, `SLOWER_PACE`) unless the app's
`supports(node, { ready, target })` chooses. A node that goes solid leaves the steps and its supports fall away: `supportsFor`
says `[]` for it. A node being learned (the frontier) is not solid and keeps its supports. `scaffoldFrom(store, goal, graph)`
reads the solid nodes from the store.

## Where this came from: the sweep of Lampas

Lampas's goal and weave (`data/goal.ts`, `data/repositories/goalSaved.ts`, `data/grammar/goalNeeds.ts`, `data/grammar/needs.ts`,
`data/grammar/goalProgress.ts`, `settings/definitions/weave.ts`, `settings/definitions/weaveOrder.ts`, `data/weave.ts`,
`GoalScreen.tsx`), each field and rule with a verdict: **Kit** (in `learn-kit/learner` or `learn-kit/graph`, named) or
**Greek-only** (it stays in Lampas: its text, its approaches, its screens or its storage). The Weave is Lampas's scaffolding that
falls away: the Greek of a word he is learning shown with its English beneath until it turns solid. The kit's general version is a
node's supports, shown until it is solid.

| Lampas field or rule | Verdict |
| --- | --- |
| `Goal` `{ book, chapter?, verse? }`: a passage of the text | Greek-only; the kit's `Goal` is `{ id, title, targets }`, and a passage's needed ideas become its targets |
| `parseGoal`, `goalText` ('Read 1 John 1:1' and back) | Greek-only |
| `goalTitle` (what the goal is called on a screen) | Kit: `Goal.title` |
| `getSavedGoalText`, the 'goal' row of the settings store | Greek-only (Lampas's storage); the kit's goal is plain data the app keeps |
| `needsOf` in `goalNeeds.ts`: a passage's needs, kept in memory per goal text | Greek-only (the chapter files); the kit's `goalNodes` is what a goal covers: its targets and all they rest on |
| `passageNeeds`: the words and grammar ideas a passage needs, with counts and a first example | Greek-only |
| `progressToward`: solid, frontier and not yet counts of a goal's words and ideas | Kit: `goalProgress` and the scaffold's `progress`, the share solid, 0 to 1; the frontier and not yet from the graph's `levelsOf` |
| `LEVELS` (the order of the bars) and `STATE_NAMES` ('Solid', 'Learning', 'Next', 'Not yet') | Greek-only (the screen's words) |
| `wordStatesOf`, `wordLevel`: a word's state by every lemma it goes by | Greek-only (vocabulary) |
| `levelsOf`, `levelOf`: an idea's level, not yet when it has none | Kit: the graph's `levelsOf`, `levelOf`; a letter group made solid by its items (`isSolid`) is Greek-only |
| `ideaState`: solid, learning, next (every need solid), not yet | Kit: a solid node is out of the scaffold's `steps`, a step is `ready` when every need is solid, learning is the graph's `learning` |
| `learnNext`: the exact gaps first, then the earliest needed idea not yet in the approach's sequence, or a passage lesson | Kit for the core: the first `ready` step of `scaffold`; the gaps of letter groups, the approach's sequence and passage lessons are Greek-only |
| `nextLesson`, `nextLessonTitle`: the lesson Learn next opens | Greek-only (the approaches' lessons) |
| `learningNow`: the one idea at the frontier | Kit: the graph's `learning` |
| `nextWords`, `NEXT_WORDS` | Greek-only (vocabulary) |
| `groupWords` | Greek-only (vocabulary) |
| `groupIdeas`: the goal's ideas cut by level | Kit: the scaffold's `solid` and `steps` |
| `placedAt`: when the placement last set a level | Kit: the graph's `NodeState` `how` (`'placement'`) and `since`; no helper of its own |
| Goal screen rows: Goal, Words, Grammar ideas, Placed, Learning now, Learn next, Next words | Greek-only (the screen); its numbers are the kit's as above |
| `Weave` setting: `'off'`, `'solid'`, `'solid+learning'` | Greek-only (the setting); the rule under it is the kit's, below |
| The Weave's rule: a word being learned is shown with its English beneath until it turns solid, then plain | Kit: a step's `supports`, shown until the node is solid (`supportsFor` is `[]` then) |
| `weaveVerse`'s `solid`, `learning` and `formPasses`, and `Woven.learning` | Kit for the split (the graph's `solidOf` and `learning`); weaving them into a verse is Greek-only |
| `weaveForTeaching`: one word woven in while it is taught | Greek-only |
| `WeaveOrder`: `'english'`, `'greek'`, and `chunkOrder`, `wovenInOrder`, `drawnOrder`, `chunkText` | Greek-only |
| The Weave shows only from a Greek interest of 2 (`greekFrom(2)`); its Order only while it is not Off | Greek-only |

Lampas's About you (`data/repositories/profile.ts`, `AboutYouScreen.tsx`), for the profile:

| Lampas field or rule | Verdict |
| --- | --- |
| `age` (a text, at most 20 characters) | Kit: `age`, a number of years |
| `pace`: quick, steady, slow | Kit: `speed`, `SPEEDS` |
| `ways`: hearing, seeing, reading, doing | Kit: `learnerKind`, in the tutor's words |
| `background` | Kit: `experience` |
| `why` | Kit: a goal chosen with the tutor (`Goal`), or a note |
| (none: boy or girl) | Kit: `gender`, `GENDERS`, new |
| `notes`, each with when and the talk it came from, at most 12 | Kit: `notes` with their `turn`, `NOTES_MAX` |
| `learned`: a value per field with when, the talk, guessed, mine | Kit: `Learned` `{ value, turn, when, sure }`; guessed is `'guessed'`, mine is `'set'` |
| A guess never replaces what the tutor was told; nothing replaces his own words | Kit: `outranks`, `learn` |
| A learned value for a field he set himself is a suggestion: shown, never sent | Kit: `learn` answers `'kept'`; showing the suggestion is Lampas's |
| `learnFromTalk(talk, updates)` | Kit: `learnAll` |
| `removed` (a talk does not bring back what he took away), `asked` and `doNotAsk` (not asked again for a day, or after a no) | Lampas's: the tutor's manners, for the tutor's story to take or leave |
| One JSON object in the settings store, read for what it can be (`parse`) | Lampas's (storage); the kit's profile is plain data |
