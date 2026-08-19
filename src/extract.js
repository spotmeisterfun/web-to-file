/* ------------------------------------------------------------------ *
 * extract — de hoofdinhoud van een pagina vinden en opschonen.
 *
 * Volgorde: gekalibreerde selector per domein → bekende selectors →
 * dichtheids-heuristiek → body zonder navigatie.
 * ------------------------------------------------------------------ */

/** Containers die op de meeste wiki's en documentatiesites de inhoud bevatten. */
const CONTENT_SELECTORS = [
  '[data-testid="ak-renderer-document"]',   // Confluence Cloud
  '#main-content',                          // Confluence Server/DC
  '.wiki-content',                          // Confluence Server/DC
  '.mw-parser-output',                      // MediaWiki
  '.markdown-body',                         // GitHub-achtig
  '.theme-doc-markdown',                    // Docusaurus
  '.md-content__inner',                     // MkDocs Material
  '[role="main"] article',
  'article[role="article"]',
  'main article',
  'article',
  'main',
  '[role="main"]',
  '#content',
  '.content',
];

const NEGATIVE_CLASS = /(^|[\s_-])(nav|navigation|menu|sidebar|side-bar|footer|header|masthead|breadcrumb|comment|share|social|related|promo|banner|advert|cookie|toolbar|pagination|widget|meta|search|skip|screen-reader|sr-only|visually-hidden|announce|feedback)([\s_-]|$)/i;
const POSITIVE_CLASS = /(^|[\s_-])(content|article|main|body|post|page|entry|wiki|doc|docs|markdown|prose|text|storytext)([\s_-]|$)/i;

/** Wordt altijd verwijderd: nooit inhoud, vaak wel veel ruis. */
const HARD_STRIP = [
  'script', 'style', 'noscript', 'template', 'svg', 'canvas', 'iframe', 'object', 'embed',
  'form', 'button', 'input', 'select', 'textarea', 'link', 'meta', 'base', 'audio', 'video',
  '[aria-hidden="true"]', '[hidden]', '[role="navigation"]', '[role="banner"]',
  '[role="contentinfo"]', '[role="search"]', '[role="complementary"]', '[role="alert"]',
  '[role="dialog"]', '[role="tooltip"]', 'nav', 'aside', 'footer', '[data-web-to-file]',
].join(', ');

/** Wordt verwijderd zolang het blok klein is (anders is het waarschijnlijk inhoud). */
const SOFT_STRIP = [
  '.sidebar', '.toc', '#toc', '.table-of-contents', '.toc-macro', '.breadcrumbs', '.breadcrumb',
  '.cookie', '.cookie-banner', '.share', '.sharing', '.social', '.comments', '#comments',
  '.comment-list', '.pagination', '.prev-next', '.edit-link', '.skip-link', '.sr-only',
  '.screen-reader-text', '.visually-hidden', '.announcement', '.feedback', '.rate-page',
  '.page-metadata', '.expand-icon', '.aui-icon', '.confluence-information-macro-icon',
  '.hidden', '.docs-feedback', '.theme-doc-toc-desktop', '.md-sidebar',
].join(', ');

const SOFT_STRIP_MAX_CHARS = 1500;

function visibleTextLength(element) {
  return (element.textContent || '').replace(/\s+/g, ' ').trim().length;
}

function linkDensity(element, textLength) {
  if (!textLength) return 1;
  let linkLength = 0;
  for (const anchor of element.querySelectorAll('a')) {
    linkLength += (anchor.textContent || '').trim().length;
  }
  return Math.min(1, linkLength / textLength);
}

function classSignal(element) {
  const haystack = `${element.className || ''} ${element.id || ''}`;
  if (NEGATIVE_CLASS.test(haystack)) return 0.4;
  if (POSITIVE_CLASS.test(haystack)) return 1.3;
  return 1;
}

/** Scoort een kandidaat-container op tekstvolume tegenover link-dichtheid. */
function scoreCandidate(element) {
  const textLength = visibleTextLength(element);
  if (textLength < 200) return 0;
  const density = linkDensity(element, textLength);
  if (density > 0.5) return 0;
  const blocks = element.querySelectorAll('p, li, pre, td, h2, h3, h4').length;
  return (textLength * (1 - density) + blocks * 25) * classSignal(element);
}

/** Zoekt via de dichtheids-heuristiek de beste container in het document. */
function findByDensity(doc) {
  const body = doc.body;
  if (!body) return null;
  const candidates = body.querySelectorAll('main, article, section, div, td');
  let best = null;
  let bestScore = 0;
  let inspected = 0;
  for (const candidate of candidates) {
    if (inspected > 3000) break;
    inspected += 1;
    const score = scoreCandidate(candidate);
    if (score > bestScore) {
      bestScore = score;
      best = candidate;
    }
  }
  return best;
}

/**
 * Bepaalt het element met de hoofdinhoud.
 * @returns {{root: Element, via: string}}
 */
