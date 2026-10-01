// The dashboard click-through (components/DashDemo.astro). A click on a hotspot
// shows the screen it names; a click anywhere else lights every hotspot for a
// moment, so the clickable parts are easy to find. Tall screens scroll inside
// the window only once it has been clicked, so scrolling past the page never
// gets caught in it.

const HINT = 900; // ms the hotspots stay lit

export function initDash(root: HTMLElement) {
  const screens = new Map([...root.querySelectorAll<HTMLElement>('[data-screen]')].map((s) => [s.dataset.screen!, s]));
  const view = root.querySelector<HTMLElement>('[data-dash-view]')!;
  const path = root.querySelector('[data-dash-path]')!;
  const more = root.querySelector<HTMLElement>('[data-dash-more]')!;
  const caption = root.querySelector('[data-dash-caption]')!;
  const back = root.querySelector<HTMLButtonElement>('[data-dash-back]')!;
  const history: string[] = [];
  let current = [...screens].find(([, s]) => !s.hidden)![0];
  let hint = 0;

  root.classList.add('is-live');

  const flash = () => {
    root.classList.add('is-hinting');
    clearTimeout(hint);
    hint = window.setTimeout(() => root.classList.remove('is-hinting'), HINT);
  };

  const show = (id: string) => {
    const next = screens.get(id);
    if (!next) return;
    screens.forEach((s, k) => (s.hidden = k !== id));
    current = id;
    view.scrollTop = 0;
    path.textContent = next.dataset.path!;
    caption.textContent = next.dataset.caption!;
    more.hidden = !('tall' in next.dataset);
    back.disabled = history.length === 0;
  };

  root.addEventListener('click', (e) => {
    const target = e.target as HTMLElement;
    const spot = target.closest<HTMLElement>('[data-to]');
    root.classList.add('is-engaged');
    if (spot) {
      history.push(current);
      show(spot.dataset.to!);
      view.focus({ preventScroll: true });
    } else if (target.closest('[data-dash-view]')) {
      flash();
    }
  });
  back.addEventListener('click', () => {
    const prev = history.pop();
    if (prev) show(prev);
  });
  root.addEventListener('pointerleave', () => root.classList.remove('is-engaged'));

  // Fetch every screen once the window is near, so a click never waits on one;
  // and light the hotspots the first time it comes into view.
  const near = new IntersectionObserver(
    ([e]) => {
      if (!e.isIntersecting) return;
      root.querySelectorAll('img').forEach((img) => (img.loading = 'eager'));
      near.disconnect();
    },
    { rootMargin: '600px 0px' },
  );
  const seen = new IntersectionObserver(
    ([e]) => {
      if (!e.isIntersecting) return;
      flash();
      seen.disconnect();
    },
    { threshold: 0.6 },
  );
  near.observe(view);
  seen.observe(view);

  show(current);
}
