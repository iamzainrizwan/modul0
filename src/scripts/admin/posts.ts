// posts: src/content/blog/*.md, edited side by side with a preview drawn in
// the blog's own styles. images (button, paste or drop) are shrunk here, then
// committed to public/blog/<slug>/ straight away; the markdown points at them.
import { marked } from 'marked';
import { call, saveFile, deleteFile, explain, type RepoFile } from './api';
import { say, el, watchDirty } from './ui';
import { parse, serialise } from '../frontmatter';

export let posts: RepoFile[] = [];
const dir = 'src/content/blog';
const IMAGE_WIDTH = 1600; // px, the widest an image is stored
const IMAGE_MAX = 5_000_000; // bytes, after shrinking

const form = document.querySelector<HTMLFormElement>('[data-post-form]')!;
const index = document.querySelector<HTMLElement>('[data-post-index]')!;
const area = form.querySelector('textarea')!;
const preview = form.querySelector<HTMLElement>('[data-preview]')!;
const base = document.querySelector<HTMLElement>('[data-login]')!.dataset.base ?? '/';
const field = (name: string) => form.elements.namedItem(name) as HTMLInputElement;

let current: RepoFile | null = null; // the post open in the editor (null: a new one)
let open = ''; // the hash the editor was opened at
let saved = ''; // the post as last loaded or saved, to spot unsaved changes
const pending = new Map<string, string>(); // image url -> local preview, until the site redeploys

const text = () =>
  serialise({
    ...parse(current?.text ?? ''),
    title: field('title').value.trim(),
    date: field('date').value,
    description: field('description').value.trim(),
    draft: field('draft').checked,
    body: area.value,
  });
const dirty = () => !form.hidden && text() !== saved;
watchDirty(dirty);

export async function loadPosts() {
  posts = (await call<{ files: RepoFile[] }>('/admin/posts')).files;
  showIndex();
}

function showIndex() {
  const list = document.querySelector<HTMLOListElement>('[data-post-list]')!;
  const sorted = posts.map((p) => ({ p, f: parse(p.text) })).sort((a, b) => b.f.date.localeCompare(a.f.date));
  list.replaceChildren(
    ...sorted.map(({ p, f }) =>
      el('li', {},
        el('a', { class: 'adm-list-title', href: `#posts/${p.name}`, text: f.title || p.name }),
        el('span', { class: 'gb-poster', text: [f.date, p.name].join(' · ') }),
        f.draft ? el('span', { class: 'adm-badge', text: 'draft' }) : el('a', { class: 'text-btn', href: `${base}blog/${p.name}/`, target: '_blank', text: 'live ↗' }),
      ),
    ),
  );
  if (!posts.length) list.append(el('li', { class: 'gb-empty', text: 'No posts yet.' }));
}

export function routePosts(sub: string) {
  const target = sub ? `posts/${sub}` : 'posts';
  if (!form.hidden && target !== open && dirty() && !confirm('Throw away the unsaved changes?')) {
    history.replaceState(null, '', `#${open}`);
    return;
  }
  if (!sub) {
    form.hidden = true;
    index.hidden = false;
    return;
  }
  if (target === open && !form.hidden) return;
  const post = sub === 'new' ? null : posts.find((p) => p.name === sub);
  if (sub !== 'new' && !post) return say(`There's no post called ${sub}.`, true);
  edit(post ?? null, target);
}

function edit(post: RepoFile | null, hash: string) {
  current = post;
  open = hash;
  const f = parse(post?.text ?? '');
  field('slug').value = post?.name ?? '';
  field('slug').readOnly = !!post;
  field('title').value = f.title;
  field('date').value = f.date || new Date().toISOString().slice(0, 10);
  field('description').value = f.description;
  field('draft').checked = post ? f.draft : true;
  area.value = f.body;
  form.querySelector<HTMLElement>('[data-post-delete]')!.hidden = !post;
  index.hidden = true;
  form.hidden = false;
  saved = text();
  state();
  render();
  (post ? area : field('title')).focus({ preventScroll: true });
}

function state() {
  const parts = [current ? current.name : 'new post', field('draft').checked ? 'draft' : 'live', dirty() ? 'unsaved changes' : 'saved'];
  if (!current && !dirty()) parts.pop();
  form.querySelector('[data-post-state]')!.textContent = parts.join(' · ');
}

