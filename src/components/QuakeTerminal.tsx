import { useEffect, useRef, useState } from 'react';
import type { Fs } from '../scripts/terminal';

// drop-down terminal available on every page: ` toggles it, esc or `exit`
// closes it. the engine is the same one /terminal/ uses. it's loaded the
// first time it opens (the engine, the eggs and fs.json, the files), not on
// every page: most visits never open it. hovering a terminal link warms it.

type Terminal = typeof import('../scripts/terminal');
type Eggs = typeof import('../scripts/eggs');
type Loaded = { terminal: Terminal; eggs: Eggs; fs: Fs };

export default function QuakeTerminal({ src }: { src: string }) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const engine = useRef<ReturnType<Terminal['boot']>>(null);
  const loading = useRef<Promise<Loaded> | null>(null);
  const load = () =>
    (loading.current ??= Promise.all([
      import('../scripts/terminal'),
      import('../scripts/eggs'),
      fetch(src).then((r) => (r.ok ? (r.json() as Promise<Fs>) : Promise.reject(r.status))),
    ]).then(([terminal, eggs, fs]) => ({ terminal, eggs, fs })));
  const opener = useRef<Element | null>(null);
  // text to put on the command line once it's open (the page's / key)
  const pending = useRef<string | null>(null);
  // a new easter-egg nudge in the title bar every time it opens (none until
  // the first open, so the server render and hydration agree)
  const [tip, setTip] = useState<[string, string] | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const typing = (e.target as HTMLElement).closest('input, textarea, [contenteditable]');
      const off = document.documentElement.dataset.keys === 'off' && !open;
      if (e.key === '`' && !off && !e.ctrlKey && !e.metaKey && !e.altKey && (!typing || open)) {
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
    const warm = () => void load().catch(() => (loading.current = null));
    (window as any).__quakeReady = true;
    window.addEventListener('keydown', onKey);
    window.addEventListener('modul0:terminal', onOpen);
    window.addEventListener('modul0:warm', warm);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('modul0:terminal', onOpen);
      window.removeEventListener('modul0:warm', warm);
    };
  }, [open]);

  useEffect(() => {
    if (open) {
      opener.current = document.activeElement;
      // first open loads and boots the engine (boot lines 30ms apart, so it's
      // typeable almost at once); later opens keep the session, and the
      // promise is already settled
      load()
        .then(({ terminal, eggs, fs }) => {
          setTip(eggs.tip());
          if (!engine.current && root.current) {
            engine.current = terminal.boot(root.current, fs, { onExit: () => setOpen(false), scroller: scroller.current!, bootDelay: 30 });
          }
          engine.current?.focus();
          if (pending.current !== null) {
            engine.current?.type(pending.current);
            pending.current = null;
          }
        })
        .catch(() => {
          // try again next open; say so now
          loading.current = null;
          const out = root.current?.querySelector('.t-output');
          if (out && !engine.current) out.textContent = "couldn't load the terminal. try again, or open /terminal/.";
        });
    } else {
      // an egg left running would keep the keyboard after the terminal's gone
      engine.current?.stop();
    }
    if (!open && opener.current instanceof HTMLElement) {
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
              <input className="t-cmd" type="text" aria-label="command" enterKeyHint="send" autoComplete="off" autoCapitalize="off" spellCheck={false} />
            </form>
          </div>
        </div>
      </div>
      {open && <div className="quake-scrim" onClick={() => setOpen(false)} />}
    </>
  );
}
