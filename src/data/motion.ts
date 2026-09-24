// how the site moves (see "pixel motion" in site.css). production uses these
// defaults; the test site (PUBLIC_TEST=1, see .github/workflows/test.yml) shows
// a panel that overrides them per browser, and replays the boot on every load.
export type MotionStyle = 'dither' | 'redraw' | 'print' | 'instant';
export type Motion = {
  style: MotionStyle;
  // extras, independent of the style and of each other
  pages: boolean; // page-to-page transitions
  reveal: boolean; // headings and cards reveal on first scroll into view
  cursor: boolean; // block-cursor hover on links
  decode: boolean; // mono labels resolve from random glyphs
};

export const styles: { id: MotionStyle; label: string }[] = [
  { id: 'dither', label: 'dither' },
  { id: 'redraw', label: 'redraw' },
  { id: 'print', label: 'print' },
  { id: 'instant', label: 'instant' },
];
export const extras: { id: Exclude<keyof Motion, 'style'>; label: string }[] = [
  { id: 'pages', label: 'page transitions' },
  { id: 'reveal', label: 'scroll reveal' },
  { id: 'cursor', label: 'block-cursor hover' },
  { id: 'decode', label: 'decode labels' },
];

export const defaults: Motion = { style: 'dither', pages: true, reveal: true, cursor: false, decode: false };
export const testSite = import.meta.env.PUBLIC_TEST === '1';
