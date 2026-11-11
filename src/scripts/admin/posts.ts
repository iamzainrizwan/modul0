// posts: src/content/blog/*.md, edited side by side with a preview drawn in
// the blog's own styles. images (button, paste or drop) are shrunk here, then
// committed to public/blog/<slug>/ straight away; the markdown points at them.
// drafts are different: the repo is public and its history shows every edit,
// so a draft and its images live in the worker's d1 instead, and publishing
// commits them (images first, then the post) and deletes the draft.
import { marked } from 'marked';
import {
  call, saveFile, deleteFile, explain, ApiError, loadDrafts, saveDraft, deleteDraft, saveDraftImage, draftImage,
  type RepoFile, type Draft,
} from './api';
import { say, el, watchDirty, plural } from './ui';
import { parse, serialise } from '../frontmatter';
import { picker, type SiteLink } from './editor/picker';
import { enter, tab, pasteLink } from './editor/lists';
import { images as imagesIn, imageMd, toFigures, codeRanges, type Img } from './editor/figures';
import { colour } from './editor/highlight';
import { tops } from './editor/mirror';
import { smarten } from './editor/smart';

export let posts: RepoFile[] = []; // live, on github
export let drafts: Draft[] = []; // private, in d1
const dir = 'src/content/blog';
const IMAGE_WIDTH = 1600; // px, the widest an image is stored
const IMAGE_MAX = 5_000_000; // bytes, after shrinking
const DRAFT_IMAGE_MAX = 1_900_000; // a draft's images sit in d1, 2 MB a value

const form = document.querySelector<HTMLFormElement>('[data-post-form]')!;
const index = document.querySelector<HTMLElement>('[data-post-index]')!;
const area = form.querySelector('textarea')!;
const preview = form.querySelector<HTMLElement>('[data-preview]')!;
const base = document.querySelector<HTMLElement>('[data-login]')!.dataset.base ?? '/';
const field = (name: string) => form.elements.namedItem(name) as HTMLInputElement;
const split = form.querySelector<HTMLElement>('.md-split')!;
const pvBody = form.querySelector<HTMLElement>('[data-pv-body]')!;
const origin = (() => { try { return new URL(import.meta.env.SITE).origin; } catch { return ''; } })();

let current: RepoFile | null = null; // the live post open in the editor
let draft: Draft | null = null; // or the draft (both null: a new post)
let open = ''; // the hash the editor was opened at
let saved = ''; // the post as last loaded or saved, to spot unsaved changes
const pending = new Map<string, string>(); // image url -> local preview, until the site redeploys

const text = () =>
  serialise({
    ...parse((current ?? draft)?.text ?? ''),
    title: field('title').value.trim(),
    date: field('date').value,
    description: field('description').value.trim(),
    draft: field('draft').checked,
    body: area.value,
  });
const dirty = () => !form.hidden && text() !== saved;
watchDirty(dirty);

let loaded = false; // a link straight to a post waits for the list, not "no such post"
export async function loadPosts() {
  [posts, drafts] = await Promise.all([call<{ files: RepoFile[] }>('/admin/posts').then((d) => d.files), loadDrafts()]);
  loaded = true;
  showIndex();
}

function showIndex() {
  const list = document.querySelector<HTMLOListElement>('[data-post-list]')!;
  const all = [...drafts.map((p) => ({ p, live: false })), ...posts.map((p) => ({ p, live: true }))];
  const sorted = all.map((x) => ({ ...x, f: parse(x.p.text) })).sort((a, b) => b.f.date.localeCompare(a.f.date));
  list.replaceChildren(
    ...sorted.map(({ p, f, live }) =>
      el('li', {},
        el('a', { class: 'adm-list-title', href: `#posts/${p.name}`, text: f.title || p.name }),
        el('span', { class: 'gb-poster', text: [f.date, p.name].join(' · ') }),
        live ? el('a', { class: 'text-btn', href: `${base}blog/${p.name}/`, target: '_blank', text: 'live ↗' }) : el('span', { class: 'adm-badge', text: 'draft' }),
      ),
    ),
  );
  if (!all.length) list.append(el('li', { class: 'gb-empty', text: 'No posts yet.' }));
}

export function routePosts(sub: string) {
  const target = sub ? `posts/${sub}` : 'posts';
  if (!form.hidden && target !== open && dirty()) {
    if (!confirm('Throw away the unsaved changes?')) {
      history.replaceState(null, '', `#${open}`);
      return;
    }
    store.drop(open);
  }
  if (target !== open && form.classList.contains('md-focus')) focusMode(false);
  if (!sub) {
    form.hidden = true;
    index.hidden = false;
    return;
  }
  if (target === open && !form.hidden) return;
  if (sub !== 'new' && !loaded) return; // main.ts routes again once posts are in
  const post = sub === 'new' ? null : posts.find((p) => p.name === sub) ?? null;
  const d = sub === 'new' || post ? null : drafts.find((p) => p.name === sub) ?? null;
  if (sub !== 'new' && !post && !d) return say(`There's no post called ${sub}.`, true);
  edit(post, d, target);
}

