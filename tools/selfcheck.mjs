#!/usr/bin/env node
/**
 * Controleert het gebouwde userscript op de dingen die pas op de werkmachine
 * stuk zouden gaan: ontbrekende @grant-regels, achtergebleven module-syntax,
 * of een verwijzing naar een CDN (waar geen netwerk is).
 *
 *   node tools/selfcheck.mjs
 */
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const FILE = join(ROOT, 'dist', 'web-to-file.user.js');
const source = readFileSync(FILE, 'utf8');
const problems = [];
const notes = [];

/* 1. Geldige metadata-kop, als eerste in het bestand. */
if (!source.startsWith('// ==UserScript==')) problems.push('het bestand begint niet met // ==UserScript==');
if (!source.includes('// ==/UserScript==')) problems.push('de metadata-kop wordt niet afgesloten');

/* 2. Geen externe afhankelijkheden: op het werk is er geen internet. */
if (/^\/\/\s*@require\b/m.test(source)) problems.push('@require gevonden — libraries moeten gevendord zijn');
if (/(https?:)?\/\/(cdn|unpkg|jsdelivr)/i.test(source)) problems.push('verwijzing naar een CDN gevonden');

/* 3. Geen module-syntax: een userscript is een gewoon script. */
for (const [index, line] of source.split('\n').entries()) {
  if (/^\s*(import|export)\s/.test(line) && !/^\s*\/\//.test(line)) {
    problems.push(`module-syntax op regel ${index + 1}: ${line.trim().slice(0, 60)}`);
  }
}

/* 4. Elke gebruikte GM_-functie moet ook echt aangevraagd zijn. */
const metaBlock = source.slice(0, source.indexOf('// ==/UserScript=='));
const granted = new Set([...metaBlock.matchAll(/^\/\/\s*@grant\s+(\S+)/gm)].map((match) => match[1]));
const body = source.slice(source.indexOf('// ==/UserScript=='));
const used = new Set([...body.matchAll(/\bGM_\w+/g)].map((match) => match[0]));
used.delete('GM_info'); // GM_info werkt zonder @grant

for (const name of used) {
  if (!granted.has(name)) problems.push(`${name} wordt gebruikt maar niet ge-@grant`);
}
for (const name of granted) {
  if (!used.has(name)) notes.push(`@grant ${name} wordt niet gebruikt`);
}

/* 5. De libraries moeten in de bundle staan. */
if (!/const TurndownService = \(function \(\)/.test(source)) problems.push('Turndown ontbreekt in de bundle');
if (!/var turndownPluginGfm =/.test(source)) problems.push('de GFM-plugin ontbreekt in de bundle');

/* 6. Syntaxcheck door Node zelf. */
try {
  execFileSync(process.execPath, ['--check', FILE], { stdio: 'pipe' });
} catch (error) {
  problems.push(`syntaxfout: ${String(error.stderr || error.message).split('\n')[0]}`);
}

for (const note of notes) process.stdout.write(`let op: ${note}\n`);
if (problems.length) {
  for (const problem of problems) process.stderr.write(`FOUT: ${problem}\n`);
  process.exit(1);
}
process.stdout.write(`selfcheck ok — ${(source.length / 1024).toFixed(1)} kB, grants: ${[...granted].join(', ')}\n`);
