# What learn-kit replaces

A sweep of Lampas, spell-forge and legend for every hand-built graph, frontier or scheduler, with a verdict for each. It is the start
of Lampas on learn-kit and of the SM-2 sweep in the new spelling world. Paths are from each app's root (`lampas/`, `spell-forge/`,
`legend/`); line numbers are where the thing starts, as the three apps stood on 2026-10-22. Only file paths and verdicts are here.

The learn-kit names are those of `@learn-kit/graph` 0.3.0 (`learn-kit/graph`).

Verdicts:

- `covered`: learn-kit has it; the reason names the entry point that replaces it.
- `not-covered`: learn-kit does not have it; the reason says why, and whether the app keeps it or a later learn-kit package could.
- `not-scheduler`: a hit of the sweep's words that is not a graph, a frontier or a scheduler (a label, a timer, a poll, a stored field).

## Hand-built graphs, frontiers and schedulers

Each row of this table and the next is `| Where | Verdict | Why |`.

| Where | Verdict | Why |
| --- | --- | --- |
| `lampas/src/data/grammar/pathGraph.ts:6` | covered | `GraphNode` and `Graph` are the idea (id, needs) and the path (ideas in teaching order, by id). |
| `lampas/src/data/grammar/pathGraph.ts:18` | covered | `graphProblems` finds an id listed twice, an unknown need, a need on itself and a cycle, each naming its node. |
| `lampas/src/data/grammar/pathGraph.ts:45` | covered | `validate` throws a `GraphError` naming every problem, as `makePath` does. |
| `lampas/src/data/grammar/pathGraph.ts:52` | covered | `nodeOf` is `ideaIn`. |
| `lampas/src/data/grammar/pathGraph.ts:59` | covered | `needsOf` is `needsIn`. |
| `lampas/src/data/grammar/pathGraph.ts:62` | covered | `below` is `belowIn`, every idea an idea rests on however far down. |
| `lampas/src/data/grammar/pathGraph.ts:77` | covered | `depthOf` is `depthIn`, and `layers` is the graph by depth. |
| `lampas/src/data/grammar/pathGraph.ts:91` | covered | `frontierOf` is `frontierIn`: not solid, every need solid, in the path's order. |
| `lampas/src/data/grammar/pathGraph.ts:129` | not-covered | `layoutPath` and its pixel constants (line 97) draw the graph on a screen; `layers` gives the rows, the drawing stays in the app. |
| `lampas/src/data/grammar/ladder.ts:87` | not-covered | The `def` helper and the ideas after it (`DEFS`, line 164) are the Greek: subject data that stays in Lampas and is handed to `validate`. |
| `lampas/src/data/grammar/ladder.ts:602` | covered | `LADDER` gives each idea its `rung`, its position in the list; `GraphNode` carries it as `level`, and `order` keeps the listed order. |
| `lampas/src/data/grammar/ladder.ts:610` | covered | `LADDER_PATH` is `makePath` over the ideas; `validate` does that. |
| `lampas/src/data/grammar/ladder.ts:631` | not-covered | The item groups (the alphabet and its letters, the diphthongs, the pairs, the breathings; `itemsOf`, `groupOfItem`) are a Lampas rule: an item counts as solid when its group is. The graph has no groups. |
| `lampas/src/data/grammar/ladder.ts:662` | covered | `ideasBelow` is `below`. |
| `lampas/src/approaches/index.ts:22` | not-covered | `orderOf` is the teaching order by lesson, not by needs; `order` is topological, so the lesson order stays the approach's. |
| `lampas/src/approaches/index.ts:106` | not-covered | `nextLessonOf` takes the first idea in the lesson order that is not yet; `frontier` takes the first whose needs are solid, so moving over is a choice for Lampas on learn-kit. |
| `lampas/src/data/grammar/placement.ts:86` | not-covered | `startPlacement` and `answer` (line 172) walk up and down the approach's order two questions an idea; learn-kit's `place` writes one result and not the walk. |
| `lampas/src/data/grammar/placement.ts:125` | not-covered | `levelOfAnswers` grades an idea from two answers (both right solid, one frontier, none not yet); `place` takes passed or not passed only. |
| `lampas/src/data/grammar/placement.ts:152` | not-covered | `infer` credits letters, sounds and marks from the forms read right: a Greek rule that stays in Lampas. |
| `lampas/src/data/grammar/drillIt.ts:125` | not-covered | `unmetNeed` gives the lowest unmet need of one idea; `needsOf` with `levelsOf` give the parts, but not that one answer. |
| `lampas/src/data/grammar/drillIt.ts:231` | not-covered | `start` and `answer` (line 259) are the drill walk (up a step on a right, halfway back on a miss, proved, edge or limit); drills are a later learn-kit package. |
| `lampas/src/data/schedule.ts:7` | covered | `DAY`, the same day in milliseconds. |
| `lampas/src/data/schedule.ts:19` | covered | `STEP_DAYS` (1, 3, 7, 14, 30, 60), with `RARE_CHECK_DAYS` (line 22) and `RARE_STEP` (line 25), the same values. |
| `lampas/src/data/schedule.ts:35` | not-covered | `FLASHCARD_STEP` and `modeFor` choose how an item is asked (choice or flashcard) from its step: a screen's choice, the step it reads is in `Schedule`. |
| `lampas/src/data/schedule.ts:46` | covered | `Schedule` (step, due, lastWhen, lapses, rights), without the item's kind and id. |
| `lampas/src/data/schedule.ts:49` | covered | `gapOf`, the same gap in milliseconds for a step. |
| `lampas/src/data/schedule.ts:54` | covered | `nextReview`, the same dates as Lampas's. |
| `lampas/src/data/schedule.ts:67` | covered | `isDue`, due at or before now. |
| `lampas/src/data/grammar/needs.ts:11` | covered | The `Level` type (solid, frontier, notYet) is `Level`. |
| `lampas/src/data/grammar/needs.ts:124` | not-covered | `progressToward` counts a passage's needed words and ideas by level for a goal; the counts are a goal's, and `levelsOf` supplies the levels. |
| `lampas/src/data/grammar/goalProgress.ts:44` | covered | `stateOf` (learning, next, not yet): learning is `learning`, and next is the `frontierOf` test. |
| `lampas/src/data/grammar/goalProgress.ts:111` | covered | `learningNow` is `learning`, apart from leaving out the items of a group. |
| `lampas/src/data/grammar/bridge.ts:109` | covered | `missingFoundations` is `below` filtered to the ideas not yet; the wording stays. |
| `lampas/src/data/grammar/ideaSheet.ts:261` | covered | `taughtAt` is an idea and `below` of it. |
| `lampas/src/data/paradigms/index.ts:61` | not-covered | `isAvailable` asks whether every idea a table cell names is within an extent; a cell is not a node, so this is glue over `levelsOf` that stays. |
| `lampas/src/data/grammar/gradedVerses.ts:47` | not-covered | `ideaMet` is the same test for a verse: glue over the levels, not a graph. |
| `lampas/src/data/db.ts:403` | covered | The `GrammarLevel` row (level, since, how) is `NodeState`; Lampas writes a `GraphStore` over its table. |
| `lampas/src/data/db.ts:786` | not-covered | The v21 upgrade that left one idea at the frontier is a one-time change of Lampas's own tables. |
| `lampas/src/data/repositories/grammarLevels.ts:25` | covered | `SOLID_STEP`, and `levelFromStep` (line 34), the same. |
| `lampas/src/data/repositories/grammarLevels.ts:31` | covered | `knownStart` (the 30-day step, due in 30 days) is `knownSchedule`. |
| `lampas/src/data/repositories/grammarLevels.ts:50` | covered | `getLevel` and `listLevels` (line 55) are `levelOf` and `levelsOf` over a `GraphStore`. |
| `lampas/src/data/repositories/grammarLevels.ts:81` | covered | `frontierIdeas` is `learning`. |
| `lampas/src/data/repositories/grammarLevels.ts:90` | covered | `otherFrontier` is the `other` that `teach` answers `busy` with. |
| `lampas/src/data/repositories/grammarLevels.ts:96` | covered | `startLearning` (step 0, due after the first gap) is `startSchedule`, written by `teach`. |
| `lampas/src/data/repositories/grammarLevels.ts:107` | covered | `lowestFrontier` is `place`: of the unproved the first in order is the frontier and the rest go back to not yet. |
| `lampas/src/data/repositories/grammarLevels.ts:130` | covered | `advanceFrontier` is the moving on that `review`, `testOut` and `teach` do when the frontier is proved. |
| `lampas/src/data/repositories/grammarLevels.ts:150` | not-covered | `syncAlphabet` and `announceAlphabet` (line 172) keep a group's level from its items and tell the bus; groups and the bus stay in Lampas. |
| `lampas/src/data/repositories/grammarLevels.ts:183` | covered | `setLevel` writes a level and keeps the one-frontier rule; learn-kit's `setLevel` is the plain write and `teach` keeps the rule. |
| `lampas/src/data/repositories/grammarLevels.ts:210` | covered | `recordGrammarAnswer` is `review`. |
| `lampas/src/data/repositories/grammarLevels.ts:235` | covered | `scheduleIdea` puts an idea on the schedule, as `startSchedule` and `knownSchedule` do. |
| `lampas/src/data/repositories/grammarLevels.ts:263` | covered | `teachIdea` is `teach` for Got it, with `FrontierChoice` (line 248) the same, and `testOut` for I know it. |
| `lampas/src/data/repositories/grammarLevels.ts:303` | not-covered | `recordDrill` reads a drill result and moves the level; the moves are `teach`, `testOut` and `review`, the drill result is the later drill package's. |
| `lampas/src/data/repositories/grammarLevels.ts:332` | not-covered | `seedLevelsIfFirstOpen` seeds levels once from Lampas's older tables; it stays. |
| `lampas/src/data/repositories/reviews.ts:50` | not-covered | `announceDue` tells Lampas's event bus that reviews are due. |
| `lampas/src/data/repositories/reviews.ts:59` | covered | `writeReview` is `nextReview` written for an item. |
| `lampas/src/data/repositories/reviews.ts:72` | covered | `writeRestart` (an item back to step 0) is `startSchedule`. |
| `lampas/src/data/repositories/reviews.ts:100` | not-covered | `ideaExists`, `planRowAskable`, `live`, `inScheme` and `namesSomething` (to line 165) keep from the due list the rows Review cannot ask (words, tables, sounds, drill plan steps); those items are not graph nodes. |
| `lampas/src/data/repositories/reviews.ts:174` | covered | `listDue` and `countDue` (line 188) are `dueOf` for the nodes of a graph; the rows that are not nodes keep the filter above. |
| `lampas/src/data/repositories/reviews.ts:227` | not-covered | `seedScheduleIfFirstOpen` (with `SOLID_START_STEP` at line 22 and `SPREAD_DAYS` at line 24) spreads the solid words over 30 days once, on an upgrade. |
| `lampas/src/data/repositories/words.ts:118` | covered | `KNOWN_START_STEP` (the 30-day step) is `KNOWN_STEP`, with `knownSchedule`. |
| `lampas/src/data/repositories/words.ts:121` | not-covered | Taking a new word onto the list (learning, solid or dropped) is a word list with its own states, not a graph; its schedule is `nextReview` through reviews.ts. |
| `lampas/src/data/repositories/inference.ts:18` | covered | `KNOWN_START_STEP` again, `KNOWN_STEP`. |
| `lampas/src/data/repositories/inference.ts:63` | not-covered | Crediting a group from the letters read right, and falling back to the frontier, is the Greek inference of placement.ts:152; it ends in `place`-like writes. |
| `lampas/src/data/repositories/rusty.ts:36` | not-covered | `moveToFrontier` moves several words and ideas at once and restarts their schedules; `teach` moves one node. |
| `lampas/src/data/rusty.ts:61` | not-covered | `rustyOf` and `overdueOf` (line 74) pick solid items overdue from their `due` by Lampas's own days (`RUSTY_*`, line 9); `isDue` and `dueOf` supply the due test only. |
| `lampas/src/review/round.ts:48` | not-covered | `drawReviewRound` fills a round with the due items first, then others and the gap questions; the due part is `dueOf`, the rest is Lampas's mix. |
| `lampas/src/review/kinds.ts:215` | covered | The use of `SOLID_STEP` (an idea at the solid step may be asked to parse a word) is `SOLID_STEP`. |
| `lampas/src/data/repositories/drillPlans.ts:103` | not-covered | Pushing a plan row's `due` out a day is a drill plan's own edit of a review row. |
| `lampas/src/data/frontier.ts:46` | not-covered | `pickFrontier` picks the next new words of a chapter by how common they are in the New Testament; it never looks at needs, so it is not the graph's frontier. `easiestVerse` (line 93) stays with it. |
| `spell-forge/src/core/spaced-rep/scheduler.ts:11` | not-covered | `REVIEW_INTERVALS` gives each of four buckets its own expanding days (learning every session, familiar 1 to 3, mastered 7 to 60, review 60 to 180); `STEP_DAYS` is one ladder, so moving over changes spell-forge's dates. |
| `spell-forge/src/core/spaced-rep/scheduler.ts:21` | not-covered | `getIntervalIndex` picks the interval from the consecutive correct count; `nextReview` steps on two rights in a row, so the rule is different. |
| `spell-forge/src/core/spaced-rep/scheduler.ts:28` | not-covered | `calculateNextReview` dates the next review from the bucket and the streak (a new word is due at once); the nearest learn-kit entry is `nextReview`, with different dates. |
| `spell-forge/src/core/spaced-rep/scheduler.ts:54` | not-covered | `updateWordStats` updates counters, bucket, difficulty and the date in one call; only the date part has a learn-kit counterpart (`nextReview`). |
| `spell-forge/src/core/spaced-rep/buckets.ts:8` | not-covered | `MASTERED_MIN_DAYS` (three distinct days of correct answers for mastered) has no counterpart: learn-kit's solid is a step, not a count of days. |
| `spell-forge/src/core/spaced-rep/buckets.ts:13` | not-covered | `DEMOTION_THRESHOLD` (three wrong in a row drop one bucket, with a grace period); `nextReview` drops two steps on one wrong. |
| `spell-forge/src/core/spaced-rep/buckets.ts:37` | not-covered | `demoteOneLevel` and `bucketMinCorrect` (line 50) move between five buckets (new, learning, familiar, mastered, review); learn-kit has three levels. |
| `spell-forge/src/core/spaced-rep/buckets.ts:73` | not-covered | `transitionBucket` is the rule for the five buckets from streaks, days and wrongs: the SM-2 sweep decides whether the spelling graph's levels replace it. |
| `spell-forge/src/core/spaced-rep/difficulty.ts:29` | not-covered | `computeDifficulty` scores a word 0 to 1 from error rate, response time, scaffolding and recency to order practice; it is neither a graph nor a schedule, and learn-kit has no score. |
| `spell-forge/src/core/spaced-rep/test-demotion.ts:13` | not-covered | `computeTestDemotion` drops a word one bucket after a miss on a real test; the nearest learn-kit entry is `review` with a wrong, which drops two steps. |
| `spell-forge/src/core/spaced-rep/coin-service.ts:68` | covered | `getWordsDueCount` and `getWordsDueIds` (line 75) keep the words whose `nextReviewDate` has come and are not new; for words as graph nodes that is `dueOf`. |
| `spell-forge/src/contracts/types.ts:114` | covered | The `nextReviewDate` field of `WordStats` is `Schedule`'s `due` (as ms). |
| `spell-forge/src/App.tsx:560` | not-covered | A new `WordStats` row with `nextReviewDate: new Date()` is due at once; `startSchedule` waits one gap, so it differs. The same row is built at lines 685 and 894. |
| `spell-forge/src/features/word-lists/add-words.ts:53` | not-covered | The same new row, due at once, as App.tsx:560. |
| `spell-forge/src/core/word-selection/selector.ts:39` | not-covered | `selectSessionWords` mixes a session (current, review and maintenance shares by days to the test); not a graph or a schedule, but it reads the buckets and dates above. `isBlockedByDays` (line 310) and `sortByPriority` (line 334) go with it. |
| `spell-forge/src/core/mastery.ts:15` | not-covered | `getWordCategory` folds the bucket and the learning stage into mastered, familiar, learning or new; a count for a screen. |
| `spell-forge/src/core/adaptive/engine.ts:11` | not-covered | `analyzeEngagement` reads fatigue and frustration from the last answers of one session; it is not a schedule or a graph, and learn-kit has no counterpart. |
| `spell-forge/src/core/adaptive/engine.ts:27` | not-covered | `determineAction` chooses what to do next in the session (slow down, wrap up, make it harder) from those signals; it stays in spell-forge. |
| `spell-forge/src/core/learning/engine.ts:11` | not-covered | `MAX_STAGE`, `SUCCESSES_TO_ADVANCE` and `FAILURES_TO_REGRESS` (line 17) are a four-stage scaffold ladder for one word (letters shown, then hidden); stages are not graph levels. |
| `spell-forge/src/core/learning/engine.ts:103` | not-covered | `processAttempt` advances a word three successes a stage, regresses it on two failures and masters it on a test out; the test out resembles `testOut`, the rest is the scaffold. |
| `spell-forge/src/core/learning/engine.ts:228` | not-covered | `sortWordsForLearning` orders a list by length (easy to hard, hard to easy, wave, random) and `findNextWord` (line 297) takes the first not mastered: a frontier of a list with no needs, where `frontierOf` would give the same word but not the order. |

