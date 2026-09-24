import { useEffect, useRef, useState } from 'react';

// file-tree style nav for the home page; highlights the section in view.
// an item with children is a folder: on desktop it only opens while one of its
// sections is current. an item with href is a page, not a home section.
type Item = { id: string; label: string; href?: string; children?: Item[] };

export default function SectionNav({ items, base, initial }: { items: Item[]; base: string; initial?: string }) {
  const [current, setCurrent] = useState(initial ?? items[0]?.id);
  const nav = useRef<HTMLElement>(null);

  // on narrow screens the nav scrolls sideways; keep the active item in view
  useEffect(() => {
    const el = nav.current;
    const link = el?.querySelector<HTMLElement>('[aria-current]');
    if (!el || !link || el.scrollWidth <= el.clientWidth) return;
    const left = link.offsetLeft - el.clientWidth / 2 + link.offsetWidth / 2;
    el.scrollTo({ left, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  }, [current]);

  useEffect(() => {
    const sections = items.flatMap((i) => i.children ?? [i]).map((i) => document.getElementById(i.id)).filter(Boolean) as HTMLElement[];
    if (!sections.length) return;
    const atBottom = () => innerHeight + scrollY >= document.documentElement.scrollHeight - 4;
    const io = new IntersectionObserver(
      (entries) => {
        if (atBottom()) return setCurrent(sections[sections.length - 1].id);
        const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setCurrent(visible[0].target.id);
      },
      { rootMargin: '-20% 0px -65% 0px' },
    );
    sections.forEach((s) => io.observe(s));
    // the last section is too short to reach the trigger line, so claim it at the bottom
    const onScroll = () => {
      if (atBottom()) setCurrent(sections[sections.length - 1].id);
    };
    addEventListener('scroll', onScroll, { passive: true });
    return () => {
      io.disconnect();
      removeEventListener('scroll', onScroll);
    };
  }, [items]);

  const label = (l: string) => (
    <>
      {l.replace(/\/$/, '')}
      {l.endsWith('/') && <span className="tree-slash">/</span>}
    </>
  );
  const link = (i: Item) => (
    <li key={i.id}>
      <a href={i.href ?? `${base}#${i.id}`} aria-current={current === i.id ? (i.href ? 'page' : 'location') : undefined}>
        {label(i.label)}
      </a>
    </li>
  );

  return (
    <nav className="tree" aria-label="Sections" ref={nav}>
      <span className="tree-root">~/</span>
      <ul>
        {items.map((i) =>
          i.children ? (
            <li key={i.id} className={`tree-group${i.children.some((c) => c.id === current) ? ' is-open' : ''}`}>
              <a className="tree-dir" href={`${base}#${i.children[0].id}`}>
                {label(i.label)}
              </a>
              <ul>{i.children.map(link)}</ul>
            </li>
          ) : (
            link(i)
          ),
        )}
      </ul>
    </nav>
  );
}
