// The fleet architecture figure (components/FleetFigure.astro): flows that
// play step by step, a packet that travels each step's path, and a detail
// panel for any part. Autoplay only while on screen and the tab is visible;
// under reduced motion nothing moves on its own and steps change in place.

import { gsap } from 'gsap';
import { EDGES, FLOWS, OVERVIEW, PART, type Pt } from '../data/fleet';

const HOLD = 1.9; // seconds a step stays up after its packet arrives
const HOLD_STILL = 2.6; // for a step with no packet

export function initFleet(root: HTMLElement) {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = <T extends Element>(sel: string) => root.querySelector<T>(sel)!;
  const svg = $<SVGSVGElement>('svg');
  const packet = $<SVGGElement>('[data-packet]');
  const tabs = [...root.querySelectorAll<HTMLButtonElement>('[data-flow]')];
  const playBtn = $<HTMLButtonElement>('[data-play]');

  let flow = 0;
  let step = 0;
  let playing = !reduce;
  let onScreen = false;
  let pending: gsap.core.Tween | gsap.core.Tween[] | null = null;

  root.classList.add('is-live');

  const kill = () => {
    (Array.isArray(pending) ? pending : pending ? [pending] : []).forEach((t) => t.kill());
    pending = null;
  };

  // The step's path as one polyline, each edge run in its direction.
  const route = (path: [string, 1 | -1][]): Pt[] =>
    path.flatMap(([id, dir], i) => {
      const pts = dir > 0 ? EDGES[id] : [...EDGES[id]].reverse();
      return i ? pts.slice(1) : pts;
    });
  const along = (pts: Pt[], t: number): Pt => {
    const segs = pts.slice(1).map((p, i) => Math.hypot(p[0] - pts[i][0], p[1] - pts[i][1]));
    let d = t * segs.reduce((a, b) => a + b, 0);
    for (let i = 0; i < segs.length; i++) {
      if (d <= segs[i] || i === segs.length - 1) {
        const k = segs[i] ? Math.min(d / segs[i], 1) : 1;
        return [pts[i][0] + (pts[i + 1][0] - pts[i][0]) * k, pts[i][1] + (pts[i + 1][1] - pts[i][1]) * k];
      }
      d -= segs[i];
    }
    return pts[pts.length - 1];
  };

  // On a horizontal line the tag sits left of the dot: in the gap when the
  // packet arrives from the left, in the empty end of the box when it arrives
  // from the right. On a vertical line it sits beside the dot.
  const label = (text: string, pts: Pt[]) => {
    const t = packet.querySelector('text')!;
    t.textContent = text;
    const w = t.getComputedTextLength() + 16;
    const [a, b] = pts.slice(-2);
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    let x = 10;
    let y = -22;
    if (Math.abs(dx) >= Math.abs(dy)) x = -(w + 10);
    else {
      x = b[0] > 1000 ? -(w + 10) : 10;
      y = dy > 0 ? -26 : 8;
    }
    const tag = packet.querySelector('rect')!;
    tag.setAttribute('width', w.toFixed(1));
    tag.setAttribute('x', x.toFixed(1));
    tag.setAttribute('y', y.toFixed(1));
    t.setAttribute('x', (x + w / 2).toFixed(1));
    t.setAttribute('y', (y + 13).toFixed(1));
  };

  const setSlots = (ecu: string | undefined, slot: 'download' | 'swap' | undefined) => {
    svg.querySelectorAll('[data-slot]').forEach((el) => el.classList.remove('is-filling', 'is-new'));
    if (!ecu || !slot) return;
    const g = svg.querySelector(`[data-part="${ecu}"]`)!;
    if (slot === 'download') g.querySelector('[data-slot="download"]')!.classList.add('is-filling');
    if (slot === 'swap') g.querySelector('[data-slot="run"]')!.classList.add('is-new');
  };

  const show = (animate: boolean) => {
    kill();
    const s = FLOWS[flow].steps[step];
    svg.querySelectorAll('.is-on').forEach((el) => el.classList.remove('is-on'));
    s.on.forEach((id) => svg.querySelector(`[data-part="${id}"]`)?.classList.add('is-on'));
    s.path.forEach(([id]) => svg.querySelector(`[data-edge="${id}"]`)?.classList.add('is-on'));
    if (s.path.some(([id]) => id === 'canport-bus' || id.startsWith('bus-'))) svg.querySelector('[data-edge-bus]')?.classList.add('is-on');
    setSlots(s.on.find((id) => PART[id]?.kind === 'ecu'), s.slot);

    $('[data-caption]').textContent = s.caption;
    $('[data-count]').textContent = `${step + 1} / ${FLOWS[flow].steps.length}`;
    tabs.forEach((t, i) => t.setAttribute('aria-selected', String(i === flow)));
    playBtn.textContent = playing ? 'Pause' : 'Play';

    if (!s.path.length) {
      gsap.set(packet, { opacity: 0 });
      if (animate) pending = gsap.delayedCall(HOLD_STILL, advance);
      return;
    }
    const pts = route(s.path);
    label(s.packet ?? '', pts);
    const at = (t: number) => {
      const [x, y] = along(pts, t);
      packet.setAttribute('transform', `translate(${x.toFixed(1)} ${y.toFixed(1)})`);
    };
    if (!animate || reduce) {
      at(1);
      gsap.set(packet, { opacity: 1 });
      if (animate) pending = gsap.delayedCall(HOLD_STILL, advance);
      return;
    }
    const length = pts.slice(1).reduce((a, p, i) => a + Math.hypot(p[0] - pts[i][0], p[1] - pts[i][1]), 0);
    const dur = Math.min(1.4, Math.max(0.5, 0.35 + length * 0.0016));
    const progress = { t: 0 };
    at(0);
    pending = [
      gsap.fromTo(packet, { opacity: 0 }, { opacity: 1, duration: 0.15 }),
      gsap.to(progress, { t: 1, duration: dur, ease: 'power1.inOut', onUpdate: () => at(progress.t) }),
      gsap.delayedCall(dur + HOLD, advance),
    ];
  };

  function advance() {
    const steps = FLOWS[flow].steps.length;
    if (step < steps - 1) step++;
    else {
      flow = (flow + 1) % FLOWS.length;
      step = 0;
    }
    show(running());
  }
  const running = () => playing && onScreen && !document.hidden;

  // Controls.
  tabs.forEach((t, i) =>
    t.addEventListener('click', () => {
      flow = i;
      step = 0;
      playing = !reduce;
      show(running());
    }),
  );
  $('[data-prev]').addEventListener('click', () => {
    playing = false;
    step = (step - 1 + FLOWS[flow].steps.length) % FLOWS[flow].steps.length;
    show(false);
  });
  $('[data-next]').addEventListener('click', () => {
    playing = false;
    step = (step + 1) % FLOWS[flow].steps.length;
    show(false);
  });
  playBtn.addEventListener('click', () => {
    playing = !playing;
    show(running());
  });

  // Details for any part, by pointer or keyboard.
  const select = (id: string) => {
    const p = PART[id];
    svg.querySelectorAll('.is-selected').forEach((el) => el.classList.remove('is-selected'));
    svg.querySelector(`[data-part="${id}"]`)?.classList.add('is-selected');
    $('[data-detail-title]').textContent = p.label;
    $('[data-detail-body]').textContent = p.detail;
    $('[data-detail-tags]').textContent = p.tags.join(' / ');
  };
  svg.querySelectorAll<SVGGElement>('[data-part]').forEach((g) => {
    const id = g.dataset.part!;
    g.addEventListener('click', () => select(id));
    g.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        select(id);
      }
    });
  });
  root.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      svg.querySelectorAll('.is-selected').forEach((el) => el.classList.remove('is-selected'));
      $('[data-detail-title]').textContent = OVERVIEW.title;
      $('[data-detail-body]').textContent = OVERVIEW.detail;
      $('[data-detail-tags]').textContent = '';
    }
  });

  // Run only while on screen and the tab is visible.
  const io = new IntersectionObserver(([e]) => {
    onScreen = e.isIntersecting;
    show(running());
  });
  io.observe(svg);
  document.addEventListener('visibilitychange', () => show(running()));

  show(false);
}
