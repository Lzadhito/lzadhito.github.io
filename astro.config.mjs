// @ts-check
import sitemap from '@astrojs/sitemap';
import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://lzadhito.github.io',
  integrations: [sitemap({ filter: (page) => !page.includes('/write/') })],
});
