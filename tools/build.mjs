#!/usr/bin/env node
/**
 * Bouwt de losse modules uit src/ en de libraries uit vendor/ tot één
 * self-contained userscript in dist/. Geen bundler, geen dependencies.
 *
 *   node tools/build.mjs
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUTPUT = join(ROOT, 'dist', 'web-to-file.user.js');

/**
 * `shim: true` levert de UMD-export op als const (Turndown). De GFM-plugin
 * declareert zelf al `var turndownPluginGfm` en gaat dus ongewijzigd mee.
 */
const VENDOR = [
  { file: 'vendor/turndown.js', shim: 'TurndownService' },
  { file: 'vendor/turndown-plugin-gfm.js', shim: null },
];

// Volgorde is belangrijk: alles staat in één scope, main.js roept boot() aan.
const MODULES = [
  'src/util.js',
  'src/settings.js',
  'src/scope.js',
  'src/fetcher.js',
  'src/extract.js',
  'src/markdown.js',
  'src/discover.js',
  'src/assemble.js',
  'src/save.js',
  'src/ui.js',
  'src/calibrate.js',
  'src/flow.js',
  'src/main.js',
];

const read = (relative) => readFileSync(join(ROOT, relative), 'utf8');

const banner = (relative) => `\n/* =========================================================\n * ${relative}\n * ========================================================= */\n`;

function wrapVendor({ file, shim }) {
  const code = read(file);
  if (!shim) return `${banner(file)}${code}`;
  return `${banner(file)}const ${shim} = (function () {
  const module = { exports: {} };
  const exports = module.exports;
  const define = undefined;
${code}
  return module.exports;
})();
`;
}

const meta = read('src/meta.js').trimEnd();
const version = /@version\s+(\S+)/.exec(meta);

const parts = [
  meta,
  '',
  '/* Gegenereerd door tools/build.mjs — pas src/ aan, niet dit bestand. */',
  '',
  "(function () {",
  "'use strict';",
  '',
  `const BUILD_VERSION = ${JSON.stringify(version ? version[1] : 'dev')};`,
  ...VENDOR.map(wrapVendor),
  ...MODULES.map((file) => `${banner(file)}${read(file)}`),
  '})();',
  '',
];

mkdirSync(join(ROOT, 'dist'), { recursive: true });
const output = parts.join('\n');
writeFileSync(OUTPUT, output);

const kb = (output.length / 1024).toFixed(1);
process.stdout.write(`dist/web-to-file.user.js  v${version ? version[1] : '?'}  ${kb} kB\n`);
