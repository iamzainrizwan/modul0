// the js half of the site's motion (the css half is "pixel motion" in
// site.css). settings live on <html>: data-motion is the reveal style,
// data-mx-* the extras, set before first paint by the head script in
// Site.astro. nothing here runs for reduced motion, and nothing is hidden
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
// headings that decode: two of their characters flicker through glyphs
const HEADINGS = '.hero-h, .page-title, .section-h, .sub-h, .article h1';

const GLYPHS = '#%&*?/<>01';
// two characters of a heading (one if it's only two long) flicker through
// glyphs in purple, then settle one after the other. each is wrapped in a
// span locked to its own width, so the heading never reflows, and the
// heading keeps its real text as its accessible name while it plays.
function decode(h: HTMLElement, delay = 0) {
  if (h.dataset.decoded) return;
  h.dataset.decoded = '1';
  const spots: { node: Text; at: number }[] = [];
  const walk = document.createTreeWalker(h, NodeFilter.SHOW_TEXT);
  for (let n = walk.nextNode() as Text | null; n; n = walk.nextNode() as Text | null) {
    [...n.data].forEach((c, at) => /[\p{L}\p{N}]/u.test(c) && spots.push({ node: n, at }));
  }
  if (!spots.length) return;
  // one from each half, so the two aren't bunched together
  const half = Math.ceil(spots.length / 2);
  const pick = (from: number, to: number) => spots[from + Math.floor(Math.random() * (to - from))];
  const chosen = spots.length <= 2 ? [pick(0, spots.length)] : [pick(0, half), pick(half, spots.length)];

  setTimeout(() => {
    h.setAttribute('aria-label', h.textContent ?? '');
    // wrap from the end of each text node backwards so earlier offsets hold
    const spans = chosen
      .sort((x, y) => (x.node === y.node ? y.at - x.at : 0))
      .map(({ node, at }) => {
        const offset = [...node.data].slice(0, at).join('').length;
        const ch = node.splitText(offset);
        ch.splitText(ch.data.codePointAt(0)! > 0xffff ? 2 : 1);
        const span = document.createElement('span');
        span.className = 'dc';
        ch.replaceWith(span);
        span.textContent = ch.data;
        span.style.width = `${span.getBoundingClientRect().width}px`;
        return span;
      })
      .reverse();
    spans.forEach((span, i) => {
      const final = span.textContent ?? '';
      const flicker = setInterval(() => {
        span.textContent = GLYPHS[(Math.random() * GLYPHS.length) | 0];
      }, 70);
      setTimeout(() => {
        clearInterval(flicker);
        span.replaceWith(final);
        if (i === spans.length - 1) {
          h.normalize();
          h.removeAttribute('aria-label');
        }
      }, 650 + i * 300);
    });
  }, delay);
}

// set up once: the page's own work (reveal, decode) runs for every page the
// router swaps in (astro:page-load), and for the first one straight away
export function initMotion() {
  // the block cursor needs the link's length in characters
  document.addEventListener('pointerover', (e) => {
    const a = (e.target as Element).closest?.('a');
    if (a && !a.style.getPropertyValue('--n')) a.style.setProperty('--n', String(Math.max(4, Math.min((a.textContent ?? '').trim().length, 40))));
  });
  page();
  document.addEventListener('astro:page-load', page);
}

let io: IntersectionObserver | null = null;

function page() {
  // each swap brings a new <body>: mark it so a page is only set up once
  if (document.body.dataset.motion) return;
  document.body.dataset.motion = '1';
  io?.disconnect();
  if (reduced()) return;

  const reveal = has('reveal') && style() !== 'instant';
  const labels = has('decode') ? [...document.querySelectorAll<HTMLElement>(HEADINGS)].filter(ours) : [];

  // below the fold: reveal (and decode) the first time each thing scrolls in
  const seen = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        const el = e.target as HTMLElement;
        if (el.classList.contains('px')) el.classList.add('px-in');
        if (labels.includes(el)) decode(el);
        seen.unobserve(el);
      }
    },
    { rootMargin: '0px 0px -8% 0px' },
  );
  io = seen;
  if (reveal) {
    for (const el of document.querySelectorAll<HTMLElement>(REVEAL)) {
      if (!ours(el) || onScreen(el)) continue;
      el.style.setProperty('--i', String(index(el)));
      el.classList.add('px');
      seen.observe(el);
    }
  }
  for (const el of labels) if (!onScreen(el)) seen.observe(el);
  html.classList.add('px-ready');

  // headings on screen at load decode; behind the boot sequence, wait for it first
  const now = () => labels.filter(onScreen).forEach((el, i) => decode(el, 150 + i * 120));
  if (html.dataset.boot) {
    const mo = new MutationObserver(() => {
      if (html.dataset.boot) return;
      mo.disconnect();
      now();
    });
    mo.observe(html, { attributes: true, attributeFilter: ['data-boot'] });
  } else now();
}
