// The record pile and the phone's bar (components/SiteNav.astro).
//
// The pile docks in the top-right corner once the top bar has scrolled out of
// sight, the records landing one after another, the bottom one first. Nothing
// opens: the record under the pointer slides out of the pile and stands up to
// face you (global.css, .pile-rec.is-pulled); the pile is split into equal
// bands top to bottom, since a record's edge is thinner than a pointer is
// precise. Focus pulls a record too, and Escape puts it back.
//
// The bar names the section you are in and opens into a sheet of every link;
// while it is open the page behind is inert and does not scroll.
//
// The records are drawn once, in vinyl.ts, and again when the theme changes;
// nothing here runs on a timer or a frame loop.

import { disc, type Disc } from './vinyl';

const root = document.documentElement;
const pile = document.querySelector<HTMLElement>('[data-pile]');
const dock = document.querySelector<HTMLElement>('[data-dock]');
const topbar = document.querySelector<HTMLElement>('.topbar');
const here = pile?.dataset.here ?? 'main';
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
const pointer = matchMedia('(hover: hover) and (min-width: 900px)');

// ---- Where you are ------------------------------------------------------------

// On the main page, the last section whose top has passed a line 30% down the
// window, and Contact once the page is at its end; elsewhere, the page itself.
const sections = Array.from(document.querySelectorAll<HTMLElement>('main section[id], footer#contact'));
function current(): string | null {
  if (here !== 'main') return here;
  if (innerHeight + scrollY >= root.scrollHeight - 4) return 'contact';
  let id: string | null = null;
  for (const s of sections) if (s.getBoundingClientRect().top <= innerHeight * 0.3) id = s.id;
  return id;
}

const listeners: ((id: string | null) => void)[] = [];
let shown: string | null | undefined;
let queued = false;
function whereabouts() {
  queued = false;
  const id = current();
  if (id === shown) return;
  shown = id;
  listeners.forEach((fn) => fn(id));
}
addEventListener('scroll', () => {
  if (!queued) {
    queued = true;
    requestAnimationFrame(whereabouts);
  }
}, { passive: true });
addEventListener('resize', whereabouts);

// Draws a canvas's record at its layout size; skips one that is not laid out.
function draw(canvas: HTMLCanvasElement, labelSize?: number) {
  if (!canvas.offsetWidth) return false;
  disc(canvas, JSON.parse(canvas.dataset.disc ?? '{"lacquer":"black","scheme":"green"}') as Disc, labelSize);
  return true;
}
const whenIdle = (fn: () => void) => ('requestIdleCallback' in window ? requestIdleCallback(fn, { timeout: 1500 }) : setTimeout(fn, 200));

// ---- The pile -----------------------------------------------------------------

if (pile && topbar) {
  const hit = pile.querySelector<HTMLElement>('.pile-hit')!;
  const recs = Array.from(pile.querySelectorAll<HTMLElement>('.pile-rec')).map((li) => ({
    li,
    link: li.querySelector('a')!,
    canvas: li.querySelector('canvas')!,
  }));
  let docked = false;
  let pulled: (typeof recs)[number] | null = null;
  let landing = 0;
  let closing = 0;
  let drawn = false;

  const paint = () => {
    drawn = recs.every((r) => draw(r.canvas));
  };
  const pull = (rec: typeof pulled) => {
    if (rec === pulled) return;
    pulled = rec;
    recs.forEach((r) => r.li.classList.toggle('is-pulled', r === rec));
  };
  const close = (now = false) => {
    clearTimeout(closing);
    closing = window.setTimeout(() => pull(null), now ? 0 : 300);
  };
  const setDocked = (on: boolean) => {
    if (on === docked) return;
    docked = on;
    pile.inert = !on;
    pile.classList.toggle('is-docked', on);
    if (on) {
      if (!drawn) paint();
      pile.classList.add('is-landing');
      clearTimeout(landing);
      landing = window.setTimeout(() => pile.classList.remove('is-landing'), 900);
    } else {
      close(true);
    }
  };

  // Docked once the top bar's bottom edge has left the top of the window.
  new IntersectionObserver(([e]) => setDocked(!e.isIntersecting && e.boundingClientRect.bottom <= 0)).observe(topbar);

  listeners.push((id) => recs.forEach((r) => r.li.classList.toggle('is-current', r.link.dataset.id === id)));

  const at = (y: number) => {
    const box = hit.getBoundingClientRect();
    const k = Math.floor(((y - box.top) / box.height) * recs.length);
    return recs[Math.max(0, Math.min(recs.length - 1, k))];
  };
  hit.addEventListener('pointermove', (e) => {
    clearTimeout(closing);
    pull(at(e.clientY));
  });
  hit.addEventListener('click', (e) => at(e.clientY).link.click());
  pile.addEventListener('pointerenter', () => clearTimeout(closing));
  pile.addEventListener('pointerleave', () => close());
  pile.addEventListener('focusin', (e) => {
    const t = e.target as HTMLElement;
    if (!t.matches(':focus-visible')) return;
    clearTimeout(closing);
    pull(recs.find((r) => r.link === t) ?? null);
  });
  pile.addEventListener('focusout', (e) => {
    if (!pile.contains(e.relatedTarget as Node)) close(true);
  });
  pile.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    close(true);
    (document.activeElement as HTMLElement | null)?.blur();
  });
  // A record played spins while the page goes there.
  recs.forEach((r) => {
    r.link.addEventListener('click', () => {
      r.canvas.classList.remove('is-spinning');
      void r.canvas.offsetWidth;
      r.canvas.classList.add('is-spinning');
      close();
    });
    r.canvas.addEventListener('animationend', () => r.canvas.classList.remove('is-spinning'));
  });

  document.fonts.ready.then(() => whenIdle(paint));
  document.addEventListener('themechange', () => drawn && paint());
  pointer.addEventListener('change', () => pointer.matches && !drawn && docked && paint());
}

