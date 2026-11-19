import { useEffect, useRef, useState, type CSSProperties, type RefObject } from 'react';
import { birthday } from '../scripts/birthday';
import { outros, type Outro } from '../data/motion';

// first-visit boot animation. the page is fully rendered underneath. an inline
// script in Site.astro sets html[data-boot=pending] before first paint, which
// shows a static black cover (no flash of the page); this component swaps it
// for the animated overlay and removes the attribute when done.
//
// sequence: log lines resolve [ .... ] -> [  r0  ] while a square progress
// bar fills, the name types itself (typo included, then fixed), and a solid
// purple panel dithers in over it, then dithers away to reveal the site
// (css px-in / px-out). any key/tap skips straight to the wipe.
//
// that last hand-over (wipe in, then reveal out) is the outro, picked by
// html[data-outro] (motion.ts; the test site's panel switches it). each outro
// is css in site.css ("boot outros"); the element marked data-end finishing
// its animation moves wipe -> reveal -> done.

// `short` is shown on narrow screens so each line stays on one row. statuses
// read as remainders: r0 = done, nothing left over; r1 = something still left
type Line = { text: string; short: string; status: 'ok' | 'wait' };

const LINES: Line[] = [
  { text: 'identifying user: zain rizwan', short: 'user: zain rizwan', status: 'ok' },
  { text: 'mounting /kcl/computer-science/year-2', short: 'mount /kcl/cs/year-2', status: 'ok' },
  { text: 'loading cybersoc/treasurer', short: 'load cybersoc/treasurer', status: 'ok' },
  { text: 'connecting to alexandria', short: 'connect alexandria', status: 'ok' },
  { text: 'starting s3ntry health daemon', short: 'start s3ntry health', status: 'ok' },
  { text: 'ledgr: categoriser', short: 'ledgr: categoriser', status: 'wait' },
];

const LINE_STEP = 115;
const RESOLVE = 190;
const BAR = 16;

// keystrokes for the name: 'rizwna' is the typo, two backspaces fix it
type Key = { ch: string; wait: number } | { back: true; wait: number };
const KEYS: Key[] = (() => {
  const jitter = [62, 48, 81, 55, 70, 44, 90, 58, 66, 51, 77];
  const typed = (s: string, start: number) => [...s].map((ch, i) => ({ ch, wait: jitter[(start + i) % jitter.length] }));
  return [
    ...typed('zain rizw', 0),
    ...typed('na', 9),
    { back: true, wait: 420 }, // notice the typo
    { back: true, wait: 70 },
    ...typed('an', 3),
  ];
})();

type Phase = 'log' | 'name' | 'wipe' | 'reveal' | 'done';

