// a form for any json value, editing it in place: strings, numbers and
// booleans get inputs; arrays get add / remove / move; arrays of objects get
// a collapsible card each. hints (by path, array indices as *) pick selects,
// checkbox sets and objects whose keys are data (the terminal's file names).
import { el, button } from './ui';

export type Hints = {
  choose?: Record<string, string[]>; // one of these
  many?: Record<string, string[]>; // any of these
  records?: string[]; // objects keyed by name, not by field
};
type Json = string | number | boolean | null | Json[] | { [k: string]: Json };
type Obj = { [k: string]: Json };

const label = (key: string) => key.replace(/([a-z])([A-Z])/g, '$1 $2').toLowerCase();
const isObj = (v: unknown): v is Obj => !!v && typeof v === 'object' && !Array.isArray(v);
// what a card is called: its first naming field
const title = (o: Obj, i: number) => String(['name', 'title', 'org', 'label', 'group', 'what', 'slug'].map((k) => o[k]).find((v) => typeof v === 'string' && v) ?? `#${i + 1}`).replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
// an empty copy of a value, for a new array item
const blank = (v: Json): Json => (Array.isArray(v) ? [] : isObj(v) ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, blank(x)])) : typeof v === 'number' ? 0 : typeof v === 'boolean' ? false : '');

