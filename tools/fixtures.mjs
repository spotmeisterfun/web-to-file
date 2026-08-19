#!/usr/bin/env node
/**
 * Bakt de HTML-fixtures in één scriptbestand, zodat test/browser.html ze
 * synchroon kan inladen. Zonder fetch werkt het harnas ook rechtstreeks via
 * file:// en hoeft er geen servertje te draaien.
 *
 *   node tools/fixtures.mjs
 */
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DIR = join(ROOT, 'test', 'fixtures');
const OUTPUT = join(DIR, 'fixtures.js');

const files = readdirSync(DIR).filter((name) => name.endsWith('.html')).sort();
const entries = files.map((name) => {
  const html = readFileSync(join(DIR, name), 'utf8');
  if (html.includes('`') || html.includes('${')) {
    throw new Error(`${name} bevat een backtick of \${; dat kan niet in een template literal`);
  }
  return `FIXTURES[${JSON.stringify(name)}] = String.raw\`${html}\`;`;
});

writeFileSync(OUTPUT, [
  '/* Gegenereerd door tools/fixtures.mjs — pas de .html-bestanden aan. */',
  'var FIXTURES = (globalThis.FIXTURES = globalThis.FIXTURES || {});',
  '',
  ...entries,
  '',
].join('\n'));

process.stdout.write(`test/fixtures/fixtures.js — ${files.length} fixtures: ${files.join(', ')}\n`);