// the project count comes from profile.ts (Site.astro passes it), so adding
// a project from the admin keeps it right
export default function BootSequence({ birth, featured, archived }: { birth: string; featured: number; archived: number }) {
  const [active, setActive] = useState(false);
  // on the birthday (and the days after) the log gets one more line, after the user
  const [lines, setLines] = useState(LINES);
  const [shown, setShown] = useState(0);
  const [resolved, setResolved] = useState(0);
  const [typed, setTyped] = useState('');
  const [phase, setPhase] = useState<Phase>('log');
  const [outro, setOutro] = useState<Outro>('wipe');
  // outro geometry, measured when the wipe starts (mod's grid, rail's target)
  const [geo, setGeo] = useState<Record<string, string>>({});
  const [cells, setCells] = useState(0);
  const outroRef = useRef<Outro>('wipe');
  const timers = useRef<number[]>([]);
  const skipped = useRef(false);
  const screen = useRef<HTMLDivElement>(null);

  const later = (fn: () => void, ms: number) => timers.current.push(window.setTimeout(fn, ms));

  const toWipe = () => {
    if (skipped.current) return;
    skipped.current = true;
    timers.current.forEach(clearTimeout);
    if (outroRef.current === 'mod') {
      const cols = Math.ceil(innerWidth / 48);
      setCells(cols * Math.ceil(innerHeight / 48));
      setGeo({ '--cols': String(cols) });
    }
    if (outroRef.current === 'rail' || outroRef.current === 'grow60') {
      // squash the boot screen into the rail's name
      const r = document.querySelector('.rail-name')?.getBoundingClientRect();
      const ok = r && r.width > 0;
      setGeo({
        '--rx': `${ok ? r.left : innerWidth / 2}px`,
        '--ry': `${ok ? r.top : innerHeight / 2}px`,
        '--rw': `${ok ? r.width : 0}px`,
        '--rh': `${ok ? r.height : 0}px`,
        '--sx': String(ok ? r.width / innerWidth : 0),
        '--sy': String(ok ? r.height / innerHeight : 0),
      });
    }
    setPhase('wipe');
    try {
      sessionStorage.setItem('modul0-booted', '1');
    } catch {}
  };

  useEffect(() => {
    const root = document.documentElement;
    if (root.dataset.boot !== 'pending') return;
    // hand over from the static cover to the animated overlay
    root.dataset.boot = 'running';
    const o = root.dataset.outro as Outro;
    if (outros.some((x) => x.id === o)) {
      outroRef.current = o;
      setOutro(o);
    }
    const bday = birthday(birth);
    const all = [
      ...LINES,
      { text: `indexing ${featured} featured projects, ${archived} archived`, short: `index ${featured + archived} projects`, status: 'ok' as const },
    ];
    const LOG = bday
      ? [all[0], { text: `uptime rolled over: ${bday.age}y. happy birthday`, short: `uptime: ${bday.age}y rollover`, status: 'ok' as const }, ...all.slice(1)]
      : all;
    setLines(LOG);
    setActive(true);

    LOG.forEach((_, i) => {
      later(() => setShown(i + 1), LINE_STEP * (i + 1));
      later(() => setResolved(i + 1), LINE_STEP * (i + 1) + RESOLVE);
    });

    let t = LINE_STEP * LOG.length + RESOLVE + 260;
    later(() => setPhase('name'), t);
    t += 180;
    for (const k of KEYS) {
      t += k.wait;
      if ('back' in k) later(() => setTyped((s) => s.slice(0, -1)), t);
      else later(() => setTyped((s) => s + k.ch), t);
    }
    later(toWipe, t + 520);

    const skip = (e: Event) => {
      if (e instanceof KeyboardEvent && ['Shift', 'Control', 'Alt', 'Meta'].includes(e.key)) return;
      toWipe();
    };
    window.addEventListener('keydown', skip);
    window.addEventListener('pointerdown', skip);
    return () => {
      timers.current.forEach(clearTimeout);
      window.removeEventListener('keydown', skip);
      window.removeEventListener('pointerdown', skip);
    };
  }, []);

  // failsafe: the wipe advances on animationend, so if that never fires
  // (a style whose animation can't run), move on anyway rather than leave
  // the purple panel up
  useEffect(() => {
    if (phase !== 'wipe' && phase !== 'reveal') return;
    const t = window.setTimeout(() => {
      document.documentElement.removeAttribute('data-boot');
      setPhase(phase === 'wipe' ? 'reveal' : 'done');
    }, 2000);
    return () => clearTimeout(t);
  }, [phase]);

  if (!active || phase === 'done') return null;

  const filled = Math.round((resolved / lines.length) * BAR);
  const advance = () => {
    if (phase === 'wipe') {
      // page shows through as soon as the black screen is gone
      document.documentElement.removeAttribute('data-boot');
      setPhase('reveal');
    } else if (phase === 'reveal') setPhase('done');
  };

  return (
    <div
      className="bootseq"
      role="presentation"
      aria-hidden="true"
      data-phase={phase}
      data-outro={outro}
      style={geo as CSSProperties}
      onAnimationEnd={(e) => {
        if ((e.target as HTMLElement).hasAttribute('data-end')) advance();
      }}
    >
      {phase !== 'reveal' && (
        <div className="boot-screen" ref={screen} {...(phase === 'wipe' && SELF.includes(outro) ? { 'data-end': '' } : {})}>
          <div className="boot-log">
            <div className="boot-head">
              <span>modul0 bootloader</span>
              <span>v0.4</span>
            </div>
            {lines.slice(0, shown).map((l, i) => {
              const done = i < resolved;
              return (
                <div key={i} className="boot-line">
                  <span className="boot-text">
                    <span className="boot-long">{l.text}</span>
                    <span className="boot-short">{l.short}</span>
                  </span>
                  <span className={`boot-status ${done ? l.status : 'pending'}`}>
                    {done ? (l.status === 'ok' ? '[  r0  ]' : '[  r1  ]') : '[ .... ]'}
                  </span>
                </div>
              );
            })}
            <div className="boot-bar">
              {Array.from({ length: BAR }, (_, i) => (
                <span key={i} className={i < filled ? 'on' : ''} />
              ))}
            </div>
          </div>
          <div className="boot-name">
            {phase === 'log' ? ' ' : typed}
            {phase !== 'log' && <span className="boot-cursor" />}
          </div>
          <span className="boot-skip">
            <span className="boot-long">any key skips</span>
            <span className="boot-short">tap to skip</span>
          </span>
        </div>
      )}
      {(phase === 'wipe' || phase === 'reveal') && <Hand outro={outro} phase={phase} cells={cells} onEnd={advance} screen={screen} />}
    </div>
  );
}

