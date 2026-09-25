// how the site moves (see "pixel motion" in site.css). production uses these
// defaults; the test site (PUBLIC_TEST=1, see .github/workflows/test.yml) shows
// a panel that overrides them per browser, and replays the boot on every load.
export type MotionStyle = 'dither' | 'redraw' | 'print' | 'instant' | 'smooth';
export type Motion = {
  style: MotionStyle;
  // extras, independent of the style and of each other
  reveal: boolean; // headings and cards reveal on first scroll into view
  cursor: boolean; // block-cursor hover on links
  decode: boolean; // two characters of each heading flicker through glyphs
  quake: QuakeDrop; // how the drop-down terminal arrives (mockups, test site)
};

// the drop-down terminal, trying to make it feel less laggy. 'current' is the
// live one: a 4-step slide over 160ms, the dithered scrim dissolving in, and
// the boot lines printing 150ms apart before you can type. every mockup
// closes instantly, puts the scrim down whole, focuses straight away and
// prints the boot lines fast (or at once); they differ in the arrival.
export type QuakeDrop = 'current' | 'snap' | 'shutter' | 'bands' | 'bar' | 'wire';
export const quakes: { id: QuakeDrop; label: string }[] = [
  { id: 'current', label: 'current (4-step slide)' },
  { id: 'snap', label: '1 snap: there on the keypress' },
  { id: 'shutter', label: '2 shutter: half, then full' },
  { id: 'bands', label: '3 bands: 3 rows top-down' },
  { id: 'bar', label: '4 bar first, then body' },
  { id: 'wire', label: '5 wireframe, then fill' },
];
// ms between boot lines on first open, per drop
export const quakeBoot: Record<QuakeDrop, number> = { current: 150, snap: 0, shutter: 30, bands: 30, bar: 30, wire: 30 };

export const styles: { id: MotionStyle; label: string }[] = [
  { id: 'dither', label: 'dither' },
  { id: 'redraw', label: 'redraw' },
  { id: 'print', label: 'print' },
  { id: 'instant', label: 'instant' },
  { id: 'smooth', label: 'smooth (the old style)' },
];
export const extras: { id: Exclude<keyof Motion, 'style'>; label: string }[] = [
  { id: 'reveal', label: 'scroll reveal' },
  { id: 'cursor', label: 'block-cursor hover' },
  { id: 'decode', label: 'decode headings' },
];

// chosen by zain on the test site, 2026-09-24
export const defaults: Motion = { style: 'dither', reveal: true, cursor: true, decode: true, quake: 'current' };
export const testSite = import.meta.env.PUBLIC_TEST === '1';
