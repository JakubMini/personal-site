// The fleet architecture figure (components/FleetFigure.astro): one release,
// step by step, a packet travelling each step's link. Autoplay only while on
// screen and the tab is visible; under reduced motion nothing moves on its
// own, and the step dots still work.

import { gsap } from 'gsap';
import { EDGES, STEPS, type Pt } from '../data/fleet';

const HOLD = 2.0; // seconds a step stays up after its packet arrives
const HOLD_STILL = 2.8; // for a step with no packet

export function initFleet(root: HTMLElement) {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const svg = root.querySelector('svg')!;
  const packets = [...root.querySelectorAll<SVGGElement>('[data-packet]')];
  const dots = [...root.querySelectorAll<HTMLButtonElement>('[data-step]')];
  const playBtn = root.querySelector<HTMLButtonElement>('[data-play]')!;
  const caption = root.querySelector('[data-caption]')!;

  let step = 0;
  let playing = !reduce;
  let onScreen = false;
  let pending: gsap.core.Tween[] = [];

  root.classList.add('is-live');
  const kill = () => {
    pending.forEach((t) => t.kill());
    pending = [];
  };
  const running = () => playing && onScreen && !document.hidden;
  const along = (pts: readonly Pt[], k: number): Pt => [pts[0][0] + (pts[1][0] - pts[0][0]) * k, pts[0][1] + (pts[1][1] - pts[0][1]) * k];

  // A packet along a link, its tag centred on the dot's path. Returns its travel time.
  const send = (g: SVGGElement, edge: string, label: string, animate: boolean) => {
    const pts = EDGES[edge];
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
    svg.querySelectorAll('.is-on').forEach((el) => el.classList.remove('is-on'));
    s.on.forEach((id) => svg.querySelector(`[data-block="${id}"]`)?.classList.add('is-on'));
    [s.edge, s.also?.edge].forEach((e) => e && svg.querySelector(`[data-edge="${e}"]`)?.classList.add('is-on'));
    // The ECU's flash: the bootloader takes the image, then the application is new.
    svg.querySelector('[data-slot="boot"]')!.classList.toggle('is-on', s.slot === 'boot');
    svg.querySelector('[data-slot="app"]')!.classList.toggle('is-new', s.slot === 'app' || step === STEPS.length - 1);

    caption.textContent = s.caption;
    dots.forEach((d, i) => d.setAttribute('aria-current', String(i === step)));
    playBtn.textContent = playing ? 'Pause' : 'Play';

    gsap.set(packets, { opacity: 0 });
    let dur = 0;
    if (s.edge && s.packet) dur = send(packets[0], s.edge, s.packet, animate && !reduce);
    if (s.also) send(packets[1], s.also.edge, s.also.packet, animate && !reduce);
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

  const io = new IntersectionObserver(([e]) => {
    onScreen = e.isIntersecting;
    show(running());
  });
  io.observe(svg);
  document.addEventListener('visibilitychange', () => show(running()));

  show(false);
}