// the outro's own elements. rail and crt animate the boot screen itself on
// the way in (it carries data-end then), so they only add something here for
// the reveal. keys differ between phases so every element restarts
const end = (last: boolean) => (last ? { 'data-end': '' } : {});
// outros whose wipe is the boot screen's own animation (it carries data-end)
const SELF: Outro[] = ['rail', 'crt', 'bayer', 'adam7', 'scan', 'halftone', 'afterglow'];
const BANDS = 8;
const TEAR = [3, 0, 5, 1, 6, 2, 7, 4, 9, 8]; // order the tear's bands go in
const range = (n: number) => Array.from({ length: n }, (_, i) => i);

function Hand({ outro, phase, cells, onEnd, screen }: { outro: Outro; phase: 'wipe' | 'reveal'; cells: number; onEnd: () => void; screen: RefObject<HTMLDivElement | null> }) {
  const inn = phase === 'wipe';
  switch (outro) {
    // 60fps: the boot screen itself, text and all, through every bayer level
    case 'bayer60':
      return inn ? <Levels key="in" target={screen} from={0} to={64} ms={520} onEnd={onEnd} /> : <span className="ot-done" key="out" data-end />;
    // the original wipe at full frame rate: purple dithers in, then out
    case 'wipe60':
      return <Levels key={phase} from={inn ? 64 : 0} to={inn ? 0 : 64} ms={inn ? 280 : 460} onEnd={onEnd} />;
    // purple rectangles moving at full frame rate (css, eased, no steps)
    case 'slide60':
    case 'grow60':
      return <div className={`ot-${outro} ot-${inn ? 'in' : 'out'}`} key={phase} data-end />;
    // from the name: a front spreading out of the rail's name (NameFlow)
    case 'name-box':
      return <NameFlow key={phase} shape={outro} phase={phase} onEnd={onEnd} />;
    case 'name-rings':
    case 'name-square':
    case 'name-diamond':
    case 'name-spiral':
    case 'name-radar':
    case 'name-blocks':
    case 'name-shock':
      return inn ? <NameFlow key="in" shape={outro} phase={phase} onEnd={onEnd} /> : <span className="ot-done" key="out" data-end />;
    case 'sweep60':
      return <Flow key={phase} kind={outro} phase={phase} onEnd={onEnd} />;
    case 'front60':
      return inn ? <Flow key="in" kind={outro} phase={phase} onEnd={onEnd} /> : <span className="ot-done" key="out" data-end />;
    case 'bayer':
    case 'adam7':
    case 'scan':
    case 'halftone':
    case 'afterglow':
      return inn ? null : <span className="ot-done" key="out" data-end />;
    case 'front':
    case 'static':
    case 'life':
      return inn ? <Cells kind={outro} onEnd={onEnd} key="in" /> : <span className="ot-done" key="out" data-end />;
    case 'shutter':
      return (
        <div className="ot-bands" key={phase}>
          {range(BANDS).map((i) => (
            <span key={i} style={{ '--i': inn ? i : BANDS - 1 - i } as CSSProperties} {...end(inn ? i === BANDS - 1 : i === 0)} />
          ))}
        </div>
      );
    case 'bar':
      return (
        <div className="ot-bar" key={phase}>
          {range(16).map((i) => (
            <span key={i} style={{ '--i': i } as CSSProperties} {...end(i === 15)} />
          ))}
        </div>
      );
    case 'mod':
      // in: the cells where 4 divides i - g, g = 0..3; out: the same mod 5
      return (
        <div className="ot-mod" key={phase}>
          {range(cells).map((i) => (
            <span key={i} style={{ '--i': inn ? i % 4 : i % 5 } as CSSProperties} {...end(i === (inn ? 3 : 4))} />
          ))}
        </div>
      );
    case 'tear':
      if (inn) return <div className="ot-panel" key="in" data-end />;
      return (
        <div className="ot-tear" key="out">
          {TEAR.map((d, i) => (
            <span key={i} style={{ '--i': d } as CSSProperties} {...end(d === TEAR.length - 1)} />
          ))}
        </div>
      );
    case 'rail':
      return inn ? null : <div className="ot-rail" key="out" data-end />;
    case 'crt':
      return inn ? null : (
        <div className="ot-crt" key="out">
          <span data-end />
          <span />
        </div>
      );
    default:
      // wipe, slash, cut: one panel
      return <div className={`ot-panel ot-${inn ? 'in' : 'out'}`} key={phase} data-end />;
  }
}

