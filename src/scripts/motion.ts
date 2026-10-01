// Scroll motion, after the storyboard in the design canvas: a band pins, its
// machine rides across, the year drifts the other way, then the role text
// rises in line by line.
//
// Nothing here runs under prefers-reduced-motion; the page is complete without
// it. Nothing runs on a timer either: every tween is scrubbed by the scroll or
// plays once as its element enters, so an idle or hidden page does no work.
// Two exceptions: the intro (intro.ts), about three seconds on load, and the
// hero's signal chain (signal-chain.ts), which loops, but only while it is on
// screen and the tab is visible.

import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';
import { intro } from './intro';
import { signalChain, type Kind } from './signal-chain';
import { tftpTimeline } from './tftp-figure';

gsap.registerPlugin(ScrollTrigger, SplitText);

// Pinning a band is for wide screens; narrow ones scrub as the band passes.
const WIDE = '(min-width: 900px)';
// Phones get the hero's tall drawing.
const PHONE = '(max-width: 599px)';

// Degrees a wheel turns while its drawing travels `distance` CSS px, so it
// rolls rather than slides. data-wheel is "cx cy r" in viewBox units.
function roll(wheel: SVGGElement, svg: SVGSVGElement, distance: number) {
  const r = Number(wheel.dataset.wheel!.split(' ')[2]);
  const scale = svg.getBoundingClientRect().width / svg.viewBox.baseVal.width;
  return (distance / (2 * Math.PI * r * scale)) * 360;
}

function wheels(tl: gsap.core.Timeline, svg: SVGSVGElement, distance: () => number, sign = 1) {
  svg.querySelectorAll<SVGGElement>('[data-wheel]').forEach((wheel) => {
    const [cx, cy] = wheel.dataset.wheel!.split(' ');
    tl.fromTo(
      wheel,
      { rotation: 0 },
      { rotation: () => sign * roll(wheel, svg, distance()), svgOrigin: `${cx} ${cy}` },
      0,
    );
  });
}

// The hero's signal chain, drawn landed whether or not anything moves, in the
// wide drawing or, on phones, the tall one. It is drawn now, ahead of the
// fonts, so the intro has something to uncover.
const chainCanvas = document.querySelector<HTMLCanvasElement>('[data-signal-chain]');
let chain = chainCanvas ? signalChain(chainCanvas, matchMedia(PHONE).matches ? 'tall' : 'wide') : null;

// With motion the chain plays by itself and loops, on frames that stop while
// it is off screen or the tab is hidden, and the part under the pointer (or
// the last one tapped) gets a loop of its own. Returns the stop, which leaves
// the chain landed.
function heroChain(kind: Kind, moving: boolean) {
  if (!chainCanvas) return;
  if (!chain || chain.kind !== kind) {
    chain?.stop();
    chain = signalChain(chainCanvas, kind);
  }
  if (!moving) return;
  const live = chain;
  const { canvas } = live;
  let onScreen = false;
  let raf = 0;
  let last = 0;
  const frame = (now: number) => {
    raf = 0;
    if (!onScreen || document.hidden) return;
    live.tick(Math.min(0.1, (now - last) / 1000));
    last = now;
    raf = requestAnimationFrame(frame);
  };
  const run = () => {
    if (raf || !onScreen || document.hidden) return;
    last = performance.now();
    raf = requestAnimationFrame(frame);
  };
  const io = new IntersectionObserver(
    ([entry]) => {
      onScreen = entry.isIntersecting;
      run();
    },
    { rootMargin: '120px 0px' },
  );
  io.observe(canvas);
  document.addEventListener('visibilitychange', run);
  const point = (e: PointerEvent) => live.point(e);
  const leave = () => live.point(null);
  canvas.addEventListener('pointermove', point);
  canvas.addEventListener('pointerdown', point);
  canvas.addEventListener('pointerleave', leave);
  return () => {
    cancelAnimationFrame(raf);
    raf = 0;
    io.disconnect();
    document.removeEventListener('visibilitychange', run);
    canvas.removeEventListener('pointermove', point);
    canvas.removeEventListener('pointerdown', point);
    canvas.removeEventListener('pointerleave', leave);
    live.rest();
  };
}

