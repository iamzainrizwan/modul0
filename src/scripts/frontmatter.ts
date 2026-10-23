// the post editor's frontmatter: the flat `key: value` lines blog posts use
// (src/content.config.ts). keys the editor doesn't know are kept as written.

export type Post = { title: string; date: string; description: string; draft: boolean; body: string; rest: string[] };

const unquote = (v: string) => {
  if (v.startsWith('"')) try { return JSON.parse(v); } catch {}
  if (v.startsWith("'") && v.endsWith("'")) return v.slice(1, -1).replace(/''/g, "'");
  return v;
};

// quoted only when yaml would misread it; a json string is valid yaml
const quote = (v: string) => (/^[\w(][^:#]*$/.test(v) && !/\s$/.test(v) ? v : JSON.stringify(v));

export function parse(text: string): Post {
  const post: Post = { title: '', date: '', description: '', draft: false, body: text, rest: [] };
  const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!m) return post;
  post.body = m[2].replace(/^\n/, '');
  for (const line of m[1].split(/\r?\n/)) {
    const kv = line.match(/^(\w+):\s*(.*)$/);
    const key = kv?.[1];
    if (key === 'title' || key === 'description') post[key] = unquote(kv![2]);
    else if (key === 'date') post.date = unquote(kv![2]).slice(0, 10);
    else if (key === 'draft') post.draft = kv![2].trim() === 'true';
    else if (line.trim()) post.rest.push(line);
  }
  return post;
}

export function serialise(p: Post): string {
  const lines = [`title: ${quote(p.title)}`, `date: ${p.date}`, `description: ${quote(p.description)}`];
  if (p.draft) lines.push('draft: true');
  return `---\n${[...lines, ...p.rest].join('\n')}\n---\n\n${p.body.replace(/^\n+/, '').replace(/\s*$/, '\n')}`;
}