function edit(live: RepoFile | null, d: Draft | null, hash: string) {
  current = live;
  draft = d;
  open = hash;
  const post = live ?? d;
  const f = parse(post?.text ?? '');
  field('slug').value = post?.name ?? '';
  field('slug').readOnly = !!post;
  field('title').value = f.title;
  field('date').value = f.date || new Date().toISOString().slice(0, 10);
  field('description').value = f.description;
  field('draft').checked = !live;
  area.value = f.body;
  form.querySelector<HTMLElement>('[data-post-delete]')!.hidden = !post;
  index.hidden = true;
  form.hidden = false;
  saved = text();
  slugTouched = false;
  area.scrollTop = 0;
  preview.scrollTop = 0;
  offerBackup();
  state();
  render();
  (post ? area : field('title')).focus({ preventScroll: true });
  // a draft's images are in d1, so the preview fetches them with the token
  for (const name of d?.images ?? []) {
    const url = `${base}blog/${d!.name}/${name}`;
    if (pending.has(url)) continue;
    draftImage(d!.name, name).then((b) => { pending.set(url, URL.createObjectURL(b)); render(); }, () => {});
  }
}

function state() {
  const name = (current ?? draft)?.name;
  const parts = [name ?? 'new post', field('draft').checked ? 'draft (private)' : 'live', dirty() ? 'unsaved changes' : 'saved'];
  if (!name && !dirty()) parts.pop();
  form.querySelector('[data-post-state]')!.textContent = parts.join(' · ');
  form.classList.toggle('md-dirty', dirty());
}

// the preview: the post as the blog draws it (.article), from marked. each
// top-level block is drawn on its own and its first element remembers where
// it starts in the markdown (data-at), for the scroll sync. then images become
// figures and code is coloured, the way the built post does both
let timer = 0;
function render() {
  clearTimeout(timer);
  timer = window.setTimeout(draw, 80);
}
function draw() {
  form.querySelector('[data-pv-title]')!.textContent = field('title').value || 'Untitled';
  const d = field('date').value;
  form.querySelector('[data-pv-date]')!.textContent = d ? new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : '';
  const src = area.value;
  const tokens = marked.lexer(src, { gfm: true });
  const frag = document.createDocumentFragment();
  const t = document.createElement('template');
  let cursor = 0;
  for (const tok of tokens) {
    const found = src.indexOf(tok.raw, cursor);
    const start = found < 0 ? cursor : found;
    cursor = start + tok.raw.length;
    if (tok.type === 'space' || tok.type === 'def') continue;
    t.innerHTML = marked.parser(Object.assign([tok], { links: tokens.links }), { gfm: true, async: false }) as string;
    const first = t.content.firstElementChild as HTMLElement | null;
    if (first) first.dataset.at = String(start);
    frag.append(t.content);
  }
  pvBody.replaceChildren(frag);
  toFigures(pvBody);
  smarten(pvBody);
  pvBody.querySelectorAll('img').forEach((img) => {
    const at = img.getAttribute('src') ?? '';
    img.dataset.mdSrc = at;
    const local = pending.get(at);
    if (local) img.src = local;
    img.tabIndex = 0;
    img.title = 'Edit: alt text, caption, size';
    if (!img.complete) img.addEventListener('load', () => (geom = null), { once: true });
  });
  colour(pvBody, render);
  geom = null;
  lint();
  words();
  state();
  sync('area');
}

// a new slug from the title, until the slug's been typed in by hand
let slugTouched = false;
field('slug').addEventListener('input', () => (slugTouched = true));
field('title').addEventListener('input', () => {
  if (current || slugTouched) return;
  field('slug').value = field('title').value.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60);
});
form.addEventListener('input', render);
form.addEventListener('change', render);

