/* ------------------------------------------------------------------ *
 * discover — de crawl in twee fasen.
 *
 * Fase 1 (verkennen) haalt alleen de niveaus op die nódig zijn om de lijst te
 * kunnen maken: voor diepte 1 is dat alleen de startpagina. Je ziet dus eerst
 * hoeveel pagina's het worden en pas na jouw bevestiging worden de rest
 * opgehaald (fase 2).
 * ------------------------------------------------------------------ */

const DEFAULT_CONCURRENCY = 3;
const POLITE_DELAY_MS = 120;

function sameLiveUrl(url) {
  return dedupeKey(url) === dedupeKey(location.href);
}

/**
 * @param {object} options
 * @param {string}   options.startUrl
 * @param {number}   options.depth            0 = alleen deze pagina
 * @param {Function} options.allow            scope-filter uit createScopeFilter
 * @param {number}   options.maxPages
 * @param {string}   options.imageMode
 * @param {boolean}  [options.includeAllLinks] ook links buiten de hoofdinhoud volgen
 * @param {Function} [options.onProgress]     ({done, total, phase, url})
 * @param {Function} [options.isCancelled]
 * @param {Function} [options.loadPage]        alleen voor tests: eigen loader
 */
function createCrawler(options) {
  const {
    startUrl,
    depth,
    allow,
    maxPages,
    imageMode = 'link',
    includeAllLinks = false,
    concurrency = DEFAULT_CONCURRENCY,
    onProgress = () => {},
    isCancelled = () => false,
    loadPage = null,
  } = options;

  const nodes = [];
  const byKey = new Map();
  const failures = [];
  const state = { truncated: false };

  function addNode(node) {
    const key = dedupeKey(node.url);
    if (byKey.has(key)) return null;
    if (nodes.length >= maxPages) {
      state.truncated = true;
      return null;
    }
    byKey.set(key, node);
    nodes.push(node);
    return node;
  }

  async function loadDocument(node) {
    if (loadPage) return loadPage(node);
    if (sameLiveUrl(node.url)) {
      return {
        ok: true,
        doc: document,
        finalUrl: location.href,
        bytes: document.documentElement.outerHTML.length,
      };
    }
    const response = await fetchHtml(node.url);
    if (!response.ok) return response;
    const finalUrl = response.finalUrl || node.url;
    return { ok: true, doc: parseHtml(response.html, finalUrl), finalUrl, bytes: response.bytes };
  }

  /** Haalt één pagina op, zet hem om naar Markdown en onthoudt de links. */
  async function analyse(node) {
    if (node.fetched || node.excluded) return;
    const response = await loadDocument(node);
    if (!response.ok) {
      node.failed = true;
      node.reason = response.reason;
      failures.push({ url: node.url, depth: node.depth, reason: response.reason });
      return;
    }

    const { root, via } = findContentRoot(response.doc, node.url);
    const meta = extractPageMeta(response.doc, node.url, root);

    // Dezelfde pagina onder een andere URL: één keer opnemen.
    if (meta.canonical) {
      const canonicalKey = dedupeKey(meta.canonical);
      const owner = byKey.get(canonicalKey);
      if (owner && owner !== node) {
        node.excluded = true;
        node.reason = 'dubbel (zelfde canonieke URL)';
        return;
      }
      if (!owner) byKey.set(canonicalKey, node);
    }

    node.title = meta.title || node.title || shortenUrl(node.url);
    node.lastModified = meta.lastModified || '';
    node.breadcrumbs = meta.breadcrumbs || [];
    node.finalUrl = response.finalUrl;
    node.contentVia = via;
    node.bytes = response.bytes;
    const cleaned = prepareContent(root);
    node.links = collectLinks(includeAllLinks ? (response.doc.body || root) : cleaned, response.finalUrl);
    node.markdown = renderContent(cleaned, { imageMode, demoteBy: 2, title: node.title });
    node.chars = node.markdown.length;
    node.words = countWords(node.markdown);
    node.fetched = true;
  }

  async function runBatch(batch, phase) {
    let done = 0;
    await pool(batch, concurrency, async (node) => {
      if (isCancelled()) return;
      if (POLITE_DELAY_MS) await sleep(Math.random() * POLITE_DELAY_MS);
      await analyse(node);
      done += 1;
      onProgress({ phase, done, total: batch.length, url: node.url, title: node.title });
    });
  }

  /**
   * Fase 1: bouwt de lijst met pagina's. Haalt de niveaus 0..depth-1 op om de
   * links te kunnen lezen; het diepste niveau blijft nog ongeladen.
   */
  async function discover() {
    addNode({ url: startUrl, depth: 0, parentUrl: null, title: '', fetched: false });

    for (let level = 0; level < Math.max(depth, 1); level += 1) {
      if (isCancelled()) break;
      const batch = nodes.filter((node) => node.depth === level && !node.fetched && !node.excluded);
      if (!batch.length) break;
      await runBatch(batch, 'verkennen');

      if (level >= depth) break;
      for (const node of batch) {
        for (const link of node.links || []) {
          if (!allow(link.url).ok) continue;
          addNode({
            url: link.url,
            depth: level + 1,
            parentUrl: node.url,
            title: link.text || '',
            fetched: false,
          });
        }
      }
    }

    return { nodes: includedNodes(), failures, truncated: state.truncated };
  }

  /** Fase 2: haalt de nog niet geladen pagina's op uit de selectie. */
  async function collect(selected) {
    const pending = selected.filter((node) => !node.fetched && !node.excluded);
    if (pending.length) await runBatch(pending, 'ophalen');
    const selectedKeys = new Set(selected.map((node) => dedupeKey(node.url)));
    return {
      pages: selected.filter((node) => node.fetched && !node.excluded),
      failures: failures.filter((failure) => selectedKeys.has(dedupeKey(failure.url))),
    };
  }

  function includedNodes() {
    return nodes.filter((node) => !node.excluded);
  }

  return {
    discover,
    collect,
    get nodes() { return includedNodes(); },
    get failures() { return failures; },
    get truncated() { return state.truncated; },
  };
}
