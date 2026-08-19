/* ------------------------------------------------------------------ *
 * main — het knopje op de pagina en de menucommando's.
 *
 * Er wordt bewust géén sneltoets gebonden. Edge houdt combinaties als
 * Ctrl+Shift+M voor zichzelf (profiel wisselen) en stuurt die nooit naar de
 * pagina, dus een sneltoets is per browserversie en toetsenbordindeling een
 * gok. Een knopje werkt altijd.
 * ------------------------------------------------------------------ */

const BUTTON_SIZE = 34;
const DRAG_THRESHOLD = 4;
const DEFAULT_BUTTON_POSITION = { right: 18, bottom: 18 };

const BUTTON_CSS = `
:host { all: initial; }
button {
  position: fixed; width: ${BUTTON_SIZE}px; height: ${BUTTON_SIZE}px;
  z-index: 2147483000; padding: 0; border: 0; border-radius: 50%;
  background: #2563eb; color: #fff; cursor: pointer; opacity: .45;
  box-shadow: 0 2px 8px rgba(0, 0, 0, .3);
  font: 600 17px/1 -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  display: flex; align-items: center; justify-content: center;
  transition: opacity .15s, transform .15s;
  touch-action: none; -webkit-user-select: none; user-select: none;
}
button:hover, button:focus-visible { opacity: 1; transform: scale(1.08); }
button:focus-visible { outline: 2px solid #fff; outline-offset: 2px; }
`;

function findButtonHost() {
  return document.querySelector('[data-web-to-file="button"]');
}

/** De knop staat per site aan; standaard nergens. */
function isButtonEnabled() {
  return getDomainConfig(location.host).button === true;
}

function currentViewport() {
  return { width: window.innerWidth, height: window.innerHeight, size: BUTTON_SIZE };
}

function readButtonPosition() {
  const stored = getGlobalFlag('buttonPosition', null);
  return clampToViewport(stored || DEFAULT_BUTTON_POSITION, currentViewport());
}

/**
 * Maakt de knop versleepbaar. Onder de drempel van een paar pixels blijft het een
 * gewone klik, zodat verplaatsen en openen elkaar niet in de weg zitten.
 */
function makeDraggable(button) {
  let position = readButtonPosition();
  let start = null;
  let dragged = false;

  const apply = () => {
    button.style.right = `${position.right}px`;
    button.style.bottom = `${position.bottom}px`;
  };

  const onMove = (event) => {
    if (!start) return;
    const dx = event.clientX - start.x;
    const dy = event.clientY - start.y;
    if (!dragged && Math.abs(dx) + Math.abs(dy) < DRAG_THRESHOLD) return;
    dragged = true;
    position = clampToViewport({ right: start.right - dx, bottom: start.bottom - dy }, currentViewport());
    apply();
  };

  const onUp = () => {
    window.removeEventListener('pointermove', onMove, true);
    window.removeEventListener('pointerup', onUp, true);
    if (!start) return;
    start = null;
    if (dragged) {
      setGlobalFlag('buttonPosition', position);
      button.dataset.dragged = 'true';
    }
  };

  button.addEventListener('pointerdown', (event) => {
    if (event.button !== 0) return;
    start = { x: event.clientX, y: event.clientY, right: position.right, bottom: position.bottom };
    dragged = false;
    window.addEventListener('pointermove', onMove, true);
    window.addEventListener('pointerup', onUp, true);
  });

  // Na een sleep hoort de afsluitende klik de wizard niet te openen.
  button.addEventListener('click', (event) => {
    if (button.dataset.dragged === 'true') {
      delete button.dataset.dragged;
      event.preventDefault();
      return;
    }
    openWizard();
  });

  const onResize = () => {
    position = clampToViewport(position, currentViewport());
    apply();
  };
  window.addEventListener('resize', onResize);
  apply();
  return () => window.removeEventListener('resize', onResize);
}

function mountFloatingButton() {
  if (findButtonHost()) return;
  const host = el('div', { 'data-web-to-file': 'button' });
  host.style.cssText = 'all: initial;';
  const shadow = host.attachShadow({ mode: 'open' });
  const button = el('button', {
    type: 'button',
    title: "Pagina('s) opslaan als Markdown — versleep om te verplaatsen",
    'aria-label': "Pagina('s) opslaan als Markdown",
    text: '↓',
  });
  shadow.append(el('style', { text: BUTTON_CSS }), button);
  host.webToFileCleanup = makeDraggable(button);
  document.body.append(host);
}

function unmountFloatingButton() {
  const host = findButtonHost();
  if (!host) return;
  if (typeof host.webToFileCleanup === 'function') host.webToFileCleanup();
  host.remove();
}

function setButtonEnabled(enabled) {
  patchDomainConfig(location.host, { button: Boolean(enabled) });
  if (enabled) mountFloatingButton();
  else unmountFloatingButton();
}

function registerMenu() {
  if (typeof GM_registerMenuCommand !== 'function') return;
  GM_registerMenuCommand("Pagina('s) opslaan als Markdown", openWizard);
  // Neutraal label: Tampermonkey kan het label niet bijwerken zonder herladen,
  // dus een "aanzetten"/"uitzetten"-tekst zou na het omzetten onjuist zijn.
  GM_registerMenuCommand('Knopje op deze site aan-/uitzetten', () => setButtonEnabled(!isButtonEnabled()));
  GM_registerMenuCommand('Content-element kalibreren…', startCalibration);
  GM_registerMenuCommand('Kalibratie voor dit domein wissen', clearCalibration);
}

function boot() {
  registerMenu();
  if (isButtonEnabled()) mountFloatingButton();

  // Alleen voor de testharnas in test/browser.html; op echte pagina's uit.
  if (globalThis.__WEB_TO_FILE_TEST__) {
    globalThis.webToFile = {
      normalizeUrl, dedupeKey, slugify, uniqueSlug, countWords, estimateTokens, shortenUrl,
      clampToViewport,
      createScopeFilter, guessScopePrefix, collectLinks, createCrawler,
      parseHtml, findContentRoot, cleanContent, extractPageMeta, cssPathFor,
      pageToMarkdown, prepareContent, renderContent, demoteHeadings, absolutizeUrls, tidyMarkdown,
      assembleDocument, buildFilename, splitDocument,
      openWizard, startCalibration,
      isButtonEnabled, setButtonEnabled, mountFloatingButton, unmountFloatingButton,
    };
  }
}

boot();
