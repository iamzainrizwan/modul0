import { useEffect, useRef, useState } from 'react';
import { boot, type Fs } from '../scripts/terminal';
import { tip as pickTip } from '../scripts/eggs';

// drop-down terminal available on every page: ` toggles it, esc or `exit`
// closes it. the engine is the same one /terminal/ uses.

export default function QuakeTerminal({ fs }: { fs: Fs }) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const engine = useRef<ReturnType<typeof boot>>(null);
  const opener = useRef<Element | null>(null);
  // text to put on the command line once it's open (the page's / key)
  const pending = useRef<string | null>(null);
  // a new easter-egg nudge in the title bar every time it opens (none until
  // the first open, so the server render and hydration agree)
  const [tip, setTip] = useState<[string, string] | null>(null);

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
    const onOpen = (e: Event) => {
      pending.current = (e as CustomEvent<{ input?: string }>).detail?.input ?? null;
      setOpen(true);
    };
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
      setTip(pickTip());
      opener.current = document.activeElement;
      // first open boots the engine (boot lines 30ms apart, so it's typeable
      // almost at once); later opens keep the session. focus straight away:
      // the input is focusable from the drop's first frame
      if (!engine.current && root.current) {
        engine.current = boot(root.current, fs, { onExit: () => setOpen(false), scroller: scroller.current!, bootDelay: 30 });
      }
      engine.current?.focus();
      if (pending.current !== null) {
        engine.current?.type(pending.current);
        pending.current = null;
      }
    } else if (opener.current instanceof HTMLElement) {
      opener.current.focus({ preventScroll: true });
    }
  }, [open]);

  return (
    <>
      {/* kept mounted so the session survives closing. it loads in a few hard
          frames (the bar fills, then the body lands: .quake.is-open) */}
      <div
        className={open ? 'quake is-open' : 'quake'}
        role="dialog"
        aria-modal="true"
        aria-label="Terminal"
        aria-hidden={!open}
        inert={!open}
      >
        <div className="quake-bar">
          <span className="quake-title">zain@modul0: ~</span>
          {tip && (
            <button type="button" className="quake-tip" onClick={() => engine.current?.run(tip[1])} title={`runs ${tip[1]}`}>
              <span aria-hidden="true">tip: </span>
              {tip[0]}
            </button>
          )}
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
      </div>
      {open && <div className="quake-scrim" onClick={() => setOpen(false)} />}
    </>
  );
}
