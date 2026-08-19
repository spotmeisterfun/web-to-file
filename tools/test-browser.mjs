#!/usr/bin/env node
/**
 * Draait test/browser.html in een headless Chromium en rapporteert het
 * resultaat. Zonder extra npm-pakketten: alleen de browser die er al staat.
 *
 *   node tools/test-browser.mjs
 *
 * Handmatig kan het ook: test/browser.html gewoon in een browser openen.
 */
import { execFileSync } from 'node:child_process';
import { readFileSync, existsSync, mkdtempSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

const CHROME_CANDIDATES = [
  process.env.CHROME_PATH,
  '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
  '/usr/bin/google-chrome',
].filter(Boolean);

const chrome = CHROME_CANDIDATES.find((candidate) => existsSync(candidate));
if (!chrome) {
  process.stderr.write('Geen Chromium gevonden. Zet CHROME_PATH of open test/browser.html met de hand.\n');
  process.exit(2);
}

// Altijd eerst bouwen, zodat er nooit tegen een verouderde bundle getest wordt.
execFileSync(process.execPath, [join(ROOT, 'tools', 'build.mjs')], { stdio: 'inherit' });
execFileSync(process.execPath, [join(ROOT, 'tools', 'fixtures.mjs')], { stdio: 'inherit' });

const profile = mkdtempSync(join(tmpdir(), 'web-to-file-chrome-'));

let dom = '';
try {
  dom = execFileSync(chrome, [
    '--headless',
    '--disable-gpu',
    '--no-sandbox',
    '--hide-scrollbars',
    `--user-data-dir=${profile}`,
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-dev-shm-usage',
    '--allow-file-access-from-files',
    '--virtual-time-budget=15000',
    '--dump-dom',
    `file://${join(ROOT, 'test', 'browser.html')}`,
  ], { encoding: 'utf8', maxBuffer: 32 * 1024 * 1024, stdio: ['ignore', 'pipe', 'pipe'] });
} catch (error) {
  process.stderr.write(`Chromium kon niet draaien: ${error.message}\n`);
  process.exit(2);
} finally {
  rmSync(profile, { recursive: true, force: true });
}

const lines = [...dom.matchAll(/<li class="(pass|fail)">([^<]*)<\/li>/g)];
for (const [, kind, text] of lines) {
  process.stdout.write(`${kind === 'pass' ? '  ok  ' : 'FAIL  '}${text.replace(/^(PASS|FAIL) — /, '')}\n`);
}

const status = /data-wtf-status="(\w+)"/.exec(dom);
if (!lines.length || !status) {
  process.stderr.write('Het testharnas heeft niets gerapporteerd. Uitvoer:\n');
  process.stderr.write(`${dom.slice(0, 2000)}\n`);
  process.exit(1);
}
const failures = lines.filter(([, kind]) => kind === 'fail').length;
process.stdout.write(`\n${lines.length - failures} van ${lines.length} browsertests geslaagd\n`);
process.exit(status[1] === 'pass' && !failures ? 0 : 1);
