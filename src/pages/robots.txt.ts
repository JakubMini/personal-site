import type { APIRoute } from 'astro';

// Built from `site` in astro.config.mjs, so the domain is set in one place.
export const GET: APIRoute = ({ site }) =>
  new Response(
    ['User-agent: *', 'Allow: /', '', `Sitemap: ${new URL('sitemap.xml', site).href}`, ''].join('\n'),
  );
