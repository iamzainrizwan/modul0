// where a spot in a textarea is drawn. the textarea can't say, so a hidden
// copy of it (same font, width, padding and wrapping) holds the text with a
// marker at each spot, and the markers are measured. used by the link picker
// (to sit under the caret) and the scroll sync (where each block starts).
const COPY = [
  'boxSizing', 'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft',
  'borderTopWidth', 'borderRightWidth', 'borderBottomWidth', 'borderLeftWidth', 'borderStyle',
  'fontFamily', 'fontSize', 'fontWeight', 'fontStyle', 'fontVariantLigatures', 'letterSpacing', 'lineHeight',
  'textTransform', 'wordSpacing', 'tabSize', 'textIndent', 'wordBreak', 'overflowWrap',
] as const;
const ZW = String.fromCharCode(0x200b); // a zero-width space, so an empty marker still has a line

let copy: HTMLDivElement | null = null;

function sync(area: HTMLTextAreaElement) {
  copy ??= document.body.appendChild(document.createElement('div'));
  copy.setAttribute('aria-hidden', 'true');
  const cs = getComputedStyle(area);
  const s = copy.style;
  for (const k of COPY) s[k] = cs[k];
  Object.assign(s, {
    position: 'absolute', top: '0', left: '-9999px', visibility: 'hidden', pointerEvents: 'none',
    whiteSpace: 'pre-wrap', overflow: 'hidden', height: 'auto', boxSizing: 'border-box',
    // clientWidth leaves out the scrollbar, which takes width from the text
    width: `${area.clientWidth + parseFloat(cs.borderLeftWidth) + parseFloat(cs.borderRightWidth)}px`,
  });
  return copy;
}

// the top (in the textarea's scrolled content, like scrollTop) of each spot
export function tops(area: HTMLTextAreaElement, spots: number[]): number[] {
  const c = sync(area);
  const text = area.value;
  const marks: HTMLSpanElement[] = [];
  const frag = document.createDocumentFragment();
  let at = 0;
  for (const spot of spots) {
    const p = Math.max(at, Math.min(spot, text.length));
    frag.append(text.slice(at, p));
    const m = document.createElement('span');
    m.textContent = ZW;
    frag.append(m);
    marks.push(m);
    at = p;
  }
  frag.append(text.slice(at) + ZW);
  c.replaceChildren(frag);
  return marks.map((m) => m.offsetTop);
}

// the caret's box, relative to the textarea's own top left as it's scrolled
export function caretBox(area: HTMLTextAreaElement, pos = area.selectionStart) {
  const c = sync(area);
  const m = document.createElement('span');
  m.textContent = ZW;
  c.replaceChildren(area.value.slice(0, pos), m, area.value.slice(pos) + ZW);
  const lh = parseFloat(getComputedStyle(area).lineHeight) || m.offsetHeight;
  return { left: m.offsetLeft - area.scrollLeft, top: m.offsetTop - area.scrollTop, height: lh };
}
