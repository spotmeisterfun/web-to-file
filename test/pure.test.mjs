import test from 'node:test';
import assert from 'node:assert/strict';
import { loadModules } from './load.mjs';

const lib = loadModules(
  ['src/util.js', 'src/settings.js', 'src/scope.js', 'src/assemble.js'],
  [
    'normalizeUrl', 'dedupeKey', 'slugify', 'uniqueSlug', 'countWords', 'estimateTokens',
    'shortenUrl', 'todayStamp', 'pool', 'retry', 'clampToViewport',
    'createScopeFilter', 'guessScopePrefix',
    'assembleDocument', 'buildFilename', 'splitDocument',
  ],
);

test('normalizeUrl lost relatieve links op en gooit ruis weg', () => {
  const base = 'https://wiki.intern/wiki/spaces/ABC/pages/1/Start?utm_source=mail';
  assert.equal(lib.normalizeUrl('../2/Andere', base), 'https://wiki.intern/wiki/spaces/ABC/pages/2/Andere');
  assert.equal(lib.normalizeUrl('/wiki/x', base), 'https://wiki.intern/wiki/x');
  assert.equal(lib.normalizeUrl('page?utm_medium=x&keep=1', 'https://a.nl/dir/'), 'https://a.nl/dir/page?keep=1');
  assert.equal(lib.normalizeUrl('https://a.nl/p#sectie'), 'https://a.nl/p');
});

test('normalizeUrl weigert wat geen pagina is', () => {
  assert.equal(lib.normalizeUrl('mailto:iemand@example.com'), null);
  assert.equal(lib.normalizeUrl('javascript:alert(1)'), null);
  assert.equal(lib.normalizeUrl('#alleen-anker', 'https://a.nl/p'), null);
  assert.equal(lib.normalizeUrl(''), null);
  assert.equal(lib.normalizeUrl(null), null);
});

test('dedupeKey ziet dezelfde pagina onder verschillende URLs', () => {
  const key = lib.dedupeKey;
  assert.equal(key('https://a.nl/pad/'), key('https://a.nl/pad'));
  assert.equal(key('https://A.NL/pad'), key('https://a.nl/pad'));
  assert.equal(key('https://a.nl/pad/index.html'), key('https://a.nl/pad/'));
  assert.equal(key('https://a.nl/p?b=2&a=1'), key('https://a.nl/p?a=1&b=2'));
  assert.notEqual(key('https://a.nl/een'), key('https://a.nl/twee'));
});

test('slugify maakt GitHub-achtige ankers en houdt letters heel', () => {
  assert.equal(lib.slugify('Inrichting & Beheer (2024)'), 'inrichting-beheer-2024');
  assert.equal(lib.slugify('1. Overzicht'), '1-overzicht');
  assert.equal(lib.slugify('Café déjà vu'), 'café-déjà-vu');
  assert.equal(lib.slugify('!!!'), 'sectie');
});

test('uniqueSlug voorkomt dubbele ankers', () => {
  const used = new Set();
  assert.equal(lib.uniqueSlug('titel', used), 'titel');
  assert.equal(lib.uniqueSlug('titel', used), 'titel-1');
  assert.equal(lib.uniqueSlug('titel', used), 'titel-2');
});

test('scope-filter houdt de crawl binnen de opgegeven prefix', () => {
  const allow = lib.createScopeFilter({
    startUrl: 'https://wiki.intern/wiki/spaces/ABC/overview',
    prefix: 'https://wiki.intern/wiki/',
  });
  assert.equal(allow('https://wiki.intern/wiki/spaces/ABC/pages/12/Kind').ok, true);
  assert.equal(allow('https://wiki.intern/andere/plek').ok, false);
  assert.equal(allow('https://elders.intern/wiki/x').ok, false);
});

