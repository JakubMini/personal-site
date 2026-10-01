// The fleet architecture figure (components/FleetFigure.astro): a release out
// to the vehicles and data back, one step after another, on a loop. Both
// drawings (wide and tall) follow the same step; CSS shows one. It plays only
// while on screen and the tab is visible. Under reduced motion it doesn't start
// at all: the still drawing and the steps as a list stay, as without JS.

import { gsap } from 'gsap';
import { ECUS, LAYOUTS, PATH_LIGHTS, STEPS, type EcuId, type LayoutName, type Pt } from '../data/fleet';

const TRAVEL = 1.1; // seconds a packet takes along its path
const FILL = 2.4; // seconds an image takes to stream into a download slot
const HOLD = 1.8; // seconds a step stays up once it's done

interface Drawing {
  svg: SVGSVGElement;
  paths: Record<string, Pt[]>;
  packets: SVGGElement[];
}

// Where each ECU's flash stands: its application is new, its download slot full.
type Flash = Record<EcuId, { app: boolean; dl: boolean }>;

const fresh = (): Flash => ({ ecu1: { app: false, dl: false }, ecu2: { app: false, dl: false } });

// The flash after `step` has run.
function flashAfter(step: number): Flash {
  const f = fresh();
  for (const s of STEPS.slice(0, step + 1)) {
    if (!s.flash) continue;
    const e = f[s.flash.ecu];
    if (s.flash.fill) e.dl = true;
    if (s.flash.swap) Object.assign(e, { app: true, dl: false });
  }
  return f;
}

// A point `k` of the way along a polyline.
function along(pts: readonly Pt[], k: number): Pt {
  const lens = pts.slice(1).map((p, i) => Math.hypot(p[0] - pts[i][0], p[1] - pts[i][1]));
  let left = k * lens.reduce((a, b) => a + b, 0);
  for (let i = 0; i < lens.length; i++) {
    if (left <= lens[i] || i === lens.length - 1) {
      const t = lens[i] ? Math.min(left / lens[i], 1) : 0;
      return [pts[i][0] + (pts[i + 1][0] - pts[i][0]) * t, pts[i][1] + (pts[i + 1][1] - pts[i][1]) * t];
    }
    left -= lens[i];
  }
  return pts[pts.length - 1];
}

export function initFleet(root: HTMLElement) {
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

  // Set a download slot `k` full (0 to 1), its label following.
  const fillTo = (id: EcuId, k: number, version: string) => {
    all(`[data-dl="${id}"]`).forEach((g) => g.classList.toggle('is-filling', k > 0));
    all(`[data-dl="${id}"] [data-dl-fill]`).forEach((r) => r.setAttribute('width', (Number(r.dataset.w) * k).toFixed(1)));
    all(`[data-dl="${id}"] [data-dl-text]`).forEach((t) => {
      t.textContent = k > 0 ? `${version} · ${Math.round(k * 100)}%` : 'download slot';
    });
  };
  const setFlash = (f: Flash) => {
    for (const e of ECUS) {
      all(`[data-app="${e.id}"]`).forEach((g) => g.classList.toggle('is-new', f[e.id].app));
      all(`[data-app="${e.id}"] [data-app-text]`).forEach((t) => {
        t.textContent = f[e.id].app ? `application ${e.to} ✓` : `application ${e.from}`;
      });
      fillTo(e.id, f[e.id].dl ? 1 : 0, e.to);
    }
  };

  const show = (animate: boolean) => {
    kill();
    const s = STEPS[step];
    const packets = s.packets ?? [];

    const lit = new Set(s.on);
    for (const p of packets) (PATH_LIGHTS[p.path] ?? [p.path]).forEach((id) => lit.add(id));
    all('[data-part]').forEach((el) => el.classList.toggle('is-on', lit.has(el.dataset.part!)));
    caption.textContent = s.caption;

    for (const { packets: groups } of drawings) gsap.set(groups, { opacity: 0 });
    if (!animate) {
      setFlash(flashAfter(step));
      return;
    }

    // From where the last step left the flash to where this one leaves it.
    setFlash(step ? flashAfter(step - 1) : fresh());
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

    const f = s.flash;
    if (f) {
      const e = ECUS.find((x) => x.id === f.ecu)!;
      let at = 0;
      if (f.fill) {
        const k = { v: 0 };
        pending.push(gsap.to(k, { v: 1, duration: FILL, delay: TRAVEL * 0.6, ease: 'none', onUpdate: () => fillTo(e.id, k.v, e.to) }));
        at = TRAVEL * 0.6 + FILL;
      }
      if (f.swap) {
        at += f.fill ? 0.4 : 0.8;
        pending.push(gsap.delayedCall(at, () => setFlash(flashAfter(step))));
      }
      end = Math.max(end, at);
    }

    // A step with nothing moving (the build) stays up a little longer.
    pending.push(gsap.delayedCall(end + HOLD + (packets.length || f ? 0 : 1), advance));
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
