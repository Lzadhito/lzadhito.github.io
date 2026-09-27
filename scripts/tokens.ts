// Reads the YAML front matter of DESIGN.md and writes:
//   src/design/tokens.css  (CSS custom properties, -night values under :root[data-theme='dark'])
//   src/design/tokens.ts   (plain object for the Satori templates)
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from 'yaml';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const source = readFileSync(resolve(root, 'DESIGN.md'), 'utf8');
const match = source.match(/^---\n([\s\S]*?)\n---/);
if (!match) throw new Error('DESIGN.md has no YAML front matter');

type Dict = Record<string, string | number>;
const doc = parse(match[1]) as {
  colors: Dict;
  typography: Record<string, Dict>;
  rounded: Dict;
  spacing: Dict;
};

const kebab = (s: string) => s.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);
const NIGHT = '-night';

const light = Object.entries(doc.colors).filter(([k]) => !k.endsWith(NIGHT));
const night = Object.entries(doc.colors).filter(([k]) => k.endsWith(NIGHT));
// on-tertiary-night pairs with on-tertiary, etc.
const nightVars = night.map(([k, v]) => `  --color-${k.slice(0, -NIGHT.length)}: ${v};`);

const typeVars = Object.entries(doc.typography).flatMap(([name, t]) =>
  Object.entries(t).map(([prop, v]) => `  --type-${name}-${kebab(prop)}: ${v};`),
);

const css = `/* Generated from DESIGN.md by scripts/tokens.ts. Do not edit. */
:root {
${light.map(([k, v]) => `  --color-${k}: ${v};`).join('\n')}
${Object.entries(doc.rounded).map(([k, v]) => `  --radius-${k}: ${v};`).join('\n')}
${Object.entries(doc.spacing).map(([k, v]) => `  --space-${k}: ${v};`).join('\n')}
${typeVars.join('\n')}
  color-scheme: light;
}

/* Light is the default; dark applies only when the reader picks it (data-theme on <html>). */
:root[data-theme='dark'] {
${nightVars.join('\n')}
  color-scheme: dark;
}
`;

const lightColors = Object.fromEntries(light);
const ts = `// Generated from DESIGN.md by scripts/tokens.ts. Do not edit.
export const tokens = ${JSON.stringify(
  { colors: lightColors, typography: doc.typography, rounded: doc.rounded, spacing: doc.spacing },
  null,
  2,
)} as const;
`;

const out = resolve(root, 'src/design');
mkdirSync(out, { recursive: true });
writeFileSync(resolve(out, 'tokens.css'), css);
writeFileSync(resolve(out, 'tokens.ts'), ts);
console.log('tokens: wrote src/design/tokens.{css,ts}');
