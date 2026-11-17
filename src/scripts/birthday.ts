// zain's birthday, from `birth`: on the day and for the three after it
// (visitor's local date) the boot log and the terminal mark it
export const BIRTHDAY_DAYS = 4;

export function birthday(birth: string, now = new Date()): { age: number; ago: number } | null {
  const [y, m, d] = birth.split('-').map(Number);
  const day = new Date(now.getFullYear(), m - 1, d);
  const ago = Math.round((new Date(now.getFullYear(), now.getMonth(), now.getDate()).valueOf() - day.valueOf()) / 864e5);
  return ago >= 0 && ago < BIRTHDAY_DAYS ? { age: now.getFullYear() - y, ago } : null;
}