function band(el: HTMLElement, wide: boolean) {
  const svg = el.querySelector<SVGSVGElement>('.machine')!;
  const year = el.querySelector<HTMLElement>('.band-year')!;
  const heading = Number(el.dataset.heading) || 1; // 1 rightwards, -1 leftwards
  const width = () => svg.getBoundingClientRect().width;
  // From just inside one edge to just leaving the other, the way it faces.
  const near = () => -0.6 * width();
  const far = () => el.clientWidth - 0.4 * width();
  const from = () => (heading > 0 ? near() : far());
  const to = () => (heading > 0 ? far() : near());
  const drift = () => window.innerWidth * 0.08;

  gsap.set(svg, { left: 0 });
  const tl = gsap.timeline({
    defaults: { ease: 'none', duration: 1 },
    scrollTrigger: {
      trigger: el,
      start: wide ? 'center center' : 'top bottom',
      end: wide ? () => `+=${window.innerHeight * 0.9}` : 'bottom top',
      pin: wide,
      scrub: 0.5,
      invalidateOnRefresh: true,
    },
  });

  tl.fromTo(svg, { x: from }, { x: to }, 0);
  tl.fromTo(year, { x: () => heading * drift() }, { x: () => -heading * drift() }, 0);
  wheels(tl, svg, () => Math.abs(to() - from()), heading);

  // Per machine: rotors spin and the drone bobs, cells charge, the bike connects.
  const rotors = svg.querySelectorAll('.rotor');
  if (rotors.length) {
    tl.to(rotors, { scaleX: 0.25, transformOrigin: '50% 50%', duration: 1 / 24, repeat: 23, yoyo: true }, 0);
    tl.to(svg, { y: -16, ease: 'sine.inOut', duration: 0.25, repeat: 3, yoyo: true }, 0);
  }
  const cells = svg.querySelectorAll('.cell');
  if (cells.length) {
    // Cells are in column order, two per column: fill a column at a time.
    tl.to(cells, { fillOpacity: 1, duration: 0.08, stagger: (i) => Math.floor(i / 2) * 0.12 }, 0.1);
  }
  const signal = svg.querySelectorAll('.signal');
  if (signal.length) {
    tl.fromTo(signal, { opacity: 0 }, { opacity: 1, duration: 0.1, stagger: 0.12 }, 0.55);
  }
}

function reveals() {
  gsap.utils.toArray<HTMLElement>('[data-lines]').forEach((el) => {
    SplitText.create(el, {
      type: 'lines',
      mask: 'lines',
      linesClass: 'line',
      // The default puts aria-label on the element and hides the lines, and
      // aria-label is not allowed on <p>. Split lines still read as the text.
      aria: 'none',
      autoSplit: true,
      onSplit: (self) =>
        gsap.from(self.lines, {
          yPercent: 120,
          duration: 0.9,
          ease: 'power3.out',
          stagger: 0.08,
          scrollTrigger: { trigger: el, start: 'top 88%', once: true },
        }),
    });
  });

  gsap.utils.toArray<HTMLElement>('[data-rise]').forEach((el) => {
    gsap.from(el, {
      y: 32,
      autoAlpha: 0,
      duration: 0.8,
      ease: 'power2.out',
      scrollTrigger: { trigger: el, start: 'top 92%', once: true },
    });
  });

  // The portrait fades up from slightly zoomed in, settling inside its corners.
  gsap.utils.toArray<HTMLElement>('.photo-portrait img').forEach((img) => {
    gsap.from(img, {
      autoAlpha: 0,
      scale: 1.08,
      duration: 1.6,
      ease: 'power2.out',
      scrollTrigger: { trigger: img, start: 'top 85%', once: true },
    });
  });

  // Stack rows come in from alternating sides.
  gsap.utils.toArray<HTMLElement>('[data-slide]').forEach((el, i) => {
    gsap.from(el, {
      x: i % 2 ? 80 : -80,
      autoAlpha: 0,
      duration: 0.9,
      ease: 'power3.out',
      scrollTrigger: { trigger: el, start: 'top 92%', once: true },
    });
  });
}

