// The drill forms (src/forms.ts): a form is an id and the render contract the app supplies; an item names its form by id, and an id the
// registry does not hold is refused.
import { describe, expect, it } from 'vitest';
import { DrillFormError, checkItems, createForms } from '../src/index.js';
import { FORMS } from './fixtures.js';

describe('createForms', () => {
  it('holds the forms by id, with the render contract the app gave', () => {
    expect(FORMS.ids()).toEqual(['tap', 'type', 'listen']);
    expect(FORMS.has('tap')).toBe(true);
    expect(FORMS.get('type')).toEqual({ id: 'type', render: { kind: 'type' } });
  });

  it('refuses an unknown id, naming it and the ids it has', () => {
    expect(FORMS.has('juggle')).toBe(false);
    expect(() => FORMS.get('juggle')).toThrow(DrillFormError);
    expect(() => FORMS.get('juggle')).toThrow(/juggle.*tap, type, listen/);
  });

  it('refuses an id listed twice and an empty id', () => {
    expect(() => createForms([{ id: 'tap', render: 1 }, { id: 'tap', render: 2 }])).toThrow(/tap.*twice/);
    expect(() => createForms([{ id: '', render: 1 }])).toThrow(DrillFormError);
  });

  it('keeps its own list: changing the array after does not change the registry', () => {
    const forms = [{ id: 'tap', render: 1 }];
    const registry = createForms(forms);
    forms.push({ id: 'type', render: 2 });
    expect(registry.ids()).toEqual(['tap']);
  });
});

describe('checkItems', () => {
  it('passes items whose forms are held and refuses the first that is not, with its key', () => {
    const ok = { key: 'k1', form: 'tap', payload: 1 };
    expect(() => checkItems(FORMS, [ok, { ...ok, key: 'k2', form: 'type' }])).not.toThrow();
    expect(() => checkItems(FORMS, [ok, { ...ok, key: 'k3', form: 'dance' }])).toThrow(/k3.*dance/);
  });
});