// ---- The phone's bar and its sheet ------------------------------------------

if (dock) {
  const bar = dock.querySelector<HTMLButtonElement>('[data-dock-bar]')!;
  const inner = dock.querySelector<HTMLElement>('[data-dock-inner]')!;
  const scrim = dock.querySelector<HTMLElement>('[data-dock-scrim]')!;
  const pill = dock.querySelector<HTMLElement>('[data-dock-pill]')!;
  const name = dock.querySelector<HTMLElement>('[data-dock-name]')!;
  const mini = dock.querySelector<HTMLCanvasElement>('.dock-mini')!;
  const rows = Array.from(dock.querySelectorAll<HTMLAnchorElement>('[data-id]'));
  const tiles = Array.from(dock.querySelectorAll<HTMLCanvasElement>('.dock-art canvas'));
  let open = false;
  let tilesDrawn = false;

  // The sheet's width, then its height for that width, capped below the top.
  const measure = () => {
    dock.style.setProperty('--open-w', `${Math.min(innerWidth - 16, 560)}px`);
    dock.style.setProperty('--open-h', `${Math.min(innerHeight - 72, inner.scrollHeight + 57)}px`);
  };
  const setOpen = (on: boolean) => {
    open = on;
    if (on) {
      measure();
      if (!tilesDrawn) tilesDrawn = tiles.every((c) => draw(c, 0.36));
    }
    dock.classList.toggle('is-open', on);
    root.classList.toggle('dock-open', on);
    bar.setAttribute('aria-expanded', String(on));
    // Everything but the sheet is out of reach while it is open. The pile is
    // left alone: it keeps its own inert, and on a touch screen it is hidden.
    for (const el of Array.from(document.body.children)) {
      if (el !== dock && el !== pile && el instanceof HTMLElement && el.tagName !== 'SCRIPT') el.inert = on;
    }
  };

  listeners.push((id) => {
    const row = rows.find((a) => a.dataset.id === id);
    rows.forEach((a) => a.classList.toggle('is-current', a === row));
    const track = row?.querySelector('.dock-n, .dock-sleeve')?.textContent?.trim() ?? '';
    const label = row?.lastElementChild?.textContent?.trim() ?? '';
    pill.hidden = !row;
    pill.textContent = track;
    name.textContent = row ? label : 'Menu';
    bar.setAttribute('aria-label', row ? `Menu, now at ${track} ${label}` : 'Menu');
    if (!reduced.matches) {
      name.classList.remove('is-new');
      void name.offsetWidth;
      name.classList.add('is-new');
    }
  });

  bar.addEventListener('click', () => setOpen(!open));
  scrim.addEventListener('click', () => setOpen(false));
  addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && open) {
      setOpen(false);
      bar.focus();
    }
  });
  // A section of this page: close, then go there. Another page: just go.
  dock.addEventListener('click', (e) => {
    const a = (e.target as HTMLElement).closest<HTMLAnchorElement>('a[href^="#"]');
    if (!a) return;
    e.preventDefault();
    setOpen(false);
    const target = document.getElementById(a.hash.slice(1));
    requestAnimationFrame(() => {
      target?.scrollIntoView({ behavior: reduced.matches ? 'auto' : 'smooth' });
      history.replaceState(null, '', a.hash);
    });
  });
  addEventListener('resize', () => open && measure());

  document.fonts.ready.then(() => whenIdle(() => draw(mini, 0.36)));
}

whereabouts();
