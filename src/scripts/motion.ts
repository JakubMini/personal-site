// Scroll motion, after the storyboard in the design canvas: a band pins, its
// machine rides across, the year drifts the other way, then the role text
// rises in line by line.
//
// Nothing here runs under prefers-reduced-motion; the page is complete without
// it. Nothing runs on a timer either: every tween is scrubbed by the scroll or
// plays once as its element enters, so an idle or hidden page does no work.

import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';
import { animateLeanFigure } from './lean-figure';

gsap.registerPlugin(ScrollTrigger, SplitText);

// Pinning a band is for wide screens; narrow ones scrub as the band passes.
const WIDE = '(min-width: 900px)';

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

function heroBike() {
  const svg = document.querySelector<SVGSVGElement>('.hero-bike');
  if (!svg) return;
  const road = svg.parentElement!;
  // It sits 12% in from the right; this carries it just past the edge.
  const travel = () => road.clientWidth * 0.12 + svg.getBoundingClientRect().width;

  const tl = gsap.timeline({
    defaults: { ease: 'none', duration: 1 },
    scrollTrigger: {
      trigger: '.hero',
      start: 'top top',
      end: 'bottom top',
      scrub: 0.5,
      invalidateOnRefresh: true,
    },
  });
  tl.to(svg, { x: travel }, 0);
  wheels(tl, svg, travel);
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

// Split lines only once the real fonts are in, or the line breaks are wrong.
document.fonts.ready.then(() => {
  // matchMedia only calls back when some condition matches, so ask for motion
  // being allowed rather than for it being reduced, or narrow screens get none.
  gsap.matchMedia().add(
    { wide: WIDE, moving: '(prefers-reduced-motion: no-preference)' },
    (context) => {
      const { wide, moving } = context.conditions as { wide: boolean; moving: boolean };
      if (!moving) return;
      // Creation order is refresh order: pins first, so everything below them
      // measures its start with the pin spacing already in place.
      heroBike();
      document.querySelectorAll<HTMLElement>('.band').forEach((el) => band(el, wide));
      reveals();
      const stops = [loops(), ...[...document.querySelectorAll<SVGSVGElement>('svg[data-lean-figure]')].map(animateLeanFigure)];
      return () => stops.forEach((stop) => stop());
    },
  );
});
