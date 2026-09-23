import { getCollection, type CollectionEntry } from 'astro:content';
import { files, projects, whoami, birth } from './fs';

export type Post = { title: string; date: string; description: string; html: string };

export async function getPosts(): Promise<CollectionEntry<'blog'>[]> {
  const posts = await getCollection('blog', (p) => import.meta.env.DEV || !p.data.draft);
  return posts.sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf());
}

export const isoDate = (d: Date) => d.toISOString().slice(0, 10);

// everything the client-side terminal needs, serialised into each page
export async function buildFs() {
  const blog: Record<string, Post> = {};
  for (const p of await getPosts()) {
    blog[`${p.id}.md`] = {
      title: p.data.title,
      date: isoDate(p.data.date),
      description: p.data.description,
      html: p.rendered?.html ?? '',
    };
  }
  return { files, projects, blog, whoami, birth, base: import.meta.env.BASE_URL };
}

export const longDate = (d: Date) =>
  d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