## Seen questions and confirming a missed idea (`learn-kit/fresh`)

Added with `@learn-kit/fresh` 0.1.0 and `@learn-kit/drill` 0.2.0 (mw-dglxgdz.1). Lampas keeps these in the settings store and asks its
mill for fresh questions; the kit holds the rule and the ledger over an injected `FreshStore`, and the app keeps the store, the rows
and the asking.

| Where | Verdict | Why |
| --- | --- | --- |
| `lampas/src/data/repositories/seenItems.ts:33` | covered | `noteSeen` (and `noteAsked`, which never throws) keeps an idea's newest `MAX_SEEN` (30) questions, one asked again moving up: `markAsked` and `LEDGER_CAP`. The key is the app's (`seenKey` makes it of the prompt and the reference); the kit holds a string. |
| `lampas/src/data/repositories/seenItems.ts:49` | covered | `listSeen` is `asked`, oldest first, and `listSeenOf` is `asked` over several ideas; whether a key is in the list is `isFresh`. |
| `lampas/src/data/repositories/seenItems.ts:12` | not-covered | `parseSeen` and the JSON in the settings store are the app's `FreshStore`; `notable` (only a question about a verse, on an idea the mill is asked about) stays in Lampas. |
| `lampas/src/data/repositories/toConfirm.ts:39` | covered | `listToConfirm` and `isToConfirm` are `toConfirm` and `isToConfirm`; `markToConfirm` and `clearToConfirm` are done by `recordAnswer`. |
| `lampas/src/data/repositories/toConfirm.ts:73` | not-covered | `missedBefore` and the `confirmed` map read the idea's schedule row; the app reads its own rows and hands the answer to `recordAnswer` as `missedBefore`. |
| `lampas/src/review/confirm.ts:32` | covered | `confirmAnswer`'s three cases are `recordAnswer`'s verdicts: fresh right is `known`, a seen right after a miss is `to-confirm`, a wrong answer is `missed`, any other right is `seen`. Writing the row, the hint check and `askForMoreItems` stay in Lampas. |
| `lampas/src/data/grammar/drillIt.ts:50` | covered | The walk's `seen` option (a seen question never counts toward proving an idea) is `WalkOptions.isFresh`: a right answer on a seen key neither counts toward `PROVED_STREAK` nor breaks it. Lampas filters seen questions out of the steps (line 110) and checks the top step can still prove (line 126); the app may keep that, or pass `isFresh`. |

