import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';

// first-visit boot animation. the page is fully rendered underneath. an inline
// script in Site.astro sets html[data-boot=pending] before first paint, which
// shows a static black cover (no flash of the page); this component swaps it
// for the animated overlay and removes the attribute when done. skipped for reduced motion and on
// repeat visits within a session (the inline script decides both).

type Line = { text: string; status?: 'ok' | 'wait' };

const LINES: Line[] = [
  { text: 'modul0 bootloader v0.3' },
  { text: 'identifying user: zain rizwan', status: 'ok' },
  { text: 'mounting /kcl/computer-science/year-2', status: 'ok' },
  { text: 'loading cybersoc/treasurer', status: 'ok' },
  { text: 'connecting to alexandria', status: 'ok' },
  { text: 'starting s3ntry health daemon', status: 'ok' },
  { text: 'ledgr: categoriser', status: 'wait' },
  { text: 'indexing 3 featured projects, 10 more in the archive', status: 'ok' },
];

const STEP = 170; // ms between lines
const HOLD = 650; // name on screen before the reveal

export default function BootSequence() {
  const [active, setActive] = useState(false);
  const [shown, setShown] = useState(0);
  const [phase, setPhase] = useState<'log' | 'name' | 'out'>('log');
  const timers = useRef<number[]>([]);
  const done = useRef(false);

  const finish = () => {
    if (done.current) return;
    done.current = true;
    timers.current.forEach(clearTimeout);
    setPhase('out');
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
    const t = timers.current;
    LINES.forEach((_, i) => t.push(window.setTimeout(() => setShown(i + 1), STEP * (i + 1))));
    const nameAt = STEP * (LINES.length + 1) + 150;
    t.push(window.setTimeout(() => setPhase('name'), nameAt));
    t.push(window.setTimeout(finish, nameAt + HOLD + 700));
    const skip = (e: Event) => {
      if (e instanceof KeyboardEvent && ['Shift', 'Control', 'Alt', 'Meta'].includes(e.key)) return;
      finish();
    };
    window.addEventListener('keydown', skip);
    window.addEventListener('pointerdown', skip);
    return () => {
      t.forEach(clearTimeout);
      window.removeEventListener('keydown', skip);
      window.removeEventListener('pointerdown', skip);
    };
  }, []);

  if (!active) return null;

  return (
    <AnimatePresence onExitComplete={() => document.documentElement.removeAttribute('data-boot')}>
      {phase !== 'out' && (
        <motion.div
          className="bootseq"
          role="presentation"
          aria-hidden="true"
          exit={{ clipPath: 'inset(0 0 100% 0)' }}
          initial={{ clipPath: 'inset(0 0 0% 0)' }}
          transition={{ duration: 0.55, ease: [0.7, 0, 0.2, 1] }}
        >
          <div className="boot-log">
            {LINES.slice(0, shown).map((l, i) => (
              <div key={i} className="boot-line">
                <span>{l.text}</span>
                {l.status && <span className={`boot-status ${l.status}`}>{l.status === 'ok' ? '[  ok  ]' : '[ wait ]'}</span>}
              </div>
            ))}
            {phase === 'log' && <span className="boot-cursor" />}
          </div>
          {/* always rendered so the log doesn't jump when the name appears */}
          <motion.div
            className="boot-name"
            initial={{ opacity: 0, letterSpacing: '0.4em', filter: 'blur(8px)' }}
            animate={phase === 'name' ? { opacity: 1, letterSpacing: '-0.02em', filter: 'blur(0px)' } : undefined}
            transition={{ duration: 0.6, ease: [0.2, 0.8, 0.2, 1] }}
          >
            zain rizwan<span className="boot-cursor" />
          </motion.div>
          <span className="boot-skip">press any key to skip</span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
