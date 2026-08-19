/* ------------------------------------------------------------------ *
 * markdown — opgeschoonde HTML omzetten naar Markdown met Turndown.
 * ------------------------------------------------------------------ */

const PANEL_LABELS = [
  [/(^|[\s_-])(warning|danger|error|caution)([\s_-]|$)/i, 'Waarschuwing'],
  [/(^|[\s_-])(note|information|info)([\s_-]|$)/i, 'Info'],
  [/(^|[\s_-])(tip|success|hint)([\s_-]|$)/i, 'Tip'],
];

/** Maakt alle links en afbeeldingen absoluut, zodat ze buiten de site werken. */
function absolutizeUrls(root) {
  for (const anchor of root.querySelectorAll('a[href]')) {
    const href = anchor.getAttribute('href');
    if (/^(javascript|data):/i.test(href || '')) {
      anchor.removeAttribute('href');
      continue;
    }
    if (anchor.href) anchor.setAttribute('href', anchor.href);
  }
  for (const image of root.querySelectorAll('img')) {
    const lazy = image.getAttribute('data-src') || image.getAttribute('data-original');
    if (lazy && !image.getAttribute('src')) image.setAttribute('src', lazy);
    if (image.src) image.setAttribute('src', image.src);
    image.removeAttribute('srcset');
  }
}

/**
 * Verlaagt alle kopregels met `by` niveaus, zodat de koppen van een pagina onder
 * de `##` van die pagina in het gecombineerde document hangen.
 */
function demoteHeadings(root, by) {
  if (!by) return;
  const doc = root.ownerDocument;
  for (const heading of [...root.querySelectorAll('h1, h2, h3, h4, h5, h6')]) {
    const level = Number(heading.localName.slice(1));
    const target = Math.min(6, level + by);
    if (target === level) continue;
    const replacement = doc.createElement(`h${target}`);
    replacement.innerHTML = heading.innerHTML;
    heading.replaceWith(replacement);
  }
}

function panelLabel(className) {
  for (const [pattern, label] of PANEL_LABELS) {
    if (pattern.test(className)) return label;
  }
  return 'Notitie';
}

function createTurndown(options) {
  const { imageMode = 'link' } = options || {};
  const service = new TurndownService({
    headingStyle: 'atx',
    hr: '---',
    bulletListMarker: '-',
    codeBlockStyle: 'fenced',
    fence: '```',
    emDelimiter: '_',
    strongDelimiter: '**',
    linkStyle: 'inlined',
    br: '  ',
  });

  service.use(turndownPluginGfm.gfm);
  service.remove(['script', 'style', 'noscript', 'template', 'form']);

  service.addRule('webToFileImages', {
    filter: 'img',
    replacement: (_content, node) => {
      if (imageMode === 'skip') return '';
      const alt = (node.getAttribute('alt') || '').trim();
      const src = node.getAttribute('src') || '';
      if (imageMode === 'text' || !src) return alt ? `[afbeelding: ${alt}]` : '[afbeelding]';
      return `![${alt}](${src})`;
    },
  });

  // Confluence-panels en admonitions worden blockquotes met een label.
  service.addRule('webToFilePanels', {
    filter: (node) => node.nodeType === 1
      && /confluence-information-macro|admonition|aui-message/i.test(node.className || ''),
    replacement: (content, node) => {
      const body = content.trim();
      if (!body) return '';
      const quoted = body.split('\n').map((line) => `> ${line}`.trimEnd()).join('\n');
      return `\n\n> **${panelLabel(node.className || '')}**\n>\n${quoted}\n\n`;
    },
  });

  // Confluence-codeblokken hebben geen <code>, maar wel een brush-parameter.
  service.addRule('webToFileConfluenceCode', {
    filter: (node) => node.nodeName === 'PRE'
      && (/syntaxhighlighter-pre/i.test(node.className || '') || node.hasAttribute('data-syntaxhighlighter-params')),
    replacement: (_content, node) => {
      const params = node.getAttribute('data-syntaxhighlighter-params') || '';
      const match = /brush:\s*([a-z0-9+#-]+)/i.exec(params);
      const language = match ? match[1].toLowerCase() : '';
      const code = (node.textContent || '').replace(/\n+$/, '');
      return `\n\n\`\`\`${language}\n${code}\n\`\`\`\n\n`;
    },
  });

  service.addRule('webToFileDetails', {
    filter: ['details'],
    replacement: (content) => `\n\n${content.trim()}\n\n`,
  });

  return service;
}

/** Ruimt overtollige witruimte op die uit de HTML-conversie komt. */
function tidyMarkdown(markdown) {
  return markdown
    .replace(/\r\n?/g, '\n')
    .replace(/[ \t]+$/gm, '')
    // Turndown vult "-" aan tot vier tekens ("-   item"); één spatie leest beter
    // en houdt geneste lijsten intact, want die zijn vier spaties ingesprongen.
    .replace(/^(\s*)([-*+])\s{2,}(?=\S)/gm, '$1$2 ')
    .replace(/^(\s*)(\d+\.)\s{2,}(?=\S)/gm, '$1$2 ')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/^\s+|\s+$/g, '');
}

const turndownCache = new Map();

function getTurndown(imageMode) {
  if (!turndownCache.has(imageMode)) turndownCache.set(imageMode, createTurndown({ imageMode }));
  return turndownCache.get(imageMode);
}

function normalizeHeadingText(text) {
  return String(text || '').replace(/\s+/g, ' ').trim().toLowerCase();
}

/**
 * Maakt een schone kopie van de inhoud: zonder navigatie en ruis, met absolute
 * URL's. Zowel de Markdown als de te volgen links komen hieruit, zodat menu- en
 * footerlinks nooit in de crawl belanden — ook niet als de hoofdinhoud niet
 * herkend werd en er op de hele pagina teruggevallen is.
 */
function prepareContent(root) {
  const cleaned = cleanContent(root);
  absolutizeUrls(cleaned);
  return cleaned;
}

/**
 * Zet opgeschoonde inhoud om naar Markdown. Let op: dit past `cleaned` aan, dus
 * verzamel eventuele links ervóór.
 *
 * @param {Element} cleaned  resultaat van prepareContent
 * @param {object} options   { imageMode, demoteBy, title }
 */
function renderContent(cleaned, options) {
  const { imageMode = 'link', demoteBy = 2, title = '' } = options || {};

  // De titel wordt de sectiekop in het gecombineerde document; laat de eigen
  // kopregel van de pagina weg als die er precies hetzelfde staat.
  const firstHeading = cleaned.querySelector('h1, h2');
  const isTitleHeading = Boolean(firstHeading) && Boolean(title)
    && normalizeHeadingText(firstHeading.textContent) === normalizeHeadingText(title);
  if (isTitleHeading) firstHeading.remove();

  // Die weggehaalde H1 stáát al als "## N. Titel" boven de sectie, dus hoeft de
  // rest maar één niveau te zakken. Blijft de H1 staan, dan twee, zodat hij
  // netjes onder de sectiekop hangt.
  demoteHeadings(cleaned, isTitleHeading ? Math.max(1, demoteBy - 1) : demoteBy);
  return tidyMarkdown(getTurndown(imageMode).turndown(cleaned.innerHTML));
}

/** Gemakkelijke variant voor één pagina in één keer. */
function pageToMarkdown(root, options) {
  return renderContent(prepareContent(root), options);
}
