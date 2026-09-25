// the pixel wall on the guestbook page (api/: /wall). drawn on a canvas in
// the site's own colours, so it follows the theme; the <img> of /wall.svg it
// replaces is what you get without js. pick a colour, pick a cell (tap, or
// the arrow keys), then place: one pixel a day, so nothing lands on a stray tap.
const SIZE = 32;
const NAMES = ['blank', 'purple', 'ink'];

type Cell = { x: number; y: number };

const until = (s: number) => {
  const h = Math.floor(s / 3600), m = Math.ceil((s % 3600) / 60);
  return h ? `${h}h ${m}m` : `${m}m`;
};

export function setupWall(root: HTMLElement) {
  const api = root.dataset.api!;
  const canvas = root.querySelector('canvas')!;
  const img = root.querySelector('img');
  const form = root.querySelector('form')!;
  const place = form.querySelector('button')!;
  const live = root.querySelector<HTMLElement>('.wall-live')!;
  const meta = document.querySelector<HTMLElement>('[data-wall-meta]');
  const ctx = canvas.getContext('2d')!;

  let cells = '0'.repeat(SIZE * SIZE);
  let wait = 0; // seconds until this visitor's next pixel
  let waitAt = Date.now();
  let sel: Cell | null = null;
  let hover: Cell | null = null;
  let busy = false;
  // device pixels per cell: the canvas is sized to the screen, a whole number
  // per cell, so the grid lines stay crisp at any width (a 512 canvas scaled
  // down to a phone aliases them into stripes)
  let px = 16;
  // the room it has: the box's width (never over 32rem), less the 2px frame
  const fit = () => {
    const rem = parseFloat(getComputedStyle(document.documentElement).fontSize);
    const room = Math.min(root.clientWidth, 32 * rem) - 4;
    const next = Math.max(4, Math.floor((room * devicePixelRatio) / SIZE));
    if (next === px && canvas.width === px * SIZE) return;
    px = next;
    canvas.width = canvas.height = px * SIZE;
    canvas.style.width = `${(px * SIZE) / devicePixelRatio}px`;
    draw();
  };

  const color = () => Number((form.elements.namedItem('color') as RadioNodeList).value);
  const left = () => Math.max(0, wait - (Date.now() - waitAt) / 1000);
  const say = (text: string, err = false) => {
    live.textContent = text;
    live.classList.toggle('gb-err', err);
  };

  function draw() {
    const cs = getComputedStyle(document.documentElement);
    const [paper, purple, ink, line] = ['--void', '--purple', '--white', '--line'].map((v) => cs.getPropertyValue(v).trim());
    const fill = [paper, purple, ink];
    const full = SIZE * px;
    const t = Math.max(1, Math.round(px / 8)); // outline thickness, in step with the cells
    ctx.fillStyle = paper;
    ctx.fillRect(0, 0, full, full);
    for (let i = 0; i < cells.length; i++) {
      if (cells[i] === '0') continue;
      ctx.fillStyle = fill[+cells[i]];
      ctx.fillRect((i % SIZE) * px, Math.floor(i / SIZE) * px, px, px);
    }
    ctx.fillStyle = line;
    for (let k = 1; k < SIZE; k++) {
      ctx.fillRect(k * px, 0, 1, full);
      ctx.fillRect(0, k * px, full, 1);
    }
    // outlines are filled rectangles, not strokes, so they land on whole pixels
    const box = (c: Cell, grow: number, w: number, colour: string) => {
      const x = c.x * px - grow, y = c.y * px - grow, s = px + grow * 2;
      ctx.fillStyle = colour;
      ctx.fillRect(x, y, s, w);
      ctx.fillRect(x, y + s - w, s, w);
      ctx.fillRect(x, y, w, s);
      ctx.fillRect(x + s - w, y, w, s);
    };
    if (hover && (!sel || hover.x !== sel.x || hover.y !== sel.y)) box(hover, 0, t, purple);
    if (sel) {
      // a preview of the pixel, boxed in ink with a paper gap so it shows on any colour
      ctx.fillStyle = fill[color()];
      ctx.fillRect(sel.x * px, sel.y * px, px, px);
      box(sel, t, t, paper);
      box(sel, t * 2, t, ink);
    }
  }

  function label() {
    const w = left();
    place.disabled = busy || !sel || w > 0;
    place.textContent = w > 0 ? `Next pixel in ${until(w)}` : sel ? `Place at ${sel.x}, ${sel.y}` : 'Pick a cell';
    if (meta) {
      const n = [...cells].filter((c) => c !== '0').length;
      meta.textContent = `${n} ${n === 1 ? 'pixel' : 'pixels'}`;
    }
  }

  const update = () => {
    draw();
    label();
  };

  function select(c: Cell) {
    sel = { x: Math.max(0, Math.min(SIZE - 1, c.x)), y: Math.max(0, Math.min(SIZE - 1, c.y)) };
    const now = NAMES[+cells[sel.y * SIZE + sel.x]];
    say(`Cell ${sel.x}, ${sel.y}: ${now}.`);
    update();
  }

  const cellAt = (e: PointerEvent): Cell => {
    const r = canvas.getBoundingClientRect();
    return { x: Math.floor(((e.clientX - r.left) / r.width) * SIZE), y: Math.floor(((e.clientY - r.top) / r.height) * SIZE) };
  };

  async function load() {
    const res = await fetch(`${api}/wall`);
    if (!res.ok) throw new Error();
    const d = await res.json();
    cells = d.cells;
    wait = d.wait;
    waitAt = Date.now();
    img?.remove();
    canvas.parentElement!.classList.add('is-live');
    canvas.hidden = false;
    form.hidden = false;
    fit();
    update();
  }

  canvas.addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'mouse') return;
    hover = cellAt(e);
    draw();
  });
  canvas.addEventListener('pointerleave', () => {
    hover = null;
    draw();
  });
  canvas.addEventListener('click', (e) => select(cellAt(e as PointerEvent)));
  canvas.addEventListener('keydown', (e) => {
    const moves: Record<string, [number, number]> = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
    if (moves[e.key]) {
      e.preventDefault();
      const [dx, dy] = moves[e.key];
      select(sel ? { x: sel.x + dx, y: sel.y + dy } : { x: SIZE / 2, y: SIZE / 2 });
    } else if ((e.key === 'Enter' || e.key === ' ') && sel) {
      e.preventDefault();
      form.requestSubmit();
    }
  });
  form.addEventListener('change', update);

  const errors: Record<string, string> = {
    'one-a-day': 'One pixel a day. Come back tomorrow.',
    same: 'That cell’s already that colour.',
    'wall-busy': 'The wall’s had its fill for today. Try tomorrow.',
    'slow-down': 'Slow down a little, then try again.',
  };
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!sel || busy || left() > 0) return;
    busy = true;
    label();
    say('Placing…');
    try {
      const res = await fetch(`${api}/wall`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ ...sel, color: color() }),
      });
      const d = await res.json().catch(() => ({}));
      if (d.wait !== undefined) {
        wait = d.wait;
        waitAt = Date.now();
      }
      if (!res.ok) throw new Error(errors[d.error] ?? 'Couldn’t place that. Try again in a bit.');
      cells = d.cells;
      say(`Placed ${NAMES[color()]} at ${sel.x}, ${sel.y}. See you tomorrow.`);
      sel = null;
    } catch (err) {
      say(err instanceof Error && !(err instanceof TypeError) ? err.message : 'Couldn’t reach the wall. Try again in a bit.', true);
    } finally {
      busy = false;
      update();
    }
  });

  // the theme toggle recolours it; other people's pixels arrive once a minute
  // while the page is open (the router keeps this script alive, so stop once
  // the wall has been swapped out)
  new ResizeObserver(fit).observe(root);
  const onTheme = () => (root.isConnected ? draw() : window.removeEventListener('modul0:theme', onTheme));
  window.addEventListener('modul0:theme', onTheme);
  const tick = window.setInterval(() => {
    if (!root.isConnected) return clearInterval(tick);
    if (document.visibilityState === 'visible') load().catch(() => {});
    else label();
  }, 60_000);

  load().catch(() => {
    if (meta) meta.textContent = 'offline';
    say('Couldn’t load the wall right now.', true);
  });
}