test('scope-filter slaat bestanden en systeempagina\'s over', () => {
  const allow = lib.createScopeFilter({ startUrl: 'https://a.nl/docs/start', prefix: '' });
  assert.equal(allow('https://a.nl/docs/handleiding.pdf').ok, false);
  assert.equal(allow('https://a.nl/docs/logo.png').ok, false);
  assert.equal(allow('https://a.nl/login').ok, false);
  assert.equal(allow('https://a.nl/docs/pagina?action=edit').ok, false);
  assert.equal(allow('https://a.nl/docs/echte-pagina').ok, true);
  // /api/ hoort juist wél mee te komen in ontwikkeldocumentatie
  assert.equal(allow('https://a.nl/docs/api/reference').ok, true);
});

test('scope-filter respecteert een eigen uitsluitpatroon', () => {
  const allow = lib.createScopeFilter({ startUrl: 'https://a.nl/d/s', prefix: '', exclude: 'archief|oud' });
  assert.equal(allow('https://a.nl/d/archief/2019').ok, false);
  assert.equal(allow('https://a.nl/d/actueel').ok, true);
});

test('guessScopePrefix pakt het eerste padsegment', () => {
  assert.equal(lib.guessScopePrefix('https://x.nl/wiki/spaces/A/pages/1/T'), 'https://x.nl/wiki/');
  assert.equal(lib.guessScopePrefix('https://x.nl/'), 'https://x.nl/');
});

test('pool voert alles uit en houdt de volgorde aan', async () => {
  const seen = [];
  const results = await lib.pool([1, 2, 3, 4, 5], 2, async (item) => {
    seen.push(item);
    return item * 2;
  });
  assert.deepEqual([...results], [2, 4, 6, 8, 10]);
  assert.equal(seen.length, 5);
});

test('retry probeert opnieuw en geeft daarna de fout door', async () => {
  let calls = 0;
  const value = await lib.retry(async () => {
    calls += 1;
    if (calls < 3) throw new Error('nog niet');
    return 'ok';
  }, 3, 1);
  assert.equal(value, 'ok');
  assert.equal(calls, 3);

  await assert.rejects(lib.retry(async () => { throw new Error('blijft fout'); }, 1, 1), /blijft fout/);
});

const samplePages = [
  {
    title: 'Inrichting & Beheer',
    url: 'https://wiki.intern/wiki/spaces/ABC/pages/1/Inrichting',
    finalUrl: 'https://wiki.intern/wiki/spaces/ABC/pages/1/Inrichting',
    markdown: '### Uitgangspunten\n\nEerste alinea met tekst.',
    lastModified: '2026-05-01',
  },
  {
    title: 'Inrichting & Beheer',
    url: 'https://wiki.intern/wiki/spaces/ABC/pages/2/Kopie',
    finalUrl: 'https://wiki.intern/wiki/spaces/ABC/pages/2/Kopie',
    markdown: '### Tweede pagina\n\nMeer tekst hier.',
  },
];

