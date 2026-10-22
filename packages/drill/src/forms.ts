// Drill forms: how an item is put to the learner (tap it, type it, hear it ...). The library knows a form by its id only; the render
// contract is whatever the app supplies for it, and the app registers its forms once. An item names its form by id, and an id the
// registry does not hold is refused, so a drill never reaches a screen that cannot draw it.

/** A form: its id and the render contract the app supplies (a component, a descriptor ...). The library never reads the contract. */
export interface DrillForm<R = unknown> {
  id: string;
  render: R;
}

/** Thrown for a form id the registry does not hold, or a registry that cannot be made. */
export class DrillFormError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DrillFormError';
  }
}

/** The forms an app has registered. */
export interface Forms<R = unknown> {
  has(id: string): boolean;
  /** The form with this id. Throws a DrillFormError naming the ids it has when there is none. */
  get(id: string): DrillForm<R>;
  /** The ids, in the order registered. */
  ids(): string[];
}

/** The registry of these forms. Throws a DrillFormError on an empty id or an id listed twice. It keeps its own list. */
export function createForms<R>(forms: readonly DrillForm<R>[]): Forms<R> {
  const byId = new Map<string, DrillForm<R>>();
  for (const form of forms) {
    if (form.id === '') throw new DrillFormError('A drill form needs an id');
    if (byId.has(form.id)) throw new DrillFormError(`Drill form ${JSON.stringify(form.id)} is listed twice`);
    byId.set(form.id, { ...form });
  }
  return {
    has: (id) => byId.has(id),
    get: (id) => {
      const form = byId.get(id);
      if (!form) throw new DrillFormError(`Unknown drill form ${JSON.stringify(id)}; the forms are ${[...byId.keys()].join(', ') || '(none)'}`);
      return form;
    },
    ids: () => [...byId.keys()],
  };
}

/** An item an item maker makes for a node: a key that tells it from the node's others, the id of the form it is put in, and what the form shows. */
export interface MadeItem<P = unknown> {
  key: string;
  form: string;
  payload: P;
}

/** A made item with the node it is about. */
export interface DrillItem<P = unknown> extends MadeItem<P> {
  nodeId: string;
}

/** Throws a DrillFormError, naming the item's key and form, for the first item whose form the registry does not hold. */
export function checkItems(forms: Forms, items: readonly MadeItem[]): void {
  for (const item of items) {
    if (!forms.has(item.form)) throw new DrillFormError(`Item ${JSON.stringify(item.key)} is in the unknown drill form ${JSON.stringify(item.form)}; the forms are ${forms.ids().join(', ') || '(none)'}`);
  }
}