// the preview: the post as the blog draws it (.article), from marked
let timer = 0;
function render() {
  clearTimeout(timer);
  timer = window.setTimeout(() => {
    form.querySelector('[data-pv-title]')!.textContent = field('title').value || 'Untitled';
    const d = field('date').value;
    form.querySelector('[data-pv-date]')!.textContent = d ? new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : '';
    const body = form.querySelector<HTMLElement>('[data-pv-body]')!;
    body.innerHTML = marked.parse(area.value, { gfm: true, async: false }) as string;
    body.querySelectorAll('img').forEach((img) => {
      const local = pending.get(img.getAttribute('src') ?? '');
      if (local) img.src = local;
    });
    state();
  }, 80);
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

// keep the preview level with the markdown
area.addEventListener('scroll', () => {
  const r = area.scrollTop / Math.max(1, area.scrollHeight - area.clientHeight);
  preview.scrollTop = r * (preview.scrollHeight - preview.clientHeight);
});
// links in the preview open in a new tab, never in the admin itself
preview.addEventListener('click', (e) => {
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
  if (!document.execCommand('insertText', false, text)) area.setRangeText(text, start, end, 'end');
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
  link: () => {
    const url = prompt('Link to:', 'https://');
    if (url) wrap('[', `](${url})`, 'link text');
  },
  image: () => form.querySelector<HTMLInputElement>('[data-md-file]')!.click(),
};
form.querySelectorAll<HTMLButtonElement>('[data-md]').forEach((b) => b.addEventListener('click', () => ACTIONS[b.dataset.md!]()));
area.addEventListener('keydown', (e) => {
  if (!(e.ctrlKey || e.metaKey) || e.altKey) return;
  const key = { b: 'bold', i: 'italic', k: 'link' }[e.key.toLowerCase()];
  if (key) {
    e.preventDefault();
    ACTIONS[key]();
  }
});
form.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
    e.preventDefault();
    form.requestSubmit();
  }
});
// write | preview, for screens too narrow for both
form.querySelectorAll<HTMLButtonElement>('[data-md-view]').forEach((b) =>
  b.addEventListener('click', () => {
    form.querySelector<HTMLElement>('.md-split')!.dataset.view = b.dataset.mdView!;
    form.querySelectorAll('[data-md-view]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
  }),
);

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
    // on a line of its own, with the alt text selected to type over
    const s = area.selectionStart;
    const before = s > 0 && area.value[s - 1] !== '\n' ? '\n\n' : '';
    put(`${before}![${alt}](${url})\n`, s, area.selectionEnd, [before.length + 2, before.length + 2 + alt.length]);
    say(`Uploading ${name}…`);
    try {
      await saveFile(`public/blog/${slug}/${name}`, { base64: await toBase64(blob) });
      say(`Added ${name} (${Math.round(blob.size / 1024)} KB). Type over the selected alt text to describe it.`);
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
  if (!files.length) return;
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

// ---- save and delete ----
form.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!form.reportValidity()) return;
  const slug = field('slug').value;
  if (!current && posts.some((p) => p.name === slug)) return say(`There's already a post called ${slug}.`, true);
  const body = text();
  const path = `${dir}/${slug}.md`;
  try {
    const sha = await saveFile(path, { text: body }, current?.sha);
    const post = { name: slug, path, sha, text: body };
    posts = [...posts.filter((p) => p.name !== slug), post];
    const wasNew = !current;
    current = post;
    saved = body;
    field('slug').readOnly = true;
    form.querySelector<HTMLElement>('[data-post-delete]')!.hidden = false;
    showIndex();
    state();
    if (wasNew) {
      open = `posts/${slug}`;
      history.replaceState(null, '', `#${open}`);
    }
    say(`Saved ${slug}. ${parse(body).draft ? 'It’s a draft, so it stays off the live site.' : 'Live in about two minutes.'}`);
  } catch (err) {
    say(explain(err), true);
  }
});

form.querySelector('[data-post-delete]')!.addEventListener('click', async () => {
  if (!current || !confirm(`Delete the post ${current.name}? It comes back only from git history. Its images stay.`)) return;
  try {
    await deleteFile(current.path, current.sha);
    posts = posts.filter((p) => p !== current);
    say(`Deleted ${current.name}.`);
    saved = text(); // nothing left to lose
    form.hidden = true;
    current = null;
    showIndex();
    location.hash = 'posts';
  } catch (e) {
    say(explain(e), true);
  }
});
