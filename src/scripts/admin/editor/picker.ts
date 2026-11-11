// links to the site, picked like an ide's completions. two ways in:
//   typing a link: after `](` the pages, sections, projects and posts that
//   match what's typed so far drop down under the caret (ctrl+space too)
//   ctrl+k: a search box under the caret; pick a page, or paste any url.
//   it links the selected text, or the page's own title if nothing's selected
// arrows choose, enter or tab inserts, esc closes.
import { caretBox } from './mirror';
import { codeRanges } from './figures';

export type SiteLink = { path: string; title: string; kind: string; hint?: string; old?: boolean };
type Put = (text: string, start: number, end: number, select?: [number, number]) => void;
type Ctx = { start: number; end: number; query: string; bracket: number; close: boolean };

const KINDS = ['page', 'section', 'project', 'post'];
const MAX = 50;
const isUrl = (s: string) => /^(https?:\/\/|mailto:|\/|#)\S*$/.test(s);

// higher is better; -1 is no match. a substring beats letters in order, and
// earlier and tighter beats later and looser
function score(q: string, s: string) {
  if (!q) return 0;
  s = s.toLowerCase();
  const i = s.indexOf(q);
  if (i >= 0) return 1000 - i * 4 - s.length / 50 + (i === 0 || /[\s/#-]/.test(s[i - 1]) ? 200 : 0);
  let at = -1;
  let gaps = 0;
  for (const ch of q) {
    const k = s.indexOf(ch, at + 1);
    if (k < 0) return -1;
    if (at >= 0) gaps += k - at - 1;
    at = k;
  }
  return 500 - gaps * 3 - s.length / 50;
}

export function rank(links: SiteLink[], query: string) {
  const q = query.toLowerCase().trim();
  const bare = q.replace(/^\/+/, '');
  const scored = links
    .filter((l) => !l.old) // old-style links still pass the check, but aren't offered
    .map((l, i) => {
      const s = Math.max(score(q, l.path), score(bare, l.title.toLowerCase()), score(bare, (l.hint ?? '').toLowerCase()) - 300);
      return { l, s: q ? s : -KINDS.indexOf(l.kind) * 1000 - i, i };
    })
    .filter((x) => !q || x.s >= 0);
  return scored.sort((a, b) => b.s - a.s || a.i - b.i).slice(0, MAX).map((x) => x.l);
}

export function picker(area: HTMLTextAreaElement, host: HTMLElement, links: () => SiteLink[], put: Put, origin: string) {
  const box = document.createElement('div');
  box.className = 'md-pick';
  box.hidden = true;
  const search = document.createElement('input');
  search.className = 'md-pick-q';
  Object.assign(search, { type: 'text', placeholder: 'search the site, or paste a url', autocomplete: 'off', spellcheck: false });
  search.setAttribute('role', 'combobox');
  search.setAttribute('aria-label', 'Link to');
  search.setAttribute('aria-autocomplete', 'list');
  search.setAttribute('aria-expanded', 'true');
  const list = document.createElement('ul');
  list.className = 'md-pick-list';
  list.id = 'md-pick-list';
  list.setAttribute('role', 'listbox');
  list.setAttribute('aria-label', 'Pages on the site');
  search.setAttribute('aria-controls', list.id);
  const foot = document.createElement('p');
  foot.className = 'md-pick-foot';
  const live = document.createElement('p');
  live.className = 'sr-only';
  live.setAttribute('aria-live', 'polite');
  box.append(search, list, foot);
  host.append(box, live);

  let mode: 'inline' | 'palette' | null = null;
  let items: SiteLink[] = [];
  let active = 0;
  let ctx: Ctx | null = null;
  let sel: [number, number] = [0, 0];
  let dismissed = -1; // the link esc closed, so typing in it doesn't reopen
  let raw = ''; // palette: a url typed or pasted in
  let shownFor: string | null = null; // the text the open list was ranked for

  // the link the caret is in: `](` then a path with no spaces, on this line
  function context(): Ctx | null {
    const pos = area.selectionStart;
    if (pos !== area.selectionEnd) return null;
    const v = area.value;
    const ls = v.lastIndexOf('\n', pos - 1) + 1;
    const m = /\]\(([^\s()<>"]*)$/.exec(v.slice(ls, pos));
    if (!m) return null;
    const at = ls + m.index;
    // not an image's, and not in code
    const open = v.lastIndexOf('[', at);
    if (open > 0 && v[open - 1] === '!') return null;
    if (codeRanges(v).some(([s, e]) => at >= s && at < e)) return null;
    const after = /^[^\s()<>"]*/.exec(v.slice(pos))![0];
    return { start: pos - m[1].length, end: pos + after.length, query: m[1], bracket: v[at - 1] === '[' ? at - 1 : -1, close: v[pos + after.length] === ')' };
  }

  function draw() {
    list.replaceChildren(
      ...items.map((l, i) => {
        const li = document.createElement('li');
        li.id = `md-pick-${i}`;
        li.setAttribute('role', 'option');
        li.setAttribute('aria-selected', String(i === active));
        const kind = document.createElement('span');
        kind.className = 'md-pick-kind';
        kind.textContent = l.kind;
        const title = document.createElement('span');
        title.className = 'md-pick-title';
        title.textContent = l.title;
        const path = document.createElement('span');
        path.className = 'md-pick-path';
        path.textContent = l.path;
        li.append(kind, title, path);
        li.addEventListener('mousedown', (e) => e.preventDefault()); // keep focus where it is
        li.addEventListener('click', () => accept(i));
        li.addEventListener('mousemove', () => i !== active && pick(i));
        return li;
      }),
    );
    const none = !items.length;
    foot.textContent = mode === 'palette' && raw ? `enter: link to ${raw}` : none ? 'nothing on the site matches' : '↑↓ choose · enter insert · esc close';
    const target = mode === 'palette' ? search : area;
    if (items.length) target.setAttribute('aria-activedescendant', `md-pick-${active}`);
    else target.removeAttribute('aria-activedescendant');
    list.querySelector('[aria-selected=true]')?.scrollIntoView({ block: 'nearest' });
  }

  function pick(i: number) {
    active = (i + items.length) % Math.max(1, items.length);
    list.querySelectorAll('[role=option]').forEach((li, k) => li.setAttribute('aria-selected', String(k === active)));
    const target = mode === 'palette' ? search : area;
    target.setAttribute('aria-activedescendant', `md-pick-${active}`);
    list.children[active]?.scrollIntoView({ block: 'nearest' });
  }

  function place() {
    const at = mode === 'inline' && ctx ? ctx.start : sel[0];
    const c = caretBox(area, at);
    const a = area.getBoundingClientRect();
    const h = host.getBoundingClientRect();
    const w = Math.min(30 * 16, h.width - 16);
    box.style.width = `${w}px`;
    let left = a.left - h.left + Math.max(0, c.left) - 8;
    left = Math.max(8, Math.min(left, h.width - w - 8));
    const caretTop = a.top - h.top + Math.min(Math.max(c.top, 0), a.height - c.height);
    const below = caretTop + c.height + 4;
    const tall = box.offsetHeight || 260;
    const top = below + tall > h.height && caretTop - tall - 4 > 0 ? caretTop - tall - 4 : below;
    box.style.left = `${left}px`;
    box.style.top = `${top}px`;
  }

  function show(next: 'inline' | 'palette') {
    const was = mode;
    mode = next;
    box.dataset.mode = next;
    search.hidden = next !== 'palette';
    box.hidden = false;
    place();
    if (was !== next || !was) live.textContent = items.length ? `${items.length} link${items.length === 1 ? '' : 's'} on the site. Up and down to choose, enter to insert.` : '';
  }

  function close() {
    shownFor = null;
    if (!mode) return;
    const was = mode;
    mode = null;
    box.hidden = true;
    area.removeAttribute('aria-activedescendant');
    if (was === 'palette' && document.activeElement === search) {
      area.focus();
      area.setSelectionRange(sel[0], sel[1]);
    }
  }

  // after typing ('type': may open), a caret move ('move': only follows or
  // closes, a click into a link shouldn't pop it open) or ctrl+space ('force')
  function update(how: 'type' | 'move' | 'force' = 'type') {
    if (mode === 'palette') return;
    if (how === 'move' && !mode) return;
    const force = how === 'force';
    ctx = context();
    if (!ctx) {
      dismissed = -1;
      return close();
    }
    if (force) dismissed = -1;
    if (ctx.start === dismissed) return close();
    if (isUrl(ctx.query) && !ctx.query.startsWith('/') && !ctx.query.startsWith('#')) return close(); // an outside link
    // the same link and text as before (an arrow key's keyup): keep the choice
    if (mode === 'inline' && ctx.query === shownFor) return place();
    items = rank(links(), ctx.query);
    if (!items.length && !force) return close();
    shownFor = ctx.query;
    active = 0;
    draw();
    show('inline');
  }

  function palette() {
    sel = [area.selectionStart, area.selectionEnd];
    raw = '';
    search.value = '';
    items = rank(links(), '');
    active = 0;
    draw();
    show('palette');
    search.focus();
  }

  search.addEventListener('input', () => {
    const q = search.value.trim();
    raw = /^(https?:\/\/|mailto:)/.test(q) ? local(q) : '';
    items = raw ? [] : rank(links(), q);
    active = 0;
    draw();
    place();
  });
  search.addEventListener('keydown', (e) => {
    if (keys(e)) e.preventDefault();
  });
  search.addEventListener('blur', () => setTimeout(() => mode === 'palette' && document.activeElement !== search && close(), 0));

  // a link to this site is written as a path, like the rest of the posts
  function local(url: string) {
    if (origin && url.startsWith(origin)) return url.slice(origin.length) || '/';
    return url;
  }

  function accept(i = active) {
    if (mode === 'inline' && ctx) {
      const l = items[i];
      if (!l) return close();
      const c = ctx;
      dismissed = -1;
      close();
      if (c.bracket >= 0) {
        // `[](` with no text yet: the page's title goes in too
        const md = `[${l.title}](${l.path})`;
        put(md, c.bracket, c.end + (c.close ? 1 : 0), [md.length, md.length]);
      } else {
        const md = l.path + (c.close ? '' : ')');
        put(md, c.start, c.end, [md.length + (c.close ? 1 : 0), md.length + (c.close ? 1 : 0)]);
      }
      return;
    }
    if (mode === 'palette') {
      const l = items[i];
      const url = raw || l?.path;
      if (!url) return;
      const [s, e] = sel;
      const chosen = area.value.slice(s, e);
      const text = chosen && !chosen.includes('\n') ? chosen : l?.title ?? 'link text';
      close();
      const md = `[${text}](${url})`;
      // nothing was selected and it's a bare url: select the text to type over
      put(md, s, e, chosen || l ? [md.length, md.length] : [1, 1 + text.length]);
    }
  }

  // keys while it's open; true if handled
  function keys(e: KeyboardEvent): boolean {
    if (!mode) return false;
    if (e.key === 'ArrowDown') return pick(active + 1), true;
    if (e.key === 'ArrowUp') return pick(active - 1), true;
    if (e.key === 'PageDown') return pick(Math.min(items.length - 1, active + 8)), true;
    if (e.key === 'PageUp') return pick(Math.max(0, active - 8)), true;
    if ((e.key === 'Enter' && !e.shiftKey) || (e.key === 'Tab' && !e.shiftKey)) {
      if (!items.length && !(mode === 'palette' && raw)) {
        if (mode === 'inline') close();
        return mode === 'palette';
      }
      accept();
      return true;
    }
    if (e.key === 'Escape') {
      if (mode === 'inline') dismissed = ctx?.start ?? -1;
      close();
      return true;
    }
    return false;
  }

  area.addEventListener('blur', () => setTimeout(() => mode === 'inline' && document.activeElement !== area && close(), 0));
  area.addEventListener('scroll', () => mode && place());
  window.addEventListener('resize', () => mode && place());

  return { update, palette, keys, close, isOpen: () => !!mode, local, inLink: () => !!context() };
}
