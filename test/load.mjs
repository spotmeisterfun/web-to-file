/**
 * Laadt losse src-modules in een schone context, zodat de pure functies zonder
 * browser getest kunnen worden. De modules zijn gewone scripts (geen ESM), dus
 * concateneren en één keer evalueren is genoeg — precies wat de build ook doet.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join, dirname } from 'node:path';
import vm from 'node:vm';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

export function loadModules(files, exportNames, extraGlobals = {}) {
  const code = files.map((file) => readFileSync(join(ROOT, file), 'utf8')).join('\n');
  const wrapped = `(function () {\n'use strict';\n${code}\nreturn { ${exportNames.join(', ')} };\n})()`;
  return vm.runInNewContext(wrapped, {
    console, URL, URLSearchParams, setTimeout, clearTimeout, TextEncoder, ...extraGlobals,
  }, { filename: 'web-to-file-test-bundle.js' });
}
