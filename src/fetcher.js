/* ------------------------------------------------------------------ *
 * fetcher — HTML ophalen mét de ingelogde sessie van de gebruiker.
 *
 * Omdat een userscript in de context van de pagina zelf draait, gaan cookies
 * (inclusief SameSite=Strict en SSO) automatisch mee bij een same-origin fetch.
 * Voor andere hosts valt het script terug op GM_xmlhttpRequest.
 * ------------------------------------------------------------------ */

const FETCH_TIMEOUT_MS = 20000;
const HTML_CONTENT_TYPE = /(text\/html|application\/xhtml)/i;

function isSameOrigin(url) {
  try {
    return new URL(url).origin === location.origin;
  } catch {
    return false;
  }
}

function parseContentType(headerBlob) {
  const match = /^content-type:\s*(.+)$/im.exec(headerBlob || '');
  return match ? match[1].trim() : '';
}

/**
 * Ziet de respons eruit als een inlogpagina in plaats van de gevraagde inhoud?
 * Een inlog-achtig pad telt alleen als we er naartoe zijn omgeleid — anders
 * zou een echte pagina onder bijvoorbeeld /docs/auth/ onterecht sneuvelen.
 */
function looksLikeLoginPage(html, requestedUrl, finalUrl) {
  const redirected = dedupeKey(requestedUrl) !== dedupeKey(finalUrl);
  if (redirected && /\/(login|signin|sign-in|auth|adfs|saml|oauth2)\b/i.test(finalUrl)) return true;
  const head = html.slice(0, 4000);
  return /<input[^>]+type=["']?password/i.test(head) && !/<article|<main/i.test(head);
}

function fetchViaGm(url) {
  if (typeof GM_xmlhttpRequest !== 'function') {
    return Promise.reject(new Error('GM_xmlhttpRequest is niet beschikbaar'));
  }
  return new Promise((resolve, reject) => {
    GM_xmlhttpRequest({
      method: 'GET',
      url,
      timeout: FETCH_TIMEOUT_MS,
      headers: { Accept: 'text/html,application/xhtml+xml' },
      onload: (response) => resolve({
        status: response.status,
        html: response.responseText || '',
        finalUrl: response.finalUrl || url,
        contentType: parseContentType(response.responseHeaders),
      }),
      onerror: () => reject(new Error('netwerkfout')),
      ontimeout: () => reject(new Error('timeout na 20s')),
      onabort: () => reject(new Error('afgebroken')),
    });
  });
}

async function fetchViaWindow(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      credentials: 'include',
      redirect: 'follow',
      signal: controller.signal,
      headers: { Accept: 'text/html,application/xhtml+xml' },
    });
    return {
      status: response.status,
      html: await response.text(),
      finalUrl: response.url || url,
      contentType: response.headers.get('content-type') || '',
    };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Haalt één pagina op. Gooit nooit; geeft altijd een resultaatobject terug.
 *
 * @returns {Promise<{ok: boolean, url: string, finalUrl?: string, html?: string,
 *                    bytes?: number, reason?: string}>}
 */
async function fetchHtml(url) {
  try {
    const response = await retry(
      () => (isSameOrigin(url) ? fetchViaWindow(url) : fetchViaGm(url)),
      2,
      500,
    );
    if (response.status < 200 || response.status >= 300) {
      return { ok: false, url, reason: `HTTP ${response.status}` };
    }
    if (response.contentType && !HTML_CONTENT_TYPE.test(response.contentType)) {
      return { ok: false, url, reason: `geen HTML (${response.contentType.split(';')[0]})` };
    }
    if (!response.html || !response.html.trim()) {
      return { ok: false, url, reason: 'lege respons' };
    }
    if (looksLikeLoginPage(response.html, url, response.finalUrl || url)) {
      return { ok: false, url, reason: 'inlogpagina — sessie verlopen?' };
    }
    return {
      ok: true,
      url,
      finalUrl: response.finalUrl,
      html: response.html,
      bytes: response.html.length,
    };
  } catch (error) {
    return { ok: false, url, reason: error && error.message ? error.message : 'onbekende fout' };
  }
}

/**
 * Parseert HTML naar een los document en zet er een <base> in, zodat relatieve
 * links en afbeeldingen als absolute URL uitgelezen kunnen worden.
 */
function parseHtml(html, url) {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const head = doc.head || doc.documentElement;
  const existing = doc.querySelector('base[href]');
  if (existing) {
    const resolved = normalizeUrl(existing.getAttribute('href'), url);
    if (resolved) existing.setAttribute('href', resolved);
    else existing.remove();
  }
  if (!doc.querySelector('base[href]')) {
    const base = doc.createElement('base');
    base.setAttribute('href', url);
    head.insertBefore(base, head.firstChild);
  }
  return doc;
}
