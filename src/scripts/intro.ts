// The startup animation, after wodniack.dev's. On an ink cover the hero's
// e-bike draws itself while a boot log runs and the charge counts up; the
// battery fills, the bike rides off to the right and takes the cover with it,
// and the hero builds in behind. Its own bike rolls in from the left and stops
// in its place, still heading right, the way the scroll then carries it.
//
// It plays only when the inline script in components/Intro.astro has set
// html.has-intro: JavaScript on, motion allowed, no #section in the address.
// It is the page's one timed animation, so nothing waits on it: the page
// scrolls throughout, and any scroll, key, click or touch finishes it at once.

import { gsap } from 'gsap';
import { DrawSVGPlugin } from 'gsap/DrawSVGPlugin';
import { ScrambleTextPlugin } from 'gsap/ScrambleTextPlugin';
import { SplitText } from 'gsap/SplitText';
import { roll } from './wheels';

gsap.registerPlugin(DrawSVGPlugin, ScrambleTextPlugin, SplitText);

const SKIP = ['scroll', 'wheel', 'touchstart', 'keydown', 'pointerdown'];

// Turn a drawing's wheels for `distance` px of travel. `turns` scales that
// travel: [0, 1] rides off from rest, [-1, 0] rolls in and comes to rest.
function spin(
  tl: gsap.core.Timeline,
  svg: SVGSVGElement,
  distance: number,
  [from, to]: [number, number],
  vars: gsap.TweenVars,
  position: number,
) {
  svg.querySelectorAll<SVGGElement>('[data-wheel]').forEach((wheel) => {
    const turn = roll(wheel, svg, distance);
    // The tyre is the wheel's bounding box, so its centre is the hub. Not
    // svgOrigin as the scroll uses: when a timeline starts a fromTo on a wheel
    // that is already turned, GSAP re-reads an svgOrigin as box-relative but
    // still absolute, and the wheel orbits a point off its axle.
    gsap.set(wheel, { transformOrigin: '50% 50%', rotation: from * turn });
    tl.to(wheel, { rotation: to * turn, ...vars }, position);
  });
}