// front, static, life: the paper colour in cells over the page, drawn a
// frame at a time on a canvas. each cell is one pixel of a small canvas,
// scaled up without smoothing, so the edges stay hard at any size
type CellKind = 'front' | 'static' | 'life';
const CELL: Record<CellKind, number> = { front: 4, static: 2, life: 8 };

// the 8x8 bayer matrix (ordered dither): the bits of x^y and y, interleaved and reversed
const bayer8 = (x: number, y: number) => {
  const a = (x ^ y) & 7, b = y & 7;
  let v = 0;
  for (let k = 0; k < 3; k++) v = (v << 2) | (((a >> k) & 1) << 1) | ((b >> k) & 1);
  return v;
};

// each frame: which cells are still covered, and how long it holds
type Frame = [on: (i: number) => boolean, ms: number];

function frames(kind: CellKind, cols: number, rows: number, cell: number): Frame[] {
  const n = cols * rows;
  if (kind === 'front') {
    // from the rail's name outward: distance does most of it, the dither
    // grains the edge
    const r = document.querySelector('.rail-name')?.getBoundingClientRect();
    const ox = r && r.width ? (r.left + r.width / 2) / cell : 0;
    const oy = r && r.width ? (r.top + r.height / 2) / cell : 0;
    const far = Math.max(...[[0, 0], [cols, 0], [0, rows], [cols, rows]].map(([x, y]) => Math.hypot(x - ox, y - oy)));
    const t = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const x = i % cols, y = Math.floor(i / cols);
      t[i] = 0.72 * (Math.hypot(x - ox, y - oy) / far) + 0.28 * ((bayer8(x, y) + 0.5) / 64);
    }
    const steps = 14;
    return Array.from({ length: steps + 1 }, (_, f): Frame => [(i) => t[i] >= f / steps, 32]);
  }
  if (kind === 'static') {
    // new noise every frame, thinner each time
    return [1, 0.85, 0.7, 0.55, 0.4, 0.25, 0.12, 0].map((d): Frame => {
      const on = new Uint8Array(n);
      for (let i = 0; i < n; i++) on[i] = Math.random() < d ? 1 : 0;
      return [(i) => on[i] === 1, 45];
    });
  }
  // life: a random soup, then conway's rules a few generations, then what's
  // still alive is thinned out
  let g = new Uint8Array(n);
  for (let i = 0; i < n; i++) g[i] = Math.random() < 0.5 ? 1 : 0;
  const snap = (a: Uint8Array): Frame => [(i) => a[i] === 1, 70];
  const out: Frame[] = [[() => true, 60], snap(g)];
  for (let gen = 0; gen < 9; gen++) {
    const next = new Uint8Array(n);
    for (let y = 0; y < rows; y++)
      for (let x = 0; x < cols; x++) {
        let k = 0;
        for (let dy = -1; dy <= 1; dy++)
          for (let dx = -1; dx <= 1; dx++) {
            if (!dx && !dy) continue;
            const xx = x + dx, yy = y + dy;
            if (xx >= 0 && yy >= 0 && xx < cols && yy < rows) k += g[yy * cols + xx];
          }
        const i = y * cols + x;
        next[i] = k === 3 || (k === 2 && g[i]) ? 1 : 0;
      }
    g = next;
    out.push(snap(g));
  }
  for (const keep of [0.5, 0.2]) {
    g = g.map((v) => (v && Math.random() < keep ? 1 : 0));
    out.push([((a) => (i: number) => a[i] === 1)(g), 60]);
  }
  out.push([() => false, 0]);
  return out;
}

