/* ------------------------------------------------------------------ *
 * ui — het paneel, in een shadow DOM zodat de opmaak van de site niets
 * kan breken en het paneel zelf niet in de export terechtkomt.
 * ------------------------------------------------------------------ */

const PANEL_CSS = `
:host { all: initial; }
* { box-sizing: border-box; }
.overlay {
  position: fixed; inset: 0; z-index: 2147483647;
  background: rgba(15, 23, 42, .55);
  display: flex; align-items: center; justify-content: center; padding: 24px;
  font: 14px/1.5 -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  color: #0f172a;
}
.panel {
  background: #fff; color: #0f172a; width: 100%; max-width: 760px;
  max-height: 86vh; display: flex; flex-direction: column;
  border-radius: 12px; box-shadow: 0 24px 64px rgba(0,0,0,.35); overflow: hidden;
}
header { display: flex; align-items: center; gap: 12px; padding: 14px 18px; border-bottom: 1px solid #e2e8f0; }
header .title { font-weight: 700; font-size: 15px; }
header .step { color: #64748b; font-size: 12px; margin-left: auto; }
header button.close { border: 0; background: none; font-size: 22px; line-height: 1; cursor: pointer; color: #64748b; padding: 0 4px; }
.body { padding: 18px; overflow: auto; flex: 1; }
footer { display: flex; align-items: center; gap: 10px; padding: 14px 18px; border-top: 1px solid #e2e8f0; background: #f8fafc; }
footer .status { color: #475569; font-size: 12px; margin-right: auto; }
.actions { display: flex; gap: 10px; }
.hint { color: #64748b; font-size: 12px; }
.field { display: block; margin-bottom: 14px; }
.field > span.label { display: block; font-weight: 600; margin-bottom: 5px; }
.field > span.hint { display: block; color: #64748b; font-size: 12px; margin-top: 4px; }
input[type=text], input[type=number], select, textarea {
  width: 100%; padding: 8px 10px; border: 1px solid #cbd5e1; border-radius: 7px;
  font: inherit; background: #fff; color: inherit;
}
textarea { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 12px; min-height: 190px; resize: vertical; }
button.action {
  border: 1px solid #cbd5e1; background: #fff; color: #0f172a; padding: 8px 14px;
  border-radius: 7px; font: inherit; font-weight: 600; cursor: pointer;
}
button.action:hover { background: #f1f5f9; }
button.action.primary { background: #2563eb; border-color: #2563eb; color: #fff; }
button.action.primary:hover { background: #1d4ed8; }
button.action:disabled { opacity: .5; cursor: not-allowed; }
button.link { border: 0; background: none; color: #2563eb; cursor: pointer; font: inherit; padding: 0; text-decoration: underline; }
.depth { display: flex; gap: 8px; flex-wrap: wrap; }
.depth button { flex: 1 1 120px; text-align: left; padding: 9px 12px; border: 1px solid #cbd5e1; border-radius: 8px; background: #fff; cursor: pointer; font: inherit; }
.depth button.selected { border-color: #2563eb; background: #eff6ff; box-shadow: inset 0 0 0 1px #2563eb; }
.depth button strong { display: block; }
.depth button span { color: #64748b; font-size: 12px; }
details.more { margin-top: 6px; }
details.more summary { cursor: pointer; color: #2563eb; font-weight: 600; margin-bottom: 12px; }
.summary { background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; padding: 12px 14px; margin-bottom: 14px; }
.summary strong { font-size: 16px; }
.toolbar { display: flex; gap: 12px; align-items: center; margin-bottom: 8px; font-size: 12px; color: #475569; }
.group { margin-bottom: 14px; }
.group > .group-title { font-weight: 700; font-size: 12px; text-transform: uppercase; letter-spacing: .04em; color: #64748b; margin: 12px 0 6px; }
.row { display: flex; gap: 9px; align-items: flex-start; padding: 5px 6px; border-radius: 6px; }
.row:hover { background: #f1f5f9; }
.row input { margin-top: 3px; flex: none; }
.row .text { min-width: 0; }
.row .name { display: block; font-weight: 500; word-break: break-word; }
.row .path { display: block; color: #64748b; font-size: 12px; word-break: break-all; }
.row .fail { display: block; }
.progress { height: 8px; background: #e2e8f0; border-radius: 999px; overflow: hidden; margin: 12px 0; }
.progress > div { height: 100%; background: #2563eb; width: 0; transition: width .2s; }
.mono { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 12px; word-break: break-all; color: #475569; }
.stats { display: flex; gap: 18px; flex-wrap: wrap; margin-bottom: 14px; }
.stats div span { display: block; color: #64748b; font-size: 12px; }
.stats div strong { font-size: 17px; }
.warn { background: #fef3c7; border: 1px solid #fcd34d; border-radius: 8px; padding: 10px 12px; margin-bottom: 12px; }
.fail { color: #b91c1c; font-size: 12px; }
@media (prefers-color-scheme: dark) {
  .overlay { color: #e2e8f0; }
  .hint { color: #94a3b8; }
  .panel { background: #0f172a; color: #e2e8f0; }
  header, footer { border-color: #1e293b; }
  footer { background: #131c31; }
  header .step, footer .status, .row .path, .group > .group-title, .field > span.hint, .mono, .stats div span { color: #94a3b8; }
  input[type=text], input[type=number], select, textarea { background: #1e293b; border-color: #334155; color: #e2e8f0; }
  button.action { background: #1e293b; border-color: #334155; color: #e2e8f0; }
  button.action:hover { background: #263449; }
  button.action.primary { background: #2563eb; border-color: #2563eb; color: #fff; }
  .depth button { background: #1e293b; border-color: #334155; color: #e2e8f0; }
  .depth button.selected { background: #1e3a8a; }
  .depth button span { color: #94a3b8; }
  .row:hover { background: #1e293b; }
  .summary { background: #172554; border-color: #1e40af; }
  .progress { background: #1e293b; }
  .warn { background: #422006; border-color: #a16207; }
}
`;

