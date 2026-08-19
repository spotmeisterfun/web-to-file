#!/usr/bin/env node
/**
 * Haalt de externe libraries op en schrijft ze naar vendor/.
 *
 * Dit script hoef je maar één keer te draaien (en alleen als je de versies wilt
 * bijwerken). De resultaten worden meegecommit, zodat de werkmachine nooit
 * netwerktoegang of npm nodig heeft.
 *
 *   node tools/vendor.mjs
 */
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

const PACKAGES = [
  {
    spec: 'turndown@7.2.4',
    // De browser-build gebruikt de echte DOM; de andere builds trekken domino mee.
    from: 'lib/turndown.browser.umd.js',
    to: 'vendor/turndown.js',
    license: 'LICENSE',
  },
  {
    spec: 'turndown-plugin-gfm@1.0.2',
    from: 'dist/turndown-plugin-gfm.js',
    to: 'vendor/turndown-plugin-gfm.js',
    license: 'LICENSE',
  },
];

const work = mkdtempSync(join(tmpdir(), 'web-to-file-vendor-'));
try {
  for (const pkg of PACKAGES) {
    process.stdout.write(`↓ ${pkg.spec}\n`);
    const out = execFileSync('npm', ['pack', pkg.spec, '--silent'], { cwd: work, encoding: 'utf8' });
    const tarball = out.trim().split('\n').pop();
    execFileSync('tar', ['xzf', tarball], { cwd: work });

    const code = readFileSync(join(work, 'package', pkg.from), 'utf8');
    const license = readFileSync(join(work, 'package', pkg.license), 'utf8');
    const header = [
      '/*',
      ` * ${pkg.spec} — ${pkg.from}`,
      ' * Gevendord door tools/vendor.mjs. Niet met de hand aanpassen.',
      ' *',
      ...license.trimEnd().split('\n').map((line) => ` * ${line}`.trimEnd()),
      ' */',
      '',
    ].join('\n');

    writeFileSync(join(ROOT, pkg.to), header + code);
    process.stdout.write(`  → ${pkg.to}\n`);
    rmSync(join(work, 'package'), { recursive: true, force: true });
  }
} finally {
  rmSync(work, { recursive: true, force: true });
}
process.stdout.write('Klaar. Draai nu: node tools/build.mjs\n');
