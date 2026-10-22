// Fixtures shared by the drill tests: a ladder graph of eight levels (two nodes a level), steps of arithmetic-flavoured questions,
// and a forms registry. Nothing here is a subject the library knows.
import { validate, type Graph, type GraphNode } from 'learn-kit/graph';
import { createForms, type RawStep, type WalkQuestion } from '../src/index.js';

/**
 * Eight levels, two nodes each: aN needs a(N-1) and b(N-1); bN needs b(N-1). Listed level by level, a before b. The nodes of level N
 * are therefore a(N), b(N); knowing a(N) means knowing everything below it except b(N') of its own level and above.
 */
export const LEVELS = 8;
export const LADDER: Graph<GraphNode> = validate(
  Array.from({ length: LEVELS }, (_, n): GraphNode[] => [
    { id: `a${n}`, level: n, needs: n === 0 ? [] : [`a${n - 1}`, `b${n - 1}`] },
    { id: `b${n}`, level: n, needs: n === 0 ? [] : [`b${n - 1}`] },
  ]).flat(),
);

export const levelOfId = (id: string): number => Number(id.slice(1));

export const FORMS = createForms([
  { id: 'tap', render: { kind: 'tap' } },
  { id: 'type', render: { kind: 'type' } },
  { id: 'listen', render: { kind: 'listen' } },
]);

/** Raw steps for a drill: `steps` steps, `perStep` questions each, facets cycling through `facets` ids. */
export function rawSteps(steps = 5, perStep = 6, facets = ['f1', 'f2', 'f3']): RawStep<string>[] {
  return Array.from({ length: steps }, (_, s) => ({
    title: `step ${s + 1}`,
    questions: Array.from({ length: perStep }, (_, q) => {
      const facet = facets[(q + s) % facets.length];
      return { key: `s${s + 1}q${q}`, form: 'tap', facet: { id: facet, label: `facet ${facet}` }, payload: `step ${s + 1} question ${q}` };
    }),
  }));
}

export type Q = WalkQuestion<string>;
