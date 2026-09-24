// time since `birth`, split into units by remainders: each unit is what's left
// over once the bigger ones are taken out. shared by the rail and the terminal.
export const DAY = 864e5;
export const YEAR = DAY * 365.25;

export function uptimeParts(birth: string, now = Date.now()) {
  const t = now - new Date(birth).valueOf();
  return {
    y: Math.floor(t / YEAR),
    d: Math.floor((t % YEAR) / DAY),
    h: Math.floor((t % DAY) / 36e5),
    m: Math.floor((t % 36e5) / 6e4),
    s: Math.floor((t % 6e4) / 1e3),
  };
}

const pad = (n: number) => String(n).padStart(2, '0');

export function uptimeText(birth: string, now?: number) {
  const { y, d, h, m, s } = uptimeParts(birth, now);
  return `${y}y ${d}d ${pad(h)}h ${pad(m)}m ${pad(s)}s`;
}

// one row per unit: [unit, the expression (with a % in it, bar years), value]
export function uptimeRows(birth: string, now?: number): [string, string, string][] {
  const { y, d, h, m, s } = uptimeParts(birth, now);
  return [
    ['y', 't / 1y', String(y)],
    ['d', 't % 1y / 1d', String(d)],
    ['h', 't % 1d / 1h', pad(h)],
    ['m', 't % 1h / 1m', pad(m)],
    ['s', 't % 1m / 1s', pad(s)],
  ];
}
