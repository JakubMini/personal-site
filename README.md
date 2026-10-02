# personal-site

Jakub Szypicyn's personal site: a static page that works as a business card,
with the career told as five machines you scroll past, and two pages away
from the desk, the records and the photographs.

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
| Colours, type, spacing | `src/styles/global.css`, tokens at the top; each colour is a light and a dark value |
| Light or dark | `src/scripts/theme.ts` and the switch, `src/components/ThemeToggle.astro`; the surfaces that keep or flip their colours are under Theme in `global.css` |
| Scroll motion | `src/scripts/motion.ts` |
| The intro on load | `src/scripts/intro.ts`, `src/components/Intro.astro`; the record is `src/scripts/vinyl.ts` |
| The hero's signal chain | `src/scripts/signal-chain.ts`; `motion.ts` runs its loop and hands it the pointer |
| The icon and logo mark | `public/favicon.svg` (also the mark beside the name) |
| The line drawings | `src/components/Machine.astro`; wheels and the e-bikes' rear drive are `MachineWheel.astro` and `MachineDrive.astro` |
| The vinyls and photography pages | `src/pages/vinyls.astro` and `photography.astro` on `src/layouts/Hobby.astro`; their copy, records and photos are `vinyls` and `photography` in `site.ts` |
| The vinyls page's turntable | `src/scripts/crate.ts`; the record itself is `vinyl.ts` |

**Photos.** Put the file in `src/assets/photos/`, import it at the top of
`site.ts`, and set it as that photo's `src`. Astro resizes it at build time.
Until then the slot is a grey box with its caption.

**Records** (`vinyls.records`) are the favourites, oldest first, with the
whole shelf's `count` above them. Each has a square `cover` in
`src/assets/covers/`, 480px, taken from the iTunes catalogue at thumbnail
size to identify the record; a photo of the sleeve itself would do as well.

**Photographs** (`photography.photos`) are shown whole, in justified rows at
each photo's own shape, in the order listed; add one by importing it and
adding a line with its alt text and caption. Every row fills the width, the
last one too, so keep the count one that ends on a full row (three or four
to a row on a desktop). A white frame baked into an
export should be cut off first (`sharp(file).trim()`); the files are kept at
about 2000px on the long edge, as Instagram exports them.

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

**Code snippets.** A chapter can have a `snippet`: set its
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
- [ ] Code for the snippet slots, or delete the ones not wanted
- [ ] A CV cut for the public site (no phone number)
- [ ] Places and years for the photographs' captions (`photography.photos`)

## Hosting

Cloudflare Workers static assets (`wrangler.jsonc`) on Jakub's personal
Cloudflare account, not the Skarper one, deployed by Cloudflare's Git
integration, so no Cloudflare token is stored in GitHub. One-time setup:

1. Cloudflare dashboard → Workers & Pages → Create → Import a repository →
   `JakubMini/personal-site`. The Worker name must stay `personal-site`, as in
   `wrangler.jsonc`, or the build fails.
2. Build command `pnpm build`, deploy command `npx wrangler deploy`,
   production branch `main`.
