/* ------------------------------------------------------------------ *
 * util — losse hulpfuncties zonder DOM-afhankelijkheden.
 * ------------------------------------------------------------------ */

const TRACKING_PARAMS = [
  'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'utm_id',
  'gclid', 'fbclid', 'mc_cid', 'mc_eid', 'ref', 'referrer',
  // Atlassian-specifiek
  'atlOrigin', 'src', 'focusedCommentId', 'focusedTaskId', 'atl_token', 'moved',
];

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** GitHub-stijl anchor-slug, zodat de inhoudsopgave in Markdown-viewers werkt. */
function slugify(text) {
  const slug = String(text || '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-+|-+$/g, '');
  return slug || 'sectie';
}

/** Zorgt dat een slug uniek is binnen `used`, met GitHub's -1/-2 achtervoegsels. */
function uniqueSlug(base, used) {
  let slug = base;
  let n = 0;
  while (used.has(slug)) {
    n += 1;
    slug = `${base}-${n}`;
  }
  used.add(slug);
  return slug;
}

/**
 * Maakt van een (mogelijk relatieve) href een absolute URL die we kunnen ophalen:
 * hash eraf, tracking-parameters eraf. Geeft null bij niet-http(s) of onparseerbaar.
 */
function normalizeUrl(raw, base) {
  if (!raw) return null;
  const trimmed = String(raw).trim();
  if (!trimmed || trimmed.startsWith('#')) return null;
  let url;
  try {
    url = base ? new URL(trimmed, base) : new URL(trimmed);
  } catch {
    return null;
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
  url.hash = '';
  for (const param of TRACKING_PARAMS) url.searchParams.delete(param);
  return url.toString();
}

/**
 * Agressievere sleutel om dubbele pagina's te herkennen: dezelfde pagina met en
 * zonder slash, met andere parameter-volgorde of via /index.html telt één keer.
 */
function dedupeKey(rawUrl) {
  let url;
  try {
    url = new URL(rawUrl);
  } catch {
    return String(rawUrl);
  }
  url.hash = '';
  url.hostname = url.hostname.toLowerCase();
  url.pathname = url.pathname
    .replace(/\/index\.(html?|php|aspx?)$/i, '/')
    .replace(/\/{2,}/g, '/')
    .replace(/(.)\/$/, '$1');
  const params = [...url.searchParams.entries()].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
  url.search = '';
  for (const [key, value] of params) url.searchParams.append(key, value);
  return url.toString();
}

/** Voert `worker` uit over `items` met maximaal `limit` gelijktijdige aanroepen. */
async function pool(items, limit, worker) {
  const queue = [...items];
  const results = [];
  const runners = Array.from({ length: Math.max(1, Math.min(limit, queue.length)) }, async () => {
    for (;;) {
      const index = items.length - queue.length;
      const item = queue.shift();
      if (item === undefined) return;
      results[index] = await worker(item, index);
    }
  });
  await Promise.all(runners);
  return results;
}

/** Probeert `fn` opnieuw met oplopende wachttijd. Gooit de laatste fout door. */
async function retry(fn, attempts = 2, baseDelay = 400) {
  let lastError;
  for (let attempt = 0; attempt <= attempts; attempt += 1) {
    try {
      return await fn(attempt);
    } catch (error) {
      lastError = error;
      if (attempt < attempts) await sleep(baseDelay * 2 ** attempt);
    }
  }
  throw lastError;
}

function countWords(text) {
  const matches = String(text).match(/\S+/g);
  return matches ? matches.length : 0;
}

/** Ruwe schatting: ~4 tekens per token. Genoeg om te zien of iets in de context past. */
function estimateTokens(text) {
  return Math.round(String(text).length / 4);
}

function formatNumber(value) {
  return new Intl.NumberFormat('nl-NL').format(value);
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} kB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Kort een URL in voor weergave in de lijst: alleen pad + query. */
function shortenUrl(rawUrl, maxLength = 72) {
  let text = rawUrl;
  try {
    const url = new URL(rawUrl);
    text = url.pathname + url.search;
  } catch { /* laat de ruwe waarde staan */ }
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength - 1)}…`;
}

/**
 * Houdt de zwevende knop binnen het venster. De positie is de afstand van de
 * rechter- en onderrand tot de knop, zodat hij bij het verkleinen van het venster
 * in de hoek blijft hangen in plaats van eruit te schuiven.
 *
 * @param {{right: number, bottom: number}} position
 * @param {{width: number, height: number, size: number}} viewport
 */
function clampToViewport(position, viewport) {
  const margin = 8;
  const size = Number(viewport && viewport.size) > 0 ? Number(viewport.size) : 34;
  const width = Number(viewport && viewport.width) > 0 ? Number(viewport.width) : 0;
  const height = Number(viewport && viewport.height) > 0 ? Number(viewport.height) : 0;

  const fallback = 18;
  // Alleen echte getallen tellen: Number(null) is 0, en dat zou als een
  // geldige positie tegen de rand worden gelezen.
  const wanted = (value) => (typeof value === 'number' && Number.isFinite(value) ? value : fallback);
  const fit = (value, extent) => {
    const limit = Math.max(margin, extent - size - margin);
    return Math.min(Math.max(value, margin), limit);
  };

  return {
    right: fit(wanted(position && position.right), width),
    bottom: fit(wanted(position && position.bottom), height),
  };
}

function escapeHtml(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function todayStamp() {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}
