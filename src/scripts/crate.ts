// The vinyls page's turntable (pages/vinyls.astro). The record on the right
// stays put while the crate scrolls past it. The needle drops on the first
// record, the label changes to whichever record is under the stylus, and the
// arm tracks from the rim to the lead-out across the list. The record turns at
// 33⅓ while it is on screen and the tab is visible, and a scroll gives it a
// flick. On phones the record sits in the hero and a now-playing bar with a
// small record sticks to the top over the list.
//
// Under reduced motion the record is drawn still, with the collection's label
// and the arm at rest, and nothing follows the scroll.

import { GROOVES, vinyl, type Label } from './vinyl';

const PHONE = '(max-width: 599px)';
const RPM = 100 / 3;
const SPEED = (RPM / 60) * Math.PI * 2; // radians a second

// The tonearm, in the disc's 1000-unit box (the SVG in vinyls.astro): the
// pivot top right, the record's centre and radius, the arm's length from the
// pivot to the stylus, and where the arm rests when nothing plays.
const PIVOT = { x: 860, y: 140 };
const CENTRE = { x: 420, y: 560 };
const RADIUS = 380;
const ARM = 600;
const REST = (95 * Math.PI) / 180;

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

// The arm's angle with its stylus on the groove at radius `rho`: the stylus is
// where that groove is `ARM` from the pivot (the law of cosines), on the side
// the arm swings in from.
function armAngle(rho: number) {
  const d = Math.hypot(PIVOT.x - CENTRE.x, PIVOT.y - CENTRE.y);
  const phi = Math.acos(clamp((d * d + rho * rho - ARM * ARM) / (2 * d * rho), -1, 1));
  const theta = Math.atan2(PIVOT.y - CENTRE.y, PIVOT.x - CENTRE.x) + phi;
  const sx = CENTRE.x + rho * Math.cos(theta);
  const sy = CENTRE.y + rho * Math.sin(theta);
  return Math.atan2(sy - PIVOT.y, sx - PIVOT.x);
}

// From the first groove to the lead-out, as a share of the list scrolled.
const armAt = (progress: number) => armAngle(lerp(RADIUS * GROOVES.out, RADIUS * GROOVES.in, progress));

function sized(canvas: HTMLCanvasElement) {
  const css = canvas.clientWidth || 2;
  canvas.width = canvas.height = Math.round(css * Math.min(2, devicePixelRatio || 1));
  return css;
}

