// the terminal's hidden commands, and the tally of which ones you've found
// (`eggs`, per browser). none are in `help`; the ? list only hints. jokes,
// not facts: nothing here claims anything about zain's setup that the rest
// of the site doesn't already say.
//
// quick ones are pure (text in, html out). the long ones (snake, hack,
// cmatrix, yes, the fork bomb) animate in the output on the step clock and
// take the keyboard while they run: ctrl+c or q stops them.

export type Esc = (s: string) => string;

// every egg, in the order `eggs` lists them. the engine's own eggs (rm -rf /,
// sl, vim...) are here too so they count
export const EGGS: [id: string, name: string][] = [
  ['rm', 'rm -rf /'],
  ['sl', 'sl'],
  ['vim', 'vim'],
  ['vim-exit', 'exit, inside vim'],
  ['wq', ':wq, outside vim'],
  ['nano', 'nano'],
  ['ping', 'ping alexandria'],
  ['ssh', 'ssh alexandria'],
  ['sudo', 'sudo'],
  ['sandwich', 'sudo make me a sandwich'],
  ['make', 'make'],
  ['git-push', 'git push'],
  ['git-blame', 'git blame'],
  ['dotfiles', 'ls -a'],
  ['secrets', 'cat .secrets'],
  ['shell', 'echo $SHELL'],
  ['cowsay', 'cowsay'],
  ['fortune', 'fortune'],
  ['man-man', 'man man'],
  ['coffee', 'brew coffee'],
  ['weather', 'weather'],
  ['modulo', '%'],
  ['yes', 'yes'],
  ['forkbomb', ':(){ :|:& };:'],
  ['hack', 'hack'],
  ['matrix', 'cmatrix'],
  ['snake', 'snake'],
  ['reboot', 'reboot'],
  ['shutdown', 'shutdown'],
];

const KEY = 'modul0-eggs';
export function foundEggs(): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(KEY) ?? '[]'));
  } catch {
    return new Set();
  }
}
// true if it's a new find
export function markEgg(id: string): boolean {
  const got = foundEggs();
  if (got.has(id) || !EGGS.some(([e]) => e === id)) return false;
  got.add(id);
  try {
    localStorage.setItem(KEY, JSON.stringify([...got]));
  } catch {}
  return true;
}
export function resetEggs() {
  try {
    localStorage.removeItem(KEY);
  } catch {}
}

export function eggsReport(esc: Esc) {
  const got = foundEggs();
  const n = EGGS.filter(([id]) => got.has(id)).length;
  const list = EGGS.filter(([id]) => got.has(id)).map(([, name]) => `<span class="accent">+</span> ${esc(name)}`);
  const head =
    n === EGGS.length
      ? `<b>all ${n}.</b> you might be a sysadmin.`
      : `<b>${n} of ${EGGS.length}</b> found${n ? '' : ". none yet: try what you'd try on a real terminal"}.`;
  return `${head}${list.length ? `<pre>${list.join('\n')}</pre>` : ''}<span class="dim">(eggs --reset starts over)</span>`;
}

const FORTUNES = [
  // zain's own lines, from the site
  "pwn others and don't pwn yourself.",
  "if you're going to hoard knowledge, commit to the bit.",
  'discard the quotient. keep the remainder.',
  // the classics
  "there's no place like 127.0.0.1.",
  'it works on my machine.',
  "the cloud is just someone else's computer.",
  "there are 10 kinds of people: those who read binary and those who don't.",
  "it's always dns.",
  'weeks of coding can save you hours of planning.',
  'to understand recursion, first understand recursion.',
  "a sysadmin's favourite page is the one that never pages.",
];

const cow = (text: string, esc: Esc) => {
  // wrap to 30 columns, then the bubble around it
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = '';
  for (const w of words) {
    if (line && line.length + w.length + 1 > 30) {
      lines.push(line);
      line = '';
    }
    line += (line ? ' ' : '') + w.slice(0, 30);
  }
  lines.push(line);
  const w = Math.max(...lines.map((l) => l.length));
  const edges = (i: number) => (lines.length === 1 ? ['<', '>'] : i === 0 ? ['/', '\\'] : i === lines.length - 1 ? ['\\', '/'] : ['|', '|']);
  const body = lines.map((l, i) => {
    const [a, b] = edges(i);
    return `${a} ${esc(l.padEnd(w))} ${b}`;
  });
  return `<pre> ${'_'.repeat(w + 2)}\n${body.join('\n')}\n ${'-'.repeat(w + 2)}
        \\   ^__^
         \\  (oo)\\_______
            (__)\\       )\\/\\
                ||----w |
                ||     ||</pre>`;
};

