/* ------------------------------------------------------------------ *
 * calibrate — de gebruiker wijst zelf het element met de hoofdinhoud aan.
 *
 * Voor interne wiki's die niet met de standaard-selectors werken is dit de
 * betrouwbaarste route: één keer aanwijzen, daarna onthoudt het script de
 * selector voor dat domein.
 * ------------------------------------------------------------------ */

const CALIBRATE_BANNER_CSS = `
position: fixed; top: 0; left: 0; right: 0; z-index: 2147483647;
background: #2563eb; color: #fff; padding: 10px 16px;
font: 600 14px/1.4 -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
text-align: center; box-shadow: 0 2px 8px rgba(0,0,0,.3);
`;

const CALIBRATE_OUTLINE_CSS = `
position: fixed; z-index: 2147483646; pointer-events: none;
border: 2px solid #2563eb; background: rgba(37, 99, 235, .12);
border-radius: 3px; transition: all .05s linear;
`;

function startCalibration() {
  const host = el('div', { 'data-web-to-file': 'calibrate' });
  host.style.cssText = 'all: initial;';
  const shadow = host.attachShadow({ mode: 'open' });
  const banner = el('div', { text: 'Klik op het blok met de hoofdinhoud. Escape om te stoppen.' });
  banner.style.cssText = CALIBRATE_BANNER_CSS;
  const outline = el('div', {});
  outline.style.cssText = CALIBRATE_OUTLINE_CSS;
  shadow.append(banner, outline);
  document.body.append(host);

  let current = null;

  const targetAt = (event) => {
    const element = document.elementFromPoint(event.clientX, event.clientY);
    if (!element || element.closest('[data-web-to-file]')) return null;
    return element;
  };

  const onMove = (event) => {
    const element = targetAt(event);
    if (!element) return;
    current = element;
    const box = element.getBoundingClientRect();
    outline.style.top = `${box.top}px`;
    outline.style.left = `${box.left}px`;
    outline.style.width = `${box.width}px`;
    outline.style.height = `${box.height}px`;
    banner.textContent = `${element.localName}${element.id ? `#${element.id}` : ''} — klik om te kiezen, Escape om te stoppen`;
  };

  const stop = () => {
    document.removeEventListener('mousemove', onMove, true);
    document.removeEventListener('click', onClick, true);
    document.removeEventListener('keydown', onKey, true);
    host.remove();
  };

  const onClick = (event) => {
    const element = targetAt(event) || current;
    event.preventDefault();
    event.stopPropagation();
    if (!element) return;
    const selector = cssPathFor(element);
    const domain = location.host;
    let matched = null;
    try {
      matched = document.querySelector(selector);
    } catch { /* selector niet bruikbaar */ }
    stop();
    if (!selector || matched !== element) {
      alert('Kon voor dit element geen betrouwbare selector maken. Probeer het omliggende blok.');
      return;
    }
    patchDomainConfig(domain, { contentSelector: selector });
    alert(`Opgeslagen voor ${domain}:\n\n${selector}\n\nDit blok wordt vanaf nu als hoofdinhoud gebruikt.`);
  };

  const onKey = (event) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      stop();
    }
  };

  document.addEventListener('mousemove', onMove, true);
  document.addEventListener('click', onClick, true);
  document.addEventListener('keydown', onKey, true);
}

function clearCalibration() {
  patchDomainConfig(location.host, { contentSelector: null });
  alert(`De gekalibreerde selector voor ${location.host} is gewist.`);
}