function findContentRoot(doc, url) {
  const host = (() => {
    try { return new URL(url).host; } catch { return ''; }
  })();

  const calibrated = getDomainConfig(host).contentSelector;
  if (calibrated) {
    try {
      const element = doc.querySelector(calibrated);
      if (element && visibleTextLength(element) > 50) return { root: element, via: 'gekalibreerd' };
    } catch { /* ongeldige bewaarde selector: gewoon doorgaan */ }
  }

  // Een bekende selector is een sterk signaal; die vertrouwen we ook bij een
  // korte pagina, waar de heuristiek nog niets zou vinden.
  for (const selector of CONTENT_SELECTORS) {
    const element = doc.querySelector(selector);
    if (element && visibleTextLength(element) > 100) return { root: element, via: selector };
  }

  const dense = findByDensity(doc);
  if (dense) return { root: dense, via: 'heuristiek' };

  return { root: doc.body || doc.documentElement, via: 'hele pagina' };
}

/**
 * Maakt een kopie van de inhoud zonder navigatie, scripts en andere ruis.
 * Het origineel blijft ongemoeid, zodat de echte pagina niet verandert.
 */
function cleanContent(root) {
  const clone = root.cloneNode(true);

  for (const element of clone.querySelectorAll(HARD_STRIP)) element.remove();

  for (const element of clone.querySelectorAll(SOFT_STRIP)) {
    if (visibleTextLength(element) < SOFT_STRIP_MAX_CHARS) element.remove();
  }

  // Kopregels met alleen een ankerlink ("¶", "#") leveren lege links op.
  for (const anchor of clone.querySelectorAll('a')) {
    const text = (anchor.textContent || '').trim();
    if (!text && !anchor.querySelector('img')) anchor.remove();
  }

  return clone;
}

/** Haalt titel, canonieke URL en wijzigingsdatum uit het document. */
function extractPageMeta(doc, url, contentRoot) {
  const pick = (selector, attribute) => {
    const element = doc.querySelector(selector);
    if (!element) return '';
    const value = attribute ? element.getAttribute(attribute) : element.textContent;
    return (value || '').trim().replace(/\s+/g, ' ');
  };

  const contentHeading = contentRoot && contentRoot.querySelector('h1')
    ? (contentRoot.querySelector('h1').textContent || '').trim().replace(/\s+/g, ' ')
    : '';

  const title = contentHeading
    || pick('meta[property="og:title"]', 'content')
    || pick('h1')
    || cleanDocumentTitle(doc.title || '')
    || shortenUrl(url);

  const canonicalRaw = pick('link[rel="canonical"]', 'href');
  const canonical = canonicalRaw ? normalizeUrl(canonicalRaw, url) : null;

  const lastModified = pick('meta[property="article:modified_time"]', 'content')
    || pick('meta[name="last-modified"]', 'content')
    || pick('.page-metadata time[datetime]', 'datetime')
    || pick('time[datetime]', 'datetime');

  const breadcrumbs = [...doc.querySelectorAll('nav.breadcrumbs a, #breadcrumbs a, .breadcrumb a, ol.breadcrumb a, [aria-label="breadcrumb"] a')]
    .map((anchor) => (anchor.textContent || '').trim())
    .filter(Boolean);

  return { title, canonical, lastModified, breadcrumbs };
}

/** Haalt een sitenaam-achtervoegsel van de <title> af ("Pagina - Ruimte - Confluence"). */
function cleanDocumentTitle(title) {
  const cleaned = title.trim().replace(/\s+/g, ' ');
  const match = /^(.*?)\s+[-|–—]\s+([^-|–—]{1,40})$/.exec(cleaned);
  if (match && match[1].trim().length >= 3) return match[1].trim();
  return cleaned;
}

/**
 * Bouwt een redelijk stabiele CSS-selector voor een element. Gebruikt voor de
 * kalibratiemodus, waarin de gebruiker de content-container zelf aanwijst.
 */
function cssPathFor(element) {
  if (!element || element.nodeType !== 1) return '';
  const parts = [];
  let node = element;
  while (node && node.nodeType === 1 && node.localName !== 'html') {
    if (node.id && /^[A-Za-z][\w-]*$/.test(node.id)) {
      parts.unshift(`#${node.id}`);
      break;
    }
    let selector = node.localName;
    const stableClasses = [...(node.classList || [])]
      .filter((name) => /^[A-Za-z][\w-]*$/.test(name) && !/\d{3,}|active|selected|open|hover|focus|current/i.test(name));
    if (stableClasses.length) selector += `.${stableClasses.slice(0, 2).join('.')}`;
    const parent = node.parentElement;
    if (parent) {
      const siblings = [...parent.children].filter((child) => child.localName === node.localName);
      if (siblings.length > 1) selector += `:nth-of-type(${siblings.indexOf(node) + 1})`;
    }
    parts.unshift(selector);
    node = node.parentElement;
  }
  return parts.join(' > ');
}