function timeline(cover: HTMLElement) {
  const bike = cover.querySelector<SVGSVGElement>('.intro-bike')!;
  const log = cover.querySelector<HTMLElement>('[data-log]')!;
  const charge = cover.querySelector<HTMLElement>('.intro-charge')!;
  const heroBike = document.querySelector<SVGSVGElement>('.hero-bike')!;
  const road = heroBike.parentElement!;

  // From where it stands to just past the right edge, and from just past the
  // road's left edge to where it stands.
  const rideOff = innerWidth - bike.getBoundingClientRect().left;
  const rollIn = heroBike.getBoundingClientRect().right - road.getBoundingClientRect().left;

  const tl = gsap.timeline();
  const level = { percent: 0 };

  // Boot: the drawing draws itself wheels first, the log runs, the charge
  // counts up. A round cap draws a dot at zero length, so each stroke also
  // stays transparent until its turn.
  const strokes = bike.querySelectorAll('circle, path, rect');
  gsap.set(strokes, { drawSVG: 0, opacity: 0 });
  tl.set(bike, { visibility: 'visible' }, 0)
    .to(strokes, { drawSVG: '100%', duration: 0.9, ease: 'power2.inOut', stagger: 0.035 }, 0.1)
    .to(strokes, { opacity: 1, duration: 0.01, stagger: 0.035 }, 0.1)
    .to(
      level,
      {
        percent: 100,
        duration: 1.25,
        ease: 'power1.inOut',
        onUpdate: () => {
          charge.textContent = `${String(Math.round(level.percent)).padStart(3, '0')}%`;
        },
      },
      0,
    );
  const steps: string[] = JSON.parse(log.dataset.log!).slice(1);
  steps.forEach((text, i) => {
    const at = 0.45 + (0.7 * i) / Math.max(1, steps.length - 1);
    tl.to(log, { scrambleText: { text, chars: '01' }, duration: 0.4 }, at);
  });

  // Powered: the battery fills, then the bike rides off and the cover goes
  // with it, its edge trailing the back wheel.
  gsap.set(cover, { clipPath: 'inset(0% 0% 0% 0%)' });
  tl.to(bike.querySelector('.pack'), { fillOpacity: 1, duration: 0.2 }, 1.15)
    .to(bike, { x: rideOff, duration: 0.8, ease: 'power2.in' }, 1.35)
    .to(cover, { clipPath: 'inset(0% 0% 0% 100%)', duration: 0.8, ease: 'power2.in' }, 1.42);
  spin(tl, bike, rideOff, [0, 1], { duration: 0.8, ease: 'power2.in' }, 1.35);

  // The hero builds in behind it. Splits are reverted when the intro ends.
  const name = SplitText.create('.hero-name', { type: 'lines, chars', mask: 'lines', linesClass: 'line' });
  // aria-label is not allowed on <p>; split lines still read as the text.
  const pitch = SplitText.create('.pitch', { type: 'lines', mask: 'lines', linesClass: 'line', aria: 'none' });
  const topbar = gsap.utils.toArray<HTMLElement>('.topbar .wordmark, .topbar .nav a');
  const facts = gsap.utils.toArray<HTMLElement>('.hero-facts > *');

  // Start states are set here rather than left to from(): GSAP renders those
  // lazily, on its next frame, and the wipe must never uncover the hero as
  // it ends up before it has been hidden.
  gsap.set(name.chars, { yPercent: 125 });
  gsap.set('.hero .ruled', { clipPath: 'inset(0% 100% 0% 0%)' });
  gsap.set(topbar, { y: -16, autoAlpha: 0 });
  gsap.set(pitch.lines, { yPercent: 120 });
  gsap.set(heroBike, { x: -rollIn });
  gsap.set(facts, { y: 14, autoAlpha: 0 });

  tl.to(name.chars, { yPercent: 0, duration: 1, ease: 'expo.out', stagger: 0.03 }, 1.7)
    .to(
      '.hero .ruled',
      { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.1, ease: 'expo.inOut', clearProps: 'clipPath' },
      1.7,
    )
    // clearProps, or an inline opacity outlives the intro and kills a:hover.
    .to(topbar, { y: 0, autoAlpha: 1, duration: 0.6, ease: 'power3.out', stagger: 0.04, clearProps: 'all' }, 1.85)
    .to(pitch.lines, { yPercent: 0, duration: 0.8, ease: 'power3.out', stagger: 0.08 }, 1.9)
    .to(heroBike, { x: 0, duration: 1.2, ease: 'power3.out' }, 1.9)
    .to(facts, { y: 0, autoAlpha: 1, duration: 0.6, ease: 'power2.out', stagger: 0.06, clearProps: 'all' }, 2.2);
  spin(tl, heroBike, rollIn, [-1, 0], { duration: 1.2, ease: 'power3.out' }, 1.9);

  return { tl, splits: [name, pitch] };
}

// Resolves once the intro has finished or been skipped, with the cover gone
// and the hero as it is without motion; at once when there is none to play.
export function intro(): Promise<void> {
  const root = document.documentElement;
  const cover = document.querySelector<HTMLElement>('.intro');
  if (!cover || !root.classList.contains('has-intro')) return Promise.resolve();
  // The script has the cover now, so the CSS failsafe stands down.
  cover.style.animation = 'none';

  return new Promise((resolve) => {
    let played: ReturnType<typeof timeline> | undefined;
    let finished = false;

    const finish = () => {
      if (finished) return;
      finished = true;
      SKIP.forEach((type) => removeEventListener(type, finish));
      played?.tl.progress(1).kill();
      played?.splits.forEach((split) => split.revert());
      cover.remove();
      root.classList.remove('has-intro');
      resolve();
    };

    SKIP.forEach((type) => addEventListener(type, finish, { passive: true }));
    // Reloaded part way down: the browser restores the scroll, perhaps before
    // the listener above was there to hear it.
    if (scrollY > 0) return finish();

    // The hero's text splits by line, which needs the real fonts.
    document.fonts.ready.then(() => {
      if (finished) return;
      if (scrollY > 0) return finish();
      played = timeline(cover);
      played.tl.eventCallback('onComplete', finish);
    });
  });
}
