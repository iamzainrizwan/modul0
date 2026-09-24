import { useEffect, useId, useLayoutEffect, useRef, useState, type CSSProperties } from 'react';
import type { Area, Project } from '../data/profile';
import { inline } from '../data/inline';

// content strings may carry [text](url) links
const html = (s: string) => ({ __html: inline(s) });

// featured projects show everything; the archive is filterable by area and
// each card expands for its details. switching filters snaps the grid to the
// new set and wipes the cards in (css, .card-in), and holds the scroll still
// so the filter bar stays under the pointer.

const PREVIEW = 3;

function Status({ p }: { p: Project }) {
  return (
    <span className={`status status-${p.status}`}>
      <span className="status-dot" aria-hidden="true" />
      {p.statusText}
    </span>
  );
}

function Stack({ items }: { items: string[] }) {
  return (
    <ul className="stack" aria-label="Built with">
      {items.map((s) => (
        <li key={s}>{s}</li>
      ))}
    </ul>
  );
}

function Featured({ p }: { p: Project }) {
  const [all, setAll] = useState(false);
  const listId = useId();
  const extra = p.details.length - PREVIEW;
  return (
    <article className="feature" id={`project-${p.slug}`}>
      <header className="feature-head">
        <div>
          <h3 className="feature-name">{p.name}</h3>
          <p className="feature-tagline">{p.tagline}</p>
        </div>
        <div className="feature-meta">
          <Status p={p} />
          <span className="year">{p.year}</span>
        </div>
      </header>
      <p className="feature-summary" dangerouslySetInnerHTML={html(p.summary)} />
      <ul className="details" id={listId}>
        {p.details.slice(0, PREVIEW).map((d) => (
          <li key={d} dangerouslySetInnerHTML={html(d)} />
        ))}
        {/* the extra lines print one after another; collapsing is instant */}
        {all &&
          p.details.slice(PREVIEW).map((d, i) => (
            <li key={d} className="print" style={{ '--i': i } as CSSProperties} dangerouslySetInnerHTML={html(d)} />
          ))}
      </ul>
      <footer className="feature-foot">
        <Stack items={p.stack} />
        <div className="feature-actions">
          {extra > 0 && (
            <button type="button" className="text-btn" aria-expanded={all} aria-controls={listId} onClick={() => setAll(!all)}>
              {all ? 'Show less' : `Show ${extra} more`}
            </button>
          )}
          {p.repo && (
            <a className="text-btn" href={p.repo}>
              Source on GitHub
            </a>
          )}
        </div>
      </footer>
    </article>
  );
}

function ArchiveCard({ p, i, wipe }: { p: Project; i: number; wipe: boolean }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const expandable = p.details.length > 0;
  return (
    <li className={wipe ? 'card card-in' : 'card'} id={`project-${p.slug}`} style={{ '--i': i } as CSSProperties}>
      <div className="card-head">
        <h4 className="card-name">{p.name}</h4>
        <span className="year">{p.year}</span>
      </div>
      <p className="card-tagline">{p.tagline}</p>
      <p className="card-summary" dangerouslySetInnerHTML={html(p.summary)} />
      {open && (
        <ul id={id} className="details details-small">
          {p.details.map((d, i) => (
            <li key={d} className="print" style={{ '--i': i } as CSSProperties} dangerouslySetInnerHTML={html(d)} />
          ))}
        </ul>
      )}
      <div className="card-foot">
        <span className="card-stack">{p.stack.join(', ')}</span>
        {(expandable || p.repo || p.context) && (
          <span className="card-actions">
            {expandable && (
              <button type="button" className="text-btn" aria-expanded={open} aria-controls={id} onClick={() => setOpen(!open)}>
                {open ? 'Less' : 'Details'}
              </button>
            )}
            {p.repo && (
              <a className="text-btn" href={p.repo} aria-label={`${p.name} source on GitHub`}>
                Source
              </a>
            )}
            {p.context && <span className="card-context">{p.context}</span>}
          </span>
        )}
      </div>
    </li>
  );
}

export default function ProjectExplorer({ featured, archive, areas }: { featured: Project[]; archive: Project[]; areas: Area[] }) {
  const [area, setArea] = useState<Area | 'All'>('All');
  // bumped on every filter change: remounts the cards so the wipe replays
  const [round, setRound] = useState(0);
  const saved = useRef<number | null>(null);
  const spacer = useRef<HTMLDivElement>(null);
  const pick = (a: Area | 'All') => {
    if (a === area) return;
    saved.current = scrollY;
    setArea(a);
    setRound((r) => r + 1);
  };

  // a shorter list would pull the page up under the pointer. before paint, pad
  // the bottom just enough to keep the old scroll position, then restore it.
  useLayoutEffect(() => {
    const y = saved.current;
    const pad = spacer.current;
    if (y === null || !pad) return;
    saved.current = null;
    pad.style.height = '0px';
    const short = y + innerHeight - document.documentElement.scrollHeight;
    pad.style.height = `${Math.max(0, short)}px`;
    scrollTo({ top: y, behavior: 'instant' });
  }, [round]);
  const shown = area === 'All' ? archive : archive.filter((p) => p.areas.includes(area));
  const count = (a: Area) => archive.filter((p) => p.areas.includes(a)).length;

  // a link to an archived project (#project-sherpa) must find it even if a filter hides it
  useEffect(() => {
    const reveal = () => {
      const slug = location.hash.replace('#project-', '');
      const target = archive.find((p) => p.slug === slug);
      if (!target || shown.includes(target)) return;
      pick('All');
      requestAnimationFrame(() => document.getElementById(`project-${slug}`)?.scrollIntoView());
    };
    addEventListener('hashchange', reveal);
    return () => removeEventListener('hashchange', reveal);
  }, [archive, shown]);

  return (
    <div className="explorer">
      <div className="features">
        {featured.map((p) => (
          <Featured key={p.slug} p={p} />
        ))}
      </div>

      <div className="archive">
        <div className="archive-head">
          <h3 className="sub-h">Everything else</h3>
          <div className="filters" role="group" aria-label="Filter projects by area">
            {(['All', ...areas] as const).map((a) => {
              const n = a === 'All' ? archive.length : count(a);
              if (!n) return null;
              return (
                <button key={a} type="button" className="chip" aria-pressed={area === a} onClick={() => pick(a)}>
                  {a} <span className="chip-n">{n}</span>
                </button>
              );
            })}
          </div>
        </div>
        <ul className="cards">
          {shown.map((p, i) => (
            <ArchiveCard key={`${round}-${p.slug}`} p={p} i={i} wipe={round > 0} />
          ))}
        </ul>
        <div ref={spacer} aria-hidden="true" />
      </div>
    </div>
  );
}