const MAN_MAN = `<div class="man">
<p>MAN(1)</p>
<b>name</b>
<p>man - an interface to the manuals. the ones nobody reads.</p>
<b>synopsis</b>
<p>man [page]</p>
<b>description</b>
<p>shows the manual for a command. on this system there's one worth reading: <a class="run" href="#" data-cmd="man modul0">man modul0</a>.</p>
<b>see also</b>
<p>help(1), and whoever you'd usually ask.</p>
</div>`;

// the pure ones: [egg id, html] or null if it isn't an egg
export function quick(line: string, command: string, args: string[], esc: Esc, error: (s: string) => string): [string, string] | null {
  const rest = args.join(' ');
  if (/^:\s*(wq?|q!?|x)$/.test(line)) return ['wq', "you're not in vim. good to see you practising, though."];
  switch (command) {
    case '%':
    case 'modulo':
      return ['modulo', "%: the whole site's named after me. <a class=\"run\" href=\"#\" data-cmd=\"man modul0\">man modul0</a> says why."];
    case 'sudo':
      if (/^make me a sandwich$/i.test(rest)) return ['sandwich', 'okay.'];
      if (rest === '!!') return ['sudo', error('nice try. still not in the sudoers file.')];
      return ['sudo', error('zain is not in the sudoers file. this incident will be reported.')];
    case 'make':
      if (/^me a sandwich$/i.test(rest)) return ['make', 'what? make it yourself.'];
      if (!rest) return ['make', error('make: *** No targets specified and no makefile found.  Stop.')];
      return ['make', error(`make: *** No rule to make target '${esc(args[0])}'.  Stop.`)];
    case 'ssh': {
      const host = (args.find((a) => !a.startsWith('-')) ?? '').replace(/^.*@/, '').toLowerCase();
      if (host === 'alexandria') return ['ssh', error("ssh: connect to host alexandria port 22: connection refused. it doesn't answer strangers.")];
      // not an egg: '' counts for nothing
      return ['', error(host ? `ssh: ${esc(host)}: this is a website. it can't open a socket.` : 'usage: ssh [user@]host')];
    }
    case 'cowsay':
      return ['cowsay', cow(rest || 'moo. (cowsay [text])', esc)];
    case 'fortune':
      return ['fortune', FORTUNES[Math.floor(Math.random() * FORTUNES.length)]];
    case 'brew':
    case 'coffee':
      return ['coffee', error("418 I'm a teapot.")];
    case 'weather':
      return ['weather', "london: raining, probably. it's london."];
    default:
      return null;
  }
}

export { MAN_MAN };

// ---------- the long ones ----------

export type Ctx = {
  print: (html: string) => HTMLElement; // appends an entry, returns its response element
  busy: (on: boolean) => void; // hides the prompt while something runs
  reduced: () => boolean;
  cols: () => number; // how many characters fit across the output
  found: (id: string) => void;
  scroll: () => void;
  room: () => number; // the visible height of the terminal, px
};

// the keyboard, for as long as one of these runs. ctrl+c, q or esc stops
// (esc stops the thing, not the terminal around it); the handler gets the
// rest. capture phase, so the page's own keys (j/k) wait their turn
function takeKeys(stop: () => void, onKey?: (e: KeyboardEvent) => boolean) {
  const h = (e: KeyboardEvent) => {
    if (e.key === '`') return stop(); // the terminal's closing: let it
    if ((e.ctrlKey && e.key === 'c') || e.key === 'q' || e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      return stop();
    }
    if (onKey?.(e)) {
      e.preventDefault();
      e.stopPropagation();
    }
  };
  window.addEventListener('keydown', h, true);
  return () => window.removeEventListener('keydown', h, true);
}

// runs `frame` every `ms` until it returns false or someone stops it
function loop(ctx: Ctx, ms: number, frame: (n: number) => boolean | void, done: (stopped: boolean) => void, onKey?: (e: KeyboardEvent) => boolean) {
  ctx.busy(true);
  let n = 0;
  let over = false;
  const finish = (stopped: boolean) => {
    if (over) return;
    over = true;
    clearInterval(timer);
    release();
    done(stopped);
    ctx.busy(false);
  };
  const release = takeKeys(() => finish(true), onKey);
  const timer = window.setInterval(() => {
    if (frame(n++) === false) finish(false);
  }, ms);
  return finish;
}