// keep the preview level with the markdown, block by block: where each block
// starts in the textarea (measured, since lines wrap) is paired with where it's
// drawn in the preview, and scrolling either side follows the other between
// those pairs. a percentage drifts as soon as an image or a code block is
// taller in one than the other
let geom: { a: number[]; b: number[] } | null = null;
const shown = (n: HTMLElement) => n.offsetParent !== null && n.clientHeight > 0;
function measure() {
  if (geom) return geom;
  const els = [...pvBody.querySelectorAll<HTMLElement>('[data-at]')];
  const at = tops(area, els.map((e) => Number(e.dataset.at)));
  const origin = preview.getBoundingClientRect().top - preview.scrollTop;
  const to = els.map((e) => e.getBoundingClientRect().top - origin - 16);
  const maxA = area.scrollHeight - area.clientHeight;
  const maxB = preview.scrollHeight - preview.clientHeight;
  const a = [0];
  const b = [0];
  at.forEach((y, i) => {
    const pad = 16;
    if (y - pad > a.at(-1)! && to[i] >= b.at(-1)! && y - pad < maxA && to[i] < maxB) {
      a.push(y - pad);
      b.push(to[i]);
    }
  });
  a.push(Math.max(maxA, a.at(-1)! + 1));
  b.push(Math.max(maxB, b.at(-1)!));
  return (geom = { a, b });
}
function follow(y: number, from: number[], to: number[]) {
  let k = 0;
  while (k < from.length - 2 && from[k + 1] <= y) k++;
  const f = Math.min(1, Math.max(0, (y - from[k]) / Math.max(1, from[k + 1] - from[k])));
  return to[k] + f * (to[k + 1] - to[k]);
}
let expect = { area: -1, preview: -1 }; // where a scroll we set will land, so it isn't followed back
function sync(from: 'area' | 'preview') {
  if (!shown(area) || !shown(preview)) return;
  const g = measure();
  const [src, dst, a, b] = from === 'area' ? [area, preview, g.a, g.b] as const : [preview, area, g.b, g.a] as const;
  const y = Math.round(follow(src.scrollTop, a, b));
  if (Math.abs(dst.scrollTop - y) < 2) return;
  expect[from === 'area' ? 'preview' : 'area'] = y;
  dst.scrollTop = y;
}
area.addEventListener('scroll', () => {
  if (Math.abs(area.scrollTop - expect.area) < 2) return void (expect.area = -1);
  sync('area');
});
preview.addEventListener('scroll', () => {
  if (Math.abs(preview.scrollTop - expect.preview) < 2) return void (expect.preview = -1);
  sync('preview');
});
new ResizeObserver(() => { geom = null; }).observe(split);
// the preview tab on a narrow screen opens where the caret is
function revealCaret() {
  const els = [...pvBody.querySelectorAll<HTMLElement>('[data-at]')];
  const here = els.filter((e) => Number(e.dataset.at) <= area.selectionStart).at(-1);
  if (!here) return;
  const origin = preview.getBoundingClientRect().top - preview.scrollTop;
  preview.scrollTop = here.getBoundingClientRect().top - origin - 24;
}
// links in the preview open in a new tab, never in the admin itself
preview.addEventListener('click', (e) => {
  const img = (e.target as Element).closest<HTMLImageElement>('img[data-md-src]');
  if (img) return openImageFromPreview(img);
  const a = (e.target as Element).closest('a');
  if (!a) return;
  e.preventDefault();
  const href = a.getAttribute('href') ?? '';
  if (/^https?:/.test(href)) window.open(href, '_blank', 'noopener');
});

