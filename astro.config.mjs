import { defineConfig } from 'astro/config';
import react from '@astrojs/react';

export default defineConfig({
  site: process.env.SITE ?? 'https://modul0.dev',
  base: process.env.BASE ?? '/',
  trailingSlash: 'always',
  // every internal link is fetched on hover, and the rail's links as soon as
  // they're on screen, so a click swaps pages without waiting on the network
  prefetch: { prefetchAll: true, defaultStrategy: 'hover' },
  integrations: [react()],
  // the guestbook admin grew into /admin/ (stats too); old bookmarks follow it
  redirects: { '/guestbook/admin/': '/admin/' },
});
