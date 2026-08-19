/* ------------------------------------------------------------------ *
 * scope — bepalen welke links wel en niet meegenomen worden.
 * ------------------------------------------------------------------ */

/** Bestandstypen die geen HTML-pagina zijn en dus nooit gecrawld worden. */
const SKIP_EXTENSIONS = /\.(pdf|zip|gz|tgz|rar|7z|exe|msi|dmg|png|jpe?g|gif|svg|webp|ico|bmp|tiff?|mp[34]|m4[av]|wav|ogg|avi|mov|mkv|webm|css|js|mjs|json|xml|rss|atom|csv|tsv|xlsx?|xlsm|docx?|pptx?|odt|ods|odp|ttf|woff2?|eot|txt|patch|diff)$/i;

/**
 * Paden die op vrijwel elke wiki bestaan maar geen inhoud bevatten (of iets
 * muteren). Bewust conservatief: alleen dingen die nooit referentiemateriaal zijn.
 */
const SKIP_PATTERNS = [
  /\/(login|logout|signin|signout|sign-in|sign-out|register|password)\b/i,
  /\/(admin|setup|install)\//i,
  /[?&]action=(edit|delete|diff|history|raw|watch|unwatch|login|logout)\b/i,
  /[?&]do=(edit|revisions|diff|login|media)\b/i,
  /\/pages\/(diffpagesbyversion|viewpreviousversions|copypage|editpage|createpage|templates)/i,
  /\/(plugins|rest|s|_next|static|assets|images|attachments|download|exports?)\//i,
  /\/(spacedirectory|dashboard\.action|users\/viewuserprofile|display\/~)/i,
  /\?.*\bprint(able)?=(yes|true|1)\b/i,
  /\/(feed|rss|atom|sitemap)(\.\w+)?$/i,
  /\/(tag|tags|label|labels|search)\//i,
];

/**
 * Raadt een verstandige URL-prefix voor de crawl: de eerste padsegmenten van de
 * startpagina. Op Confluence Cloud levert dat /wiki/, op Server /display/.
 * De gebruiker kan dit in het paneel aanpassen.
 */
function guessScopePrefix(startUrl) {
  let url;
  try {
    url = new URL(startUrl);
  } catch {
    return startUrl;
  }
  const segments = url.pathname.split('/').filter(Boolean);
  if (!segments.length) return `${url.origin}/`;
  return `${url.origin}/${segments[0]}/`;
}

/**
 * Bouwt de filterfunctie voor één crawl.
 *
 * @param {object} options
 * @param {string} options.prefix       URL's moeten hiermee beginnen ('' = heel domein).
 * @param {string} [options.pattern]    Optionele extra regex waaraan de URL moet voldoen.
 * @param {string} [options.exclude]    Optionele regex; treffers worden uitgesloten.
 * @param {boolean} [options.sameOriginOnly=true]
 * @param {string} options.startUrl
 * @returns {(url: string) => {ok: boolean, reason?: string}}
 */
function createScopeFilter(options) {
  const { prefix = '', pattern = '', exclude = '', sameOriginOnly = true, startUrl } = options;
  const origin = (() => {
    try { return new URL(startUrl).origin; } catch { return null; }
  })();
  const patternRe = pattern ? new RegExp(pattern, 'i') : null;
  const excludeRe = exclude ? new RegExp(exclude, 'i') : null;

  return function allow(rawUrl) {
    let url;
    try {
      url = new URL(rawUrl);
    } catch {
      return { ok: false, reason: 'ongeldige URL' };
    }
    if (sameOriginOnly && origin && url.origin !== origin) return { ok: false, reason: 'ander domein' };
    if (prefix && !rawUrl.startsWith(prefix)) return { ok: false, reason: 'buiten de prefix' };
    if (SKIP_EXTENSIONS.test(url.pathname)) return { ok: false, reason: 'geen HTML-bestand' };
    for (const skip of SKIP_PATTERNS) {
      if (skip.test(url.pathname + url.search)) return { ok: false, reason: 'systeempagina' };
    }
    if (patternRe && !patternRe.test(rawUrl)) return { ok: false, reason: 'matcht patroon niet' };
    if (excludeRe && excludeRe.test(rawUrl)) return { ok: false, reason: 'uitgesloten door patroon' };
    return { ok: true };
  };
}

/**
 * Haalt alle bruikbare links uit een element (normaal de hoofdinhoud, niet de
 * hele pagina — daarmee vallen navigatie, footer en zijbalk automatisch weg).
 *
 * @returns {Array<{url: string, text: string}>} genormaliseerd en ontdubbeld
 */
function collectLinks(root, baseUrl) {
  if (!root) return [];
  const seen = new Set();
  const links = [];
  for (const anchor of root.querySelectorAll('a[href]')) {
    const rel = (anchor.getAttribute('rel') || '').toLowerCase().split(/\s+/);
    if (rel.includes('nofollow')) continue;
    const url = normalizeUrl(anchor.getAttribute('href'), baseUrl);
    if (!url) continue;
    const key = dedupeKey(url);
    if (seen.has(key)) continue;
    seen.add(key);
    links.push({ url, text: (anchor.textContent || '').trim().replace(/\s+/g, ' ') });
  }
  return links;
}
