/* ------------------------------------------------------------------ *
 * save — het resultaat op schijf of op het klembord zetten.
 * ------------------------------------------------------------------ */

function createBlobUrl(text) {
  const blob = new Blob([text], { type: 'text/markdown;charset=utf-8' });
  return URL.createObjectURL(blob);
}

/**
 * Downloadt het bestand via een blob-link. Dit werkt ook op sites met een
 * strikte CSP, omdat de blob in de pagina zelf wordt gemaakt.
 */
function saveTextFile(filename, text) {
  const url = createBlobUrl(text);
  try {
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    anchor.rel = 'noopener';
    anchor.style.display = 'none';
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    return { ok: true, via: 'browser' };
  } catch (error) {
    return { ok: false, reason: error && error.message ? error.message : 'download geweigerd' };
  } finally {
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  }
}

/** Alternatief via Tampermonkey zelf, voor als de gewone download niets doet. */
function saveViaGm(filename, text) {
  if (typeof GM_download !== 'function') {
    return { ok: false, reason: 'GM_download is niet beschikbaar' };
  }
  const url = createBlobUrl(text);
  try {
    GM_download({
      url,
      name: filename,
      saveAs: true,
      onerror: () => { /* de gebruiker kan altijd nog kopiëren */ },
    });
    return { ok: true, via: 'GM_download' };
  } catch (error) {
    return { ok: false, reason: error && error.message ? error.message : 'GM_download mislukt' };
  } finally {
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  }
}

function copyToClipboard(text) {
  if (typeof GM_setClipboard === 'function') {
    GM_setClipboard(text, 'text');
    return { ok: true, via: 'GM_setClipboard' };
  }
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text);
    return { ok: true, via: 'navigator.clipboard' };
  }
  return { ok: false, reason: 'geen klembord beschikbaar' };
}
