// the overview tiles: a line on each part of the site, linking to its panel
import { posts } from './posts';
import { files } from './content';
import { messages } from './guestbook';
import { pixels } from './wall';
import { stats } from './stats';
import { parse } from '../frontmatter';
import { el, fmt, plural } from './ui';

export function loadOverview() {
  const drafts = posts.filter((p) => parse(p.text).draft).length;
  const projects = files.get('projects');
  const nProjects = projects ? (JSON.parse(projects.text).featured.length + JSON.parse(projects.text).archive.length) : 0;
  const latest = messages[0];
  const tiles: [string, string, string, string][] = [
    ['#visits', 'visits', stats ? fmt(stats.hits) : '-', stats ? `page loads in ${stats.days} days, ${plural(stats.visitors, 'visitor', 'visitors')}` : 'not loaded'],
    ['#posts', 'posts', fmt(posts.length), drafts ? `${plural(drafts, 'draft', 'drafts')} not live` : 'all live'],
    ['#content/projects', 'projects', fmt(nProjects), 'featured and archived'],
    ['#guestbook', 'messages', fmt(messages.length), latest ? `latest from ${latest.name}, ${latest.created.slice(0, 10)}` : 'none yet'],
    ['#wall', 'wall', fmt(pixels.length), 'recent pixels'],
  ];
  document.querySelector('[data-tiles]')!.replaceChildren(
    ...tiles.map(([href, label, n, detail]) =>
      el('a', { class: 'adm-tile', href }, el('span', { class: 'adm-tile-label', text: label }), el('strong', { text: n }), el('span', { text: detail })),
    ),
  );
}
