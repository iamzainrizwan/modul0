import rss from '@astrojs/rss';
import { getPosts } from '../data/buildFs';

export async function GET(context) {
  const posts = await getPosts();
  return rss({
    title: 'modul0',
    description: 'zain rizwan - blog',
    site: new URL(import.meta.env.BASE_URL, context.site),
    items: posts.map((p) => ({
      title: p.data.title,
      pubDate: p.data.date,
      description: p.data.description,
      link: `blog/${p.id}/`,
    })),
  });
}
