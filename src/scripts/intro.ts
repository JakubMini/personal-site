// The startup animation, after wodniack.dev's. On an ink cover a glossy black
// record is cut from the rim inwards while a log runs, spins up to 33⅓ rpm
// and gets its label, then rolls off to the right and takes the cover with it.
// The hero builds in behind.
//
// It plays only when the inline script in components/Intro.astro has set
// html.has-intro: JavaScript on, motion allowed, no #section in the address.
// It is the page's one timed animation, so nothing waits on it: the page
// scrolls throughout, and any scroll, key, click or touch finishes it at once.

import { gsap } from 'gsap';
import { ScrambleTextPlugin } from 'gsap/ScrambleTextPlugin';
import { SplitText } from 'gsap/SplitText';
import { vinyl, type Pose } from './vinyl';

gsap.registerPlugin(ScrambleTextPlugin, SplitText);

const SKIP = ['scroll', 'wheel', 'touchstart', 'keydown', 'pointerdown'];

const RPM = 100 / 3;
const SPEED = (RPM / 60) * Math.PI * 2; // radians a second
const SPIN_UP = 1.2; // seconds, accelerating evenly

function timeline(cover: HTMLElement) {
  const record = cover.querySelector<HTMLCanvasElement>('.intro-record')!;
  const log = cover.querySelector<HTMLElement>('[data-log]')!;
  const speed = cover.querySelector<HTMLElement>('.intro-speed')!;

  // CSS sizes the record; it is drawn at the screen's density, two at most.
  const radius = record.clientWidth / 2;
  record.width = record.height = Math.round(radius * 2 * Math.min(2, devicePixelRatio || 1));
  const { frame: draw } = vinyl(record, JSON.parse(record.dataset.label!));

  // Spin is the record turning on the spot; rolling adds a turn for every
  // radius it travels, so it rolls rather than slides.
  const pose: Pose & { spin: number; x: number } = { spin: 0, x: 0, turn: 0, cut: 0, label: 0 };
  const frame = () => {
    pose.turn = pose.spin + pose.x / radius;
    gsap.set(record, { x: pose.x });
    draw(pose);
  };
  const rollOff = innerWidth - record.getBoundingClientRect().left;
  const rpm = { now: 0 };

  const tl = gsap.timeline({ onUpdate: frame });

  // Cut and spin up: grooves from the rim inwards, the label once they reach
  // it. Even acceleration over SPIN_UP turns it SPEED × SPIN_UP / 2 radians.
  gsap.set(record, { autoAlpha: 0, scale: 0.94 });
  tl.to(record, { autoAlpha: 1, scale: 1, duration: 0.4, ease: 'power2.out' }, 0)
    .to(pose, { cut: 1, duration: 0.9, ease: 'none' }, 0.1)
    .to(pose, { spin: (SPEED * SPIN_UP) / 2, duration: SPIN_UP, ease: 'power2.in' }, 0.1)
    .to(pose, { spin: `+=${SPEED}`, duration: 1, ease: 'none' }, 0.1 + SPIN_UP)
    .to(
      rpm,
      {
        now: RPM,
        duration: SPIN_UP,
        ease: 'none',
        onUpdate: () => {
          speed.textContent = `${rpm.now.toFixed(1).padStart(4, '0')} rpm`;
        },
      },
      0.1,
    )
    .to(pose, { label: 1, duration: 0.25, ease: 'power1.out' }, 0.95);
  const steps: string[] = JSON.parse(log.dataset.log!).slice(1);
  steps.forEach((text, i) => {
    const at = 0.35 + (0.75 * i) / Math.max(1, steps.length - 1);
    tl.to(log, { scrambleText: { text, chars: '01' }, duration: 0.4 }, at);
  });

  // Roll off, the cover's edge trailing it.
  gsap.set(cover, { clipPath: 'inset(0% 0% 0% 0%)' });
  tl.to(pose, { x: rollOff, duration: 0.8, ease: 'power2.in' }, 1.35)
    .to(cover, { clipPath: 'inset(0% 0% 0% 100%)', duration: 0.8, ease: 'power2.in' }, 1.42);

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
  gsap.set(facts, { y: 14, autoAlpha: 0 });
  gsap.set('.hero-chain', { autoAlpha: 0 });

  tl.to(name.chars, { yPercent: 0, duration: 1, ease: 'expo.out', stagger: 0.03 }, 1.7)
    .to('.hero-chain', { autoAlpha: 1, duration: 0.9, ease: 'power2.out', clearProps: 'all' }, 1.95)
    .to(
      '.hero .ruled',
      { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.1, ease: 'expo.inOut', clearProps: 'clipPath' },
      1.7,
    )
    // clearProps, or an inline opacity outlives the intro and kills a:hover.
    .to(topbar, { y: 0, autoAlpha: 1, duration: 0.6, ease: 'power3.out', stagger: 0.04, clearProps: 'all' }, 1.85)
    .to(pitch.lines, { yPercent: 0, duration: 0.8, ease: 'power3.out', stagger: 0.08 }, 1.9)
    .to(facts, { y: 0, autoAlpha: 1, duration: 0.6, ease: 'power2.out', stagger: 0.06, clearProps: 'all' }, 2.2);

  frame();
  return { tl, splits: [name, pitch] };
}

export function intro() {
  const root = document.documentElement;
  const cover = document.querySelector<HTMLElement>('.intro');
  if (!cover || !root.classList.contains('has-intro')) return;
  // The script has the cover now, so the CSS failsafe stands down.
  cover.style.animation = 'none';

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
  };

  SKIP.forEach((type) => addEventListener(type, finish, { passive: true }));
  // Reloaded part way down: the browser restores the scroll, perhaps before
  // the listener above was there to hear it.
  if (scrollY > 0) return finish();

  // The hero's text splits by line and the label is lettered, both of which
  // need the real fonts.
  document.fonts.ready.then(() => {
    if (finished) return;
    if (scrollY > 0) return finish();
    played = timeline(cover);
    played.tl.eventCallback('onComplete', finish);
  });
}
