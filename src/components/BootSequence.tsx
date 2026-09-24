import { useEffect, useRef, useState } from 'react';

// first-visit boot animation. the page is fully rendered underneath. an inline
// script in Site.astro sets html[data-boot=pending] before first paint, which
// shows a static black cover (no flash of the page); this component swaps it
// for the animated overlay and removes the attribute when done.
//
// sequence: log lines resolve [ .... ] -> [  r0  ] while a square progress
// bar fills, the name types itself (typo included, then fixed), and a solid
// purple panel dithers in over it, then dithers away to reveal the site
// (css px-in / px-out). any key/tap skips straight to the wipe.

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
  { text: 'indexing 3 featured projects, 11 archived', short: 'index 14 projects', status: 'ok' },
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

export default function BootSequence() {
  const [active, setActive] = useState(false);
  const [shown, setShown] = useState(0);
  const [resolved, setResolved] = useState(0);
  const [typed, setTyped] = useState('');
  const [phase, setPhase] = useState<Phase>('log');
  const timers = useRef<number[]>([]);
  const skipped = useRef(false);

  const later = (fn: () => void, ms: number) => timers.current.push(window.setTimeout(fn, ms));

  const toWipe = () => {
    if (skipped.current) return;
    skipped.current = true;
    timers.current.forEach(clearTimeout);
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
    setActive(true);

    LINES.forEach((_, i) => {
      later(() => setShown(i + 1), LINE_STEP * (i + 1));
      later(() => setResolved(i + 1), LINE_STEP * (i + 1) + RESOLVE);
    });

    let t = LINE_STEP * LINES.length + RESOLVE + 260;
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

  if (!active || phase === 'done') return null;

  const filled = Math.round((resolved / LINES.length) * BAR);

  return (
    <div className="bootseq" role="presentation" aria-hidden="true" data-phase={phase}>
      {phase !== 'reveal' && (
        <div className="boot-screen">
          <div className="boot-log">
            <div className="boot-head">
              <span>modul0 bootloader</span>
              <span>v0.4</span>
            </div>
            {LINES.slice(0, shown).map((l, i) => {
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
      {(phase === 'wipe' || phase === 'reveal') && (
        <div
          className={phase === 'wipe' ? 'boot-wipe boot-wipe-in' : 'boot-wipe boot-wipe-out'}
          onAnimationEnd={() => {
            if (phase === 'wipe') {
              // page shows through as soon as the black screen is gone
              document.documentElement.removeAttribute('data-boot');
              setPhase('reveal');
            } else setPhase('done');
          }}
        />
      )}
    </div>
  );
}
