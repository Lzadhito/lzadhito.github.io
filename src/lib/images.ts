// Build-time story (1080×1920) and social preview (1200×630) images.
// Always the light palette so every share looks the same (DESIGN.md "Colors").
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { Resvg } from '@resvg/resvg-js';
import satori, { type Font } from 'satori';
import { tokens } from '../design/tokens';
import { SITE_DOMAIN } from '../consts';

const c = tokens.colors;
const fontDir = resolve(process.cwd(), 'src/assets/fonts');
const load = (file: string) => readFileSync(resolve(fontDir, file));

// Satori reads TTF/OTF/WOFF (not WOFF2) and no variable fonts: static instances only.
const fonts: Font[] = [
  { name: 'Hanken Grotesk', data: load('hanken-grotesk-latin-400-normal.woff'), weight: 400, style: 'normal' },
  { name: 'Hanken Grotesk', data: load('hanken-grotesk-latin-700-normal.woff'), weight: 700, style: 'normal' },
  { name: 'Fira Mono', data: load('fira-mono-latin-400-normal.woff'), weight: 400, style: 'normal' },
  { name: 'Fira Mono', data: load('fira-mono-latin-700-normal.woff'), weight: 700, style: 'normal' },
];

type Node = { type: string; props: { style?: Record<string, unknown>; children?: unknown } };
const h = (type: string, style: Record<string, unknown>, children?: unknown): Node => ({
  type,
  props: { style: { display: 'flex', ...style }, children },
});

const sans = 'Hanken Grotesk'; // writing
const mono = 'Fira Mono'; // the site's own voice

async function toSvg(node: Node, width: number, height?: number) {
  return satori(node as never, { width, ...(height ? { height } : {}), fonts });
}

async function toPng(node: Node, width: number, height: number): Promise<Uint8Array> {
  const svg = await toSvg(node, width, height);
  return new Resvg(svg, { fitTo: { mode: 'width', value: width } }).render().asPng();
}

/** Rendered height of a text block at a given width (Satori computes it when height is omitted). */
async function measure(text: string, o: { size: number; weight: number; lineHeight: number; width: number }) {
  const node = h('div', { width: o.width }, [
    h('div', { fontFamily: sans, fontWeight: o.weight, fontSize: o.size, lineHeight: o.lineHeight, whiteSpace: 'pre-wrap' }, text),
  ]);
  const svg = await toSvg(node, o.width);
  return Number(svg.match(/<svg[^>]*\sheight="([\d.]+)"/)![1]);
}

/** Largest word-boundary prefix that fits maxHeight, ending with "…". */
async function truncate(text: string, maxHeight: number, o: Parameters<typeof measure>[1]) {
  const words = text.match(/\S+\s*/g) ?? [];
  let lo = 0;
  let hi = words.length;
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2);
    const candidate = words.slice(0, mid).join('').trimEnd() + '…';
    if ((await measure(candidate, o)) <= maxHeight) lo = mid;
    else hi = mid - 1;
  }
  return words.slice(0, lo).join('').trimEnd().replace(/[,;:\s]+$/, '') + '…';
}

interface Fit {
  text: string;
  size: number;
  truncated: boolean;
}

async function fit(
  text: string,
  o: { sizes: number[]; weight: number; lineHeight: number; width: number; maxHeight: (size: number) => number },
): Promise<Fit> {
  for (const size of o.sizes) {
    if ((await measure(text, { ...o, size })) <= o.maxHeight(size)) return { text, size, truncated: false };
  }
  const size = o.sizes[o.sizes.length - 1];
  return { text: await truncate(text, o.maxHeight(size), { ...o, size }), size, truncated: true };
}

const lines = (n: number, lineHeight: number) => (size: number) => Math.ceil(n * size * lineHeight) + 2;

export interface ImagePost {
  type: 'note' | 'essay';
  /** Note: the body as plain paragraphs. Essay: the title. */
  text: string;
  /** Essay only. */
  excerpt?: string;
  /** Pre-formatted date line (with time for Notes). */
  dateLine: string;
}