// ---- the toolbar ----
// insertText keeps ctrl+z working; setRangeText is the fallback
function put(text: string, start = area.selectionStart, end = area.selectionEnd, select?: [number, number]) {
  area.focus();
  area.setSelectionRange(start, end);
  // an empty insert leaves chrome's caret a character early: delete instead
  const done = text ? document.execCommand('insertText', false, text) : start === end || document.execCommand('delete');
  if (!done) area.setRangeText(text, start, end, 'end');
  if (select) area.setSelectionRange(start + select[0], start + select[1]);
  render();
}
const wrap = (before: string, after = before, empty = 'text') => {
  const { selectionStart: s, selectionEnd: e } = area;
  const inner = area.value.slice(s, e) || empty;
  put(before + inner + after, s, e, [before.length, before.length + inner.length]);
};
// prefix every selected line (headings, quotes, lists)
const lines = (prefix: string) => {
  const s = area.value.lastIndexOf('\n', area.selectionStart - 1) + 1;
  let e = area.value.indexOf('\n', area.selectionEnd);
  if (e < 0) e = area.value.length;
  const block = area.value.slice(s, e).split('\n').map((l) => prefix + l.replace(/^(#{1,6} |> |- )/, '')).join('\n');
  put(block, s, e);
};
const ACTIONS: Record<string, () => void> = {
  bold: () => wrap('**'),
  italic: () => wrap('*'),
  h2: () => lines('## '),
  h3: () => lines('### '),
  quote: () => lines('> '),
  list: () => lines('- '),
  code: () => (area.value.slice(area.selectionStart, area.selectionEnd).includes('\n') ? wrap('```\n', '\n```', 'code') : wrap('`', '`', 'code')),
  link: () => pick.palette(), // ctrl+k: search the site or paste a url
  image: () => form.querySelector<HTMLInputElement>('[data-md-file]')!.click(),
};
form.querySelectorAll<HTMLButtonElement>('[data-md]').forEach((b) => b.addEventListener('click', () => ACTIONS[b.dataset.md!]()));
// ---- the link picker (editor/picker.ts) ----
const SITE: SiteLink[] = JSON.parse(document.querySelector('[data-site-links]')?.textContent || '[]');
// the site as built, plus posts published since (the api's list is newer)
function siteLinks(): SiteLink[] {
  const have = new Set(SITE.map((l) => l.path));
  const fresh = posts
    .map((p) => ({ path: `${base}blog/${p.name}/`, title: parse(p.text).title || p.name, kind: 'post' }))
    .filter((l) => !have.has(l.path));
  return [...SITE, ...fresh];
}
const pick = picker(area, split, siteLinks, put, origin);

let tabLeaves = false; // esc, then tab: tab moves focus even in a list
area.addEventListener('keydown', (e) => {
  if (pick.keys(e)) return e.preventDefault();
  const mod = e.ctrlKey || e.metaKey;
  if (e.key === 'Escape') {
    tabLeaves = true;
    if (form.classList.contains('md-focus')) focusMode(false);
    return;
  }
  if (e.key === 'Tab' && !mod && !e.altKey) {
    if (tabLeaves) return void (tabLeaves = false);
    if (tab(area, put, e.shiftKey)) e.preventDefault();
    return;
  }
  tabLeaves = false;
  if (mod && !e.altKey && (e.key === ' ' || e.code === 'Space')) {
    e.preventDefault();
    if (pick.inLink()) pick.update('force');
    else pick.palette();
    return;
  }
  if (e.key === 'Enter' && e.altKey && !mod) {
    const img = imageAt(area.selectionStart);
    if (img) {
      e.preventDefault();
      editImage(img);
    }
    return;
  }
  if (e.key === 'Enter' && !e.shiftKey && !mod && !e.altKey) {
    if (enter(area, put)) e.preventDefault();
    return;
  }
  if (!mod || e.altKey || e.shiftKey) return;
  const key = { b: 'bold', i: 'italic', k: 'link' }[e.key.toLowerCase()];
  if (key) {
    e.preventDefault();
    ACTIONS[key]();
  }
});
area.addEventListener('input', () => pick.update('type'));
area.addEventListener('blur', () => (tabLeaves = false));
for (const ev of ['keyup', 'mouseup', 'focus']) area.addEventListener(ev, () => { pick.update('move'); where(); });

form.addEventListener('keydown', (e) => {
  const mod = e.ctrlKey || e.metaKey;
  if (mod && !e.shiftKey && e.key.toLowerCase() === 's') {
    e.preventDefault();
    form.requestSubmit();
  }
  if (mod && e.shiftKey && !e.altKey && e.key.toLowerCase() === 'f') {
    e.preventDefault();
    focusMode(!form.classList.contains('md-focus'));
  }
  if (e.key === 'Escape' && e.target !== area && !pick.isOpen() && form.classList.contains('md-focus')) focusMode(false);
});
// write | preview, for screens too narrow for both (and focus mode)
function view(v: 'write' | 'preview') {
  split.dataset.view = v;
  form.querySelectorAll('[data-md-view]').forEach((x) => x.setAttribute('aria-pressed', String((x as HTMLElement).dataset.mdView === v)));
  geom = null;
  if (v === 'preview') requestAnimationFrame(revealCaret);
}
form.querySelectorAll<HTMLButtonElement>('[data-md-view]').forEach((b) => b.addEventListener('click', () => view(b.dataset.mdView as 'write' | 'preview')));

// ---- focus mode: the editor fills the screen, just the writing ----
const focusBtn = form.querySelector<HTMLButtonElement>('[data-md-focus]')!;
function focusMode(on: boolean) {
  form.classList.toggle('md-focus', on);
  document.documentElement.classList.toggle('md-focus-on', on);
  focusBtn.setAttribute('aria-pressed', String(on));
  focusBtn.textContent = on ? 'leave focus' : 'focus';
  pick.close();
  if (on) view('write');
  geom = null;
  area.focus({ preventScroll: true });
}
focusBtn.addEventListener('click', () => focusMode(!form.classList.contains('md-focus')));
// while typing in focus mode the toolbar steps back; moving the mouse brings it
area.addEventListener('keydown', (e) => {
  if (form.classList.contains('md-focus') && e.key.length === 1 && !e.ctrlKey && !e.metaKey) form.classList.add('md-typing');
});
form.addEventListener('mousemove', () => form.classList.remove('md-typing'));

// ---- the status bar: where the caret is, how long it is, what's wrong ----
const statusPos = form.querySelector<HTMLElement>('[data-md-pos]')!;
const statusWords = form.querySelector<HTMLElement>('[data-md-words]')!;
const statusHint = form.querySelector<HTMLElement>('[data-md-hint]')!;
const WPM = 230;
const countWords = (md: string) =>
  (md
    .replace(/^ {0,3}(`{3,}|~{3,})[^\n]*\n[\s\S]*?(\n {0,3}\1[`~]*|$)/gm, ' ') // code blocks
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ') // images
    .replace(/\]\([^)]*\)/g, ']') // link targets
    .replace(/<[^>]+>/g, ' ')
    .match(/[\p{L}\p{N}][\p{L}\p{N}'’-]*/gu) ?? []).length;
let total = 0;
function words() {
  total = countWords(area.value);
  where();
}
function where() {
  const v = area.value;
  const pos = area.selectionStart;
  const ls = v.lastIndexOf('\n', pos - 1) + 1;
  const ln = v.slice(0, pos).split('\n').length;
  statusPos.textContent = `ln ${ln}, col ${pos - ls + 1}`;
  const picked = area.selectionEnd > pos ? countWords(v.slice(pos, area.selectionEnd)) : 0;
  const mins = Math.max(1, Math.round(total / WPM));
  statusWords.textContent = `${plural(total, 'word', 'words')}${picked ? ` (${plural(picked, 'word', 'words')} selected)` : ''} · ${mins} min read`;
  statusHint.textContent = document.activeElement !== area ? '' : imageAt(pos) ? 'alt+enter: alt text, caption, size' : pick.inLink() && !pick.isOpen() ? 'ctrl+space: link to the site' : '';
}
document.addEventListener('selectionchange', () => document.activeElement === area && where());

// broken links to the site and images without alt text, like an ide's problems
const problemsBtn = form.querySelector<HTMLButtonElement>('[data-md-problems-btn]')!;
const problemsList = form.querySelector<HTMLUListElement>('[data-md-problems]')!;
const LINK = /(!?)\[((?:[^\]\\]|\\.)*)\]\(\s*<?([^\s)>]+)>?(?:\s+"[^"]*")?\s*\)/g;
function lint() {
  const v = area.value;
  const code = codeRanges(v);
  const known = new Set(siteLinks().map((l) => l.path));
  const pages = new Set([...known].map((p) => p.split('#')[0]));
  const anchored = new Set([...known].filter((p) => p.includes('#')).map((p) => p.split('#')[0]));
  const found: { at: number; end: number; text: string }[] = [];
  for (const m of v.matchAll(LINK)) {
    const at = m.index!;
    if (code.some(([s, e]) => at >= s && at < e)) continue;
    const [all, bang, label, url] = m;
    const end = at + all.length;
    if (bang) {
      if (!label.trim()) found.push({ at, end, text: 'An image with no alt text: alt+enter on it to add some.' });
      continue;
    }
    if (origin && url.startsWith(origin)) {
      found.push({ at, end, text: `${url} is this site: write it as ${url.slice(origin.length) || '/'}, like the other links.` });
      continue;
    }
    if (!url.startsWith(base) || url.startsWith('//')) continue;
    const [page, hash] = url.split('#');
    if (page.startsWith(`${base}blog/`) && /\.[a-z0-9]+$/i.test(page)) continue; // a post's own files
    const norm = /[^/]$/.test(page) && !/\.[a-z0-9]+$/i.test(page) ? `${page}/` : page;
    if (!pages.has(norm)) found.push({ at, end, text: `${url}: there's no page at ${norm}.` });
    else if (norm !== page) found.push({ at, end, text: `${url}: the site's urls end in /, so ${norm}${hash ? `#${hash}` : ''}.` });
    else if (hash && anchored.has(page) && !known.has(url)) found.push({ at, end, text: `${url}: ${page} has no section #${hash}.` });
  }
  problemsBtn.hidden = !found.length;
  problemsBtn.textContent = plural(found.length, 'problem', 'problems');
  problemsList.replaceChildren(
    ...found.map((f) => {
      const li = el('li');
      const b = el('button', { type: 'button', class: 'text-btn', text: `ln ${v.slice(0, f.at).split('\n').length}` });
      b.addEventListener('click', () => {
        area.focus();
        area.setSelectionRange(f.at, f.end);
        const y = tops(area, [f.at])[0];
        area.scrollTop = Math.max(0, y - area.clientHeight / 3);
      });
      li.append(b, ` ${f.text}`);
      return li;
    }),
  );
  if (!found.length) {
    problemsList.hidden = true;
    problemsBtn.setAttribute('aria-expanded', 'false');
  }
}
problemsBtn.addEventListener('click', () => {
  const open = problemsList.hidden;
  problemsList.hidden = !open;
  problemsBtn.setAttribute('aria-expanded', String(open));
});

// ---- image options: alt text, caption, size ----
const dlg = document.querySelector<HTMLDialogElement>('[data-img-dlg]')!;
const dlgForm = dlg.querySelector<HTMLFormElement>('[data-img-form]')!;
const dlgField = (n: string) => dlgForm.elements.namedItem(n) as HTMLInputElement;
let editing: Img | null = null;
const imageAt = (pos: number) => imagesIn(area.value).find((i) => pos >= i.start && pos <= i.end) ?? null;
function editImage(img: Img) {
  editing = img;
  dlgField('alt').value = img.alt;
  dlgField('caption').value = img.caption;
  (dlgForm.querySelector(`[name=size][value=${img.narrow ? 'narrow' : 'full'}]`) as HTMLInputElement).checked = true;
  const thumb = dlgForm.querySelector<HTMLImageElement>('[data-img-thumb]')!;
  thumb.src = pending.get(img.src) ?? img.src;
  dlg.returnValue = '';
  dlg.showModal();
  dlgField('alt').select();
}
function openImageFromPreview(img: HTMLImageElement) {
  const src = img.dataset.mdSrc ?? '';
  const nth = [...pvBody.querySelectorAll<HTMLImageElement>('img[data-md-src]')].filter((i) => i.dataset.mdSrc === src).indexOf(img);
  const md = imagesIn(area.value).filter((i) => i.src === src)[Math.max(0, nth)];
  if (md) editImage(md);
}
pvBody.addEventListener('keydown', (e) => {
  const img = (e.target as Element).closest<HTMLImageElement>('img[data-md-src]');
  if (img && (e.key === 'Enter' || e.key === ' ')) {
    e.preventDefault();
    openImageFromPreview(img);
  }
});
// enter in the alt text applies, like the rest of the form (shift+enter is a new line)
dlgField('alt').addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    dlgForm.querySelector<HTMLButtonElement>('[value=ok]')!.click();
  }
});
dlg.addEventListener('close', () => {
  const was = editing;
  editing = null;
  if (dlg.returnValue === 'ok' && was) {
    // it may have moved since (typing, another image going in): find it again
    const now = imagesIn(area.value);
    const same = now.find((i) => i.start === was.start && i.src === was.src) ?? now.find((i) => i.src === was.src);
    if (same) {
      const md = imageMd({
        alt: dlgField('alt').value.replace(/\s+/g, ' ').trim(),
        caption: dlgField('caption').value,
        src: same.src,
        narrow: (dlgForm.querySelector('[name=size]:checked') as HTMLInputElement).value === 'narrow',
      });
      put(md, same.start, same.end, [md.length, md.length]);
      say('Image updated.');
      return;
    }
  }
  area.focus();
});

// ---- a backup in this browser: what's typed survives a crash or a closed tab ----
const BACKUP = 'modul0-admin-backup:';
const restoreBar = form.querySelector<HTMLElement>('[data-md-restore]')!;
type Backup = { slug: string; text: string; body?: string; at: number };
const store = {
  get: (k: string): Backup | null => { try { return JSON.parse(localStorage.getItem(BACKUP + k) ?? 'null'); } catch { return null; } },
  set: (k: string, b: Backup) => { try { localStorage.setItem(BACKUP + k, JSON.stringify(b)); } catch {} },
  drop: (k: string) => { try { localStorage.removeItem(BACKUP + k); } catch {} },
};
let backupTimer = 0;
form.addEventListener('input', () => {
  clearTimeout(backupTimer);
  backupTimer = window.setTimeout(() => {
    if (form.hidden || !open) return;
    if (dirty()) store.set(open, { slug: field('slug').value, text: text(), body: area.value, at: Date.now() });
    else store.drop(open);
  }, 400);
});
function offerBackup() {
  const b = store.get(open);
  restoreBar.hidden = !b || b.text === saved;
  if (restoreBar.hidden) return;
  const t = new Date(b!.at);
  const day = t.toDateString() === new Date().toDateString() ? 'today' : t.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  restoreBar.querySelector('[data-md-restore-text]')!.textContent =
    `This browser kept unsaved changes to this post from ${day} at ${t.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}.`;
}
restoreBar.querySelector('[data-md-restore-yes]')!.addEventListener('click', () => {
  const b = store.get(open);
  restoreBar.hidden = true;
  if (!b) return;
  const f = parse(b.text);
  if (!field('slug').readOnly && b.slug) field('slug').value = b.slug;
  field('title').value = f.title;
  field('date').value = f.date;
  field('description').value = f.description;
  field('draft').checked = f.draft;
  area.value = b.body ?? f.body; // exactly as typed
  render();
  area.focus();
  say('Restored. Save to keep it.');
});
restoreBar.querySelector('[data-md-restore-no]')!.addEventListener('click', () => {
  store.drop(open);
  restoreBar.hidden = true;
  area.focus();
});

// ---- images ----
// gifs go up as they are (they may move); everything else is drawn at most
// IMAGE_WIDTH wide and saved as webp, unless that comes out bigger
async function shrink(file: File): Promise<Blob> {
  if (file.type === 'image/gif') return file;
  const bmp = await createImageBitmap(file);
  const scale = Math.min(1, IMAGE_WIDTH / bmp.width);
  const canvas = el('canvas');
  canvas.width = Math.round(bmp.width * scale);
  canvas.height = Math.round(bmp.height * scale);
  canvas.getContext('2d')!.drawImage(bmp, 0, 0, canvas.width, canvas.height);
  const out = await new Promise<Blob | null>((ok) => canvas.toBlob(ok, 'image/webp', 0.85));
  return out && (scale < 1 || out.size < file.size) ? out : file;
}
const EXT: Record<string, string> = { 'image/webp': 'webp', 'image/png': 'png', 'image/jpeg': 'jpg', 'image/gif': 'gif' };
const toBase64 = (blob: Blob) =>
  new Promise<string>((ok, fail) => {
    const r = new FileReader();
    r.onload = () => ok(String(r.result).split(',')[1]);
    r.onerror = fail;
    r.readAsDataURL(blob);
  });

let lastImage: { alt: [number, number]; end: number } | null = null;
async function addImages(list: File[]) {
  const images = list.filter((f) => EXT[f.type]);
  if (!images.length) return say('Only png, jpg, webp and gif images.', true);
  const slug = field('slug').value;
  if (!field('slug').checkValidity() || !slug) {
    field('slug').focus();
    return say('Set the slug first: images are stored under /blog/slug/.', true);
  }
  for (const file of images) {
    const blob = await shrink(file);
    if (blob.size > IMAGE_MAX) {
      say(`${file.name} is still over 5 MB after shrinking.`, true);
      continue;
    }
    const stem = file.name.toLowerCase().replace(/\.[^.]+$/, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40) || 'image';
    const name = `${stem}-${Date.now().toString(36)}.${EXT[blob.type] ?? 'png'}`;
    const url = `${base}blog/${slug}/${name}`;
    const alt = stem.replace(/-/g, ' ');
    pending.set(url, URL.createObjectURL(blob));
    // on a line of its own, with the alt text selected to type over. if the
    // last image's alt is still selected untouched (or this is the next file
    // of the same drop), go after that image rather than into its alt text
    let s = area.selectionStart;
    let e = area.selectionEnd;
    if (lastImage && s === lastImage.alt[0] && e === lastImage.alt[1]) s = e = lastImage.end;
    const before = s > 0 && area.value[s - 1] !== '\n' ? '\n\n' : '';
    const md = `${before}![${alt}](${url})\n`;
    put(md, s, e, [before.length + 2, before.length + 2 + alt.length]);
    lastImage = { alt: [area.selectionStart, area.selectionEnd], end: s + md.length };
    // one image: straight to its alt text, caption and size (the upload carries on)
    if (images.length === 1) {
      const added = imagesIn(area.value).find((i) => i.src === url);
      if (added) editImage(added);
    }
    const privately = field('draft').checked;
    if (privately && blob.size > DRAFT_IMAGE_MAX) {
      say(`${name} is over 1.9 MB, the most a draft can hold. Try a smaller one.`, true);
      continue;
    }
    say(`Uploading ${name}…`);
    try {
      if (privately) {
        await saveDraftImage(slug, name, await toBase64(blob));
        draftNames(slug).add(name);
      } else await saveFile(`public/blog/${slug}/${name}`, { base64: await toBase64(blob) });
      const kb = Math.max(1, Math.round(blob.size / 1024));
      say(images.length === 1 ? `Added ${name} (${kb} KB).` : `Added ${name} (${kb} KB). Type over the selected alt text to describe it, or alt+enter on it.`);
    } catch (e) {
      say(`${name}: ${explain(e)} The markdown for it is still in the post.`, true);
    }
  }
}
form.querySelector<HTMLInputElement>('[data-md-file]')!.addEventListener('change', (e) => {
  const input = e.target as HTMLInputElement;
  addImages([...(input.files ?? [])]);
  input.value = '';
});
area.addEventListener('paste', (e) => {
  const files = [...(e.clipboardData?.files ?? [])];
  if (!files.length) {
    const t = e.clipboardData?.getData('text/plain') ?? '';
    if (pasteLink(area, put, t, pick.local)) e.preventDefault();
    else if (pick.inLink() && origin && t.trim().startsWith(origin)) {
      // a link to this site pasted into a link: just its path
      e.preventDefault();
      put(pick.local(t.trim()), area.selectionStart, area.selectionEnd);
    }
    return;
  }
  e.preventDefault();
  addImages(files);
});
area.addEventListener('dragover', (e) => {
  if (e.dataTransfer?.types.includes('Files')) {
    e.preventDefault();
    area.classList.add('md-drop');
  }
});
area.addEventListener('dragleave', () => area.classList.remove('md-drop'));
area.addEventListener('drop', (e) => {
  area.classList.remove('md-drop');
  const files = [...(e.dataTransfer?.files ?? [])];
  if (!files.length) return;
  e.preventDefault();
  addImages(files);
});

// ---- save, publish and delete ----
// a draft's images still in d1, by slug (added this session, or listed with the draft)
const draftImageNames = new Map<string, Set<string>>();
function draftNames(slug: string) {
  if (!draftImageNames.has(slug)) draftImageNames.set(slug, new Set(drafts.find((d) => d.name === slug)?.images ?? []));
  return draftImageNames.get(slug)!;
}

function afterSave(slug: string, body: string, live: RepoFile | null, d: Draft | null) {
  const wasNew = !current && !draft;
  store.drop(open);
  store.drop(`posts/${slug}`);
  restoreBar.hidden = true;
  current = live;
  draft = d;
  saved = body;
  field('slug').readOnly = true;
  form.querySelector<HTMLElement>('[data-post-delete]')!.hidden = false;
  showIndex();
  state();
  if (wasNew) {
    open = `posts/${slug}`;
    history.replaceState(null, '', `#${open}`);
  }
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!form.reportValidity()) return;
  const slug = field('slug').value;
  const isNew = !current && !draft;
  if (isNew && [...posts, ...drafts].some((p) => p.name === slug)) return say(`There's already a post called ${slug}.`, true);
  const body = text();
  const path = `${dir}/${slug}.md`;
  try {
    if (field('draft').checked) {
      // a live post ticked back to draft comes off the site
      if (current && !confirm(`Unpublish ${slug}? It comes off the live site and back to your private drafts. Its images stay public.`)) return;
      await saveDraft(slug, body);
      const d: Draft = { name: slug, text: body, updated: new Date().toISOString(), images: [...draftNames(slug)] };
      drafts = [...drafts.filter((p) => p.name !== slug), d];
      if (current) {
        await deleteFile(current.path, current.sha);
        posts = posts.filter((p) => p.name !== slug);
      }
      afterSave(slug, body, null, d);
      return say(`Saved ${slug} privately. Drafts never touch GitHub.`);
    }
    if (draft && !confirm(`Publish ${slug}? It's committed to the public repo and goes live in about two minutes.`)) return;
    // images first, so the post never goes live pointing at missing ones
    // only the ones the post still uses: the rest go with the draft
    const names = [...draftNames(slug)].filter((n) => body.includes(`/blog/${slug}/${n}`));
    for (const [i, name] of names.entries()) {
      say(`Publishing image ${i + 1} of ${names.length}…`);
      // a conflict means it's already there: a publish cut short (rate
      // limit, network) is being retried, and the names never repeat
      await saveFile(`public/blog/${slug}/${name}`, { base64: await toBase64(await draftImage(slug, name)) }).catch((err) => {
        if (!(err instanceof ApiError && err.code === 'conflict')) throw err;
      });
    }
    const sha = await saveFile(path, { text: body }, current?.sha);
    const post = { name: slug, path, sha, text: body };
    posts = [...posts.filter((p) => p.name !== slug), post];
    if (draft || draftNames(slug).size) {
      await deleteDraft(slug);
      drafts = drafts.filter((p) => p.name !== slug);
      draftImageNames.delete(slug);
    }
    afterSave(slug, body, post, null);
    say(`Saved ${slug}. Live in about two minutes.`);
  } catch (err) {
    say(explain(err), true);
  }
});

form.querySelector('[data-post-delete]')!.addEventListener('click', async () => {
  const target = current ?? draft;
  if (!target) return;
  const msg = current
    ? `Delete the post ${current.name}? It comes back only from git history. Its images stay.`
    : `Delete the draft ${target.name} and its images? It was never on GitHub, so it can't come back.`;
  if (!confirm(msg)) return;
  try {
    if (current) {
      await deleteFile(current.path, current.sha);
      posts = posts.filter((p) => p !== current);
    } else {
      await deleteDraft(target.name);
      drafts = drafts.filter((p) => p !== target);
      draftImageNames.delete(target.name);
    }
    say(`Deleted ${target.name}.`);
    store.drop(open);
    saved = text(); // nothing left to lose
    form.hidden = true;
    current = draft = null;
    showIndex();
    location.hash = 'posts';
  } catch (e) {
    say(explain(e), true);
  }
});
