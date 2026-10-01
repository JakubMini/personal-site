// Rolling wheels, shared by the scroll motion and the intro.

import { gsap } from 'gsap';

// Degrees a wheel turns while its drawing travels `distance` CSS px, so it
// rolls rather than slides. data-wheel is "cx cy r" in viewBox units.
export function roll(wheel: SVGGElement, svg: SVGSVGElement, distance: number) {
  const r = Number(wheel.dataset.wheel!.split(' ')[2]);
  const scale = svg.getBoundingClientRect().width / svg.viewBox.baseVal.width;
  return (distance / (2 * Math.PI * r * scale)) * 360;
}

export function wheels(tl: gsap.core.Timeline, svg: SVGSVGElement, distance: () => number, sign = 1) {
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