/** Story image, 1080 × 1920. Layout zones follow DESIGN.md "Story image". */
export async function storyImage(post: ImagePost): Promise<Uint8Array> {
  const W = 1080;
  const H = 1920;
  const X = 96;
  const boxW = 888;
  const boxTop = 360;
  const boxH = 1060;

  let body: Node;
  let truncated = false;

  if (post.type === 'note') {
    const f = await fit(post.text, { sizes: [72, 64, 56, 50, 44], weight: 400, lineHeight: 1.3, width: boxW, maxHeight: () => boxH });
    truncated = f.truncated;
    body = h('div', { fontFamily: sans, fontWeight: 400, fontSize: f.size, lineHeight: 1.3, color: c.primary, whiteSpace: 'pre-wrap' }, f.text);
  } else {
    const title = await fit(post.text, {
      sizes: [88, 80, 72, 64, 56],
      weight: 700,
      lineHeight: 1.12,
      width: boxW,
      maxHeight: lines(4, 1.12), // max 4 lines
    });
    const titleH = await measure(title.text, { size: title.size, weight: 700, lineHeight: 1.12, width: boxW });
    const excerptSize = 44;
    const excerptLh = 1.3;
    const excerptMax = Math.min(6 * excerptSize * excerptLh, boxH - titleH - 56);
    const excerpt = await truncate(post.excerpt ?? '', excerptMax, { size: excerptSize, weight: 400, lineHeight: excerptLh, width: boxW });
    truncated = true;
    body = h('div', { flexDirection: 'column' }, [
      h('div', { fontFamily: sans, fontWeight: 700, fontSize: title.size, lineHeight: 1.12, color: c.primary }, title.text),
      h('div', { marginTop: 56, fontFamily: sans, fontWeight: 400, fontSize: excerptSize, lineHeight: excerptLh, color: c.secondary }, excerpt),
    ]);
  }

  const meta = { fontFamily: mono, fontWeight: 400, fontSize: 34, lineHeight: 1.3 };
  const root = h('div', { width: W, height: H, position: 'relative', background: c.neutral }, [
    h('div', { position: 'absolute', left: X, top: 268, flexDirection: 'column' }, [
      h('div', { ...meta, fontWeight: 700, color: c.primary }, 'Dito'),
      h('div', { ...meta, color: c.secondary }, post.dateLine),
    ]),
    h('div', { position: 'absolute', left: X, top: boxTop, width: boxW, height: boxH, overflow: 'hidden' }, [body]),
    h('div', { position: 'absolute', left: X, top: 1440, flexDirection: 'column' }, [
      truncated ? h('div', { ...meta, color: c.secondary }, 'Read the rest at') : null,
      h('div', { ...meta, color: c.tertiary }, SITE_DOMAIN),
    ].filter(Boolean)),
  ]);
  return toPng(root, W, H);
}

/** Social preview, 1200 × 630. Essays use the title, Notes the first sentence. */
export async function ogImage(o: { title: string }): Promise<Uint8Array> {
  const W = 1200;
  const H = 630;
  const boxW = W - 160;
  const f = await fit(o.title, { sizes: [60, 56, 52, 48, 44, 40], weight: 400, lineHeight: 1.25, width: boxW, maxHeight: lines(4, 1.25) });

  const meta = { fontFamily: mono, fontWeight: 400, fontSize: 26, lineHeight: 1.3 };
  const root = h('div', { width: W, height: H, padding: '72px 80px', flexDirection: 'column', justifyContent: 'space-between', background: c.neutral }, [
    h('div', { fontFamily: sans, fontWeight: 400, fontSize: f.size, lineHeight: 1.25, color: c.primary, whiteSpace: 'pre-wrap' }, f.text),
    h('div', { ...meta, color: c.secondary }, [
      h('span', { marginRight: 8 }, 'Dito,'),
      h('span', { color: c.tertiary }, SITE_DOMAIN),
    ]),
  ]);
  return toPng(root, W, H);
}

/** Flat PNG of a single glyph for app icons. */
export async function glyphIcon(size: number, opts: { maskable?: boolean } = {}): Promise<Uint8Array> {
  const glyph = Math.round(size * (opts.maskable ? 0.5 : 0.7));
  const root = h('div', { width: size, height: size, alignItems: 'center', justifyContent: 'center', background: c.neutral }, [
    h('div', { fontFamily: sans, fontWeight: 700, fontSize: glyph, lineHeight: 1, color: c.primary, marginTop: -Math.round(glyph * 0.06) }, 'd'),
  ]);
  return toPng(root, size, size);
}
