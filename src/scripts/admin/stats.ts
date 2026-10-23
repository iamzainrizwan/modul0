// visits: page loads over 7, 30 or 90 days from the worker's hits table
import { call, explain } from './api';
import { say, el, fmt, plural, when } from './ui';

export type Stats = {
  days: number; views: number; hits: number; visitors: number;
  daily: { day: string; hits: number; visitors: number }[];
  pages: { path: string; hits: number; visitors: number }[];
  refs: { ref: string; hits: number }[];
  countries: { country: string; visitors: number }[];
  recent: { at: string; path: string; ref: string | null; country: string | null; visitor: string }[];
};
export let stats: Stats | null = null;
let days = 30;
const box = () => document.querySelector<HTMLElement>('[data-panel=visits]')!;
const $ = <T extends Element>(sel: string) => box().querySelector<T>(sel)!;

// a table's rows; the second column gets a bar, as a share of the biggest
function fill(sel: string, rows: (string | number)[][], empty: string) {
  const body = $<HTMLTableElement>(sel).tBodies[0];
  const max = Math.max(1, ...rows.map((r) => Number(r[1])));
  body.replaceChildren(
    ...rows.map((r) => {
      const tr = el('tr');
      r.forEach((v, i) => {
        const td = el('td', { text: typeof v === 'number' ? fmt(v) : v });
        if (i === 1 && typeof v === 'number') td.style.setProperty('--bar', `${Math.round((v / max) * 100)}%`);
        tr.append(td);
      });
      return tr;
    }),
  );
  if (!rows.length) body.append(el('tr', {}, el('td', { colspan: '3', text: empty })));
}

export async function loadStats() {
  const s = (stats = await call<Stats>(`/admin/stats?days=${days}`));
  $('[data-stats-sum]').textContent =
    `${plural(s.hits, 'page load', 'page loads')} from ${plural(s.visitors, 'visitor', 'visitors')} in ${s.days} days · ${plural(s.views, 'visit', 'visits')} counted all time`;

  // every day in the range, quiet ones too, oldest first
  const byDay = new Map(s.daily.map((d) => [d.day, d]));
  const all = Array.from({ length: s.days }, (_, i) => {
    const day = new Date(Date.now() - (s.days - 1 - i) * 86400 * 1000).toISOString().slice(0, 10);
    return byDay.get(day) ?? { day, hits: 0, visitors: 0 };
  });
  const top = Math.max(1, ...all.map((d) => d.hits));
  const chart = $<HTMLElement>('[data-stats-chart]');
  chart.replaceChildren(
    ...all.map((d) => {
      const label = `${d.day}: ${fmt(d.hits)} loads, ${fmt(d.visitors)} visitors`;
      const bar = el('span', { class: 'stats-bar', title: label });
      bar.style.setProperty('--h', `${(d.hits / top) * 100}%`);
      return bar;
    }),
  );
  chart.setAttribute('role', 'img');
  chart.setAttribute('aria-label', `Page loads a day over ${s.days} days, peak ${fmt(top)}. The table below has each day.`);
  fill('[data-stats-daily]', [...all].reverse().map((d) => [d.day, d.hits, d.visitors]), '');
  fill('[data-stats-pages]', s.pages.map((p) => [p.path, p.hits, p.visitors]), 'No page loads yet.');
  fill('[data-stats-refs]', s.refs.map((r) => [r.ref, r.hits]), 'No referrers yet.');
  fill('[data-stats-countries]', s.countries.map((c) => [c.country, c.visitors]), 'Nothing yet.');
  $('[data-stats-recent-sum]').textContent = `latest ${plural(s.recent.length, 'page load', 'page loads')}`;
  $('[data-stats-recent]').replaceChildren(
    ...s.recent.map((h) =>
      el('li', {},
        el('span', { text: h.path }),
        el('span', { class: 'gb-poster', text: [when(h.at), h.ref && `from ${h.ref}`, h.country, `visitor ${h.visitor}`].filter(Boolean).join(' · ') }),
      ),
    ),
  );
}

document.querySelectorAll<HTMLButtonElement>('[data-panel=visits] [data-days]').forEach((b) =>
  b.addEventListener('click', () => {
    days = Number(b.dataset.days);
    box().querySelectorAll('[data-days]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
    loadStats().catch((e) => say(explain(e), true));
  }),
);