3. Domain: `jakubszypicyn.com`, bought with Cloudflare Registrar (no markup on
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
  complete and static. Three exceptions follow.
- **The intro** (`components/Intro.astro`, `scripts/intro.ts`),
  about three seconds on every load, after wodniack.dev. On an ink cover a
  glossy black record is cut, spins up to 33⅓ rpm and rolls off, uncovering
  the page. It is drawn in a 2D canvas (`scripts/vinyl.ts`), not three.js, so
  the first load carries no extra library. It never locks the scroll: any
  scroll, key, click or touch finishes it at once. It is skipped
  under reduced motion, without JavaScript, and when the address names a
  section (`/#contact`). If the script never arrives, the cover fades by itself
  after six seconds.
- **The hero's signal chain** (`scripts/signal-chain.ts`) is a 2D canvas, no
  library, drawn in the page's own ink, green and paper. A hub motor's phase
  current enters a board, crosses a shunt, climbs the sense lines into an
  amplifier and the MCU, leaves as a train of pulses for the radio, flies off
  the antenna as a packet, hops broker, function and database in the cloud and
  lands in a phone as the chart's newest point. It plays by itself and loops,
  but only while it is on screen and the tab is visible; each run brings one
  new sample and the charts scroll on. The part under the pointer, or the last
  one tapped, gets a small loop of its own: the motor spins, the MCU's pins
  blink, the radio keeps transmitting, the phone's chart goes live. Under
  reduced motion it is drawn landed and still; without JavaScript the band
  stays plain green.
- **The vinyls page's turntable** (`scripts/crate.ts`) is the intro's record
  again, with a label for each record in the crate and a tonearm. It stays
  put while the crate scrolls past: the needle drops on the first record, the
  label changes to the record under the stylus, and the arm tracks from the
  rim to the lead-out across the list. It turns at 33⅓ while on screen and
  the tab is visible, and a scroll gives it a flick. Under reduced motion it
  is drawn still with the collection's label; without JavaScript a plain CSS
  record stands in.
- **The hobbies are pages, not sections.** `/vinyls` and `/photography` are
  linked from the top bar (after the sections, past a hairline), the About
  paragraph and the colophon, so the main page's scroll is unchanged. Photography links the Instagram feed; the page is the edit.
- **Dark mode is the same three colours the other way up.** Every colour
  token is a `light-dark()` pair: `--paper` is the page and `--ink` what is
  drawn on it, and on the dark page they swap. Green stays green but goes
  deeper on ink (`#1cb35a` for `#2ff27c`), easier on the eyes across a hero.
  The green surfaces pin `color-scheme: light`, so ink stays on green, and the
  surfaces that are ink with paper on them (the last Journey band, the vinyls
  page's top bar and deck) pin `color-scheme: dark`, so on the dark page they
  are simply the page. The page follows the system until the switch in the
  top bar is pressed; that choice is kept in `localStorage` and put back
  before the first paint, and a choice that matches the system is dropped so
  the page follows it again. The code snippets carry both syntax palettes
  (Shiki's dual themes), the figures draw with the tokens, the hero's chain
  and the record's label read the green, and the 3D lean figure reads its
  colours when it mounts (a light bike on a dark road, on ink) and is built
  again when the theme changes. A product shot with its paper baked in is
  turned down a little on ink. The intro's cover and the dashboard's window
  keep their own colours.
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

- The machines are drawn in more detail than the mockup's outlines: laced
  wheels with tyres that have depth (spokes show a wheel rolling rather than
  sliding), a strapped battery and gimbal on the drone, a drivetrain and a
  rear hub drive on the e-bikes, straps and a BMS on the battery pack, and a
  cockpit with pedals on the cargo quad.
- The cargo vehicle drives right to left, because the drawing faces left.
- A battery's cells fill as it crosses; the drone's rotors spin; the last
  bike's signal arcs appear as it rides.
- Links with nowhere to go yet (CV, papers) are not rendered as links.
- The page opens with an intro the mockup doesn't have: a vinyl record is cut
  and spun up on ink, rolls off, and the hero builds in behind it.
- The favicon is a green vinyl record instead of the bike, and the same record
  sits beside the name in the top bar.
- The hero's bike is replaced by a signal chain that loops on its own, from a
  hub motor over a circuit board and the cloud to the app. The bike keeps its
  place in the Journey bands.
- Two pages the mockup does not have, `/vinyls` and `/photography`, in the
  same language: the vinyls page's hero is the site's one ink hero, the
  record's home from the intro.

Narrow screens have layouts of their own (`global.css`, Narrow screens), not
in the mockup:

- **Tablets, 600–899px:** the desktop's twelve columns with wider spans. The
  hero facts sit two by two and the portrait beside the lead. Role photos sit
  beside their text, stack rows run in three columns and the degrees side by
  side.
- **Phones, under 600px:** one column. The name, Contact and the light or
  dark switch share the top line, with the sections as a three-column index
  under them.
- **The hero chain** has a tall drawing under 600px, the chain running down
  the page at phone size with every part legible. Tablets get the wide
  drawing at their width.
- **The TFTP, fleet and OTA figures** are drawn twice, wide and tall
  (`TftpFigure.astro`, `data/fleet.ts`, `data/ota.ts`), and CSS shows the
  tall drawing under 900px. In the tall TFTP figure the board sits under the lab PC, the
  links run down between them, and the log scrolls in a ten-line window.
- **The dashboard screenshots** (Skarper, 2026) are of a local copy of the
  platform on its own ports, loaded with demo data: `DEMO-` serials,
  example.com riders, laps of a park. Never the hosted project.
- **The vinyls page** under 900px puts the hero text, the record and the facts
  on one ink band, and a now-playing bar with a small record sticks to the
  top while the crate scrolls; on phones each record's number sits under its
  sleeve. The photographs run one to a row.
- **Code** swipes sideways on touch screens, and the hint reads "tap to
  scroll".
- Above 1440px, the hero name and the band labels line up with the centred
  column.
