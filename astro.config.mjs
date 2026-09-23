import { defineConfig } from 'astro/config';
import react from '@astrojs/react';

// set SITE to the real domain once there is one (github pages default below)
export default defineConfig({
  site: process.env.SITE ?? 'https://iamzainrizwan.github.io',
  base: process.env.BASE ?? '/',
  trailingSlash: 'always',
  integrations: [react()],
});