function Cells({ kind, onEnd }: { kind: CellKind; onEnd: () => void }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current!;
    const dpr = devicePixelRatio || 1;
    const cell = CELL[kind];
    const cols = Math.ceil(innerWidth / cell), rows = Math.ceil(innerHeight / cell);
    canvas.width = Math.round(innerWidth * dpr);
    canvas.height = Math.round(innerHeight * dpr);
    const ctx = canvas.getContext('2d')!;
    const small = document.createElement('canvas');
    small.width = cols;
    small.height = rows;
    const sctx = small.getContext('2d')!;
    // the paper colour as rgb: drawn once, read back
    sctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--void').trim() || '#000';
    sctx.fillRect(0, 0, 1, 1);
    const [r, g, b] = sctx.getImageData(0, 0, 1, 1).data;
    const img = sctx.createImageData(cols, rows);
    for (let i = 0; i < cols * rows; i++) img.data.set([r, g, b], i * 4);
    const draw = (on: (i: number) => boolean) => {
      for (let i = 0; i < cols * rows; i++) img.data[i * 4 + 3] = on(i) ? 255 : 0;
      sctx.putImageData(img, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(small, 0, 0, cols * cell * dpr, rows * cell * dpr);
    };
    const list = frames(kind, cols, rows, cell);
    let k = 0;
    let t = 0;
    const step = () => {
      const [on, ms] = list[k++];
      draw(on);
      t = window.setTimeout(k < list.length ? step : onEnd, ms);
    };
    step();
    return () => clearTimeout(t);
  }, []);
  return <canvas className="ot-cells" ref={ref} />;
}

// ---- 60fps outros: driven by requestAnimationFrame, a new frame every paint ----

const ease = (p: number) => p * p * (3 - 2 * p); // smoothstep: eases in and out

// runs `frame(p)` every animation frame for `ms`, p from 0 to 1, then `onEnd`
function useTween(ms: number, frame: (p: number) => void, onEnd: () => void) {
  useEffect(() => {
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / ms);
      frame(ease(p));
      if (p < 1) raf = requestAnimationFrame(tick);
      else onEnd();
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);
}

// a mask that keeps the cells of an 8x8 bayer tile (2px cells) whose level
// is at least k: 0 keeps everything, 64 nothing. built once each
const MASKS: string[] = [];
function levelMask(k: number) {
  if (k <= 0) return 'none';
  if (k >= 64) return 'linear-gradient(#0000, #0000)';
  if (!MASKS[k]) {
    let d = '';
    for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) if (bayer8(x, y) >= k) d += `M${x * 2} ${y * 2}h2v2h-2z`;
    MASKS[k] = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' shape-rendering='crispEdges'%3E%3Cpath d='${d}'/%3E%3C/svg%3E") 0 0 / 16px 16px`;
  }
  return MASKS[k];
}

// steps an element (the boot screen, or its own purple panel) through the
// bayer levels from `from` to `to`
function Levels({ target, from, to, ms, onEnd }: { target?: RefObject<HTMLElement | null>; from: number; to: number; ms: number; onEnd: () => void }) {
  const own = useRef<HTMLDivElement>(null);
  let last = -1;
  useTween(
    ms,
    (p) => {
      const el = target?.current ?? own.current;
      const k = Math.round(from + (to - from) * p);
      if (!el || k === last) return;
      last = k;
      el.style.mask = levelMask(k);
    },
    onEnd,
  );
  return target ? null : <div className="ot-panel" ref={own} style={{ mask: levelMask(from) }} />;
}