export function yes(ctx: Ctx, word: string) {
  const el = ctx.print('<pre class="yes"></pre>').querySelector('pre')!;
  let lines = 0;
  loop(
    ctx,
    30,
    () => {
      el.textContent += `${word}\n`.repeat(4);
      lines += 4;
      ctx.scroll();
      return lines < 400;
    },
    (stopped) => {
      el.textContent += stopped ? '^C' : '...';
      if (!stopped) ctx.print('<span class="dim">you can stop it with ctrl+c, you know.</span>');
      ctx.found('yes');
    },
  );
}

export function forkbomb(ctx: Ctx) {
  const el = ctx.print('<pre></pre>').querySelector('pre')!;
  let procs = 1;
  loop(
    ctx,
    ctx.reduced() ? 1 : 70,
    () => {
      procs *= 2;
      el.textContent = `forking... ${procs.toLocaleString('en-GB')} processes`;
      ctx.scroll();
      return procs < 65536;
    },
    () => {
      el.textContent += '\nfork: retry: resource temporarily unavailable';
      ctx.print("oom-killer: killed the lot. the site's fine.");
      ctx.found('forkbomb');
    },
  );
}

export function hack(ctx: Ctx, target: string, esc: Esc) {
  const steps = ['bypassing the firewall', 'decrypting the mainframe', 'downloading more ram', 'reversing the polarity', 'enhancing'];
  const el = ctx.print(`<pre>target: ${esc(target || 'the mainframe')}\n</pre>`).querySelector('pre')!;
  const head = el.textContent!;
  const bar = (i: number) => {
    const done = steps.map((s, k) => (k < Math.floor(i / 10) ? `[##########] ${s}` : k === Math.floor(i / 10) ? `[${'#'.repeat(i % 10).padEnd(10, '.')}] ${s}` : ''));
    return head + done.filter(Boolean).join('\n');
  };
  loop(
    ctx,
    ctx.reduced() ? 1 : 28,
    (i) => {
      el.textContent = bar(i);
      ctx.scroll();
      return i < steps.length * 10;
    },
    (stopped) => {
      if (stopped) return;
      el.insertAdjacentHTML('beforeend', '\n<span class="op">ACCESS GRANTED</span>');
      window.setTimeout(() => {
        el.lastElementChild!.outerHTML = '<span class="error">access denied. this is a portfolio.</span>';
        ctx.found('hack');
      }, ctx.reduced() ? 0 : 700);
    },
  );
}

const RAIN = 'abcdefghijklmnopqrstuvwxyz0123456789%#/<>{}[]$&*+=';
export function cmatrix(ctx: Ctx) {
  const rows = 14;
  const cols = Math.max(20, Math.min(ctx.cols(), 120));
  const el = ctx.print('<pre class="rain" aria-hidden="true"></pre>').querySelector('pre')!;
  const glyph = () => RAIN[Math.floor(Math.random() * RAIN.length)];
  const heads = Array.from({ length: cols }, () => -Math.floor(Math.random() * rows * 2));
  const grid = Array.from({ length: rows }, () => Array.from({ length: cols }, glyph));
  const draw = () => {
    let s = '';
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const d = heads[x] - y; // how far behind this column's head
        if (d === 0) s += `<b>${grid[y][x]}</b>`;
        else if (d > 0 && d < 5) s += `<i>${grid[y][x]}</i>`;
        else if (d >= 5 && d < 9) s += `<s>${grid[y][x]}</s>`;
        else s += ' ';
      }
      s += '\n';
    }
    el.innerHTML = s;
  };
  loop(
    ctx,
    75,
    (n) => {
      for (let x = 0; x < cols; x++) {
        heads[x] = heads[x] > rows + 9 ? -Math.floor(Math.random() * rows) : heads[x] + 1;
        if (Math.random() < 0.3) grid[Math.floor(Math.random() * rows)][x] = glyph();
      }
      draw();
      if (n === 0) ctx.scroll();
      return !ctx.reduced() && n < 70;
    },
    () => {
      el.outerHTML = '<span class="dim">wake up, neo.</span>';
      ctx.found('matrix');
    },
  );
}

