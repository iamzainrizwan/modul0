// how the site moves (see "pixel motion" in site.css). production uses these
// defaults; the test site (PUBLIC_TEST=1, see .github/workflows/test.yml) shows
// a panel that overrides them per browser, and replays the boot on every load.
export type MotionStyle = 'dither' | 'redraw' | 'print' | 'instant' | 'smooth';
// how the boot hands over to the page (BootSequence.tsx, "boot outros" in
// site.css). wipe is the original: a purple panel in the motion style's
// surface animation, in and out. sweeps cover the screen and uncover it;
// dithers break the boot screen up over the page, a hard frame at a time;
// 60fps ones redraw every animation frame
export type Outro =
  | 'wipe' | 'shutter' | 'slash' | 'rail' | 'crt' | 'cut' | 'mod' | 'tear' | 'bar'
  | 'bayer' | 'adam7' | 'front' | 'afterglow' | 'halftone' | 'static' | 'scan' | 'life'
  | 'bayer60' | 'wipe60' | 'sweep60' | 'front60' | 'slide60' | 'grow60'
  | 'name-rings' | 'name-square' | 'name-diamond' | 'name-spiral' | 'name-radar' | 'name-blocks' | 'name-shock' | 'name-box';
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
  { id: 'smooth', label: 'smooth' },
];
export const outros: { id: Outro; label: string; group: 'sweep' | 'dither' | 'fps' | 'name' }[] = [
  { id: 'wipe', label: 'wipe', group: 'sweep' },
  { id: 'shutter', label: 'shutter', group: 'sweep' },
  { id: 'slash', label: '% slash', group: 'sweep' },
  { id: 'rail', label: 'to rail', group: 'sweep' },
  { id: 'crt', label: 'crt', group: 'sweep' },
  { id: 'cut', label: 'cut', group: 'sweep' },
  { id: 'mod', label: 'mod grid', group: 'sweep' },
  { id: 'tear', label: 'tear', group: 'sweep' },
  { id: 'bar', label: 'bar', group: 'sweep' },
  { id: 'bayer', label: 'bayer', group: 'dither' },
  { id: 'adam7', label: 'interlace', group: 'dither' },
  { id: 'front', label: 'from name', group: 'dither' },
  { id: 'afterglow', label: 'afterglow', group: 'dither' },
  { id: 'halftone', label: 'halftone', group: 'dither' },
  { id: 'static', label: 'static', group: 'dither' },
  { id: 'scan', label: 'scanlines', group: 'dither' },
  { id: 'life', label: 'life', group: 'dither' },
  { id: 'bayer60', label: 'bayer', group: 'fps' },
  { id: 'wipe60', label: 'dither wipe', group: 'fps' },
  { id: 'sweep60', label: 'dither sweep', group: 'fps' },
  { id: 'front60', label: 'from name', group: 'fps' },
  { id: 'slide60', label: 'slide', group: 'fps' },
  { id: 'grow60', label: 'grow', group: 'fps' },
  { id: 'name-rings', label: 'rings', group: 'name' },
  { id: 'name-square', label: 'square', group: 'name' },
  { id: 'name-diamond', label: 'diamond', group: 'name' },
  { id: 'name-spiral', label: 'spiral', group: 'name' },
  { id: 'name-radar', label: 'radar', group: 'name' },
  { id: 'name-blocks', label: 'blocks', group: 'name' },
  { id: 'name-shock', label: 'shockwave', group: 'name' },
  { id: 'name-box', label: 'box', group: 'name' },
];
export const extras: { id: Exclude<keyof Motion, 'style' | 'outro'>; label: string }[] = [
  { id: 'reveal', label: 'scroll reveal' },
  { id: 'cursor', label: 'block-cursor hover' },
  { id: 'decode', label: 'decode headings' },
  { id: 'pointer', label: 'square pointer' },
];

// chosen by zain on the test site, 2026-09-24 (pointer: on to try, 2026-09-28;
// outro: bayer, the stepped one, 2026-11-19)
export const defaults: Motion = { style: 'dither', outro: 'bayer', reveal: true, cursor: true, decode: true, pointer: true };
export const testSite = import.meta.env.PUBLIC_TEST === '1';
