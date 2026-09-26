import { listing, postView } from './render';
import { uptimeRows, uptimeText } from './uptime';
import { getTheme, setTheme } from './theme';
import { EGGS, markEgg, foundEggs, resetEggs, eggsReport, quick, MAN_MAN, yes, forkbomb, hack, cmatrix, snake, type Ctx } from './eggs';

type Post = { title: string; date: string; description: string; html: string };
export type Fs = {
  files: Record<string, string>;
  projects: Record<string, string>;
  blog: Record<string, Post>;
  whoami: string;
  birth: string;
  base: string;
  // the build: commit, repo, recent history (src/data/build.ts)
  build?: { short: string; url: string; repo: string; log: { sha: string; date: string; subject: string }[] };
};

const DIRS = ['projects', 'blog'] as const;
type Dir = '' | (typeof DIRS)[number];

// [label, description, what clicking it in `help` runs (default: the label)].
// `help` shows the first page, the way around; `help more` the rest. tab
// completion knows both
const COMMANDS: [string, string, string?][] = [
  ['help [more]', 'this list (more: the rest of it)', 'help more'],
  ['whoami', 'who i am'],
  ['ls [dir]', 'list files'],
  ['cd [dir]', 'change directory'],
  ['cat [file]', 'output file contents'],
  ['blog', 'list blog posts'],
  ['open [post]', 'go to a post\'s own page'],
  ['grep [text]', 'search every file', 'grep alexandria'],
  ['man modul0', "why it's called that"],
  ['clear', 'clear screen'],
  ['exit', 'back to the normal site'],
];
const MORE: [string, string, string?][] = [
  ['tail -f status.log', "what i'm working on right now"],
  ['pgrep -a zain', 'recent achievements'],
  ['uptime [-v]', 'time since i was born (-v shows the maths)', 'uptime -v'],
  ['expr a % b', 'the remainder of a / b', 'expr 17 % 5'],
  ['neofetch', 'system info, sort of'],
  ['git log', 'what changed on the site lately'],
  ['curl modul0.dev/cv.txt', 'the cv as plain text (works from your own terminal too)', 'curl modul0.dev/cv.txt'],
  ['theme [light|dark]', 'switch the colours', 'theme'],
  ['history', 'commands you\'ve run'],
];

const BOOT = [
  'modul0 v0.2',
  'initialising...',
  'loading user zain rizwan...',
  'type <span class="accent">help</span> for available commands, <span class="accent">exit</span> to leave',
];

const escape = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
const error = (msg: string) => `<span class="error">${msg}</span>`;
// every % the terminal prints is meant to be seen
const op = (s: string) => s.replace(/%/g, '<span class="op">%</span>');

// integer arithmetic, like expr(1): bigints so nothing loses precision, and %
// keeps the dividend's sign
const ARITH = /^\s*(-?\d+)\s*([-+*/%])\s*(-?\d+)\s*$/;
function expr(src: string) {
  const m = ARITH.exec(src);
  if (!m) return error('expr: try something like <span class="accent">expr 17 % 5</span>');
  const a = BigInt(m[1]), b = BigInt(m[3]), o = m[2];
  if ((o === '/' || o === '%') && b === 0n) return error('expr: division by zero');
  const r = o === '+' ? a + b : o === '-' ? a - b : o === '*' ? a * b : o === '/' ? a / b : a % b;
  const line = `${m[1]} ${op(o)} ${m[3]} = <b>${r}</b>`;
  return o === '%' && r === 0n ? `${line}<br><span class="dim">remainder 0: divides clean, nothing left over.</span>` : line;
}

// sl(1), for when you meant ls
const TRAIN = `      ____
 ____|[]|_|__________
|  __  |   modul0 ${op('%')} |
|_|__|_|_____________|
  O  O    O O   O O`;

// neofetch's logo: the % mark (squares top left and bottom right, the slash
// between them), same shape as the favicon
const logo = () => {
  const sq = (s: string) => `<span class="accent">${s}</span>`;
  // 14 columns: squares in two corners, the slash stepping two columns a row
  const rows = [
    `${sq('████')}        ██`,
    `${sq('████')}      ██  `,
    `        ██    `,
    `      ██      `,
    `    ██        `,
    `  ██      ${sq('████')}`,
    `██        ${sq('████')}`,
  ];
  return rows.join('\n');
};

