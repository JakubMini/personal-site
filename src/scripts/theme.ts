// Light or dark. The colours are CSS (global.css, Theme): with no choice made
// the page follows the system, and a choice sets data-theme on <html>, kept in
// localStorage, which layouts/Layout.astro reads back before the first paint.
// This script runs the toggle (components/ThemeToggle.astro), tells the page
// when the theme changes, and resolves a colour token for the scripts that
// draw with the page's colours.

export type Theme = 'light' | 'dark';

const KEY = 'theme';
const root = document.documentElement;
const system = matchMedia('(prefers-color-scheme: dark)');
const toggles = Array.from(document.querySelectorAll<HTMLButtonElement>('[data-theme-toggle]'));

// The theme in use: the stylesheet sets color-scheme on <html> to one word.
export const theme = (): Theme => (getComputedStyle(root).colorScheme === 'dark' ? 'dark' : 'light');

// A choice that matches the system is not kept, so the page goes on following it.
export function setTheme(next: Theme) {
  const chosen = next === (system.matches ? 'dark' : 'light') ? null : next;
  if (chosen) root.dataset.theme = chosen;
  else delete root.dataset.theme;
  try {
    if (chosen) localStorage.setItem(KEY, chosen);
    else localStorage.removeItem(KEY);
  } catch {
    // Private mode or storage off: the choice lasts the page.
  }
  changed();
}

function changed() {
  const t = theme();
  for (const b of toggles) b.setAttribute('aria-checked', String(t === 'dark'));
  document.dispatchEvent(new CustomEvent<Theme>('themechange', { detail: t }));
}

for (const b of toggles) b.addEventListener('click', () => setTheme(theme() === 'dark' ? 'light' : 'dark'));
system.addEventListener('change', () => {
  if (!root.dataset.theme) changed();
});
// A choice made in another tab.
addEventListener('storage', (e) => {
  if (e.key !== KEY) return;
  if (e.newValue === 'light' || e.newValue === 'dark') root.dataset.theme = e.newValue;
  else delete root.dataset.theme;
  changed();
});
changed();

// A token (--ink, --c-blue…) as the colour it is on `el`, in el's own scheme,
// for canvas and WebGL, which cannot read light-dark() themselves.
export function colour(el: Element, token: string) {
  const probe = document.createElement('i');
  probe.style.color = `var(${token})`;
  el.append(probe);
  const c = getComputedStyle(probe).color;
  probe.remove();
  return c;
}