export function buildForm(root: Obj, hints: Hints, changed: () => void): HTMLElement {
  // a text field; optional keys (missing from some siblings) vanish when emptied
  function text(parent: Obj | Json[], key: string | number, path: string, name: string, optional = false) {
    const value = String((parent as any)[key] ?? '');
    const choices = hints.choose?.[path];
    let input: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
    if (choices) {
      input = el('select', {}, ...choices.map((c) => el('option', { value: c, text: c, selected: c === value })));
    } else if (value.length > 70 || value.includes('\n')) {
      input = el('textarea', { rows: String(Math.min(12, Math.ceil(value.length / 80) + 1)) });
      input.value = value;
    } else {
      input = el('input', { autocomplete: 'off' });
      input.value = value;
    }
    input.addEventListener('input', () => {
      if (optional && !input.value && !Array.isArray(parent)) delete (parent as Obj)[key];
      else (parent as any)[key] = input.value;
      changed();
    });
    input.setAttribute('aria-label', name);
    return input;
  }

  function scalar(parent: Obj | Json[], key: string | number, path: string, name: string, optional: boolean) {
    const v = (parent as any)[key];
    if (typeof v === 'boolean') {
      const c = el('input', { type: 'checkbox', checked: v, 'aria-label': name });
      c.addEventListener('change', () => { (parent as any)[key] = c.checked; changed(); });
      return c;
    }
    if (typeof v === 'number') {
      const n = el('input', { type: 'number', value: String(v), 'aria-label': name });
      n.addEventListener('input', () => { (parent as any)[key] = Number(n.value); changed(); });
      return n;
    }
    return text(parent, key, path, name, optional);
  }

  function field(parent: Obj, key: string, path: string, optional: boolean): HTMLElement {
    const v = parent[key];
    const p = path ? `${path}.${key}` : key;
    if (Array.isArray(v) || isObj(v) || hints.many?.[p]) return group(label(key), value(parent, key, p));
    return el('label', { class: 'cf-field' }, el('span', { text: label(key) + (optional ? ' (optional)' : '') }), scalar(parent, key, p, label(key), optional));
  }

  const group = (name: string, body: HTMLElement) => el('fieldset', { class: 'cf-group' }, el('legend', { text: name }), body);

  // the editor for parent[key], whatever it holds
  function value(parent: Obj | Json[], key: string | number, path: string): HTMLElement {
    const v = (parent as any)[key];
    if (hints.many?.[path]) return checks(parent, key, hints.many[path]);
    if (Array.isArray(v)) return list(v, path);
    if (isObj(v)) return hints.records?.includes(path) ? record(v, path) : object(v, path);
    return scalar(parent, key, path, String(key), false);
  }

  function object(o: Obj, path: string, siblings: Obj[] = [o]) {
    // every key any sibling has, so a missing optional field can be filled in
    const keys = [...new Set(siblings.flatMap((s) => Object.keys(s)))];
    const box = el('div', { class: 'cf-obj' });
    for (const k of keys) {
      const optional = siblings.some((s) => !(k in s));
      if (!(k in o)) {
        // shaped like a sibling's: an absent string field shows empty
        const like = siblings.find((s) => k in s)![k];
        if (typeof like !== 'string') continue;
      }
      box.append(field(o, k, path, optional));
    }
    return box;
  }

  function checks(parent: Obj | Json[], key: string | number, options: string[]) {
    const chosen = new Set((parent as any)[key] as string[]);
    return el('div', { class: 'cf-checks' }, ...options.map((opt) => {
      const c = el('input', { type: 'checkbox', checked: chosen.has(opt) });
      c.addEventListener('change', () => {
        (parent as any)[key] = options.filter((o) => (o === opt ? c.checked : chosen.has(o)));
        chosen.clear();
        ((parent as any)[key] as string[]).forEach((x) => chosen.add(x));
        changed();
      });
      return el('label', {}, c, ` ${opt}`);
    }));
  }

  // an array: one row (scalars) or card (objects) per item; structural changes redraw it
  function list(arr: Json[], path: string): HTMLElement {
    const box = el('div', { class: 'cf-list' });
    const p = `${path}.*`;
    const redraw = () => { box.replaceWith(list(arr, path)); changed(); };
    const tools = (i: number) =>
      el('span', { class: 'cf-tools' },
        button('↑', () => { if (i > 0) { [arr[i - 1], arr[i]] = [arr[i], arr[i - 1]]; redraw(); } }),
        button('↓', () => { if (i < arr.length - 1) { [arr[i + 1], arr[i]] = [arr[i], arr[i + 1]]; redraw(); } }),
        button('remove', () => { if (confirm('Remove this item?')) { arr.splice(i, 1); redraw(); } }),
      );
    const objects = arr.filter(isObj);
    arr.forEach((item, i) => {
      if (isObj(item)) {
        const card = el('details', { class: 'cf-card' }, el('summary', {}, el('span', { text: title(item, i) }), tools(i)), object(item, p, objects));
        // keep the summary's name current as its fields change
        card.addEventListener('input', () => (card.querySelector('summary > span')!.textContent = title(item, i)));
        box.append(card);
      } else {
        box.append(el('div', { class: 'cf-row' }, value(arr, i, p), tools(i)));
      }
    });
    box.append(button('+ add', () => {
      const like = arr.length ? blank(arr[arr.length - 1]) : '';
      arr.push(like);
      redraw();
    }, 'text-btn cf-add'));
    return box;
  }

  // an object whose keys are names (terminal files): rename, add, remove
  function record(o: Obj, path: string): HTMLElement {
    const box = el('div', { class: 'cf-list' });
    const redraw = () => { box.replaceWith(record(o, path)); changed(); };
    for (const k of Object.keys(o)) {
      const name = el('input', { value: k, 'aria-label': 'file name', class: 'cf-key', spellcheck: 'false' });
      name.addEventListener('change', () => {
        const next = name.value.trim();
        if (!next || next === k || next in o) { name.value = k; return; }
        // rebuild in the same order with the new name
        const entries = Object.entries(o).map(([key, v]) => [key === k ? next : key, v] as const);
        for (const key of Object.keys(o)) delete o[key];
        entries.forEach(([key, v]) => (o[key] = v));
        redraw();
      });
      box.append(el('details', { class: 'cf-card' },
        el('summary', {}, el('span', { text: k }), el('span', { class: 'cf-tools' }, button('remove', () => { if (confirm(`Remove ${k}?`)) { delete o[k]; redraw(); } }))),
        el('div', { class: 'cf-obj' }, el('label', { class: 'cf-field' }, el('span', { text: 'name' }), name), el('label', { class: 'cf-field' }, el('span', { text: 'contents' }), scalar(o, k, `${path}.*`, k, false))),
      ));
    }
    box.append(button('+ add', () => {
      const n = prompt('New name:');
      if (n && !(n in o)) { o[n] = ''; redraw(); }
    }, 'text-btn cf-add'));
    return box;
  }

  return object(root, '');
}
