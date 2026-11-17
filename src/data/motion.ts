// how the site moves (see "pixel motion" in site.css). production uses these
// defaults; the test site (PUBLIC_TEST=1, see .github/workflows/test.yml) shows
// a panel that overrides them per browser, and replays the boot on every load.
export type MotionStyle = 'dither' | 'redraw' | 'print' | 'instant' | 'smooth';
// how the boot hands over to the page (BootSequence.tsx, "boot outros" in
// site.css). wipe is the original: a purple panel in the motion style's
// surface animation, in and out
export type Outro = 'wipe' | 'shutter' | 'slash' | 'rail' | 'crt' | 'cut' | 'mod' | 'tear' | 'bar';
export type Motion = {
  style: MotionStyle;
  outro: Outro;
  // extras, independent of the style and of each other
  reveal: boolean; // headings and cards reveal on first scroll into view
  cursor: boolean; // block-cursor hover on links
  decode: boolean; // two characters of each heading flicker through glyphs
  pointer: boolean; // the mouse pointer is a square (css cursor images, fine pointers only)
};

export const styles: { id: MotionStyle; label: string }[] = [
  { id: 'dither', label: 'dither' },
  { id: 'redraw', label: 'redraw' },
  { id: 'print', label: 'print' },
  { id: 'instant', label: 'instant' },
  { id: 'smooth', label: 'smooth (the old style)' },
];
export const outros: { id: Outro; label: string }[] = [
  { id: 'wipe', label: 'wipe (current)' },
  { id: 'shutter', label: 'shutter' },
  { id: 'slash', label: '% slash' },
  { id: 'rail', label: 'collapse to rail' },
  { id: 'crt', label: 'crt off/on' },
  { id: 'cut', label: 'cut' },
  { id: 'mod', label: 'mod grid' },
  { id: 'tear', label: 'tear' },
  { id: 'bar', label: 'progress bar' },
];
export const extras: { id: Exclude<keyof Motion, 'style' | 'outro'>; label: string }[] = [
  { id: 'reveal', label: 'scroll reveal' },
  { id: 'cursor', label: 'block-cursor hover' },
  { id: 'decode', label: 'decode headings' },
  { id: 'pointer', label: 'square pointer' },
];

// chosen by zain on the test site, 2026-09-24 (pointer: on to try, 2026-09-28)
export const defaults: Motion = { style: 'dither', outro: 'wipe', reveal: true, cursor: true, decode: true, pointer: true };
export const testSite = import.meta.env.PUBLIC_TEST === '1';
