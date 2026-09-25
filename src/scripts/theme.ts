// light / dark. dark is the default for everyone (the browser's preference is
// ignored on purpose); light is saved per browser and applied before paint by
// the inline script in Site.astro and Terminal.astro.
export type Theme = 'dark' | 'light';
const KEY = 'modul0-theme';

export const getTheme = (): Theme => (document.documentElement.dataset.theme === 'light' ? 'light' : 'dark');

export function setTheme(t: Theme) {
  const html = document.documentElement;
  if (t === 'light') html.dataset.theme = 'light';
  else delete html.dataset.theme;
  try {
    if (t === 'light') localStorage.setItem(KEY, 'light');
    else localStorage.removeItem(KEY);
  } catch {}
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', t === 'light' ? '#ffffff' : '#000000');
  window.dispatchEvent(new CustomEvent('modul0:theme', { detail: t }));
}
