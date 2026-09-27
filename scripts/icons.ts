// Generates the app icon and favicon: a lowercase "d" in Literata 600, Ink on Paper.
// Run manually (`npx tsx scripts/icons.ts`); output is committed to public/.
import { writeFileSync } from 'node:fs';
import { glyphIcon } from '../src/lib/images';

const out = (name: string, data: Uint8Array) => writeFileSync(`public/${name}`, data);
out('favicon-32.png', await glyphIcon(32));
out('icon-192.png', await glyphIcon(192));
out('icon-512.png', await glyphIcon(512));
out('icon-maskable-512.png', await glyphIcon(512, { maskable: true }));
console.log('icons written to public/');
