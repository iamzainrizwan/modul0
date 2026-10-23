// static (non-blog) files in the terminal's fake filesystem. values are html
// strings, rendered as-is. blog/ is filled in at build time from
// src/content/blog. same facts as profile.ts, in the terminal's own voice -
// keep the two in sync. the text lives in content/terminal.json, editable
// from the admin page.

import terminal from './content/terminal.json';

export const whoami: string = terminal.whoami;
export const status: string = terminal.status;
export const birth: string = terminal.birth;
export const files: Record<string, string> = terminal.files;
export const projects: Record<string, string> = terminal.projects;