// snake: arrows, wasd or hjkl; space pauses; swipe on a touch screen
export function snake(ctx: Ctx) {
  const W = 18, H = 12;
  const res = ctx.print(`<div class="t-snake"><div class="t-snake-board" style="--w:${W};--h:${H}"></div><div class="t-snake-status"></div></div>`);
  const board = res.querySelector<HTMLElement>('.t-snake-board')!;
  const status = res.querySelector<HTMLElement>('.t-snake-status')!;
  const cells = Array.from({ length: W * H }, () => board.appendChild(document.createElement('i')));
  // as big as fits: the width there is, and the height the terminal shows
  // less room for the command above and the status and egg note below, so
  // the whole board is on screen without scrolling
  const em = parseFloat(getComputedStyle(board).fontSize) || 16;
  const across = res.clientWidth || 27 * em;
  const tall = ctx.room() - 7 * em;
  board.style.width = `${Math.floor(Math.max(9 * em, Math.min(across, 27 * em, (tall * W) / H)))}px`;
  let best = 0;
  try {
    best = Number(localStorage.getItem('modul0-snake')) || 0;
  } catch {}
  let body = [{ x: 5, y: 6 }, { x: 4, y: 6 }, { x: 3, y: 6 }];
  let dir = { x: 1, y: 0 };
  const turns: { x: number; y: number }[] = [];
  let food = { x: 12, y: 6 };
  let score = 0;
  let paused = false;
  let dead = false;
  const place = () => {
    do food = { x: Math.floor(Math.random() * W), y: Math.floor(Math.random() * H) };
    while (body.some((b) => b.x === food.x && b.y === food.y));
  };
  const draw = () => {
    cells.forEach((c) => (c.className = ''));
    body.forEach((b, i) => (cells[b.y * W + b.x].className = i ? 's' : 'h'));
    cells[food.y * W + food.x].className = 'f';
    status.textContent = paused ? 'paused · space to go on' : `score ${score} · best ${best} · arrows/wasd/hjkl · q quits`;
  };
  const steer = (x: number, y: number) => {
    const last = turns[turns.length - 1] ?? dir;
    if (last.x === -x && last.y === -y) return; // no reversing into yourself
    if (turns.length < 3) turns.push({ x, y });
  };
  const KEYS: Record<string, [number, number]> = {
    ArrowUp: [0, -1], w: [0, -1], k: [0, -1],
    ArrowDown: [0, 1], s: [0, 1], j: [0, 1],
    ArrowLeft: [-1, 0], a: [-1, 0], h: [-1, 0],
    ArrowRight: [1, 0], d: [1, 0], l: [1, 0],
  };
  // swipes, for phones
  let start: { x: number; y: number } | null = null;
  board.addEventListener('pointerdown', (e) => (start = { x: e.clientX, y: e.clientY }));
  board.addEventListener('pointerup', (e) => {
    if (!start) return;
    const dx = e.clientX - start.x, dy = e.clientY - start.y;
    start = null;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 16) return;
    Math.abs(dx) > Math.abs(dy) ? steer(Math.sign(dx), 0) : steer(0, Math.sign(dy));
  });
  board.style.touchAction = 'none';
  ctx.found('snake');
  draw();
  ctx.scroll();
  let tick = 0;
  loop(
    ctx,
    20,
    () => {
      // the snake moves every few 20ms ticks, a little faster as it grows
      if (paused || ++tick < Math.max(3, 7 - Math.floor(score / 4))) return true;
      tick = 0;
      dir = turns.shift() ?? dir;
      const head = { x: body[0].x + dir.x, y: body[0].y + dir.y };
      if (head.x < 0 || head.y < 0 || head.x >= W || head.y >= H || body.some((b) => b.x === head.x && b.y === head.y)) {
        dead = true;
        return false;
      }
      body = [head, ...body];
      if (head.x === food.x && head.y === food.y) {
        score++;
        place();
      } else body.pop();
      draw();
      return true;
    },
    () => {
      if (score > best) {
        best = score;
        try {
          localStorage.setItem('modul0-snake', String(best));
        } catch {}
      }
      board.classList.add('over');
      status.innerHTML = `${dead ? 'game over' : 'quit'} · score ${score} · best ${best} · <a class="run" href="#" data-cmd="snake">play again</a>`;
    },
    (e) => {
      if (e.key === ' ') {
        paused = !paused;
        draw();
        return true;
      }
      const k = KEYS[e.key.length === 1 ? e.key.toLowerCase() : e.key];
      if (!k) return false;
      steer(k[0], k[1]);
      return true;
    },
  );
}
