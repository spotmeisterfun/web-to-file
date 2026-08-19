/* ------------------------------------------------------------------ *
 * settings — persistente instellingen via GM_getValue/GM_setValue.
 *
 * Alles staat in één JSON-blob, met een sectie per domein zodat een
 * gekalibreerde content-selector per site bewaard blijft.
 * ------------------------------------------------------------------ */

const SETTINGS_KEY = 'web-to-file:settings';
const memoryFallback = { data: null };

function hasGmStorage() {
  return typeof GM_getValue === 'function' && typeof GM_setValue === 'function';
}

function readSettings() {
  if (!hasGmStorage()) return memoryFallback.data || (memoryFallback.data = {});
  try {
    const raw = GM_getValue(SETTINGS_KEY, '{}');
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function writeSettings(settings) {
  if (!hasGmStorage()) {
    memoryFallback.data = settings;
    return;
  }
  try {
    GM_setValue(SETTINGS_KEY, JSON.stringify(settings));
  } catch { /* opslag vol of geweigerd: instellingen zijn niet essentieel */ }
}

/** Laatst gebruikte opties in het paneel, zodat je ze niet opnieuw invult. */
function getLastOptions() {
  const settings = readSettings();
  return settings.lastOptions && typeof settings.lastOptions === 'object' ? settings.lastOptions : {};
}

function setLastOptions(options) {
  const settings = readSettings();
  settings.lastOptions = options;
  writeSettings(settings);
}

function getDomainConfig(host) {
  const settings = readSettings();
  const domains = settings.domains || {};
  return domains[host] && typeof domains[host] === 'object' ? domains[host] : {};
}

function patchDomainConfig(host, patch) {
  const settings = readSettings();
  settings.domains = settings.domains || {};
  settings.domains[host] = Object.assign({}, settings.domains[host], patch);
  writeSettings(settings);
}

function getGlobalFlag(name, fallback) {
  const settings = readSettings();
  return name in settings ? settings[name] : fallback;
}

function setGlobalFlag(name, value) {
  const settings = readSettings();
  settings[name] = value;
  writeSettings(settings);
}
