// the js half of the site's motion (the css half is "pixel motion" in
// site.css). settings live on <html>: data-motion is the reveal style,
// data-mx-* the extras, set before first paint by the head script in
// Site.astro (which also sets .px-draw to hold main's blocks back until the
// arrival draw starts). nothing here runs for reduced motion, and nothing is hidden
// unless this runs (.px-ready), so the site is whole without js.

const html = document.documentElement;
const style = () => html.dataset.motion ?? 'dither';
const has = (x: string) => html.hasAttribute(`data-mx-${x}`);
const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

// react owns what's inside its islands; touching it would break hydration
const ours = (el: Element) => !el.closest('astro-island');
const onScreen = (el: Element) => el.getBoundingClientRect().top < innerHeight;
const index = (el: Element) => {
  const item = el.closest('li') ?? el;
  return Math.min([...(item.parentElement?.children ?? [])].indexOf(item), 4);
};

// what reveals on first scroll into view
const REVEAL = '.section-h, .page-title, .sub-h, .teaser, .readout > div, .glance > li, .machine';
// mono labels that decode (leaf text only)
const LABELS = '.section-meta, .glance-k, .teaser-tagline, .award-when, .tl-when, .facts dt, .readout dt, .also-h, .page-head .section-meta';

// the page as blocks, top to bottom: main's children, with sections opened up
function blocks(): HTMLElement[] {
  const main = document.querySelector('main');
  if (!main) return [];
  const out: HTMLElement[] = [];
  for (const el of main.children) {
    if (el.tagName === 'SECTION') out.push(...(el.children as HTMLCollectionOf<HTMLElement>));
    else out.push(el as HTMLElement);
  }
  // an island's wrapper has no box of its own (display: contents)
  return out.filter((el) => el.tagName !== 'ASTRO-ISLAND' && el.offsetHeight > 0);
}

const GLYPHS = '#%&*+=/<>?01';
function decode(el: HTMLElement, delay = 0) {
  if (el.dataset.decoded || el.children.length) return;
  el.dataset.decoded = '1';
  const final = el.textContent ?? '';
  const chars = [...final];
  let t = 0;
  const tick = () => {
    t++;
    const done = Math.floor(t * 1.6);
    el.textContent = chars.map((c, i) => (i < done || c === ' ' ? c : GLYPHS[(Math.random() * GLYPHS.length) | 0])).join('');
    if (done >= chars.length) {
      el.textContent = final;
      return;
    }
    setTimeout(tick, 32);
  };
  setTimeout(tick, delay);
}

export function initMotion() {
  // the block cursor needs the link's length in characters
  document.addEventListener('pointerover', (e) => {
    const a = (e.target as Element).closest?.('a');
    if (a && !a.style.getPropertyValue('--n')) a.style.setProperty('--n', String(Math.max(4, Math.min((a.textContent ?? '').trim().length, 40))));
  });

  if (reduced()) return;

  const reveal = has('reveal') && style() !== 'instant';
  const labels = has('decode') ? [...document.querySelectorAll<HTMLElement>(LABELS)].filter(ours) : [];

  // below the fold: reveal (and decode) the first time each thing scrolls in
  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        const el = e.target as HTMLElement;
        if (el.classList.contains('px')) el.classList.add('px-in');
        if (labels.includes(el)) decode(el);
        io.unobserve(el);
      }
    },
    { rootMargin: '0px 0px -8% 0px' },
  );
  if (reveal) {
    for (const el of document.querySelectorAll<HTMLElement>(REVEAL)) {
      if (!ours(el) || onScreen(el)) continue;
      el.style.setProperty('--i', String(index(el)));
      el.classList.add('px');
      io.observe(el);
    }
  }
  for (const el of labels) if (!onScreen(el)) io.observe(el);
  html.classList.add('px-ready');

  // on arrival the page draws itself block by block, top to bottom, in the
  // current style (links are prefetched, so this is all a page change is).
  // labels on screen decode. behind the boot sequence, wait for it first.
  const now = () => {
    if (has('pages') && style() !== 'instant') {
      blocks()
        .filter(onScreen)
        .forEach((el, i) => {
          el.style.setProperty('--i', String(Math.min(i, 14)));
          el.classList.add('px', 'px-in', 'px-arrive');
        });
    }
    html.classList.remove('px-draw');
    labels.filter(onScreen).forEach((el, i) => decode(el, i * 40));
  };
  if (html.dataset.boot) {
    const mo = new MutationObserver(() => {
      if (html.dataset.boot) return;
      mo.disconnect();
      now();
    });
    mo.observe(html, { attributes: true, attributeFilter: ['data-boot'] });
  } else now();
}
