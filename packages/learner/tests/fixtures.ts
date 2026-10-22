// Fixtures shared by the learner tests: a small graph listed easy first and a goal over it. Nothing here is a subject the library knows.
import { validate } from 'learn-kit/graph';
import type { Goal } from '../src/index.js';

/**
 * Two roots, count and shapes. add and subtract need count; multiply needs add; proof needs shapes and lies under no target of GOAL;
 * fractions needs multiply and subtract; area needs multiply and shapes; algebra needs fractions.
 */
export const GRAPH = validate([
  { id: 'count', needs: [], level: 1 },
  { id: 'shapes', needs: [], level: 1 },
  { id: 'add', needs: ['count'], level: 2 },
  { id: 'subtract', needs: ['count'], level: 2 },
  { id: 'multiply', needs: ['add'], level: 3 },
  { id: 'proof', needs: ['shapes'], level: 3 },
  { id: 'fractions', needs: ['multiply', 'subtract'], level: 4 },
  { id: 'area', needs: ['multiply', 'shapes'], level: 4 },
  { id: 'algebra', needs: ['fractions'], level: 5 },
]);

export const GOAL: Goal = { id: 'top-of-the-class', title: 'Top of the class', targets: ['algebra', 'area'] };

/** The goal's nodes, the targets and all they rest on, in teaching order: every node of GRAPH but proof. */
export const GOAL_PATH = ['count', 'shapes', 'add', 'subtract', 'multiply', 'fractions', 'area', 'algebra'];
