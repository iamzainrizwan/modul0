// the blog's markdown (astro 7, sätteri) turns on smart punctuation, so the
// preview does too: curly quotes, -- and --- as dashes, ... as an ellipsis.
// never inside code
const L = { d: '“', D: '”', s: '‘', S: '’' };
const OPENS = /[\s([{—–-]$/;

export function smarten(root: HTMLElement) {
  const walk = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode: (n) => (n.parentElement?.closest('code, pre, kbd, script, style') ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT),
  });
  let before = ' '; // the character before this text node, across inline tags
  let block: Element | null = null;
  for (let n = walk.nextNode(); n; n = walk.nextNode()) {
    const t = n as Text;
    const b = t.parentElement?.closest('p, li, h1, h2, h3, h4, h5, h6, td, th, figcaption, dd, dt') ?? null;
    if (b !== block) {
      block = b;
      before = ' ';
    }
    const v = t.data;
    let out = '';
    for (let i = 0; i < v.length; i++) {
      const ch = v[i];
      const prev = out ? out.at(-1)! : before;
      if (ch === '"') out += OPENS.test(prev) || i === 0 && /\s/.test(before) ? L.d : L.D;
      else if (ch === "'") out += OPENS.test(prev) && /\w/.test(v[i + 1] ?? '') ? L.s : L.S;
      else if (ch === '-' && v[i + 1] === '-' && v[i + 2] === '-') { out += '—'; i += 2; }
      else if (ch === '-' && v[i + 1] === '-') { out += '–'; i += 1; }
      else if (ch === '.' && v[i + 1] === '.' && v[i + 2] === '.') { out += '…'; i += 2; }
      else out += ch;
    }
    if (out !== v) t.data = out;
    if (out) before = out.at(-1)!;
  }
}
