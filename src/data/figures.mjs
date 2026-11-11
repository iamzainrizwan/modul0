// blog images as figures (astro.config.mjs runs this over every post; the
// admin preview does the same in src/scripts/admin/editor/figures.ts).
// a paragraph holding nothing but images becomes figures:
//   ![alt](/blog/x/a.webp "caption")   the title is the caption
//   ![alt](/blog/x/a.webp#narrow)      #narrow draws it narrower
//   two or more on one line            they sit side by side
const blank = (n) => n.type === 'text' && !n.value.trim();
const isImg = (n) => n.type === 'element' && n.tagName === 'img';
const el = (tagName, properties, children) => ({ type: 'element', tagName, properties, children });

function figure(img) {
  const props = { ...img.properties };
  const src = String(props.src ?? '');
  const narrow = src.endsWith('#narrow');
  const caption = props.title;
  if (narrow) props.src = src.slice(0, -'#narrow'.length);
  delete props.title;
  const kids = [el('img', props, [])];
  if (caption) kids.push(el('figcaption', {}, [{ type: 'text', value: String(caption) }]));
  return el('figure', narrow ? { className: ['narrow'] } : {}, kids);
}

// a sätteri hast plugin (astro 7's markdown): astro.config.mjs passes it to satteri()
export default {
  name: 'figures',
  element: {
    filter: ['p'],
    visit(p, ctx) {
      const kids = p.children.filter((k) => !blank(k));
      if (!kids.length || !kids.every(isImg)) return;
      ctx.replaceNode(p, kids.length === 1 ? figure(kids[0]) : el('div', { className: ['figs'] }, kids.map(figure)));
    },
  },
};
