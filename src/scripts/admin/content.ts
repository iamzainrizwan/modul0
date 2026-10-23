// the site's content: src/data/content/*.json (profile.ts and fs.ts read
// them), edited as a form or as raw json, saved as one commit per file
import { call, saveFile, explain, type RepoFile } from './api';
import { say, watchDirty } from './ui';
import { buildForm, type Hints } from './form';

export const files = new Map<string, RepoFile>();
const AREAS = ['Infrastructure', 'Backend', 'AI & ML', 'Data', 'Embedded', 'Apps'];
const HINTS: Hints = {
  choose: { 'featured.*.status': ['live', 'building', 'done'], 'archive.*.status': ['live', 'building', 'done'] },
  many: { 'featured.*.areas': AREAS, 'archive.*.areas': AREAS },
  records: ['files', 'projects'],
};
const NAMES: Record<string, string> = { profile: 'Profile & links', projects: 'Projects', homelab: 'Homelab', cv: 'CV', productions: 'Productions', terminal: 'Terminal files' };

const panel = document.querySelector<HTMLElement>('[data-panel=content]')!;
const formBox = panel.querySelector<HTMLElement>('[data-content-form]')!;
const json = panel.querySelector<HTMLTextAreaElement>('[data-content-json]')!;
const saveBtn = panel.querySelector<HTMLButtonElement>('[data-content-save]')!;
const revertBtn = panel.querySelector<HTMLButtonElement>('[data-content-revert]')!;

let name = '';
let model: any = null; // the file being edited, changed in place by the form
let view: 'form' | 'json' = 'form';
const out = () => JSON.stringify(model, null, 2) + '\n';
const dirty = () => !!model && (view === 'json' ? json.value : out()) !== files.get(name)?.text;
watchDirty(dirty);

export async function loadContent() {
  const list = (await call<{ files: RepoFile[] }>('/admin/content')).files;
  list.forEach((f) => files.set(f.name, f));
}

function changed() {
  saveBtn.disabled = revertBtn.disabled = !dirty();
}

function show() {
  const f = files.get(name);
  panel.querySelector('[data-content-title]')!.textContent = NAMES[name] ?? name;
  if (!f) {
    formBox.replaceChildren();
    model = null;
    return say(`Couldn’t load ${name}.json.`, true);
  }
  model = JSON.parse(f.text);
  json.value = f.text;
  formBox.replaceChildren(buildForm(model, HINTS, changed));
  changed();
}

export function routeContent(next: string) {
  if (next === name && model) return;
  if (dirty() && !confirm(`Throw away the unsaved changes to ${NAMES[name] ?? name}?`)) {
    history.replaceState(null, '', `#content/${name}`);
    return;
  }
  name = next;
  formView();
  show();
}

// back to the form, without reading the json box (show() refills both)
function formView() {
  view = 'form';
  formBox.hidden = false;
  json.closest('label')!.hidden = true;
  panel.querySelectorAll('[data-content-view]').forEach((b) => b.setAttribute('aria-pressed', String((b as HTMLElement).dataset.contentView === 'form')));
}

function setView(next: 'form' | 'json') {
  if (next === view) return;
  if (next === 'form') {
    // the json may have been edited: the form follows it, if it parses
    try { model = JSON.parse(json.value); } catch { return say('That isn’t valid JSON yet, so the form can’t show it.', true); }
    formBox.replaceChildren(buildForm(model, HINTS, changed));
  } else {
    json.value = out();
  }
  view = next;
  formBox.hidden = view === 'json';
  json.closest('label')!.hidden = view === 'form';
  panel.querySelectorAll('[data-content-view]').forEach((b) => b.setAttribute('aria-pressed', String((b as HTMLElement).dataset.contentView === view)));
  changed();
}
panel.querySelectorAll<HTMLButtonElement>('[data-content-view]').forEach((b) => b.addEventListener('click', () => setView(b.dataset.contentView as 'form' | 'json')));
json.addEventListener('input', changed);

revertBtn.addEventListener('click', () => {
  if (!confirm('Throw away your changes?')) return;
  formView();
  show();
});

saveBtn.addEventListener('click', async () => {
  const f = files.get(name)!;
  let text = view === 'json' ? json.value : out();
  try {
    text = JSON.stringify(JSON.parse(text), null, 2) + '\n';
  } catch {
    return say('That isn’t valid JSON.', true);
  }
  try {
    const sha = await saveFile(f.path, { text }, f.sha);
    files.set(name, { ...f, sha, text });
    model = JSON.parse(text);
    json.value = text;
    changed();
    say(`Saved ${NAMES[name]}. Live in about two minutes.`);
  } catch (e) {
    say(explain(e), true);
  }
});
