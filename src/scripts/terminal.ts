import { listing, postView } from './render';
import { uptimeRows, uptimeText } from './uptime';
import { getTheme, setTheme } from './theme';

type Post = { title: string; date: string; description: string; html: string };
export type Fs = {
  files: Record<string, string>;
  projects: Record<string, string>;
  blog: Record<string, Post>;
  whoami: string;
  birth: string;
  base: string;
};

const DIRS = ['projects', 'blog'] as const;
type Dir = '' | (typeof DIRS)[number];

// [label, description, what clicking it in `help` runs (default: the label)]
const COMMANDS: [string, string, string?][] = [
  ['help', 'list of available commands'],
  ['whoami', 'who i am'],
  ['ls [dir]', 'list files'],
  ['cd [dir]', 'change directory'],
  ['cat [file]', 'output file contents'],
  ['open [post]', 'go to a post\'s own page'],
  ['blog', 'list blog posts'],
  ['uptime [-v]', 'time since i was born (-v shows the maths)', 'uptime -v'],
  ['expr a % b', 'the remainder of a / b', 'expr 17 % 5'],
  ['man modul0', "why it's called that"],
  ['tail -f status.log', "what i'm working on right now"],
  ['pgrep -a zain', 'recent achievements'],
  ['theme [light|dark]', 'switch the colours', 'theme'],
  ['history', 'commands you\'ve run'],
  ['clear', 'clear screen'],
  ['exit', 'back to the normal site'],
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

  const prompt = () => `zain@modul0:~${cwd ? '/' + cwd : ''}$`;

  function print(html: string, command?: string, promptAt = prompt(), cls = 'entry') {
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
    if (opts.scroller) opts.scroller.scrollTop = opts.scroller.scrollHeight;
    else form.scrollIntoView({ block: 'end' });
  }

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

  function run(raw: string) {
    const promptAt = prompt();
    const line = raw.trim();
    if (line) history.push(line);
    historyIdx = history.length;
    const [command, ...args] = line.split(/\s+/);
    let out = '';
    switch (command) {
      case '':
        break;
      case 'help':
        out = `<div class="cols">${COMMANDS.map(([c, d, r]) => `<a class="run" href="#" data-cmd="${r ?? c.split(' [')[0]}">${op(c)}</a><span class="dim">${d}</span>`).join('')}</div>`;
        break;
      case 'whoami':
        out = fs.whoami;
        break;
      case 'ls':
        out = ls(args.find((a) => !a.startsWith('-')));
        break;
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
        out = cat(args[0]);
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
      case 'history':
        out = `<pre>${history.map((h, i) => `${String(i + 1).padStart(4)}  ${escape(h)}`).join('\n')}</pre>`;
        break;
      case 'echo':
        out = escape(args.join(' '));
        break;
      case 'date':
        out = new Date().toString();
        break;
      case 'sudo':
        out = error('zain is not in the sudoers file. this incident will be reported.');
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
  }

  function complete() {
    const value = input.value;
    const words = value.split(/\s+/);
    const last = words[words.length - 1];
    let candidates: string[];
    if (words.length === 1) {
      candidates = [...new Set(COMMANDS.map(([c]) => c.split(' ')[0]))];
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

  const delay = matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 150;
  BOOT.forEach((line, i) => setTimeout(() => print(line, undefined, '', i === BOOT.length - 1 ? 'entry' : 'entry boot'), i * delay));
  setTimeout(ready, BOOT.length * delay);

  return { focus: () => input.focus({ preventScroll: true }) };
}
