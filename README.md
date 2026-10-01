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
| The intro on load | `src/scripts/intro.ts`, `src/components/Intro.astro`; the record is `src/scripts/vinyl.ts` |
| The icon and logo mark | `public/favicon.svg` (also the mark beside the name) |
| The line drawings | `src/components/Machine.astro` |

**Photos.** Put the file in `src/assets/photos/`, import it at the top of
`site.ts`, and set it as that photo's `src`. Astro resizes it at build time.
Until then the slot is a grey box with its caption.

**Looping clips.** A photo can carry a short silent `video` that plays like a
GIF while on screen (paused off screen, in a hidden tab and under reduced
motion), with the photo `src` as its poster. Square, 640px, H.264, no audio:

```bash
ffmpeg -i in.mp4 -an -vf "crop=720:720:0:300,scale=640:640:flags=lanczos,format=yuv420p" -c:v libx264 -preset slow -crf 26 -movflags +faststart src/assets/video/out.mp4
ffmpeg -i src/assets/video/out.mp4 -frames:v 1 -q:v 3 src/assets/photos/out-poster.jpg
```

`crop=w:h:x:y` picks the square; the propeller rig used a 720px square from
y=300 of a 720×1280 phone clip.

**CV.** Put the PDF in `public/` and set `person.cv` to its path. While it is
`null` every CV link is hidden rather than dead.

**Code snippets.** Each chapter and the AI section have a `snippet`: set its
`code`, `lang` and `caption` in `site.ts`. It renders as text, highlighted at
build time by Shiki (bundled with Astro), never as a screenshot. Without `code`
the slot is blank; delete a chapter's `snippet` to remove the slot.

**Stack.** Every item is backed by Jakub's own commits or his CV. Colleagues'
repositories in the same organisations are not claimed.

**Icons.** `public/favicon.svg`, a green vinyl record, is the favicon and the
mark beside the name in the top bar. The home-screen icon is that record on
ink; after changing the SVG, regenerate it:

```bash
node -e "const s=require('sharp');s('public/favicon.svg',{density:288}).resize(144,144).png().toBuffer().then(d=>s({create:{width:180,height:180,channels:4,background:'#0b0f0c'}}).composite([{input:d,left:18,top:18}]).png({compressionLevel:9}).toFile('public/apple-touch-icon.png'))"
```

## Before it goes live

- [ ] Portrait and the five chapter photos
- [ ] The three paper titles and links (`publications` in `site.ts`)
- [ ] Code for the snippet slots, or delete the ones not wanted
- [ ] A CV cut for the public site (no phone number)
- [ ] Rewrite the About draft, then set `about.draft` to `false`
- [ ] Buy `jakubszypicyn.dev` (`site` in `astro.config.mjs` already points at it)
- [ ] A mobile design: below 900px the page is a stacked fallback, not a designed layout

## Hosting

Cloudflare Workers static assets (`wrangler.jsonc`) on Jakub's personal
Cloudflare account, not the Skarper one, deployed by Cloudflare's Git
integration, so no Cloudflare token is stored in GitHub. One-time setup:

1. Cloudflare dashboard → Workers & Pages → Create → Import a repository →
   `JakubMini/personal-site`. The Worker name must stay `personal-site`, as in
   `wrangler.jsonc`, or the build fails.
2. Build command `pnpm build`, deploy command `npx wrangler deploy`,
   production branch `main`.
3. Domain: `jakubszypicyn.dev`, bought with Cloudflare Registrar (no markup on
   renewal). On the Worker: Settings → Domains & Routes → Add custom domain.

After that a push to `main` deploys, and other branches get preview URLs.
By hand: `pnpm build && pnpm wrangler deploy` after `pnpm wrangler login`;
check `pnpm wrangler whoami` shows the personal account first.

## Decisions

- **Astro, static output.** Copy lives in one data file, photos go through its
  image pipeline, and the only JavaScript shipped is the motion script.
- **GSAP (ScrollTrigger, SplitText) for motion.** The standard tool for pinned,
  scroll-scrubbed animation and line-by-line text; free under GSAP's own
  licence, which is not OSI open source. Costs about 48 KB gzipped. CSS
  scroll-driven animations could replace it once pinning and line splitting are
  dependable across browsers without it.
- **three.js for the lean figure** (the 3D render beside the Skarper snippet).
  The standard WebGL library; about 135 KB gzipped, in its own chunk that
  loads only as the figure nears the viewport, so the page's first load is
  unchanged. Without JavaScript or under reduced motion an SVG still drawn at
  build time stands in. Labels are HTML (CSS2DRenderer), so they stay sharp.
- **No motion under `prefers-reduced-motion`, and no timers.** Every tween is
  scrubbed by the scroll or plays once on entry. Without JavaScript the page is
  complete and static.
- **One exception: the intro** (`components/Intro.astro`, `scripts/intro.ts`),
  about three seconds on every load, after wodniack.dev. On an ink cover a
  glossy black record is cut, spins up to 33⅓ rpm and rolls off, uncovering
  the page. It is drawn in a 2D canvas (`scripts/vinyl.ts`), not three.js, so
  the first load carries no extra library. It never locks the scroll: any
  scroll, key, click or touch finishes it at once. It is skipped
  under reduced motion, without JavaScript, and when the address names a
  section (`/#contact`). If the script never arrives, the cover fades by itself
  after six seconds.
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
- The page opens with an intro the mockup doesn't have: a vinyl record is cut
  and spun up on ink, rolls off, and the hero builds in behind it.
- The favicon is a green vinyl record instead of the bike, and the same record
  sits beside the name in the top bar.
