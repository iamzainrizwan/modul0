// renders each share card (src/data/og.ts) to a 1200x627 png at build time:
// satori lays it out to svg with the site's fonts, resvg rasterises it.
// same frame, bars and type as the hand-made home card.
import type { APIRoute, GetStaticPaths } from 'astro';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';
import { cards, type Card } from '../../data/og';

const require = createRequire(import.meta.url);
const font = (pkg: string, file: string) => readFileSync(require.resolve(`${pkg}/files/${file}`));
const fonts = [
  { name: 'Newsreader', data: font('@fontsource/newsreader', 'newsreader-latin-800-normal.woff'), weight: 800 as const, style: 'normal' as const },
  { name: 'Plex', data: font('@fontsource/ibm-plex-mono', 'ibm-plex-mono-latin-400-normal.woff'), weight: 400 as const, style: 'normal' as const },
  { name: 'Plex', data: font('@fontsource/ibm-plex-mono', 'ibm-plex-mono-latin-600-normal.woff'), weight: 600 as const, style: 'normal' as const },
];

const C = { void: '#000', white: '#fff', soft: '#c9c9c9', muted: '#9e9e9e', purple: '#a769ff' };

// a tiny element helper, so the layout reads like markup
type Node = { type: string; props: Record<string, unknown> };
const h = (type: string, style: Record<string, unknown>, ...children: (Node | string)[]): Node => ({
  type,
  props: { style: { display: 'flex', ...style }, children },
});

function card(c: Card): Node {
  const size = c.title.length <= 14 ? 132 : c.title.length <= 30 ? 96 : 72;
  const bar = { height: 82, padding: '0 38px', alignItems: 'center', justifyContent: 'space-between', fontFamily: 'Plex', fontWeight: 600, fontSize: 28 };
  return h(
    'div',
    { width: 1200, height: 627, padding: 28, background: C.void },
    h(
      'div',
      { flex: 1, flexDirection: 'column', border: `3px solid ${C.white}` },
      h(
        'div',
        { ...bar, color: C.white, borderBottom: `3px solid ${C.white}` },
        h('span', {}, 'zain_rizwan', h('span', { color: C.purple }, '@'), 'modul0.dev'),
        h('span', { color: C.muted, fontWeight: 400 }, h('span', { color: C.purple, fontWeight: 600, marginRight: 14 }, '$'), c.prompt),
      ),
      h(
        'div',
        { flex: 1, flexDirection: 'column', justifyContent: 'center', padding: '0 38px' },
        h(
          'div',
          { flexWrap: 'wrap', alignItems: 'flex-end', color: C.white, fontFamily: 'Newsreader', fontWeight: 800, fontSize: size, lineHeight: 1, letterSpacing: '-0.03em' },
          c.title,
          h('span', { width: size * 0.27, height: size * 0.66, marginLeft: size * 0.08, marginBottom: size * 0.1, background: C.purple }),
        ),
        h('div', { marginTop: 30, maxWidth: 1000, color: C.soft, fontFamily: 'Plex', fontSize: 28, lineHeight: 1.4 }, c.description),
      ),
      // a long post url gets the bar to itself
      h('div', { ...bar, color: C.void, background: C.purple }, h('span', {}, `modul0.dev/${c.path}`), h('span', {}, c.path.length > 22 ? '' : "year 2 cs @ king's college london")),
    ),
  );
}

export const getStaticPaths: GetStaticPaths = async () => (await cards()).map((c) => ({ params: { slug: c.slug }, props: { card: c } }));

export const GET: APIRoute = async ({ props }) => {
  const svg = await satori(card(props.card as Card) as never, { width: 1200, height: 627, fonts });
  const png = new Resvg(svg, { fitTo: { mode: 'width', value: 1200 } }).render().asPng();
  return new Response(png, { headers: { 'content-type': 'image/png' } });
};
