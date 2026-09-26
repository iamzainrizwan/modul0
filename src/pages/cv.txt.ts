// the cv as plain text, for `curl -L modul0.dev/cv.txt` (and the terminal's
// curl). built from profile.ts like everything else, so the same facts;
// links become their text, wrapped to 76 columns.
import type { APIRoute } from 'astro';
import {
  person, links, featured, archive, experience, education, leadership, awards, skills, certifications, type Role,
} from '../data/profile';
import { plain } from '../data/inline';
import { build } from '../data/build';

const W = 76;
const text = (s: string) => plain(s).replace(/ /g, ' ');

// wrap to W columns; the first line starts with `first`, the rest with `rest`
function wrap(s: string, first = '', rest = first) {
  const out: string[] = [];
  let line = first;
  for (const word of text(s).split(/\s+/).filter(Boolean)) {
    if (line.trim() && line.length + word.length + 1 > W) {
      out.push(line.trimEnd());
      line = rest;
    }
    line += (line.trim() && !line.endsWith(' ') ? ' ' : '') + word;
  }
  out.push(line.trimEnd());
  return out.join('\n');
}

// "left ........ right" on one line when it fits
const row = (left: string, right: string) =>
  left.length + right.length + 2 <= W
    ? left + ' '.repeat(W - left.length - right.length) + right
    : `${left}\n${' '.repeat(W - right.length)}${right}`;

const head = (s: string) => `\n\n${s.toUpperCase()}\n${'='.repeat(s.length)}\n`;

const roles = (list: Role[]) =>
  list
    .map((r) => [row(`${text(r.role)}, ${text(r.org)}`, r.when), `  ${r.place}`, ...r.details.map((d) => wrap(d, '  - ', '    '))].join('\n'))
    .join('\n\n');

export const GET: APIRoute = () => {
  const body = [
    person.name.toUpperCase(),
    `${person.study} · ${person.location}`,
    wrap([...links.map((l) => l.text), 'modul0.dev'].join(' · ')),
    '',
    wrap(person.headline),
    '',
    person.intro.map((p) => wrap(p)).join('\n\n'),
    head('Open to work'),
    wrap(person.lookingFor),
    head('Experience'),
    roles(experience),
    head('Education'),
    roles(education),
    head('Leadership and activities'),
    roles(leadership),
    head('Projects'),
    featured
      .map((p) => [row(`${p.name}: ${p.tagline}`, p.year), wrap(p.summary, '  ', '  '), ...(p.repo ? [`  ${p.repo}`] : [])].join('\n'))
      .join('\n\n'),
    '',
    'Also:',
    archive.map((p) => wrap(`${p.name} (${p.year}): ${p.tagline}`, '  - ', '    ')).join('\n'),
    head('Awards'),
    awards.map((a) => wrap(`${text(a.what)} (${a.when}). ${text(a.detail)}.`.replace(/\.\.$/, '.'), '  - ', '    ')).join('\n'),
    head('Skills'),
    skills.map((s) => wrap(s.items.join(', '), `  ${s.group.padEnd(16)}`, ' '.repeat(18))).join('\n'),
    '',
    wrap(`Certifications: ${certifications.map(text).join(', ')}`, '  ', '  '),
    '',
    '-'.repeat(W),
    wrap(`The full version, with links, is at https://modul0.dev/cv/ (built from the same source${build.short ? `, commit ${build.short}` : ''}).`),
    '',
  ].join('\n');
  return new Response(body, { headers: { 'content-type': 'text/plain; charset=utf-8' } });
};
