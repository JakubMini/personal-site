// The fleet architecture figure (components/FleetFigure.astro): one release,
// step by step, a packet travelling each step's link. Both drawings (wide and
// tall) follow the same step; CSS shows one. Autoplay only while on screen and
// the tab is visible; under reduced motion nothing moves on its own, and the
// step dots still work.

import { gsap } from 'gsap';
import { LAYOUTS, STEPS, type LayoutName, type Pt } from '../data/fleet';

const HOLD = 2.0; // seconds a step stays up after its packet arrives
const HOLD_STILL = 2.8; // for a step with no packet

interface Drawing {
  svg: SVGSVGElement;
  edges: Record<string, Pt[]>;
  packets: SVGGElement[];
}

export function initFleet(root: HTMLElement) {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const drawings: Drawing[] = [...root.querySelectorAll<SVGSVGElement>('svg[data-layout]')].map((svg) => ({
    svg,
    edges: LAYOUTS[svg.dataset.layout as LayoutName].edges,
    packets: [...svg.querySelectorAll<SVGGElement>('[data-packet]')],
  }));
  const dots = [...root.querySelectorAll<HTMLButtonElement>('[data-step]')];
  const playBtn = root.querySelector<HTMLButtonElement>('[data-play]')!;
  const caption = root.querySelector('[data-caption]')!;

  let step = 0;
  let playing = !reduce;
  const onScreen = new Set<Element>();
  let pending: gsap.core.Tween[] = [];

  root.classList.add('is-live');
  const kill = () => {
    pending.forEach((t) => t.kill());
    pending = [];
  };
  const running = () => playing && onScreen.size > 0 && !document.hidden;
  const along = (pts: readonly Pt[], k: number): Pt => [pts[0][0] + (pts[1][0] - pts[0][0]) * k, pts[0][1] + (pts[1][1] - pts[0][1]) * k];
  const all = (selector: string) => root.querySelectorAll(selector);

  // A packet along a link, its tag centred on the dot's path. Returns its travel time.
  const send = (g: SVGGElement, pts: readonly Pt[], label: string, animate: boolean) => {
    const t = g.querySelector('text')!;
    t.textContent = label;
    const w = t.getComputedTextLength() + 20;
    const r = g.querySelector('rect')!;
    r.setAttribute('width', w.toFixed(1));
    r.setAttribute('x', (-w / 2).toFixed(1));
    t.setAttribute('x', '0');
    const place = (k: number) => {
      const [x, y] = along(pts, k);
      g.setAttribute('transform', `translate(${x.toFixed(1)} ${y.toFixed(1)})`);
    };
    if (!animate) {
      place(0.5);
      gsap.set(g, { opacity: 1 });
      return 0;
    }
    const p = { k: 0 };
    const dur = 1.1;
    place(0);
    pending.push(
      gsap.fromTo(g, { opacity: 0 }, { opacity: 1, duration: 0.15 }),
      gsap.to(p, { k: 1, duration: dur, ease: 'power1.inOut', onUpdate: () => place(p.k) }),
      gsap.to(g, { opacity: 0, duration: 0.25, delay: dur + 0.6 }),
    );
    return dur;
  };

  const show = (animate: boolean) => {
    kill();
    const s = STEPS[step];
    all('.is-on').forEach((el) => el.classList.remove('is-on'));
    s.on.forEach((id) => all(`[data-block="${id}"]`).forEach((el) => el.classList.add('is-on')));
    [s.edge, s.also?.edge].forEach((e) => e && all(`[data-edge="${e}"]`).forEach((el) => el.classList.add('is-on')));
    // The ECU's flash: the bootloader takes the image, then the application is new.
    all('[data-slot="boot"]').forEach((el) => el.classList.toggle('is-on', s.slot === 'boot'));
    all('[data-slot="app"]').forEach((el) => el.classList.toggle('is-new', s.slot === 'app' || step === STEPS.length - 1));

    caption.textContent = s.caption;
    dots.forEach((d, i) => d.setAttribute('aria-current', String(i === step)));
    playBtn.textContent = playing ? 'Pause' : 'Play';

    let dur = 0;
    for (const { edges, packets } of drawings) {
      gsap.set(packets, { opacity: 0 });
      if (s.edge && s.packet) dur = send(packets[0], edges[s.edge], s.packet, animate && !reduce);
      if (s.also) send(packets[1], edges[s.also.edge], s.also.packet, animate && !reduce);
    }
    if (animate) pending.push(gsap.delayedCall(dur ? dur + HOLD : HOLD_STILL, advance));
  };

  function advance() {
    step = (step + 1) % STEPS.length;
    show(running());
  }

  dots.forEach((d, i) =>
    d.addEventListener('click', () => {
      step = i;
      playing = false;
      show(false);
    }),
  );
  playBtn.addEventListener('click', () => {
    playing = !playing;
    show(running());
  });

  // The drawing CSS hides never intersects, so this follows the one on show.
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (e.isIntersecting) onScreen.add(e.target);
      else onScreen.delete(e.target);
    }
    show(running());
  });
  drawings.forEach(({ svg }) => io.observe(svg));
  document.addEventListener('visibilitychange', () => show(running()));

  show(false);
}