## Hits of the sweep that are not a graph, a frontier or a scheduler

| Where | Verdict | Why |
| --- | --- | --- |
| `lampas/src/WordsScreen.tsx:53` | not-scheduler | A group name for words taken from the reading (source frontier). |
| `lampas/src/IdeaSheet.tsx:10` | not-scheduler | The level slider's words (Learning is frontier); line 462 calls `unmetNeed` and line 481 passes the `FrontierChoice`. |
| `lampas/src/ReviewScreen.tsx:145` | not-scheduler | A comment on practising rusty items; line 41 counts the rows due by tomorrow for display. |
| `lampas/src/ParadigmsScreen.tsx:3` | not-scheduler | Screen text about which cells are shown (solid or frontier). |
| `lampas/src/useNewWords.ts:1` | not-scheduler | The hook that calls `pickFrontier` (data/frontier.ts:46) for the New words strip. |
| `lampas/src/TeachSheet.tsx:3` | not-scheduler | The teach sheet for a new word; it calls `easiestVerse` and publishes `frontier-taught`. |
| `lampas/src/GoalScreen.tsx:1` | not-scheduler | The Goal screen's bars and labels (solid, frontier, not yet). |
| `lampas/src/PlacementScreen.tsx:77` | not-scheduler | The placement screen's level words and its summary counts (line 187). |
| `lampas/src/settings/definitions/grammarExtent.ts:27` | not-scheduler | The dials' words and options for the grammar extent. |
| `lampas/src/settings/registry.ts:453` | not-scheduler | The help text of the Weave's grammar dial. |
| `lampas/src/settings/controls/approach.tsx:87` | not-scheduler | A prop type holding a level per idea. |
| `lampas/src/review/pickerMove.ts:29` | not-scheduler | The wording of the question about moving new words to frontier grammar. |
| `lampas/src/review/practise.ts:1` | not-scheduler | Holds the items the next round is to ask first; no dates. |
| `lampas/src/data/grammar/move.ts:7` | not-scheduler | A threshold on the share of recent answers right that moves the picker between Solid and Frontier grammar; a setting, not a schedule. |
| `lampas/src/data/grammar/formLevel.ts:8` | not-scheduler | The Weave's grammar dial and the picker's levels as types and a mapping. |
| `lampas/src/data/grammar/goalProgress.ts:17` | not-scheduler | The list of levels (line 17) and `wordLevel` (line 53), which reads a word's state as a level. |
| `lampas/src/data/grammar/questions.ts:378` | not-scheduler | A comment on the parse-this-word question using the levels. |
| `lampas/src/data/grammar/ideaSheet.ts:449` | not-scheduler | A comment on letter ideas that are solid or frontier. |
| `lampas/src/data/grammar/extent.ts:2` | not-scheduler | The grammar extent (Any, Solid and frontier, Solid only) and the one test of whether a level is within it (line 23); a filter over levels. |
| `lampas/src/data/grammar/passageCheck.ts:44` | not-scheduler | A comment: a Check asks the lesson's passage, not the verses under his frontier. |
| `lampas/src/data/grammar/soundScope.ts:21` | not-scheduler | A comment on what counts as an item of a group. |
| `lampas/src/data/grammar/learnerGrammar.ts:2` | not-scheduler | The grammar snapshot sent to the tutor: counts and titles per level (solid, frontier, not yet). |
| `lampas/src/useTalk.ts:212` | not-scheduler | A comment on the one rusty offer a talk makes. |
| `lampas/src/data/repositories/index.ts:101` | not-scheduler | A re-export of the grammarLevels.ts functions. |
| `lampas/src/data/placementKeep.ts:22` | not-scheduler | The list of level words a kept placement may hold. |
| `lampas/src/data/db.ts:17` | not-scheduler | The `source: 'frontier'` field of a word, and the rusty offer fields at lines 234 and 239. |
| `lampas/src/data/frequency.ts:2` | not-scheduler | A comment: the picker uses the frequency table. |
| `lampas/src/data/rusty.ts:20` | not-scheduler | The label of the button that moves rusty items back to Frontier. |
| `lampas/src/data/paradigms/types.ts:10` | not-scheduler | A comment on a form's ideas needing to be at the frontier or solid; the test is paradigms/index.ts:61. |
| `lampas/src/data/repositories/talks.ts:45` | not-scheduler | A tutor talk's stored rusty offer. |
| `lampas/src/services/talk.ts:271` | not-scheduler | The tutor's rusty offer type. |
| `lampas/src/talk/rustyOffer.ts:1` | not-scheduler | The tutor's offer to move rust back to Frontier; it calls `moveToFrontier` (repositories/rusty.ts:36). |
| `lampas/src/talk/RustyOffer.tsx:2` | not-scheduler | The offer's sheet and button. |
| `lampas/src/review/round.ts:38` | not-scheduler | A comment on a round of chosen items; the round is `drawReviewRound` (line 48). |
| `lampas/src/events/kinds/learning.ts:14` | not-scheduler | Event types for the idea sheet, the picker and the placement. |
| `lampas/src/events/kinds/settings.ts:18` | not-scheduler | A comment on the Weave's grammar dial event. |
| `lampas/src/approaches/types.ts:28` | not-scheduler | A comment on a lesson's passage step. |
| `lampas/src/approaches/bma-tutor.ts:15` | not-scheduler | A comment on a lesson that has him read a passage. |
| `lampas/src/approaches/ladder.ts:33` | not-scheduler | A comment on the last stage's passages. |
| `lampas/src/data/repositories/words.ts:133` | not-scheduler | Writes `source: 'frontier'` on a new word and publishes `frontier-taught`. |
| `lampas/src/services/mill.ts:39` | not-scheduler | A poll interval for the grind service. |
| `lampas/src/ui/useElapsed.ts:8` | not-scheduler | A one-second timer for an elapsed clock. |
| `lampas/src/ui/visibleInterval.ts:5` | not-scheduler | A timer that sleeps while the page is hidden. |
| `spell-forge/src/bsv/node/testnet-e2e-helpers.ts:65` | not-scheduler | Waits between test network calls (`minIntervalMs`, `intervalMs`). |
| `spell-forge/src/features/about/credits.ts:232` | not-scheduler | Credits text that says intervals and buckets were adapted for children. |
| `spell-forge/src/features/tutor/ask-the-tutor.tsx:104` | not-scheduler | Polls the tutor's answer (`pollIntervalMs`) and a one-second clock at line 117; tutor-screen.tsx:115 and :129, parent-ask-flow.ts:24, tutor-flow.ts:22, math-loop.tsx:66 and reading-loop.tsx:213 are the same. |
| `spell-forge/src/features/word-lists/photo-import.ts:39` | not-scheduler | A poll of the photo import (line 217). |
| `spell-forge/src/features/practice/letter-invasion-logic.ts:15` | not-scheduler | Ticks between spawns in a game; letter-invasion.tsx:207, spell-catcher.tsx:86, word-relay-race.tsx:104 and custom-keyboard.tsx:164 are game and key-repeat timers. |
| `spell-forge/src/grist/config.ts:7` | not-scheduler | The poll interval of the grind door; grist/in-flight.ts:15, parent-ask-in-flight.ts:39 and grist/index.ts:18 are the same poll. |
| `spell-forge/src/data/db.ts:62` | not-scheduler | The `[profileId+nextReviewDate]` index of the wordStats table, repeated in each schema version down to line 324. |
| `spell-forge/src/features/dashboard/word-detail-view.tsx:154` | not-scheduler | Shows the time to the next review. |
| `spell-forge/src/core/spaced-rep/index.ts:3` | not-scheduler | A re-export of `updateWordStats` and `calculateNextReview`. |
| `legend/src/services/grist.ts:99` | not-scheduler | A poll of the grind door (`intervalMs`). |
| `legend/src/services/nameItem.ts:55` | not-scheduler | A poll of the grind door for naming an item (`intervalMs`). |

## The sweep

The three apps were searched, tests and features included, for `frontier`, `nextReview`, `isDue`, `interval`, `easeFactor` and
`topological`, and for legend also `schedule` and `due`:

- `easeFactor` and `topological`: no hit in any of the three. There is no SM-2 ease factor anywhere; spell-forge's scheduler is
  called an SM-2 adaptation but keeps buckets and fixed day lists.
- `isDue`: Lampas only (`data/schedule.ts:67` and its use in `data/repositories/reviews.ts:176`).
- `nextReview`: Lampas (`data/schedule.ts:54`, `reviews.ts:63`) and spell-forge (the rows above).
- `frontier`: Lampas throughout; spell-forge has none.
- `interval`: timers and polls in all three, listed in the second table.
- legend has no graph, frontier or scheduler; its only hits are the two polls.
- The hits in test and feature files (Lampas `tests/` and `features/`, spell-forge `tests/`, legend `tests/` and `features/`)
  exercise the modules above and add no new machinery.
