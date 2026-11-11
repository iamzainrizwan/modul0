// typing helpers, like any code editor's markdown mode:
//   enter in a list or quote carries the marker on (numbers count up, a
//   ticked box comes back empty); enter on an empty item ends the list
//   tab / shift+tab indent and outdent list items, or every selected line.
//   anywhere else tab still moves focus, and after esc it always does
//   pasting a url over selected text makes it a link
import { codeRanges } from './figures';

type Put = (text: string, start: number, end: number, select?: [number, number]) => void;
const ITEM = /^(\s*(?:>\s?)*)(\s*)([-*+]|\d{1,9}[.)])([ \t]+)(\[[ xX]\][ \t]+)?/;
const QUOTE = /^(\s*(?:>[ \t]?)+)/;

function lineAt(v: string, pos: number) {
  const s = v.lastIndexOf('\n', pos - 1) + 1;
  const e = v.indexOf('\n', pos);
  return { s, e: e < 0 ? v.length : e };
}

// the start and end of every line the selection touches
function lines(area: HTMLTextAreaElement) {
  const v = area.value;
  const s = lineAt(v, area.selectionStart).s;
  // a selection ending at the very start of a line doesn't take that line
  const endPos = area.selectionEnd > area.selectionStart && v[area.selectionEnd - 1] === '\n' ? area.selectionEnd - 1 : area.selectionEnd;
  const e = lineAt(v, endPos).e;
  return { s, e };
}

export function enter(area: HTMLTextAreaElement, put: Put): boolean {
  const v = area.value;
  const pos = area.selectionStart;
  if (pos !== area.selectionEnd) return false;
  if (codeRanges(v).some(([s, e]) => pos > s && pos < e)) return false;
  const { s, e } = lineAt(v, pos);
  const line = v.slice(s, e);
  const item = ITEM.exec(line);
  const quote = !item && QUOTE.exec(line);
  const m = item || quote;
  if (!m) return false;
  const prefix = m[0];
  if (pos - s < prefix.length) return false; // the caret is in the marker itself
  // an empty item or quote line: end the list instead of adding one
  if (!line.slice(prefix.length).trim() && pos === e) {
    put('', s, e);
    return true;
  }
  let next: string;
  if (item) {
    const [, outer, indent, marker, gap, box] = item;
    const n = /^(\d+)([.)])$/.exec(marker);
    next = outer + indent + (n ? `${Number(n[1]) + 1}${n[2]}` : marker) + gap + (box ? '[ ] ' : '');
  } else next = quote![1];
  put(`\n${next}`, pos, pos, [next.length + 1, next.length + 1]);
  return true;
}

export function tab(area: HTMLTextAreaElement, put: Put, out: boolean): boolean {
  const v = area.value;
  const { s, e } = lines(area);
  const block = v.slice(s, e);
  const multi = block.includes('\n');
  const list = block.split('\n').some((l) => ITEM.test(l));
  if (!multi && !list) return false; // prose: let tab move focus
  if (codeRanges(v).some(([cs, ce]) => s > cs && s < ce)) return false;
  const ss = area.selectionStart;
  const se = area.selectionEnd;
  let firstShift = 0;
  let total = 0;
  const changed = block.split('\n').map((l, i) => {
    const m = ITEM.exec(l);
    const width = m && /\d/.test(m[3]) ? m[3].length + m[4].length : 2; // nested numbers line up under the text
    let d: number;
    let out_: string;
    if (out) {
      const lead = /^[ \t]*/.exec(l)![0];
      const cut = Math.min(lead.length, width);
      out_ = l.slice(cut);
      d = -cut;
    } else {
      out_ = ' '.repeat(width) + l;
      d = width;
    }
    if (i === 0) firstShift = d;
    total += d;
    return out_;
  }).join('\n');
  if (changed === block) return true;
  const a = Math.max(s, ss + firstShift) - s;
  const b = se + total - s;
  put(changed, s, e, ss === se ? [a, a] : [a, b]);
  return true;
}

// a url pasted over selected text (one line, not a url itself) links it
export function pasteLink(area: HTMLTextAreaElement, put: Put, text: string, local: (u: string) => string): boolean {
  const url = text.trim();
  if (!/^(https?:\/\/|mailto:)\S+$/.test(url)) return false;
  const s = area.selectionStart;
  const e = area.selectionEnd;
  const chosen = area.value.slice(s, e);
  if (!chosen || chosen.includes('\n') || /^(https?:\/\/|mailto:)/.test(chosen.trim())) return false;
  const md = `[${chosen}](${local(url)})`;
  put(md, s, e, [md.length, md.length]);
  return true;
}
