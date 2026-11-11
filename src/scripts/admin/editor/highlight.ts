// code blocks in the preview, coloured the way the blog colours them: astro
// runs shiki with github-dark at build, so this runs the same shiki, theme and
// grammars in the browser. nothing loads until a post has a fenced block, and
// each language loads the first time it's used. a language not listed here
// shows plain in the preview (the built post may still colour it).
import type { HighlighterCore } from 'shiki/core';

type Grammar = () => Promise<{ default: unknown }>;
const GRAMMARS: Record<string, Grammar> = {
  javascript: () => import('@shikijs/langs/javascript'),
  typescript: () => import('@shikijs/langs/typescript'),
  jsx: () => import('@shikijs/langs/jsx'),
  tsx: () => import('@shikijs/langs/tsx'),
  json: () => import('@shikijs/langs/json'),
  bash: () => import('@shikijs/langs/bash'),
  python: () => import('@shikijs/langs/python'),
  go: () => import('@shikijs/langs/go'),
  c: () => import('@shikijs/langs/c'),
  cpp: () => import('@shikijs/langs/cpp'),
  java: () => import('@shikijs/langs/java'),
  kotlin: () => import('@shikijs/langs/kotlin'),
  csharp: () => import('@shikijs/langs/csharp'),
  rust: () => import('@shikijs/langs/rust'),
  sql: () => import('@shikijs/langs/sql'),
  yaml: () => import('@shikijs/langs/yaml'),
  toml: () => import('@shikijs/langs/toml'),
  ini: () => import('@shikijs/langs/ini'),
  html: () => import('@shikijs/langs/html'),
  css: () => import('@shikijs/langs/css'),
  xml: () => import('@shikijs/langs/xml'),
  markdown: () => import('@shikijs/langs/markdown'),
  diff: () => import('@shikijs/langs/diff'),
  docker: () => import('@shikijs/langs/docker'),
  nginx: () => import('@shikijs/langs/nginx'),
  latex: () => import('@shikijs/langs/latex'),
  lua: () => import('@shikijs/langs/lua'),
  ruby: () => import('@shikijs/langs/ruby'),
  php: () => import('@shikijs/langs/php'),
  haskell: () => import('@shikijs/langs/haskell'),
  asm: () => import('@shikijs/langs/asm'),
};
// the other names a fence can use (shiki's own aliases)
const ALIAS: Record<string, string> = {
  js: 'javascript', mjs: 'javascript', cjs: 'javascript', ts: 'typescript', mts: 'typescript',
  sh: 'bash', shell: 'bash', zsh: 'bash', shellscript: 'bash', py: 'python', golang: 'go',
  'c++': 'cpp', cs: 'csharp', 'c#': 'csharp', rs: 'rust', yml: 'yaml', kt: 'kotlin', kts: 'kotlin',
  md: 'markdown', dockerfile: 'docker', tex: 'latex', rb: 'ruby', hs: 'haskell', jsonc: 'json', svg: 'xml',
};
const THEME = 'github-dark';

let core: Promise<HighlighterCore> | null = null;
let ready: HighlighterCore | null = null; // the same, once it's up
const loaded = new Set<string>(['text']);
const loading = new Map<string, Promise<void>>();

const langOf = (name: string) => {
  const n = name.toLowerCase();
  const id = ALIAS[n] ?? n;
  return GRAMMARS[id] ? id : null;
};

function highlighter() {
  core ??= Promise.all([import('shiki/core'), import('shiki/engine/javascript'), import('@shikijs/themes/github-dark')]).then(
    async ([{ createHighlighterCore }, { createJavaScriptRegexEngine }, theme]) =>
      (ready = await createHighlighterCore({ themes: [theme.default], langs: [], engine: createJavaScriptRegexEngine() })),
  );
  return core;
}

function load(id: string) {
  if (!loading.has(id)) {
    const job = Promise.all([highlighter(), GRAMMARS[id]()]).then(async ([h, g]) => {
      await h.loadLanguage(g.default as never);
      loaded.add(id);
    });
    job.catch(() => loading.delete(id)); // offline: try again on the next redraw
    loading.set(id, job);
  }
  return loading.get(id)!;
}

const cache = new Map<string, string>();

// the same markup astro writes: class astro-code, the language on the pre
function render(h: HighlighterCore, id: string, name: string, src: string) {
  return h
    .codeToHtml(src.replace(/\n$/, ''), { lang: id, theme: THEME })
    .replace('class="shiki ', 'class="astro-code ')
    .replace(/<pre([^>]*)>/, `<pre$1 data-language="${name || 'plaintext'}">`);
}

// colour every <pre><code> under root. anything not ready yet is fetched and
// `again` called once it is, so the caller can redraw
export function colour(root: HTMLElement, again: () => void) {
  for (const code of root.querySelectorAll<HTMLElement>('pre > code')) {
    const name = /language-(\S+)/.exec(code.className)?.[1] ?? '';
    const id = langOf(name) ?? 'text';
    const src = code.textContent ?? '';
    const key = `${name}\n${src}`;
    let html = cache.get(key);
    if (!html) {
      if (!ready) {
        highlighter().then(again, () => {});
        continue;
      }
      if (!loaded.has(id)) {
        load(id).then(again, () => {});
        continue;
      }
      cache.set(key, (html = render(ready, id, name, src)));
      if (cache.size > 200) cache.delete(cache.keys().next().value!);
    }
    const t = document.createElement('template');
    t.innerHTML = html;
    const pre = code.parentElement!;
    const next = t.content.firstElementChild as HTMLElement | null;
    if (next && pre.dataset.at) next.dataset.at = pre.dataset.at; // the scroll sync's anchor
    pre.replaceWith(t.content);
  }
}
