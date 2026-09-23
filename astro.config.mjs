import { defineConfig } from 'astro/config';
import react from '@astrojs/react';

export default defineConfig({
  site: process.env.SITE ?? 'https://modul0.dev',
  base: process.env.BASE ?? '/',
  trailingSlash: 'always',
  integrations: [react()],
});
