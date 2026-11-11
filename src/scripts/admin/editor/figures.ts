// the preview's half of src/data/figures.mjs: a paragraph holding nothing but
// images becomes figures (title = caption, #narrow, two or more in a row), so
// the preview draws images exactly as the blog will. keep the two in step.

// an image in the markdown: ![alt](src "caption"), with the spot it sits at
export type Img = { start: number; end: number; alt: string; src: string; caption: string; narrow: boolean };
const IMG = /!\[((?:[^\]\\]|\\.)*)\]\(\s*<?([^\s)>]+)>?(?:\s+"((?:[^"\\]|\\.)*)")?\s*\)/g;
const unescape = (s: string) => s.replace(/\\(.)/g, '$1');

// every image outside code (fences and `spans`), in order
export function images(md: string): Img[] {
  const out: Img[] = [];
  const code = codeRanges(md);
  for (const m of md.matchAll(IMG)) {
    const start = m.index!;
    if (code.some(([s, e]) => start >= s && start < e)) continue;
    const src = m[2];
    out.push({
      start, end: start + m[0].length, alt: unescape(m[1]), caption: unescape(m[3] ?? ''),
      src: src.replace(/#narrow$/, ''), narrow: src.endsWith('#narrow'),
    });
  }
  return out;
}

export function imageMd(i: Pick<Img, 'alt' | 'src' | 'caption' | 'narrow'>) {
  const alt = i.alt.replace(/[\\\]]/g, '\\$&');
  const cap = i.caption.trim() ? ` "${i.caption.trim().replace(/["\\]/g, '\\$&')}"` : '';
  return `![${alt}](${i.src}${i.narrow ? '#narrow' : ''}${cap})`;
}

// [start, end) of fenced blocks and inline code
export function codeRanges(md: string): [number, number][] {
  const out: [number, number][] = [];
  const fence = /^ {0,3}(`{3,}|~{3,})[^\n]*\n[\s\S]*?(?:\n {0,3}\1[`~]*[ \t]*(?=\n|$)|$)/gm;
  for (const m of md.matchAll(fence)) out.push([m.index!, m.index! + m[0].length]);
  for (const m of md.matchAll(/(`+)[^`\n][\s\S]*?\1/g)) {
    if (!out.some(([s, e]) => m.index! >= s && m.index! < e)) out.push([m.index!, m.index! + m[0].length]);
  }
  return out;
}

function figure(img: HTMLImageElement) {
  const src = img.getAttribute('src') ?? '';
  const narrow = src.endsWith('#narrow');
  const caption = img.getAttribute('title');
  if (narrow) img.setAttribute('src', src.slice(0, -'#narrow'.length));
  img.removeAttribute('title');
  const fig = document.createElement('figure');
  if (narrow) fig.className = 'narrow';
  fig.append(img);
  if (caption) {
    const c = document.createElement('figcaption');
    c.textContent = caption;
    fig.append(c);
  }
  return fig;
}

export function toFigures(root: HTMLElement) {
  for (const p of root.querySelectorAll('p')) {
    const kids = [...p.childNodes].filter((n) => !(n.nodeType === Node.TEXT_NODE && !n.textContent!.trim()));
    if (!kids.length || !kids.every((n) => n instanceof HTMLImageElement)) continue;
    const imgs = kids as HTMLImageElement[];
    let out: HTMLElement;
    if (imgs.length === 1) out = figure(imgs[0]);
    else {
      out = document.createElement('div');
      out.className = 'figs';
      out.append(...imgs.map(figure));
    }
    if (p.dataset.at) out.dataset.at = p.dataset.at; // the scroll sync's anchor
    p.replaceWith(out);
  }
}
