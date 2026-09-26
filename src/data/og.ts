// share cards: a preview image for every page and post, built at build time
// in the same style as the hand-made home card (public/og.png, which home
// keeps). the text is each page's own title and description, so it says
// nothing profile.ts doesn't.
import { person, featured, archive } from './profile';
import { getPosts } from './buildFs';

export type Card = { slug: string; path: string; title: string; description: string; prompt: string };

const PAGES: Card[] = [
  { slug: 'projects', path: 'projects/', title: 'Projects', prompt: 'ls projects/', description: `Everything ${person.name} has built: ${featured.length} featured projects and ${archive.length} more, filterable by area.` },
  { slug: 'homelab', path: 'homelab/', title: 'Homelab', prompt: 'ssh alexandria', description: 'alexandria: the server my projects run on, the pipeline that deploys to it, and the monitor that watches it.' },
  { slug: 'cv', path: 'cv/', title: 'CV', prompt: 'cat cv.txt', description: `${person.name}: experience, education, leadership, awards and skills.` },
  { slug: 'productions', path: 'productions/', title: 'Productions', prompt: 'cat productions.log', description: `Theatre productions ${person.name} has run lighting and sound for.` },
  { slug: 'writing', path: 'blog/', title: 'Writing', prompt: 'ls blog/', description: `Posts by ${person.name}.` },
  { slug: 'guestbook', path: 'guestbook/', title: 'Guestbook', prompt: 'echo hello', description: "Say hello, leave a review, or tell me what's broken. And a pixel wall." },
];

export async function cards(): Promise<Card[]> {
  const posts = (await getPosts()).map((p) => ({
    slug: `blog-${p.id}`,
    path: `blog/${p.id}/`,
    title: p.data.title,
    description: p.data.description,
    prompt: `cat blog/${p.id}.md`,
  }));
  return [...PAGES, ...posts];
}

// the card for a page (its pathname, base stripped), or none: home keeps og.png
export async function cardFor(pathname: string): Promise<Card | undefined> {
  const base = import.meta.env.BASE_URL;
  const path = pathname.startsWith(base) ? pathname.slice(base.length) : pathname.replace(/^\//, '');
  return (await cards()).find((c) => c.path === path);
}
