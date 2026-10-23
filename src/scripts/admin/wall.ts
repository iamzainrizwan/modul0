// the pixel wall: recent placements, undo a poster, or clear it
import { call, explain } from './api';
import { say, el, button, when } from './ui';

type Pixel = { id: number; x: number; y: number; color: number; created: string; poster: string };
const COLOUR = ['erase', 'purple', 'ink'];
export let pixels: Pixel[] = [];

export async function loadWall() {
  pixels = (await call<{ pixels: Pixel[] }>('/admin/wall')).pixels;
  const list = document.querySelector<HTMLOListElement>('[data-wall-list]')!;
  list.replaceChildren(
    ...pixels.map((p) => {
      const n = pixels.filter((q) => q.poster === p.poster).length;
      return el(
        'li', {},
        el('span', { text: `${COLOUR[p.color]} at ${p.x}, ${p.y}` }),
        el('span', { class: 'gb-poster', text: `${when(p.created)} · poster ${p.poster}` }),
        button(`undo ${n === 1 ? 'it' : `all ${n}`} from ${p.poster}`, () => undo(`poster=${p.poster}`, `Undo every pixel from poster ${p.poster}?`, `Undid ${p.poster}`)),
      );
    }),
  );
  if (!pixels.length) list.append(el('li', { class: 'gb-empty', text: 'Nothing on the wall yet.' }));
}

async function undo(query: string, ask: string, done: string) {
  if (!confirm(ask)) return;
  try {
    const { deleted } = await call(`/wall?${query}`, { method: 'DELETE' });
    say(`${done} (${deleted} ${deleted === 1 ? 'pixel' : 'pixels'}).`);
    loadWall();
  } catch (e) { say(explain(e), true); }
}

document.querySelector('[data-wall-clear]')?.addEventListener('click', () =>
  undo('all=1', 'Clear the whole wall? This can’t be undone.', 'Cleared the wall'),
);