const DEPTH_CHOICES = [
  { value: 0, label: 'Alleen deze pagina', hint: '1 pagina, geen links volgen' },
  { value: 1, label: '1 laag diep', hint: 'deze pagina + alles waar hij naar linkt' },
  { value: 2, label: '2 lagen diep', hint: 'ook de links op die pagina\'s' },
  { value: 3, label: '3 lagen diep', hint: 'kan snel veel pagina\'s worden' },
];

/** Maakt een element met attributen, tekst en kinderen. Bewust zonder innerHTML:
 * titels en URL's komen van externe sites en gaan er altijd als tekst in. */
function el(tag, props, children) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(props || {})) {
    if (key === 'class') node.className = value;
    else if (key === 'text') node.textContent = value;
    else if (key.startsWith('on') && typeof value === 'function') node.addEventListener(key.slice(2), value);
    else if (value === true) node.setAttribute(key, '');
    else if (value !== false && value !== null && value !== undefined) node.setAttribute(key, value);
  }
  for (const child of [].concat(children || [])) {
    if (child === null || child === undefined || child === false) continue;
    node.append(typeof child === 'string' ? document.createTextNode(child) : child);
  }
  return node;
}

function createPanel() {
  const host = el('div', { 'data-web-to-file': 'panel' });
  host.style.cssText = 'all: initial; position: fixed; inset: 0; z-index: 2147483647;';
  const shadow = host.attachShadow({ mode: 'open' });
  shadow.append(el('style', { text: PANEL_CSS }));

  const stepLabel = el('span', { class: 'step' });
  const body = el('div', { class: 'body' });
  const status = el('span', { class: 'status' });
  const actions = el('div', { class: 'actions' });
  const footer = el('footer', {}, [status, actions]);

  const onKeyDown = (event) => {
    if (event.key === 'Escape') close();
  };
  const close = () => {
    window.removeEventListener('keydown', onKeyDown, true);
    host.remove();
  };
  window.addEventListener('keydown', onKeyDown, true);
  const overlay = el('div', { class: 'overlay' }, [
    el('div', { class: 'panel', role: 'dialog', 'aria-label': 'web-to-file' }, [
      el('header', {}, [
        el('span', { class: 'title', text: 'web-to-file' }),
        stepLabel,
        el('button', { class: 'close', title: 'Sluiten', onclick: close, text: '×' }),
      ]),
      body,
      footer,
    ]),
  ]);
  shadow.append(overlay);
  document.body.append(host);

  return {
    host,
    close,
    setStep: (text) => { stepLabel.textContent = text; },
    setStatus: (text) => { status.textContent = text; },
    render(content, buttons) {
      body.replaceChildren(...[].concat(content).filter(Boolean));
      actions.replaceChildren(...[].concat(buttons || []).filter(Boolean));
      body.scrollTop = 0;
    },
  };
}