// `rm -rf /`: what it deletes on the way down (then it all comes back)
const DOOMED = ['/home/zain/projects', '/home/zain/homelab', '/home/zain/cv', '/home/zain', '/'];

// text for grep: markup stripped, entities decoded, one entry per line
const textLines = (html: string) =>
  html
    .replace(/<br\s*\/?>|<\/(p|li|h\d|div|pre)>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&(amp|lt|gt|quot|#39|nbsp);/g, (_, e) => ({ amp: '&', lt: '<', gt: '>', quot: '"', '#39': "'", nbsp: ' ' })[e as string]!)
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);

// prose in paragraphs, not a hand-wrapped <pre>, so it reflows on phones
const MAN_MODUL0 = `<div class="man">
<p>MODUL0(1)</p>
<b>name</b>
<p>modul0 - zain's site, named after the ${op('%')} operator</p>
<b>synopsis</b>
<p>a ${op('%')} b</p>
<b>description</b>
<p>a ${op('%')} b is what's left of a once you've taken out as many b's as fit. the quotient gets thrown away; only the remainder stays.</p>
<p>most programmers meet it early: fizzbuzz is i ${op('%')} 3 == 0 and i ${op('%')} 5 == 0. the 0 on the end is a l33t shoutout to that.</p>
<p>if there's symbolism, it's this: discard the useless info (the quotient), keep only what you want (the remainder).</p>
<b>examples</b>
<div class="cols">
<a class="run" href="#" data-cmd="expr 17 % 5">expr 17 ${op('%')} 5</a><span class="dim">2</span>
<a class="run" href="#" data-cmd="expr 15 % 5">expr 15 ${op('%')} 5</a><span class="dim">0</span>
<a class="run" href="#" data-cmd="uptime -v">uptime -v</a><span class="dim">zain's age, built out of remainders</span>
</div>
</div>`;

type Options = {
  // called by `exit`; defaults to leaving for the readable site
  onExit?: () => void;
  // element that scrolls the output; defaults to the page
  scroller?: HTMLElement;
  // ms between the boot lines; default 150
  bootDelay?: number;
};

// mounts the terminal inside `terminal`, which must contain the markup from
// TerminalMarkup (.t-output, form.t-input, .t-prompt-text, input.t-cmd)
export function boot(terminal: HTMLElement, fs: Fs, opts: Options = {}) {
  const output = terminal.querySelector<HTMLElement>('.t-output')!;
  const form = terminal.querySelector<HTMLFormElement>('.t-input')!;
  const input = terminal.querySelector<HTMLInputElement>('.t-cmd')!;
  const promptText = terminal.querySelector<HTMLElement>('.t-prompt-text')!;

  let cwd: Dir = '';
  const history: string[] = [];
  let historyIdx = 0;
  let uptimeTimer: number | undefined;
  // inside `vim`, until you find :q
  let vim = false;
  const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

  const prompt = () => (vim ? '~' : `zain@modul0:~${cwd ? '/' + cwd : ''}$`);

  function print(html: string, command?: string, promptAt = prompt(), cls = 'entry'): HTMLElement {
    const entry = document.createElement('div');
    entry.className = cls;
    if (command !== undefined) {
      const echo = document.createElement('div');
      echo.className = 'echo';
      echo.innerHTML = `<span class="prompt">${promptAt}</span> ${escape(command)}`;
      entry.append(echo);
    }
    if (html) {
      const res = document.createElement('div');
      res.className = 'response';
      res.innerHTML = html;
      entry.append(res);
    }
    output.append(entry);
    scroll();
    return entry.querySelector<HTMLElement>('.response') ?? entry;
  }

  // to the bottom. on /terminal/ that's the prompt, or the output while an
  // egg has the prompt hidden (scrolling to a hidden element does nothing)
  function scroll() {
    if (opts.scroller) opts.scroller.scrollTop = opts.scroller.scrollHeight;
    else (form.hidden ? output : form).scrollIntoView({ block: 'end' });
  }

  // an easter egg found: tallied per browser (eggs.ts), announced the first time
  function found(id: string) {
    if (!markEgg(id)) return;
    const n = EGGS.filter(([e]) => foundEggs().has(e)).length;
    print(`<span class="egg-new">+1 egg · ${n}/${EGGS.length}</span> <span class="dim">type <a class="run" href="#" data-cmd="eggs">eggs</a> for the tally</span>`, undefined, '', 'entry');
  }

  // what the long eggs get to work with
  const ctx: Ctx = {
    print: (html) => print(html, undefined, '', 'entry'),
    busy: (on) => {
      form.hidden = on;
      if (!on) {
        promptText.textContent = prompt();
        input.focus({ preventScroll: true });
      }
    },
    reduced,
    cols: () => {
      const probe = document.createElement('span');
      probe.textContent = 'M'.repeat(20);
      probe.style.visibility = 'hidden';
      output.append(probe);
      const w = probe.getBoundingClientRect().width / 20;
      probe.remove();
      return Math.floor(output.clientWidth / (w || 10));
    },
    found,
    scroll,
    room: () => (opts.scroller ? opts.scroller.clientHeight : innerHeight),
  };

  // "blog/foo.md", "../about.txt", "~/projects" -> [dir, name]; name '' means the dir itself
  function resolve(path = ''): [Dir, string] | null {
    const parts = (path.startsWith('~') || path.startsWith('/') ? path.replace(/^~?\/?/, '') : [cwd, path].join('/'))
      .split('/')
      .filter((p) => p && p !== '.');
    const stack: string[] = [];
    for (const p of parts) p === '..' ? stack.pop() : stack.push(p);
    if (stack.length === 0) return ['', ''];
    if (stack.length === 1) {
      if ((DIRS as readonly string[]).includes(stack[0])) return [stack[0] as Dir, ''];
      return ['', stack[0]];
    }
    if (stack.length === 2 && (DIRS as readonly string[]).includes(stack[0])) return [stack[0] as Dir, stack[1]];
    return null;
  }

  function dirEntries(dir: Dir): string[] {
    if (dir === 'blog') return Object.keys(fs.blog);
    if (dir === 'projects') return Object.keys(fs.projects);
    return [...DIRS.map((d) => d + '/'), ...Object.keys(fs.files)];
  }

  function ls(path?: string) {
    const r = resolve(path);
    if (!r) return error(`ls: ${escape(path!)}: no such file or directory`);
    const [dir, name] = r;
    if (name) return dirEntries(dir).includes(name) ? escape(name) : error(`ls: ${escape(name)}: no such file or directory`);
    const prefix = dir === cwd ? '' : dir ? dir + '/' : cwd ? '../' : '';
    if (dir === 'blog') return listing(fs.blog, fs.base, prefix);
    return '<div class="ls">' + dirEntries(dir)
      .map((e) => {
        const cmd = e.endsWith('/') ? `ls ${prefix}${e}` : `cat ${prefix}${e}`;
        return `<a class="run${e.endsWith('/') ? ' dir' : ''}" href="#" data-cmd="${cmd}">${e}</a>`;
      })
      .join('') + '</div>';
  }

  function cat(path?: string) {
    if (!path) return error('cat: missing file operand');
    const r = resolve(path);
    const [dir, name] = r ?? ['', ''];
    if (!r || !name) return error(`cat: ${escape(path)}: ${r ? 'is a directory' : 'no such file or directory'}`);
    if (dir === 'blog' && fs.blog[name]) return postView(name, fs.blog[name], fs.base);
    const table = dir === 'projects' ? fs.projects : dir === '' ? fs.files : {};
    return table[name] ?? error(`cat: ${escape(path)}: no such file or directory`);
  }

  function uptime() {
    const fmt = () => uptimeText(fs.birth);
    // only the most recent uptime ticks
    clearInterval(uptimeTimer);
    terminal.querySelectorAll('.uptime').forEach((el) => el.classList.remove('uptime'));
    uptimeTimer = window.setInterval(() => {
      const el = terminal.querySelector('.uptime');
      if (el) el.textContent = fmt();
    }, 1000);
    return `<span class="uptime">${fmt()}</span>`;
  }

  // every unit is a remainder of the one above it
  function uptimeMaths() {
    const rows = uptimeRows(fs.birth).map(([u, e, v]) => `  ${u} = ${op(e.padEnd(12))} ${v.padStart(3)}`);
    return `<pre>t = now - ${fs.birth}\n\n${rows.join('\n')}\n\n<span class="dim">each unit is what's left once the bigger ones are taken out.</span></pre>`;
  }

  // every file, every line containing the text (case-insensitive), with the
  // match highlighted and the file clickable
  function grep(q: string) {
    const needle = q.replace(/^(['"])(.*)\1$/, '$2').toLowerCase();
    if (!needle) return error('usage: grep [text]');
    const sources: [string, string][] = [
      ...Object.entries(fs.files).map(([n, h]): [string, string] => [`~/${n}`, h]),
      ...Object.entries(fs.projects).map(([n, h]): [string, string] => [`~/projects/${n}`, h]),
      ...Object.entries(fs.blog).map(([n, p]): [string, string] => [`~/blog/${n}`, `${p.title}<br>${p.description}<br>${p.html}`]),
    ];
    const rows: string[] = [];
    let more = 0;
    for (const [path, html] of sources) {
      for (const l of textLines(html)) {
        const at = l.toLowerCase().indexOf(needle);
        if (at < 0) continue;
        if (rows.length >= 20) {
          more++;
          continue;
        }
        // a window around the match, so long paragraphs stay one line
        const from = Math.max(0, at - 40), to = Math.min(l.length, at + needle.length + 40);
        const clip = (from ? '...' : '') + escape(l.slice(from, at)) + `<span class="accent">${escape(l.slice(at, at + needle.length))}</span>` + escape(l.slice(at + needle.length, to)) + (to < l.length ? '...' : '');
        rows.push(`<a class="run dir" href="#" data-cmd="cat ${path}">${path}</a><span class="dim">:</span> ${clip}`);
      }
    }
    if (!rows.length) return `<span class="dim">no matches for "${escape(needle)}"</span>`;
    return rows.map((r) => `<div>${r}</div>`).join('') + (more ? `<span class="dim">...and ${more} more</span>` : '');
  }

  // the site deletes itself, goes dark for a beat, and comes back
  function breakSite(raw: string, promptAt: string) {
    print('', raw, promptAt);
    form.hidden = true;
    const d = reduced() ? 0 : 110;
    DOOMED.forEach((p, i) => setTimeout(() => print(`<span class="dim">removed '${p}'</span>`, undefined, '', 'entry boot'), i * d));
    let down = 0;
    setTimeout(() => {
      print(error('kernel panic - not syncing: the site is gone'), undefined, '', 'entry boot');
      if (!reduced()) document.documentElement.dataset.broken = '';
      down = performance.now();
    }, DOOMED.length * d);
    setTimeout(() => {
      delete document.documentElement.dataset.broken;
      // the real downtime, measured
      print(`restored from backup in ${((performance.now() - down) / 1000).toFixed(1)}s. told you: things that don't break.`);
      found('rm');
      form.hidden = false;
      input.focus({ preventScroll: true });
    }, DOOMED.length * d + (reduced() ? 0 : 1300));
  }

  // vim: everything is an editor command now
  function vimKeys(line: string, raw: string, promptAt: string) {
    if ([':q', ':q!', ':wq', ':wq!', ':x', 'ZZ', 'ZQ'].includes(line)) {
      vim = false;
      print('<span class="dim">you escaped vim. put that on the cv.</span>', raw, promptAt);
    } else if (line === ':w' || line === ':w!') {
      print(error("E45: 'readonly' option is set"), raw, promptAt);
    } else if (line === 'exit' || line === 'quit') {
      print(`${error(`E492: Not an editor command: ${escape(line)}`)}<br><span class="dim">that's the joke. it's :q</span>`, raw, promptAt);
      found('vim-exit');
    } else {
      print(`${error(`E492: Not an editor command: ${escape(line)}`)}<br><span class="dim">(try :q)</span>`, raw, promptAt);
    }
    promptText.textContent = prompt();
  }

  function run(raw: string) {
    const promptAt = prompt();
    const line = raw.trim();
    if (line) history.push(line);
    historyIdx = history.length;
    if (vim) return vimKeys(line, raw, promptAt);
    if (/^:\(\)\s*\{\s*:\s*\|\s*:\s*&\s*\}\s*;\s*:$/.test(line)) {
      print('', raw, promptAt);
      return forkbomb(ctx);
    }
    const [command, ...args] = line.split(/\s+/);
    const egg = quick(line, command, args, escape, error);
    if (egg) {
      print(egg[1], raw, promptAt);
      found(egg[0]);
      return;
    }
    // an egg the switch below finds, counted once its output is up
    let hit = '';
    let out = '';
    switch (command) {
      case '':
        break;
      case 'help': {
        const more = args[0] === 'more';
        const rows = (more ? MORE : COMMANDS).map(([c, d, r]) => `<a class="run" href="#" data-cmd="${r ?? c.split(' [')[0]}">${op(c)}</a><span class="dim">${d}</span>`);
        out = `<div class="cols">${rows.join('')}</div>${
          more
            ? '<span class="dim">back to the first page: <a class="run" href="#" data-cmd="help">help</a></span>'
            : `<span class="dim">${MORE.length} more: <a class="run" href="#" data-cmd="help more">help more</a></span>`
        }`;
        break;
      }
      case 'whoami':
        out = fs.whoami;
        break;
      case 'ls': {
        const path = args.find((a) => !a.startsWith('-'));
        out = ls(path);
        // -a at home shows the dotfiles
        if (args.some((a) => /^-\w*a/.test(a)) && (resolve(path)?.join('') ?? 'x') === '') {
          out = `<div class="ls"><span class="dim">.</span><span class="dim">..</span><a class="run" href="#" data-cmd="cat .secrets">.secrets</a><a class="run" href="#" data-cmd="cat .plan">.plan</a></div>${out}`;
          hit = 'dotfiles';
        }
        break;
      }
      case 'cd': {
        const r = resolve(args[0] ?? '~');
        if (!r || r[1]) out = error(`cd: ${escape(args[0])}: not a directory`);
        else cwd = r[0];
        break;
      }
      case 'pwd':
        out = `/home/zain${cwd ? '/' + cwd : ''}`;
        break;
      case 'cat':
        if (/(^|\/)\.secrets$/.test(args[0] ?? '')) {
          out = 'im lowk hungry rn';
          hit = 'secrets';
        } else if (/(^|\/)\.plan$/.test(args[0] ?? '')) out = 'sleep';
        else out = cat(args[0]);
        break;
      case 'blog':
        out = listing(fs.blog, fs.base, cwd === 'blog' ? '' : cwd ? '../blog/' : 'blog/');
        break;
      case 'open': {
        const r = args[0] ? resolve(args[0].endsWith('.md') || args[0].includes('/') ? args[0] : `~/blog/${args[0]}.md`) : null;
        if (r && r[0] === 'blog' && fs.blog[r[1]]) {
          location.href = `${fs.base}blog/${r[1].replace(/\.md$/, '')}/`;
          out = 'opening...';
        } else out = error(`open: ${escape(args[0] ?? '')}: no such post`);
        break;
      }
      case 'tail':
        out = cat('~/status.log');
        break;
      case 'pgrep':
        out = cat('~/achievements.txt');
        break;
      case 'uptime':
        out = args.includes('-v') ? uptimeMaths() : uptime();
        break;
      case 'expr':
        out = expr(args.join(' '));
        break;
      case 'man':
        if (!args[0]) out = "what manual page do you want?<br>try <a class=\"run\" href=\"#\" data-cmd=\"man modul0\">man modul0</a>";
        else if (args[0] === 'modul0') out = MAN_MODUL0;
        else if (args[0] === 'man') {
          out = MAN_MAN;
          hit = 'man-man';
        }
        else out = error(`no manual entry for ${escape(args[0])}`);
        break;
      case 'theme': {
        const t = args[0] ?? (getTheme() === 'light' ? 'dark' : 'light');
        if (t !== 'light' && t !== 'dark') out = error(`theme: ${escape(t)}: try light or dark`);
        else {
          setTheme(t);
          out = `theme: ${t}`;
        }
        break;
      }
      case 'grep':
        out = grep(args.filter((a) => !/^-\w+$/.test(a)).join(' '));
        break;
      case 'curl': {
        const url = (args.find((a) => !a.startsWith('-')) ?? '').replace(/^https?:\/\//, '').replace(/^www\./, '');
        if (url === 'modul0.dev/cv.txt' || url === 'cv.txt') {
          print('', raw, promptAt);
          fetch(`${fs.base}cv.txt`)
            .then((r) => (r.ok ? r.text() : Promise.reject(r.status)))
            .then((t) => print(`<pre>${escape(t)}</pre>`))
            .catch(() => print(error("curl: (7) couldn't connect. the file's at modul0.dev/cv.txt")));
          return;
        }
        out = `${url ? error(`curl: ${escape(url)}: not from in here`) : error('curl: try a url')}<br>try <a class="run" href="#" data-cmd="curl modul0.dev/cv.txt">curl modul0.dev/cv.txt</a>, here or in a real terminal`;
        break;
      }
      case 'rm': {
        const flags = args.filter((a) => a.startsWith('-')).join('');
        const target = args.find((a) => !a.startsWith('-')) ?? '';
        if (/r/i.test(flags) && /f/.test(flags) && ['/', '/*', '~', '~/', '*', '.'].includes(target)) return breakSite(raw, promptAt);
        out = target ? error(`rm: cannot remove '${escape(target)}': read-only file system`) : error('rm: missing operand');
        break;
      }
      case 'sl':
        hit = 'sl';
        out = reduced()
          ? `<pre>${TRAIN}</pre><span class="dim">you meant ls.</span>`
          : `<div class="sl" role="img" aria-label="a steam train goes past"><pre>${TRAIN}</pre></div>`;
        break;
      case 'vi':
      case 'vim':
      case 'nvim':
        vim = true;
        hit = 'vim';
        out = `<pre>${'~\n'.repeat(5)}<span class="dim">"${escape(args[0] ?? '[No Name]')}" [readonly]</span>\n<span class="accent">-- NORMAL --</span></pre>`;
        break;
      case 'nano':
      case 'emacs':
        hit = 'nano';
        out = `${escape(command)}: not installed. there's <a class="run" href="#" data-cmd="vim">vim</a>, though.`;
        break;
      case 'ping': {
        const host = (args.find((a) => !a.startsWith('-')) ?? '').toLowerCase();
        if (!host) out = error('ping: usage error: destination address required');
        else if (host === 'alexandria') {
          out = "PING alexandria: it doesn't answer strangers.";
          hit = 'ping';
        }
        else if (['modul0.dev', 'modul0', 'localhost', '127.0.0.1'].includes(host)) out = `64 bytes from ${escape(host)}: time=0ms. you're already here.`;
        else out = error(`ping: ${escape(host)}: this is a website. it can't send icmp.`);
        break;
      }
      case 'neofetch': {
        const row = (k: string, v: string) => `<span class="accent">${k.padEnd(9)}</span>${v}`;
        const b = fs.build;
        const info = [
          '<b>zain</b>@<b>modul0</b>',
          '-----------',
          row('os', 'modul0.dev (astro + react, static)'),
          row('host', 'github pages'),
          row('kernel', b?.short ? `<a href="${b.url}" rel="noopener">${b.short}</a>` : 'dev'),
          row('uptime', uptimeText(fs.birth)),
          row('shell', 'this one. type help'),
          row('study', 'cs @ kcl, year 2'),
          row('stack', 'python, go, typescript, java, c#'),
          row('homelab', 'alexandria (ubuntu server), valhalla (blade 14)'),
          row('theme', getTheme()),
          '',
          '<span class="neo-swatch"><i style="background:var(--void)"></i><i style="background:var(--line-strong)"></i><i style="background:var(--muted)"></i><i style="background:var(--purple-deep)"></i><i style="background:var(--purple)"></i><i style="background:var(--white)"></i></span>',
        ];
        out = `<div class="neo"><pre class="neo-logo" aria-hidden="true">${logo()}</pre><pre>${info.join('\n')}</pre></div>`;
        break;
      }
      case 'git': {
        const b = fs.build;
        const sub = args[0];
        if (sub === 'log') {
          const n = Number((args.find((a) => /^-n?\d+$/.test(a)) ?? '').replace(/^-n?/, '')) || Number(args[args.indexOf('-n') + 1]) || 10;
          const log = (b?.log ?? []).slice(0, Math.min(n, 15));
          if (!log.length) out = '<span class="dim">no history in this build (a local dev server, probably)</span>';
          else
            out = log
              .map((c) => {
                const s = c.subject.length > 110 ? c.subject.slice(0, 110) + '...' : c.subject;
                return `<div><a href="${b!.repo}/commit/${c.sha}" rel="noopener">${c.sha.slice(0, 7)}</a> <span class="dim">${c.date}</span> ${escape(s)}</div>`;
              })
              .join('');
        } else if (sub === 'status') {
          out = "<pre>on branch main\nyour branch is up to date with 'origin/main'.\n\nnothing to commit, working tree clean</pre>";
        } else if (sub === 'push') {
          out = error('remote: permission to iamzainrizwan/modul0.git denied to guest.');
          hit = 'git-push';
        } else if (sub === 'blame') {
          out = "zain. it's always zain.";
          hit = 'git-blame';
        } else if (sub === 'clone') {
          out = `the source is public: <a href="${b?.repo ?? 'https://github.com/iamzainrizwan/modul0'}" rel="noopener">github.com/iamzainrizwan/modul0</a>`;
        } else {
          out = `usage: git [log | status]<br>try <a class="run" href="#" data-cmd="git log">git log</a>`;
        }
        break;
      }
      case 'history':
        out = `<pre>${history.map((h, i) => `${String(i + 1).padStart(4)}  ${escape(h)}`).join('\n')}</pre>`;
        break;
      case 'echo': {
        // a few variables, the rest echo as typed
        const vars: Record<string, string> = { $SHELL: '/bin/modul0', $USER: 'guest', $HOME: '/home/zain', $PWD: `/home/zain${cwd ? '/' + cwd : ''}` };
        out = args.map((a) => vars[a] ?? escape(a)).join(' ');
        if (args.includes('$SHELL')) hit = 'shell';
        break;
      }
      case 'eggs':
        if (args[0] === '--reset') {
          resetEggs();
          out = '<span class="dim">tally cleared. happy hunting.</span>';
        } else out = eggsReport(escape);
        break;
      case 'yes':
        print('', raw, promptAt);
        return yes(ctx, escape(args.join(' ') || 'y'));
      case 'hack':
        print('', raw, promptAt);
        return hack(ctx, args.join(' '), escape);
      case 'cmatrix':
      case 'matrix':
        print('', raw, promptAt);
        return cmatrix(ctx);
      case 'snake':
        print('', raw, promptAt);
        return snake(ctx);
      case 'reboot': {
        print('<span class="dim">broadcast message from zain@modul0: the system is going down for reboot NOW!</span>', raw, promptAt);
        found('reboot');
        form.hidden = true;
        // a countdown, so the egg's there to see; then a real load of home
        // with the boot unplayed, so it plays again
        const count = print('rebooting in 3...');
        let n = 3;
        const tick = setInterval(() => {
          if (--n > 0) return void (count.textContent = `rebooting in ${n}...`);
          clearInterval(tick);
          try {
            sessionStorage.removeItem('modul0-booted');
          } catch {}
          location.href = fs.base;
        }, 1000);
        return;
      }
      case 'shutdown':
      case 'poweroff':
      case 'halt':
        print('the system is going down for poweroff NOW!', raw, promptAt);
        form.hidden = true;
        setTimeout(() => {
          print("<span class=\"dim\">...nah. uptime's the whole point.</span>");
          found('shutdown');
          form.hidden = false;
          promptText.textContent = prompt();
          input.focus({ preventScroll: true });
        }, reduced() ? 0 : 1300);
        return;
      case 'date':
        out = new Date().toString();
        break;
      case 'exit':
        if (opts.onExit) {
          print('logout', raw, promptAt);
          opts.onExit();
          return;
        }
        location.href = fs.base;
        out = 'logout';
        break;
      case 'clear':
        output.replaceChildren();
        return;
      default:
        // bare arithmetic works too: `17 % 5`
        if (ARITH.test(line)) {
          out = expr(line);
          break;
        }
        out = error(`${escape(command)}: command not found. whatever you typed was stupid lol`);
    }
    print(out, raw, promptAt);
    promptText.textContent = prompt();
    if (hit) found(hit);
    // the train leaves; what's left is the joke
    const sl = output.lastElementChild?.querySelector('.sl');
    sl?.addEventListener('animationend', () => (sl.outerHTML = '<span class="dim">the train left. you meant ls.</span>'), { once: true });
  }

  function complete() {
    const value = input.value;
    const words = value.split(/\s+/);
    const last = words[words.length - 1];
    let candidates: string[];
    if (words.length === 1) {
      candidates = [...new Set([...COMMANDS, ...MORE].map(([c]) => c.split(' ')[0]))];
    } else {
      const slash = last.lastIndexOf('/');
      const dirPart = last.slice(0, slash + 1);
      const r = resolve(dirPart || '.');
      candidates = r && !r[1] ? dirEntries(r[0]).map((e) => dirPart + e) : [];
    }
    const matches = candidates.filter((c) => c.startsWith(last));
    if (matches.length === 1) {
      words[words.length - 1] = matches[0] + (words.length === 1 ? ' ' : '');
      input.value = words.join(' ');
    } else if (matches.length > 1) {
      let prefix = matches[0];
      for (const m of matches) while (!m.startsWith(prefix)) prefix = prefix.slice(0, -1);
      if (prefix.length > last.length) {
        words[words.length - 1] = prefix;
        input.value = words.join(' ');
      } else print(matches.map((m) => m.slice(m.lastIndexOf('/', m.length - 2) + 1)).join('  '), value);
    }
  }

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    run(input.value);
    input.value = '';
  });

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      complete();
    } else if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      e.preventDefault();
      historyIdx = Math.max(0, Math.min(history.length, historyIdx + (e.key === 'ArrowUp' ? -1 : 1)));
      input.value = history[historyIdx] ?? '';
      input.setSelectionRange(input.value.length, input.value.length);
    } else if (e.ctrlKey && e.key === 'l') {
      e.preventDefault();
      run('clear');
    } else if (e.ctrlKey && e.key === 'c') {
      if (input.selectionStart !== input.selectionEnd) return; // let copy through
      print('', input.value + '^C');
      input.value = '';
    }
  });

  // clickable output (ls entries, help) runs commands; plain links behave normally
  output.addEventListener('click', (e) => {
    const target = (e.target as HTMLElement).closest<HTMLElement>('[data-cmd]');
    if (!target || e.metaKey || e.ctrlKey) return;
    e.preventDefault();
    run(target.dataset.cmd!);
    input.focus();
  });

  // focus the input on click anywhere, unless the user is selecting text
  terminal.addEventListener('click', (e) => {
    if ((e.target as HTMLElement).closest('a') || getSelection()?.toString()) return;
    input.focus({ preventScroll: true });
  });

  function ready() {
    form.hidden = false;
    promptText.textContent = prompt();
    if (window.matchMedia('(hover: hover)').matches) input.focus({ preventScroll: true });
  }

  const delay = matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : (opts.bootDelay ?? 150);
  BOOT.forEach((line, i) => setTimeout(() => print(line, undefined, '', i === BOOT.length - 1 ? 'entry' : 'entry boot'), i * delay));
  setTimeout(ready, BOOT.length * delay);

  return {
    focus: () => input.focus({ preventScroll: true }),
    // put text on the command line, ready to finish and run (the page's / key)
    type: (text: string) => {
      input.value = text;
      input.focus({ preventScroll: true });
      input.setSelectionRange(text.length, text.length);
    },
  };
}