// sweep60: a purple bar with a dithered leading edge crosses left to right,
// covering the boot, then carries on off the right edge, uncovering the page.
// front60: the page grows out from the rail's name, its edge grained by the
// dither. both on a canvas of 2px cells
const BAND = 0.3; // how much of the sweep the dithered edge spans
function Flow({ kind, phase, onEnd }: { kind: 'sweep60' | 'front60'; phase: 'wipe' | 'reveal'; onEnd: () => void }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const draw = useRef<(p: number) => void>(() => {});
  useEffect(() => {
    const canvas = ref.current!;
    const dpr = devicePixelRatio || 1;
    const cell = 2;
    const cols = Math.ceil(innerWidth / cell), rows = Math.ceil(innerHeight / cell), n = cols * rows;
    canvas.width = Math.round(innerWidth * dpr);
    canvas.height = Math.round(innerHeight * dpr);
    const ctx = canvas.getContext('2d')!;
    const small = document.createElement('canvas');
    small.width = cols;
    small.height = rows;
    const sctx = small.getContext('2d')!;
    sctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue(kind === 'sweep60' ? '--purple' : '--void').trim() || '#000';
    sctx.fillRect(0, 0, 1, 1);
    const [r, g, b] = sctx.getImageData(0, 0, 1, 1).data;
    const img = sctx.createImageData(cols, rows);
    for (let i = 0; i < n; i++) img.data.set([r, g, b], i * 4);
    // each cell's threshold: when p passes it, the cell changes over
    const t = new Float32Array(n);
    if (kind === 'sweep60') {
      for (let i = 0; i < n; i++) t[i] = ((i % cols) / cols) * (1 - BAND) + BAND * ((bayer8(i % cols, Math.floor(i / cols)) + 0.5) / 64);
    } else {
      const rr = document.querySelector('.rail-name')?.getBoundingClientRect();
      const ox = rr && rr.width ? (rr.left + rr.width / 2) / cell : 0;
      const oy = rr && rr.width ? (rr.top + rr.height / 2) / cell : 0;
      const far = Math.max(...[[0, 0], [cols, 0], [0, rows], [cols, rows]].map(([x, y]) => Math.hypot(x - ox, y - oy)));
      for (let i = 0; i < n; i++) {
        const x = i % cols, y = Math.floor(i / cols);
        t[i] = (Math.hypot(x - ox, y - oy) / far) * (1 - BAND) + BAND * ((bayer8(x, y) + 0.5) / 64);
      }
    }
    // sweep: covered once p passes it on the way in, uncovered once p passes
    // it on the way out. front: covered (the boot's black) until p passes it
    const covered = kind === 'front60' || phase === 'reveal' ? (i: number, p: number) => t[i] >= p : (i: number, p: number) => t[i] < p;
    draw.current = (p) => {
      for (let i = 0; i < n; i++) img.data[i * 4 + 3] = covered(i, p) ? 255 : 0;
      sctx.putImageData(img, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(small, 0, 0, cols * cell * dpr, rows * cell * dpr);
    };
    draw.current(0);
  }, []);
  // front60 is one pass, in the wipe
  const ms = kind === 'front60' ? 650 : phase === 'wipe' ? 320 : 420;
  useTween(ms, (p) => draw.current(p), onEnd);
  return <canvas className="ot-cells" ref={ref} />;
}

// ---- from the name: fronts that spread out of the rail's name ----
// every cell gets a threshold t in [0, 1) from its place relative to the
// name (the shape), grained by the bayer matrix; as p runs 0 to 1 the cells
// change over in t's order. all but box take the boot's black off the page;
// shock carries a purple band at the front; box is purple and comes back
type NameShape = 'name-rings' | 'name-square' | 'name-diamond' | 'name-spiral' | 'name-radar' | 'name-blocks' | 'name-shock' | 'name-box';

// raw order for a cell dx, dy cells from the name (w, h: the screen in cells);
// normalised afterwards, so only the order matters
const SHAPES: Record<NameShape, (dx: number, dy: number, w: number, h: number) => number> = {
  'name-rings': (dx, dy) => { const d = Math.hypot(dx, dy); return d + 6 * ((d / 24) % 1); },
  'name-square': (dx, dy) => Math.max(Math.abs(dx), Math.abs(dy)),
  'name-diamond': (dx, dy) => Math.abs(dx) + Math.abs(dy),
  'name-spiral': (dx, dy, w, h) => (Math.atan2(dy, dx) + Math.PI) / (2 * Math.PI) * Math.hypot(w, h) * 0.35 + Math.hypot(dx, dy),
  'name-radar': (dx, dy) => (Math.atan2(dx, -dy) + Math.PI * 2) % (Math.PI * 2),
  'name-blocks': (dx, dy) => Math.hypot(dx, dy) * (0.8 + Math.random() * 0.4),
  'name-shock': (dx, dy) => Math.hypot(dx, dy),
  // a rectangle the shape of the screen
  'name-box': (dx, dy, w, h) => Math.max(Math.abs(dx) / w, Math.abs(dy) / h),
};
const NAME_CELL: Partial<Record<NameShape, number>> = { 'name-blocks': 24 };
const NAME_GRAIN: Partial<Record<NameShape, number>> = { 'name-blocks': 0, 'name-radar': 0.12, 'name-box': 0.18 };
const NAME_MS: Partial<Record<NameShape, number>> = { 'name-shock': 820, 'name-radar': 700, 'name-spiral': 750 };
const SHOCK = 0.14; // the purple band's width, in t

function NameFlow({ shape, phase, onEnd }: { shape: NameShape; phase: 'wipe' | 'reveal'; onEnd: () => void }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const draw = useRef<(p: number) => void>(() => {});
  useEffect(() => {
    const canvas = ref.current!;
    const dpr = devicePixelRatio || 1;
    const cell = NAME_CELL[shape] ?? 2;
    const cols = Math.ceil(innerWidth / cell), rows = Math.ceil(innerHeight / cell), n = cols * rows;
    canvas.width = Math.round(innerWidth * dpr);
    canvas.height = Math.round(innerHeight * dpr);
    const ctx = canvas.getContext('2d')!;
    const small = document.createElement('canvas');
    small.width = cols;
    small.height = rows;
    const sctx = small.getContext('2d')!;
    // the two colours as rgb: drawn once, read back
    const css = getComputedStyle(document.documentElement);
    const rgb = (v: string) => {
      sctx.fillStyle = css.getPropertyValue(v).trim() || '#000';
      sctx.fillRect(0, 0, 1, 1);
      return [...sctx.getImageData(0, 0, 1, 1).data.slice(0, 3)];
    };
    const ink = rgb(shape === 'name-box' ? '--purple' : '--void');
    const purple = rgb('--purple');
    // the name's centre, in cells (the screen's top left if it isn't there)
    const r = document.querySelector('.rail-name')?.getBoundingClientRect();
    const ox = r && r.width ? (r.left + r.width / 2) / cell : 0;
    const oy = r && r.width ? (r.top + r.height / 2) / cell : 0;
    const f = SHAPES[shape];
    const t = new Float32Array(n);
    let max = 0;
    for (let i = 0; i < n; i++) {
      t[i] = f(i % cols - ox, Math.floor(i / cols) - oy, cols, rows);
      if (t[i] > max) max = t[i];
    }
    const g = NAME_GRAIN[shape] ?? 0.25;
    for (let i = 0; i < n; i++) t[i] = (t[i] / (max || 1)) * (1 - g) * 0.999 + g * ((bayer8(i % cols, Math.floor(i / cols)) + 0.5) / 64);
    const img = sctx.createImageData(cols, rows);
    const d = img.data;
    const put = (i: number, c: number[] | null) => {
      if (!c) return void (d[i * 4 + 3] = 0);
      d[i * 4] = c[0];
      d[i * 4 + 1] = c[1];
      d[i * 4 + 2] = c[2];
      d[i * 4 + 3] = 255;
    };
    draw.current = (p) => {
      if (shape === 'name-shock') {
        // page inside the band, purple in it, black beyond
        const q = p * (1 + SHOCK);
        for (let i = 0; i < n; i++) put(i, t[i] < q - SHOCK ? null : t[i] < q ? purple : ink);
      } else if (shape === 'name-box') {
        // in: purple grows out to cover the boot; out: it pulls back into the name
        for (let i = 0; i < n; i++) put(i, (phase === 'wipe' ? t[i] < p : t[i] < 1 - p) ? ink : null);
      } else {
        for (let i = 0; i < n; i++) put(i, t[i] >= p ? ink : null);
      }
      sctx.putImageData(img, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(small, 0, 0, cols * cell * dpr, rows * cell * dpr);
    };
    draw.current(0);
  }, []);
  const ms = shape === 'name-box' ? (phase === 'wipe' ? 340 : 440) : NAME_MS[shape] ?? 650;
  useTween(ms, (p) => draw.current(p), onEnd);
  return <canvas className="ot-cells" ref={ref} />;
}