test('assembleDocument levert frontmatter, inhoudsopgave en secties', () => {
  const { markdown, stats } = lib.assembleDocument({
    startUrl: 'https://wiki.intern/wiki/spaces/ABC/pages/1/Inrichting',
    depth: 1,
    pages: samplePages,
    failures: [{ url: 'https://wiki.intern/wiki/kapot', reason: 'HTTP 403' }],
  });

  assert.match(markdown, /^---\n/);
  assert.match(markdown, /^start_url: "https:\/\/wiki\.intern/m);
  assert.match(markdown, /^crawl_depth: 1$/m);
  assert.match(markdown, /^pages: 2$/m);
  assert.match(markdown, /^## Inhoud$/m);
  assert.match(markdown, /^## 1\. Inrichting & Beheer$/m);
  assert.match(markdown, /^## 2\. Inrichting & Beheer$/m);
  assert.match(markdown, /Bron: <https:\/\/wiki\.intern\/wiki\/spaces\/ABC\/pages\/1\/Inrichting>/);
  assert.match(markdown, /Laatst gewijzigd: 2026-05-01/);
  assert.match(markdown, /^## Niet opgehaald$/m);
  assert.match(markdown, /HTTP 403/);
  assert.equal(stats.pages, 2);
  assert.ok(stats.words > 5);
  assert.equal(stats.failures, 1);
});

test('elke link in de inhoudsopgave wijst naar een bestaande sectie', () => {
  const { markdown } = lib.assembleDocument({
    startUrl: 'https://a.nl/start',
    depth: 1,
    pages: samplePages,
    failures: [],
  });
  const anchors = [...markdown.matchAll(/^\d+\. \[[^\]]*\]\(#([^)]+)\)/gm)].map((match) => match[1]);
  assert.equal(anchors.length, 2);
  // Twee pagina's met dezelfde titel moeten twee verschillende ankers krijgen.
  assert.equal(new Set(anchors).size, 2);

  const used = new Set();
  const headingSlugs = [...markdown.matchAll(/^## (\d+\. .*)$/gm)]
    .map((match) => lib.uniqueSlug(lib.slugify(match[1]), used));
  assert.deepEqual(anchors, headingSlugs);
});

test('buildFilename bouwt een nette bestandsnaam', () => {
  const name = lib.buildFilename('https://wiki.intern/wiki/spaces/ABC', 'Inrichting & Beheer');
  assert.match(name, /^wiki\.intern-inrichting-beheer-\d{4}-\d{2}-\d{2}\.md$/);
});

test('splitDocument splitst alleen als het nodig is', () => {
  const { markdown } = lib.assembleDocument({
    startUrl: 'https://a.nl/start', depth: 1, pages: samplePages, failures: [],
  });
  assert.deepEqual(
    [...lib.splitDocument(markdown, 'doc.md', 0)].map((part) => part.name),
    ['doc.md'],
  );
  const parts = [...lib.splitDocument(markdown, 'doc.md', 5)];
  assert.ok(parts.length > 1, 'moet splitsen bij een lage woordgrens');
  assert.deepEqual(parts.map((part) => part.name), parts.map((_p, i) => `doc-deel${i + 1}.md`));
  for (const part of parts) {
    assert.match(part.content, /^---\n/, 'elk deel houdt de frontmatter');
    assert.match(part.content, /Deel \d+ van \d+/);
  }
});

test('clampToViewport laat een geldige positie staan', () => {
  const result = lib.clampToViewport({ right: 18, bottom: 18 }, { width: 1200, height: 800, size: 34 });
  assert.deepEqual({ right: result.right, bottom: result.bottom }, { right: 18, bottom: 18 });
});

test('clampToViewport trekt de knop terug in beeld', () => {
  // Verder weg van de rand dan het venster breed is: moet binnen blijven.
  const tooFar = lib.clampToViewport({ right: 5000, bottom: 5000 }, { width: 1200, height: 800, size: 34 });
  assert.equal(tooFar.right, 1200 - 34 - 8);
  assert.equal(tooFar.bottom, 800 - 34 - 8);

  // Negatief of tegen de rand: minimaal de marge aanhouden.
  const negative = lib.clampToViewport({ right: -40, bottom: 0 }, { width: 1200, height: 800, size: 34 });
  assert.equal(negative.right, 8);
  assert.equal(negative.bottom, 8);
});

test('clampToViewport valt terug op de standaardhoek bij onzin', () => {
  const result = lib.clampToViewport(null, { width: 1200, height: 800, size: 34 });
  assert.deepEqual({ right: result.right, bottom: result.bottom }, { right: 18, bottom: 18 });

  const broken = lib.clampToViewport({ right: 'x', bottom: undefined }, { width: 1200, height: 800, size: 34 });
  assert.deepEqual({ right: broken.right, bottom: broken.bottom }, { right: 18, bottom: 18 });
});

test('clampToViewport overleeft een venster dat kleiner is dan de knop', () => {
  const result = lib.clampToViewport({ right: 18, bottom: 18 }, { width: 20, height: 20, size: 34 });
  assert.equal(result.right, 8);
  assert.equal(result.bottom, 8);
});

test('shortenUrl kort lange paden in', () => {
  assert.equal(lib.shortenUrl('https://a.nl/kort'), '/kort');
  assert.ok(lib.shortenUrl(`https://a.nl/${'x'.repeat(200)}`, 40).length <= 40);
});
