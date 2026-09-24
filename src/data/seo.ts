// structured data (schema.org json-ld) for search engines. every value comes
// from profile.ts, so the accuracy rule there covers this too.
import { person, links, education, leadership, skills } from './profile';

const abs = (site: URL, path: string) => new URL(path, site).toString();
const base = import.meta.env.BASE_URL;
const linkedin = links.find((l) => l.label === 'LinkedIn')!.href;
const github = links.find((l) => l.label === 'GitHub')!.href;
const email = links.find((l) => l.label === 'Email')!.href;
const kcl = education.find((e) => e.org === "King's College London")!;

export const personId = (site: URL) => abs(site, `${base}#person`);

export function personLd(site: URL) {
  return {
    '@type': 'Person',
    '@id': personId(site),
    name: person.name,
    url: abs(site, base),
    image: abs(site, `${base}og.png`),
    description: person.headline,
    email,
    sameAs: [linkedin, github],
    affiliation: { '@type': 'CollegeOrUniversity', name: kcl.org, url: kcl.url },
    memberOf: leadership
      .filter((l) => l.when.includes('present'))
      .map((l) => ({ '@type': 'Organization', name: l.org })),
    address: { '@type': 'PostalAddress', addressLocality: 'London', addressCountry: 'GB' },
    knowsAbout: skills.filter((g) => ['Languages', 'Infrastructure', 'Security'].includes(g.group)).flatMap((g) => g.items),
  };
}

// home: a profile page about the person, on the modul0 website
export function homeLd(site: URL, title: string) {
  return [
    { '@type': 'ProfilePage', '@id': abs(site, base), url: abs(site, base), name: title, mainEntity: { '@id': personId(site) } },
    personLd(site),
    { '@type': 'WebSite', '@id': abs(site, `${base}#website`), url: abs(site, base), name: 'modul0', author: { '@id': personId(site) }, inLanguage: 'en-GB' },
  ];
}

export function postLd(site: URL, url: string, p: { title: string; description: string; date: Date }) {
  return {
    '@type': 'BlogPosting',
    headline: p.title,
    description: p.description,
    datePublished: p.date.toISOString(),
    url,
    mainEntityOfPage: url,
    image: abs(site, `${base}og.png`),
    author: { '@type': 'Person', '@id': personId(site), name: person.name, url: abs(site, base) },
    inLanguage: 'en-GB',
  };
}

// one <script type="application/ld+json">; "</" is escaped so no string can close the tag
export const ldJson = (data: object | object[]) =>
  JSON.stringify({ '@context': 'https://schema.org', '@graph': Array.isArray(data) ? data : [data] }).replace(/<\//g, '<\\/');
