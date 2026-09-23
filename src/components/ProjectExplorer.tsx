import { useEffect, useId, useState } from 'react';
import { motion, AnimatePresence, LayoutGroup } from 'motion/react';
import type { Area, Project } from '../data/profile';
import { inline } from '../data/inline';

// content strings may carry [text](url) links
const html = (s: string) => ({ __html: inline(s) });

// featured projects show everything; the archive is filterable by area and
// each card expands for its details.

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
        <AnimatePresence initial={false}>
          {all &&
            p.details.slice(PREVIEW).map((d, i) => (
              <motion.li
                key={d}
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto', transition: { delay: i * 0.03 } }}
                exit={{ opacity: 0, height: 0 }}
                dangerouslySetInnerHTML={html(d)}
              />
            ))}
        </AnimatePresence>
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

function ArchiveCard({ p }: { p: Project }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const expandable = p.details.length > 0;
  return (
    <motion.li layout="position" className="card" id={`project-${p.slug}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <div className="card-head">
        <h4 className="card-name">{p.name}</h4>
        <span className="year">{p.year}</span>
      </div>
      <p className="card-tagline">{p.tagline}</p>
      <p className="card-summary" dangerouslySetInnerHTML={html(p.summary)} />
      <AnimatePresence initial={false}>
        {open && (
          <motion.ul
            id={id}
            className="details details-small"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
          >
            {p.details.map((d) => (
              <li key={d} dangerouslySetInnerHTML={html(d)} />
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
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
    </motion.li>
  );
}

export default function ProjectExplorer({ featured, archive, areas }: { featured: Project[]; archive: Project[]; areas: Area[] }) {
  const [area, setArea] = useState<Area | 'All'>('All');
  const shown = area === 'All' ? archive : archive.filter((p) => p.areas.includes(area));
  const count = (a: Area) => archive.filter((p) => p.areas.includes(a)).length;

  // a link to an archived project (#project-sherpa) must find it even if a filter hides it
  useEffect(() => {
    const reveal = () => {
      const slug = location.hash.replace('#project-', '');
      const target = archive.find((p) => p.slug === slug);
      if (!target || shown.includes(target)) return;
      setArea('All');
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
                <button key={a} type="button" className="chip" aria-pressed={area === a} onClick={() => setArea(a)}>
                  {a} <span className="chip-n">{n}</span>
                </button>
              );
            })}
          </div>
        </div>
        <LayoutGroup>
          <motion.ul layout className="cards">
            <AnimatePresence mode="popLayout" initial={false}>
              {shown.map((p) => (
                <ArchiveCard key={p.slug} p={p} />
              ))}
            </AnimatePresence>
          </motion.ul>
        </LayoutGroup>
      </div>
    </div>
  );
}
