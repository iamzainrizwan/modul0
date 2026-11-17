import { useEffect, useRef, useState, type CSSProperties } from 'react';
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
    if (outroRef.current === 'rail') {
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

  return (
    <div
      className="bootseq"
      role="presentation"
      aria-hidden="true"
      data-phase={phase}
      data-outro={outro}
      style={geo as CSSProperties}
      onAnimationEnd={(e) => {
        if (!(e.target as HTMLElement).hasAttribute('data-end')) return;
        if (phase === 'wipe') {
          // page shows through as soon as the black screen is gone
          document.documentElement.removeAttribute('data-boot');
          setPhase('reveal');
        } else if (phase === 'reveal') setPhase('done');
      }}
    >
      {phase !== 'reveal' && (
        <div className="boot-screen" {...(phase === 'wipe' && (outro === 'rail' || outro === 'crt') ? { 'data-end': '' } : {})}>
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
      {(phase === 'wipe' || phase === 'reveal') && <Hand outro={outro} phase={phase} cells={cells} />}
    </div>
  );
}

// the outro's own elements. rail and crt animate the boot screen itself on
// the way in (it carries data-end then), so they only add something here for
// the reveal. keys differ between phases so every element restarts
const end = (last: boolean) => (last ? { 'data-end': '' } : {});
const BANDS = 8;
const TEAR = [3, 0, 5, 1, 6, 2, 7, 4, 9, 8]; // order the tear's bands go in
const range = (n: number) => Array.from({ length: n }, (_, i) => i);

function Hand({ outro, phase, cells }: { outro: Outro; phase: 'wipe' | 'reveal'; cells: number }) {
  const inn = phase === 'wipe';
  switch (outro) {
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
