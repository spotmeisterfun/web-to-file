/* ------------------------------------------------------------------ *
 * main — menucommando's, sneltoets en de optionele zwevende knop.
 * ------------------------------------------------------------------ */

const FLOATING_BUTTON_CSS = `
position: fixed; right: 18px; bottom: 18px; z-index: 2147483000;
padding: 10px 14px; border: 0; border-radius: 999px; cursor: pointer;
background: #2563eb; color: #fff; box-shadow: 0 6px 18px rgba(0,0,0,.28);
font: 600 13px/1 -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
`;

function mountFloatingButton() {
  if (document.querySelector('[data-web-to-file="button"]')) return;
  const host = el('div', { 'data-web-to-file': 'button' });
  host.style.cssText = 'all: initial;';
  const shadow = host.attachShadow({ mode: 'open' });
  const button = el('button', { type: 'button', text: '↓ Markdown', title: "Pagina('s) opslaan als Markdown" });
  button.style.cssText = FLOATING_BUTTON_CSS;
  button.addEventListener('click', openWizard);
  shadow.append(button);
  document.body.append(host);
}

function toggleFloatingButton() {
  const enabled = !getGlobalFlag('floatingButton', false);
  setGlobalFlag('floatingButton', enabled);
  if (enabled) mountFloatingButton();
  else {
    const host = document.querySelector('[data-web-to-file="button"]');
    if (host) host.remove();
  }
}

function registerMenu() {
  if (typeof GM_registerMenuCommand !== 'function') return;
  GM_registerMenuCommand("Pagina('s) opslaan als Markdown  (Ctrl+Shift+M)", openWizard);
  GM_registerMenuCommand('Content-element kalibreren…', startCalibration);
  GM_registerMenuCommand('Kalibratie voor dit domein wissen', clearCalibration);
  GM_registerMenuCommand(
    getGlobalFlag('floatingButton', false) ? 'Zwevende knop uitzetten' : 'Zwevende knop aanzetten',
    toggleFloatingButton,
  );
}

function onShortcut(event) {
  if (event.ctrlKey && event.shiftKey && !event.altKey && (event.key === 'M' || event.key === 'm')) {
    event.preventDefault();
    openWizard();
  }
}

function boot() {
  registerMenu();
  window.addEventListener('keydown', onShortcut, true);
  if (getGlobalFlag('floatingButton', false)) mountFloatingButton();

  // Alleen voor de testharnas in test/browser.html; op echte pagina's uit.
  if (globalThis.__WEB_TO_FILE_TEST__) {
    globalThis.webToFile = {
      normalizeUrl, dedupeKey, slugify, uniqueSlug, countWords, estimateTokens, shortenUrl,
      createScopeFilter, guessScopePrefix, collectLinks, createCrawler,
      parseHtml, findContentRoot, cleanContent, extractPageMeta, cssPathFor,
      pageToMarkdown, prepareContent, renderContent, demoteHeadings, absolutizeUrls, tidyMarkdown,
      assembleDocument, buildFilename, splitDocument,
      openWizard, startCalibration,
    };
  }
}

boot();