export function crate() {
  const player = document.querySelector<HTMLElement>('[data-player]');
  const list = document.querySelector<HTMLElement>('[data-crate]');
  if (!player || !list) return;
  const disc = player.querySelector<HTMLElement>('.disc')!;
  const canvas = disc.querySelector<HTMLCanvasElement>('[data-record]')!;
  const arm = disc.querySelector<SVGGElement>('[data-arm]')!;
  const readout = player.querySelector<HTMLElement>('[data-readout]')!;
  const bar = document.querySelector<HTMLElement>('[data-now-bar]');
  const mini = bar?.querySelector<HTMLCanvasElement>('[data-record-mini]') ?? null;
  const nowTitle = bar?.querySelector<HTMLElement>('[data-now-title]') ?? null;
  const rows = [...list.querySelectorAll<HTMLElement>('.rec')];
  const collection: Label = JSON.parse(canvas.dataset.label!);
  const labelOf = (i: number): Label =>
    i < 0
      ? collection
      : { top: rows[i].dataset.artist!, bottom: rows[i].dataset.title!, monogram: rows[i].dataset.year!, scheme: rows[i].dataset.scheme as Label['scheme'] };
  const moving = matchMedia('(prefers-reduced-motion: no-preference)').matches;
  const phone = matchMedia(PHONE);
  const setArm = (rad: number) => arm.setAttribute('transform', `rotate(${(rad * 180) / Math.PI})`);

  let record: ReturnType<typeof vinyl> | null = null;
  let small: ReturnType<typeof vinyl> | null = null;
  let radius = 1; // CSS px, for the scroll's flick
  let turn = 0.4;
  let shown = 1; // the label's opacity, for the swap
  let fade: 'out' | 'in' | null = null;
  let current = -1; // -1 is the collection's own label
  let target = -1;
  let armA = REST;
  let armTarget = REST;

  const render = () => {
    record?.frame({ turn, cut: 1, label: shown });
    small?.frame({ turn, cut: 1, label: shown });
    setArm(armA);
  };

  const build = () => {
    radius = sized(canvas) / 2;
    record = vinyl(canvas, labelOf(current));
    if (mini) {
      sized(mini);
      small = vinyl(mini, labelOf(current));
    }
    disc.classList.add('is-live');
    render();
  };
  // The label's green is the page's, so it is lettered again on a change of theme.
  document.addEventListener('themechange', () => {
    record?.setLabel(labelOf(current));
    small?.setLabel(labelOf(current));
    render();
  });

  const setCurrent = (i: number) => {
    if (i === target) return;
    target = i;
    fade = 'out';
    rows.forEach((row, k) => row.classList.toggle('is-playing', k === i));
    readout.textContent = `${i < 0 ? '—' : String(i + 1).padStart(2, '0')} / ${rows.length}`;
    if (nowTitle) nowTitle.textContent = i < 0 ? collection.bottom : `${rows[i].dataset.title} · ${rows[i].dataset.artist}`;
  };

  // The line the stylus reads along, in the viewport: under the record's
  // rim on wide screens, just under the now-playing bar on phones.
  const needle = () => {
    if (phone.matches && bar) return bar.getBoundingClientRect().bottom + 40;
    const d = disc.getBoundingClientRect();
    return d.top + d.height * 0.7;
  };

  const update = () => {
    const ny = needle();
    const first = rows[0].getBoundingClientRect();
    const last = rows[rows.length - 1].getBoundingClientRect();
    if (ny < first.top) {
      setCurrent(-1);
      armTarget = REST;
      return;
    }
    armTarget = armAt(clamp((ny - first.top) / (last.bottom - first.top), 0, 1));
    let i = rows.findIndex((row) => {
      const b = row.getBoundingClientRect();
      return ny >= b.top && ny < b.bottom;
    });
    if (i < 0) i = ny >= last.bottom ? rows.length - 1 : target;
    setCurrent(i);
  };

  if (!moving) {
    document.fonts.ready.then(build);
    return;
  }

  // Frames run only while a record is on screen and the tab is visible.
  let raf = 0;
  let last = 0;
  const onScreen = new Set<Element>();
  const frame = (now: number) => {
    raf = 0;
    if (!onScreen.size || document.hidden) return;
    const dt = Math.min(0.1, (now - last) / 1000);
    last = now;
    turn += SPEED * dt;
    armA += (armTarget - armA) * Math.min(1, dt * 7);
    if (fade === 'out') {
      shown = Math.max(0, shown - dt / 0.14);
      if (shown === 0) {
        current = target;
        record?.setLabel(labelOf(current));
        small?.setLabel(labelOf(current));
        fade = 'in';
      }
    } else if (fade === 'in') {
      shown = Math.min(1, shown + dt / 0.22);
      if (shown === 1) fade = null;
    }
    render();
    raf = requestAnimationFrame(frame);
  };
  const run = () => {
    if (raf || !onScreen.size || document.hidden) return;
    last = performance.now();
    raf = requestAnimationFrame(frame);
  };
  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) e.isIntersecting ? onScreen.add(e.target) : onScreen.delete(e.target);
      run();
    },
    { rootMargin: '160px 0px' },
  );
  io.observe(disc);
  if (bar) io.observe(bar);
  document.addEventListener('visibilitychange', run);

  let lastY = scrollY;
  addEventListener(
    'scroll',
    () => {
      turn += ((scrollY - lastY) / radius) * 0.5; // the flick
      lastY = scrollY;
      update();
    },
    { passive: true },
  );
  let timer = 0;
  addEventListener('resize', () => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      build();
      update();
    }, 150);
  });

  // The label is lettered in the page's fonts, so it waits for them.
  document.fonts.ready.then(() => {
    build();
    update();
  });
}

crate();
