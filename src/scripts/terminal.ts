import { listing, postView } from './render';

type Post = { title: string; date: string; description: string; html: string };
type Fs = {
  files: Record<string, string>;
  projects: Record<string, string>;
  blog: Record<string, Post>;
  whoami: string;
  birth: string;
  base: string;
};

const DIRS = ['projects', 'blog'] as const;
type Dir = '' | (typeof DIRS)[number];

const COMMANDS: [string, string][] = [
  ['help', 'list of available commands'],
  ['whoami', 'who i am'],
  ['ls [dir]', 'list files'],
  ['cd [dir]', 'change directory'],
  ['cat [file]', 'output file contents'],
  ['open [post]', 'go to a post\'s own page'],
  ['blog', 'list blog posts'],
  ['uptime', 'time since i was born'],
  ['tail -f status.log', "what i'm working on right now"],
  ['pgrep -a zain', 'recent achievements'],
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

export function boot() {
  const fs: Fs = JSON.parse(document.getElementById('fs')!.textContent!);
  const terminal = document.querySelector<HTMLElement>('.terminal')!;
  const output = document.getElementById('output')!;
  const form = document.getElementById('input') as HTMLFormElement;
  const input = document.getElementById('cmd') as HTMLInputElement;
  const promptText = document.getElementById('prompt-text')!;

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
    form.scrollIntoView({ block: 'end' });
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
    const fmt = () => {
      const day = 864e5, year = day * 365.25;
      const diff = Date.now() - new Date(fs.birth).valueOf();
      const y = Math.floor(diff / year), d = Math.floor((diff % year) / day);
      const h = Math.floor((diff % day) / 36e5), m = Math.floor((diff % 36e5) / 6e4), s = Math.floor((diff % 6e4) / 1e3);
      return `${y}y ${d}d ${h}h ${m}m ${s}s`;
    };
    // only the most recent uptime ticks
    clearInterval(uptimeTimer);
    document.querySelectorAll('.uptime').forEach((el) => el.classList.remove('uptime'));
    uptimeTimer = window.setInterval(() => {
      const el = document.querySelector('.uptime');
      if (el) el.textContent = fmt();
    }, 1000);
    return `<span class="uptime">${fmt()}</span>`;
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
        out = `<div class="cols">${COMMANDS.map(([c, d]) => `<a class="run" href="#" data-cmd="${c.split(' [')[0]}">${c}</a><span class="dim">${d}</span>`).join('')}</div>`;
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
        out = uptime();
        break;
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
        location.href = fs.base;
        out = 'logout';
        break;
      case 'clear':
        output.replaceChildren();
        return;
      default:
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
}
