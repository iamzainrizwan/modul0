import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { boot, type Fs } from '../scripts/terminal';

// drop-down terminal available on every page: ` toggles it, esc or `exit`
// closes it. the engine is the same one /terminal/ uses.

export default function QuakeTerminal({ fs }: { fs: Fs }) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const engine = useRef<ReturnType<typeof boot>>(null);
  const opener = useRef<Element | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const typing = (e.target as HTMLElement).closest('input, textarea, [contenteditable]');
      if (e.key === '`' && !e.ctrlKey && !e.metaKey && !e.altKey && (!typing || open)) {
        e.preventDefault();
        setOpen((o) => !o);
      } else if (e.key === 'Escape' && open) {
        setOpen(false);
      }
    };
    const onOpen = () => setOpen(true);
    (window as any).__quakeReady = true;
    window.addEventListener('keydown', onKey);
    window.addEventListener('modul0:terminal', onOpen);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('modul0:terminal', onOpen);
    };
  }, [open]);

  useEffect(() => {
    if (open) {
      opener.current = document.activeElement;
      // first open boots the engine; later opens keep the session
      if (!engine.current && root.current) {
        engine.current = boot(root.current, fs, { onExit: () => setOpen(false), scroller: scroller.current! });
      }
      setTimeout(() => engine.current?.focus(), 50);
    } else if (opener.current instanceof HTMLElement) {
      opener.current.focus({ preventScroll: true });
    }
  }, [open]);

  return (
    <AnimatePresence>
      {/* kept mounted so the session survives closing; hidden via motion */}
      <motion.div
        key="quake"
        className="quake"
        role="dialog"
        aria-modal="true"
        aria-label="Terminal"
        aria-hidden={!open}
        inert={!open}
        initial={false}
        animate={open ? { y: 0, visibility: 'visible' } : { y: '-110%', transitionEnd: { visibility: 'hidden' } }}
        transition={{ type: 'spring', stiffness: 380, damping: 38 }}
      >
        <div className="quake-bar">
          <span className="quake-title">zain@modul0: ~</span>
          <span className="quake-hint">
            <kbd>esc</kbd> or <kbd>`</kbd> to close
          </span>
          <button type="button" className="quake-close" onClick={() => setOpen(false)} aria-label="Close terminal">
            ×
          </button>
        </div>
        <div className="quake-scroll" ref={scroller}>
          <div className="terminal" ref={root}>
            <div className="t-output" aria-live="polite" />
            <form className="t-input" hidden>
              <label className="prompt">
                <span className="t-prompt-text">zain@modul0:~$</span>
                <span className="sr-only">command</span>
              </label>
              <input className="t-cmd" type="text" enterKeyHint="send" autoComplete="off" autoCapitalize="off" spellCheck={false} />
            </form>
          </div>
        </div>
      </motion.div>
      {open && (
        <motion.div
          key="scrim"
          className="quake-scrim"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => setOpen(false)}
        />
      )}
    </AnimatePresence>
  );
}
