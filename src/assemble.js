/* ------------------------------------------------------------------ *
 * assemble — de losse pagina's samenvoegen tot één Markdown-document.
 * ------------------------------------------------------------------ */

const SCRIPT_VERSION = (typeof GM_info !== 'undefined' && GM_info && GM_info.script && GM_info.script.version)
  ? GM_info.script.version
  : (typeof BUILD_VERSION !== 'undefined' ? BUILD_VERSION : 'dev');

/** Vierkante haken in een titel zouden de link in de inhoudsopgave breken. */
function escapeLinkText(text) {
  return String(text).replace(/([[\]])/g, '\\$1');
}

function yamlString(value) {
  return `"${String(value).replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
}

function buildFrontmatter(fields) {
  const lines = Object.entries(fields)
    .filter(([, value]) => value !== undefined && value !== null && value !== '')
    .map(([key, value]) => `${key}: ${typeof value === 'number' ? value : yamlString(value)}`);
  return ['---', ...lines, '---'].join('\n');
}

/**
 * Bouwt het complete document.
 *
 * @param {object} input
 * @param {string} input.startUrl
 * @param {number} input.depth
 * @param {Array}  input.pages     genummerde nodes met .title, .url, .markdown
 * @param {Array}  input.failures  [{url, reason}]
 * @param {string} [input.documentTitle]
 * @returns {{markdown: string, stats: object}}
 */
function assembleDocument(input) {
  const { startUrl, depth, pages, failures = [], documentTitle } = input;
  const title = documentTitle || (pages[0] && pages[0].title) || shortenUrl(startUrl);
  const generated = new Date().toISOString();

  const usedSlugs = new Set();
  const sections = pages.map((page, index) => {
    const number = index + 1;
    const heading = `${number}. ${page.title}`;
    const slug = uniqueSlug(slugify(heading), usedSlugs);
    return { page, number, heading, slug };
  });

  const body = sections.map(({ page, heading }) => {
    const metaLines = [`Bron: <${page.finalUrl || page.url}>`];
    if (page.lastModified) metaLines.push(`Laatst gewijzigd: ${page.lastModified}`);
    const content = (page.markdown || '').trim() || '_Deze pagina bevatte geen leesbare inhoud._';
    return [`## ${heading}`, '', metaLines.join('  \n'), '', content].join('\n');
  });

  const toc = sections.map(({ number, page, slug }) =>
    `${number}. [${escapeLinkText(page.title)}](#${slug}) — \`${shortenUrl(page.url, 90)}\``);

  const allText = body.join('\n');
  const stats = {
    pages: pages.length,
    chars: allText.length,
    words: countWords(allText),
    tokens: estimateTokens(allText),
    failures: failures.length,
  };

  const header = [
    buildFrontmatter({
      title,
      start_url: startUrl,
      crawl_depth: depth,
      pages: pages.length,
      words: stats.words,
      generated,
      generator: `web-to-file ${SCRIPT_VERSION}`,
    }),
    '',
    `# ${title}`,
    '',
    `Referentiemateriaal, opgehaald uit <${startUrl}> op ${todayStamp()}.`,
    `${formatNumber(stats.pages)} pagina's · diepte ${depth} · ${formatNumber(stats.words)} woorden · ≈${formatNumber(stats.tokens)} tokens`,
    '',
    '> Gegenereerd met web-to-file. Verwijs hiernaar in Copilot Chat met',
    '> `#file:<bestandsnaam>` of zet het bestand in je repository.',
    '',
    "## Inhoud",
    '',
    ...toc,
  ].join('\n');

  const parts = [header, ...body];

  if (failures.length) {
    parts.push([
      '## Niet opgehaald',
      '',
      'Deze pagina\'s zijn overgeslagen; controleer ze eventueel zelf in de browser.',
      '',
      ...failures.map((failure) => `- <${failure.url}> — ${failure.reason}`),
    ].join('\n'));
  }

  return { markdown: `${parts.join('\n\n---\n\n')}\n`, stats };
}

/** Bestandsnaam op basis van host, titel en datum. */
function buildFilename(startUrl, title) {
  let host = 'pagina';
  try {
    host = new URL(startUrl).host.replace(/^www\./, '').replace(/[^\w.-]/g, '');
  } catch { /* val terug op de standaardnaam */ }
  const slug = slugify(title).slice(0, 60) || 'export';
  return `${host}-${slug}-${todayStamp()}.md`.replace(/-{2,}/g, '-');
}

/**
 * Splitst een document in delen van ongeveer `maxWords` woorden, op sectiegrens.
 * @returns {Array<{name: string, content: string}>}
 */
function splitDocument(markdown, filename, maxWords) {
  if (!maxWords || countWords(markdown) <= maxWords) {
    return [{ name: filename, content: markdown }];
  }
  const chunks = markdown.split(/\n\n---\n\n/);
  const head = chunks.shift();
  const groups = [];
  let current = [];
  let currentWords = 0;
  for (const chunk of chunks) {
    const words = countWords(chunk);
    if (current.length && currentWords + words > maxWords) {
      groups.push(current);
      current = [];
      currentWords = 0;
    }
    current.push(chunk);
    currentWords += words;
  }
  if (current.length) groups.push(current);

  const base = filename.replace(/\.md$/i, '');
  return groups.map((group, index) => ({
    name: `${base}-deel${index + 1}.md`,
    content: `${[
      head,
      `_Deel ${index + 1} van ${groups.length}._`,
      ...group,
    ].join('\n\n---\n\n')}\n`,
  }));
}