// Silent loops ([data-loop] videos) play only while on screen and while the
// tab is visible. Returns the stop, for when motion is switched off.
function loops() {
  const videos = [...document.querySelectorAll<HTMLVideoElement>('video[data-loop]')];
  const onScreen = new Set<HTMLVideoElement>();
  const sync = (v: HTMLVideoElement) => {
    if (onScreen.has(v) && !document.hidden) {
      v.play().catch(() => {}); // a refused autoplay leaves the poster up
    } else {
      v.pause();
    }
  };

  const io = new IntersectionObserver((entries) => {
    for (const e of entries) {
      const v = e.target as HTMLVideoElement;
      if (e.isIntersecting) onScreen.add(v);
      else onScreen.delete(v);
      sync(v);
    }
  });
  videos.forEach((v) => io.observe(v));
  const onVisibility = () => videos.forEach(sync);
  document.addEventListener('visibilitychange', onVisibility);

  return () => {
    io.disconnect();
    document.removeEventListener('visibilitychange', onVisibility);
    videos.forEach((v) => v.pause());
  };
}

// The TFTP bootloader figure: its timeline plays only while the figure is on
// screen. Stopping jumps it to the end, which is the still in the markup. Of
// its two drawings only the one CSS shows gets a timeline; they swap at the
// same width as `wide`, which re-runs this.
function tftpFigures() {
  const shown = [...document.querySelectorAll<SVGSVGElement>('svg[data-tftp-figure]')].filter((svg) => svg.getClientRects().length);
  const timelines = shown.map((svg) => {
    const tl = tftpTimeline(svg);
    ScrollTrigger.create({
      trigger: svg,
      start: 'top 85%',
      end: 'bottom 15%',
      onToggle: (self) => (self.isActive ? tl.play() : tl.pause()),
    });
    return tl;
  });
  return () => timelines.forEach((tl) => tl.progress(1, false).kill());
}

// The 3D lean figure. three.js is a large download, so it loads only as the
// figure nears the viewport; until then (and without motion) the SVG still shows.
function leanFigures() {
  const stops: (() => void)[] = [];
  let stopped = false;
  // Download and parse three.js while the browser is idle after load, so the
  // work does not land mid-scroll; mounting still waits for the figure.
  if (document.querySelector('[data-lean-figure]')) {
    const prefetch = () => void import('./lean-scene-3d').catch(() => {});
    if ('requestIdleCallback' in window) requestIdleCallback(prefetch, { timeout: 4000 });
    else setTimeout(prefetch, 2000);
  }
  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        io.unobserve(e.target);
        const host = e.target as HTMLElement;
        const block = host.closest('.lean-block');
        import('./lean-scene-3d')
          .then(({ mountLeanScene }) => {
            if (stopped) return;
            stops.push(
              mountLeanScene(host, {
                naive: block?.querySelector('[data-read-naive]') ?? null,
                fixed: block?.querySelector('[data-read-fixed]') ?? null,
                lean: block?.querySelector('[data-read-lean]') ?? null,
              }),
            );
          })
          .catch(() => {}); // a failed download leaves the still in place
      }
    },
    { rootMargin: '600px 0px' },
  );
  document.querySelectorAll('[data-lean-figure]').forEach((h) => io.observe(h));
  return () => {
    stopped = true;
    io.disconnect();
    stops.forEach((stop) => stop());
  };
}

// The intro starts now, ahead of the fonts, so its cover can be dismissed
// while they load.
intro();

// Split lines only once the real fonts are in, or the line breaks are wrong.
document.fonts.ready.then(() => {
  // matchMedia only calls back when some condition matches, so one that always
  // does keeps the hero drawn on every screen, moving or not.
  gsap.matchMedia().add(
    { always: '(min-width: 0px)', wide: WIDE, phone: PHONE, moving: '(prefers-reduced-motion: no-preference)' },
    (context) => {
      const { wide, phone, moving } = context.conditions as { wide: boolean; phone: boolean; moving: boolean };
      const chainStop = heroChain(phone ? 'tall' : 'wide', moving);
      if (!moving) return () => chainStop?.();
      // Creation order is refresh order: pins first, so everything below them
      // measures its start with the pin spacing already in place.
      document.querySelectorAll<HTMLElement>('.band').forEach((el) => band(el, wide));
      reveals();
      const stops = [loops(), leanFigures(), tftpFigures()];
      return () => {
        stops.forEach((stop) => stop());
        chainStop?.();
      };
    },
  );
});
