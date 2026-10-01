import { defineConfig } from 'astro/config';

// Fully static: `astro build` writes plain files to dist/, which Cloudflare
// serves as Workers static assets (wrangler.jsonc). No adapter, no server.
export default defineConfig({
  // Turns on the canonical link and og:url.
  site: 'https://jakubszypicyn.dev',
});
