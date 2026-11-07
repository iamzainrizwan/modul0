// posts: src/content/blog/*.md, edited side by side with a preview drawn in
// the blog's own styles. images (button, paste or drop) are shrunk here, then
// committed to public/blog/<slug>/ straight away; the markdown points at them.
// drafts are different: the repo is public and its history shows every edit,
// so a draft and its images live in the worker's d1 instead, and publishing
// commits them (images first, then the post) and deletes the draft.
import { marked } from 'marked';
import {
  call, saveFile, deleteFile, explain, loadDrafts, saveDraft, deleteDraft, saveDraftImage, draftImage,
  type RepoFile, type Draft,
} from './api';
import { say, el, watchDirty } from './ui';
import { parse, serialise } from '../frontmatter';

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

export async function loadPosts() {
  [posts, drafts] = await Promise.all([call<{ files: RepoFile[] }>('/admin/posts').then((d) => d.files), loadDrafts()]);
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

// ---- save, publish and delete ----
// a draft's images still in d1, by slug (added this session, or listed with the draft)
const draftImageNames = new Map<string, Set<string>>();
function draftNames(slug: string) {
  if (!draftImageNames.has(slug)) draftImageNames.set(slug, new Set(drafts.find((d) => d.name === slug)?.images ?? []));
  return draftImageNames.get(slug)!;
}

function afterSave(slug: string, body: string, live: RepoFile | null, d: Draft | null) {
  const wasNew = !current && !draft;
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
    const names = [...draftNames(slug)];
    for (const [i, name] of names.entries()) {
      say(`Publishing image ${i + 1} of ${names.length}…`);
      await saveFile(`public/blog/${slug}/${name}`, { base64: await toBase64(await draftImage(slug, name)) });
    }
    const sha = await saveFile(path, { text: body }, current?.sha);
    const post = { name: slug, path, sha, text: body };
    posts = [...posts.filter((p) => p.name !== slug), post];
    if (draft || names.length) {
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
    saved = text(); // nothing left to lose
    form.hidden = true;
    current = draft = null;
    showIndex();
    location.hash = 'posts';
  } catch (e) {
    say(explain(e), true);
  }
});
