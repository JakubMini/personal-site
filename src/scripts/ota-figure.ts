// The OTA figure (components/OtaFigure.astro): a firmware update from CI to the
// bike and the results back, one step after another, on a loop. It runs like
// the fleet figure: both drawings follow the same step, it plays only while on
// screen and the tab is visible, and under reduced motion it doesn't start.

import { gsap } from 'gsap';
import { LAYOUTS, SLOTS, STEPS, type LayoutName, type Pt } from '../data/ota';
import { along } from './figure-path';

const TRAVEL = 1.1; // seconds a packet takes along its path
const FILL = 2.6; // seconds the image takes to stream into staging flash
const HOLD = 1.8; // seconds a step stays up once it's done

interface Drawing {
  paths: Record<string, Pt[]>;
  svg: SVGSVGElement;
  packets: SVGGElement[];
}

// The bike after `step` has run: the image waits in staging, then runs from slot B.
function flashAfter(step: number) {
  let staged = false;
  let swapped = false;
  for (const s of STEPS.slice(0, step + 1)) {
    if (s.flash === 'stage') staged = true;
    if (s.flash === 'swap') [staged, swapped] = [false, true];
  }
  return { staged, swapped };
}

export function initOta(root: HTMLElement) {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const drawings: Drawing[] = [...root.querySelectorAll<SVGSVGElement>('svg[data-layout]')].map((svg) => ({
    svg,
    paths: LAYOUTS[svg.dataset.layout as LayoutName].paths,
    packets: [...svg.querySelectorAll<SVGGElement>('[data-packet]')],
  }));
  const caption = root.querySelector('[data-caption]')!;
  const all = (selector: string) => root.querySelectorAll<SVGElement>(selector);

  let step = 0;
  const onScreen = new Set<Element>();
  let pending: (gsap.core.Tween | gsap.core.Timeline)[] = [];
  root.classList.add('is-live');

  const running = () => onScreen.size > 0 && !document.hidden;
  const kill = () => {
    pending.forEach((t) => t.kill());
    pending = [];
  };

  // Staging flash `k` full (0 to 1), its label following.
  const stageTo = (k: number) => {
    all('[data-stage]').forEach((g) => g.classList.toggle('is-filling', k > 0));
    all('[data-stage-fill]').forEach((r) => r.setAttribute('width', (Number(r.dataset.w) * k).toFixed(1)));
    all('[data-stage-text]').forEach((t) => {
      t.textContent = k > 0 ? `v${SLOTS.next} · ${Math.round(k * 100)}%` : 'staging';
    });
  };
  const setFlash = ({ staged, swapped }: { staged: boolean; swapped: boolean }) => {
    stageTo(staged ? 1 : 0);
    all('[data-slot="a"]').forEach((g) => g.classList.toggle('is-run', !swapped));
    all('[data-slot="b"]').forEach((g) => g.classList.toggle('is-run', swapped));
    all('[data-slot="b"] [data-slot-text]').forEach((t) => {
      t.textContent = `app ${swapped ? SLOTS.next : SLOTS.b}`;
    });
  };

  const show = (animate: boolean) => {
    kill();
    const s = STEPS[step];
    const packets = s.packets ?? [];

    const lit = new Set(s.on);
    for (const p of packets) lit.add(p.path);
    all('[data-part]').forEach((el) => {
      const ids = [el.dataset.part!, ...(el.dataset.also?.split(' ') ?? [])];
      el.classList.toggle('is-on', ids.some((id) => lit.has(id)));
    });
    caption.textContent = s.caption;

    for (const { packets: groups } of drawings) gsap.set(groups, { opacity: 0 });
    if (!animate) {
      setFlash(flashAfter(step));
      return;
    }

    setFlash(step ? flashAfter(step - 1) : flashAfter(-1));
    let end = 0;
    packets.forEach((p, i) => {
      const at = p.delay ?? 0;
      end = Math.max(end, at + TRAVEL);
      for (const { paths, packets: groups } of drawings) {
        const g = groups[i];
        const pts = p.back ? [...paths[p.path]].reverse() : paths[p.path];
        const tag = g.querySelector('rect')!;
        const w = p.label.length * 7.3 + 18;
        tag.setAttribute('x', (-w / 2).toFixed(1));
        tag.setAttribute('width', w.toFixed(1));
        g.querySelector('text')!.textContent = p.label;
        const place = (k: number) => {
          const [x, y] = along(pts, k);
          g.setAttribute('transform', `translate(${x.toFixed(1)} ${y.toFixed(1)})`);
        };
        const run = { k: 0 };
        place(0);
        pending.push(
          gsap
            .timeline({ delay: at })
            .fromTo(g, { opacity: 0 }, { opacity: 1, duration: 0.15 })
            .to(run, { k: 1, duration: TRAVEL, ease: 'power1.inOut', onUpdate: () => place(run.k) }, 0)
            .to(g, { opacity: 0, duration: 0.25 }, TRAVEL + 0.5),
        );
      }
    });

    if (s.flash === 'stage') {
      const k = { v: 0 };
      pending.push(gsap.to(k, { v: 1, duration: FILL, delay: TRAVEL * 0.6, ease: 'none', onUpdate: () => stageTo(k.v) }));
      end = Math.max(end, TRAVEL * 0.6 + FILL);
    }
    if (s.flash === 'swap') {
      pending.push(gsap.delayedCall(1.2, () => setFlash(flashAfter(step))));
      end = Math.max(end, 1.2);
    }

    // A step with nothing moving (the build) stays up a little longer.
    pending.push(gsap.delayedCall(end + HOLD + (packets.length || s.flash ? 0 : 1), advance));
  };

  function advance() {
    step = (step + 1) % STEPS.length;
    show(running());
  }

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
