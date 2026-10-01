# personal-site

Jakub Szypicyn's personal site: one static page that works as a business card,
with the career told as five machines you scroll past.

## Run it

```bash
pnpm install
pnpm dev        # http://localhost:4321
pnpm build      # static files into dist/
pnpm preview    # build, then serve dist/ the way Cloudflare will (_headers, 404)
```

Node 22.12 or later (`.node-version` pins 24 for Cloudflare's build).

## Where things are

| To change | Edit |
|---|---|
| Any words, links, dates | `src/data/site.ts`; the markup holds no copy |
| Layout | `src/pages/index.astro` |
| Colours, type, spacing | `src/styles/global.css`, tokens at the top |
| Scroll motion | `src/scripts/motion.ts` |
| The line drawings | `src/components/Machine.astro` |

**Photos.** Put the file in `src/assets/photos/`, import it at the top of
`site.ts`, and set it as that photo's `src`. Astro resizes it at build time.
Until then the slot is a grey box with its caption.

**CV.** Put the PDF in `public/` and set `person.cv` to its path. While it is
`null` every CV link is hidden rather than dead.

## Before it goes live

- [ ] Portrait and the five chapter photos
- [ ] The three paper titles and links (`publications` in `site.ts`)
- [ ] A CV cut for the public site (no phone number)
- [ ] Rewrite the About draft, then set `about.draft` to `false`
- [ ] Buy the domain and set `site` in `astro.config.mjs` (turns on canonical and og:url)
- [ ] A mobile design: below 900px the page is a stacked fallback, not a designed layout

## Hosting

Cloudflare Workers static assets (`wrangler.jsonc`), deployed by Cloudflare's
Git integration, so no Cloudflare token is stored in GitHub. One-time setup:

1. Cloudflare dashboard → Workers & Pages → Create → Import a repository →
   `JakubMini/personal-site`.
2. Build command `pnpm build`, deploy command `npx wrangler deploy`,
   production branch `main`.
3. Domain: buy it with Cloudflare Registrar (no markup on renewal), then on the
   Worker: Settings → Domains & Routes → Add custom domain.

After that a push to `main` deploys, and other branches get preview URLs.
By hand: `pnpm build && pnpm wrangler deploy` after `pnpm wrangler login`.

## Decisions

- **Astro, static output.** Copy lives in one data file, photos go through its
  image pipeline, and the only JavaScript shipped is the motion script.
- **GSAP (ScrollTrigger, SplitText) for motion.** The standard tool for pinned,
  scroll-scrubbed animation and line-by-line text; free under GSAP's own
  licence, which is not OSI open source. Costs about 48 KB gzipped. CSS
  scroll-driven animations could replace it once pinning and line splitting are
  dependable across browsers without it.
- **No motion under `prefers-reduced-motion`, and no timers.** Every tween is
  scrubbed by the scroll or plays once on entry. Without JavaScript the page is
  complete and static.
- **Fonts self-hosted** (Funnel Display and Funnel Sans via Fontsource). No
  request to Google, so no visitor data goes to a third party and no consent
  banner is needed.
- **Workers, not Pages.** Cloudflare's current Astro guide deploys static sites
  as Workers static assets; free for static traffic, same custom-domain flow.
- **Public repo.** Nothing in it is secret. Commits use the GitHub noreply
  address, not a work email.

## Design

`design/desktop-mockup-2026-10-01.pdf` is the approved desktop mockup (pages
1–5) and the scroll storyboard (page 6). Page 7, a dark mobile view, is the
earlier direction and superseded. The editable canvas is private:
https://claude.ai/artifact/21hnSUGqUa9g2yCiCzwbzg

Where the build departs from the mockup, on purpose:

- Wheels have faint spokes, otherwise a turning circle looks like a sliding one.
- The cargo vehicle drives right to left, because the drawing faces left.
- A battery's cells fill as it crosses; the drone's rotors spin; the last
  bike's signal arcs appear as it rides.
- Links with nowhere to go yet (CV, papers) are not rendered as links.
