import { defineConfig } from 'astro/config';

// Fully static: `astro build` writes plain files to dist/, which Cloudflare
// serves as Workers static assets (wrangler.jsonc). No adapter, no server.
export default defineConfig({
  // Turns on the canonical link and og:url.
  site: 'https://jakubszypicyn.dev',
  // The 3D lean figure's chunk (three.js) is over Vite's default warning size.
  // It loads only when the figure nears the viewport, so the warning is noise.
  vite: {
    build: { chunkSizeWarningLimit: 600 },
    // Pre-bundle the motion libraries at dev startup. Found lazily (three is
    // only imported when the figure nears the viewport), Vite re-optimises
    // mid-session and the in-flight import fails with "Outdated Optimize Dep".
    optimizeDeps: { include: ['gsap', 'gsap/DrawSVGPlugin', 'gsap/ScrambleTextPlugin', 'gsap/ScrollTrigger', 'gsap/SplitText', 'three', 'three/addons/renderers/CSS2DRenderer.js'] },
  },
});
