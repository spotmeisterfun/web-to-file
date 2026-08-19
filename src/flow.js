/* ------------------------------------------------------------------ *
 * flow — de vier stappen van de wizard aan elkaar geknoopt.
 * ------------------------------------------------------------------ */

const TOKEN_WARNING_THRESHOLD = 250000;
const SPLIT_CHOICES = [
  { value: 0, label: 'Niet splitsen (één bestand)' },
  { value: 25000, label: 'Splitsen per ~25.000 woorden' },
  { value: 50000, label: 'Splitsen per ~50.000 woorden' },
];

/** Alleen deze velden worden bewaard; de URL is altijd die van de huidige pagina. */
const REMEMBERED_OPTIONS = ['depth', 'maxPages', 'imageMode', 'includeAllLinks', 'exclude', 'splitWords'];

function rememberOptions(options) {
  const keep = {};
  for (const key of REMEMBERED_OPTIONS) keep[key] = options[key];
  setLastOptions(keep);
}

function defaultOptions() {
  const saved = getLastOptions();
  return {
    url: location.href,
    depth: typeof saved.depth === 'number' ? saved.depth : 1,
    prefix: guessScopePrefix(location.href),
    maxPages: saved.maxPages || 100,
    imageMode: saved.imageMode || 'link',
    includeAllLinks: Boolean(saved.includeAllLinks),
    exclude: saved.exclude || '',
    splitWords: saved.splitWords || 0,
  };
}

function openWizard() {
  const panel = createPanel();
  const options = defaultOptions();
  const state = { cancelled: false, crawler: null, document: null };

  /* ---------------- stap 1: instellingen ---------------- */

  function renderStart() {
    state.cancelled = false;
    panel.setStep('Stap 1 van 3 — instellen');
    panel.setStatus('');

    const urlInput = el('input', { type: 'text', value: options.url, spellcheck: 'false' });
    const prefixInput = el('input', { type: 'text', value: options.prefix, spellcheck: 'false' });
    const maxInput = el('input', { type: 'number', min: '1', max: '2000', value: String(options.maxPages) });
    const excludeInput = el('input', { type: 'text', value: options.exclude, spellcheck: 'false', placeholder: 'bijv. /archief/|oude-versie' });
    const allLinksInput = el('input', { type: 'checkbox' });
    allLinksInput.checked = options.includeAllLinks;
    const imageSelect = el('select', {}, [
      el('option', { value: 'link', text: 'Als Markdown-link behouden' }),
      el('option', { value: 'text', text: 'Vervangen door [afbeelding: alt]' }),
      el('option', { value: 'skip', text: 'Weglaten' }),
    ]);
    imageSelect.value = options.imageMode;

    // Bewaart wat er al ingevuld is, zodat het niet verdwijnt bij opnieuw tekenen.
    const captureInputs = () => {
      options.url = urlInput.value.trim() || options.url;
      options.prefix = prefixInput.value.trim();
      options.maxPages = Math.max(1, Number(maxInput.value) || 100);
      options.imageMode = imageSelect.value;
      options.includeAllLinks = allLinksInput.checked;
      options.exclude = excludeInput.value.trim();
    };

    const depthButtons = DEPTH_CHOICES.map((choice) => el('button', {
      class: choice.value === options.depth ? 'selected' : '',
      type: 'button',
      onclick: () => {
        captureInputs();
        options.depth = choice.value;
        renderStart();
      },
    }, [
      el('strong', { text: choice.label }),
      el('span', { text: choice.hint }),
    ]));

    const start = () => {
      const url = normalizeUrl(urlInput.value.trim());
      if (!url) {
        panel.setStatus('Dat is geen geldige http(s)-URL.');
        return;
      }
      Object.assign(options, {
        url,
        prefix: prefixInput.value.trim(),
        maxPages: Math.max(1, Number(maxInput.value) || 100),
        imageMode: imageSelect.value,
        includeAllLinks: allLinksInput.checked,
        exclude: excludeInput.value.trim(),
      });
      rememberOptions(options);
      runDiscover();
    };

    panel.render([
      el('label', { class: 'field' }, [
        el('span', { class: 'label', text: 'Pagina om op te slaan' }),
        urlInput,
      ]),
      el('div', { class: 'field' }, [
        el('span', { class: 'label', text: 'Hoe diep?' }),
        el('div', { class: 'depth' }, depthButtons),
      ]),
      el('label', { class: 'field' }, [
        el('span', { class: 'label', text: "Alleen pagina's waarvan de URL hiermee begint" }),
        prefixInput,
        el('span', { class: 'hint', text: 'Leeghalen om het hele domein toe te staan. Navigatie, footer en zijbalk worden altijd al genegeerd.' }),
      ]),
      isButtonEnabled() ? null : el('div', { class: 'hint' }, [
        'Het knopje is op deze site verborgen. ',
        el('button', {
          class: 'link',
          type: 'button',
          text: 'Weer aanzetten',
          onclick: () => {
            captureInputs();
            setButtonEnabled(true);
            panel.setStatus('Het knopje staat weer rechtsonder op deze site.');
            renderStart();
          },
        }),
        ' — dan hoef je hier niet meer via het Tampermonkey-menu te komen.',
      ]),
      el('details', { class: 'more' }, [
        el('summary', { text: 'Meer opties' }),
        el('label', { class: 'field' }, [
          el('span', { class: 'label', text: "Maximum aantal pagina's" }),
          maxInput,
        ]),
        el('label', { class: 'field' }, [
          el('span', { class: 'label', text: 'Afbeeldingen' }),
          imageSelect,
        ]),
        el('label', { class: 'field' }, [
          el('span', { class: 'label', text: 'URL-patroon uitsluiten (regex, optioneel)' }),
          excludeInput,
        ]),
        el('label', { class: 'field' }, [
          el('span', { class: 'label' }, [allLinksInput, ' Ook links buiten de hoofdinhoud volgen']),
          el('span', { class: 'hint', text: 'Standaard uit: dan blijft de lijst schoon, omdat menu- en footerlinks wegvallen.' }),
        ]),
      ]),
    ], [
      el('button', { class: 'action primary', type: 'button', text: 'Verkennen →', onclick: start }),
    ]);
  }

  /* ---------------- stap 2: verkennen ---------------- */

  function renderProgress(title, note) {
    const bar = el('div', {});
    const line = el('div', { class: 'mono', text: 'Bezig…' });
    panel.render([
      el('div', { class: 'field' }, [el('span', { class: 'label', text: title })]),
      note ? el('div', { class: 'hint', text: note }) : null,
      el('div', { class: 'progress' }, [bar]),
      line,
    ], [
      el('button', {
        class: 'action',
        type: 'button',
        text: 'Stoppen',
        onclick: () => { state.cancelled = true; panel.setStatus('Gestopt.'); renderStart(); },
      }),
    ]);
    state.progress = {
      update: ({ done, total, url }) => {
        bar.style.width = total ? `${Math.round((done / total) * 100)}%` : '0%';
        panel.setStatus(`${done} van ${total}`);
        line.textContent = shortenUrl(url, 90);
      },
    };
    return state.progress;
  }

  async function runDiscover() {
    panel.setStep('Stap 2 van 3 — verkennen');
    const requestNote = options.depth <= 1
      ? 'Alleen de startpagina wordt nu opgehaald om de lijst te maken.'
      : `Om ${options.depth} lagen te kunnen tonen worden nu ook de tussenliggende pagina's opgehaald.`;
    renderProgress('Pagina\'s zoeken…', requestNote);

    const allow = createScopeFilter({
      startUrl: options.url,
      prefix: options.prefix,
      exclude: options.exclude,
      sameOriginOnly: !options.prefix,
    });

    state.crawler = createCrawler({
      startUrl: options.url,
      depth: options.depth,
      allow,
      maxPages: options.maxPages,
      imageMode: options.imageMode,
      includeAllLinks: options.includeAllLinks,
      onProgress: (info) => { if (state.progress) state.progress.update(info); },
      isCancelled: () => state.cancelled,
    });

    try {
      await state.crawler.discover();
    } catch (error) {
      panel.setStatus(`Verkennen mislukt: ${error && error.message ? error.message : error}`);
      return;
    }
    if (state.cancelled) return;
    renderReview();
  }

  /* ---------------- stap 3: overzicht en selectie ---------------- */

  function renderReview() {
    panel.setStep('Stap 3 van 3 — controleren');
    panel.setStatus('');
    state.progress = null;
    const nodes = state.crawler.nodes;
    for (const node of nodes) {
      if (node.selected === undefined) node.selected = !node.failed;
    }

    const byDepth = new Map();
    for (const node of nodes) {
      if (!byDepth.has(node.depth)) byDepth.set(node.depth, []);
      byDepth.get(node.depth).push(node);
    }

    const primary = el('button', { class: 'action primary', type: 'button' });
    const counter = el('span', {});
    const updateCount = () => {
      const count = nodes.filter((node) => node.selected).length;
      primary.textContent = `Ophalen en samenvoegen (${count}) →`;
      primary.disabled = count === 0;
      counter.textContent = `${count} van ${nodes.length} geselecteerd`;
    };

    const groups = [...byDepth.keys()].sort((a, b) => a - b).map((depth) => {
      const pages = byDepth.get(depth);
      const label = depth === 0 ? 'Startpagina' : `Niveau ${depth} — ${pages.length} pagina's`;
      return el('div', { class: 'group' }, [
        el('div', { class: 'group-title', text: label }),
        ...pages.map((node) => {
          const checkbox = el('input', { type: 'checkbox' });
          checkbox.checked = node.selected;
          checkbox.addEventListener('change', () => {
            node.selected = checkbox.checked;
            updateCount();
          });
          return el('label', { class: 'row' }, [
            checkbox,
            el('span', { class: 'text' }, [
              el('span', { class: 'name', text: node.title || shortenUrl(node.url, 60) }),
              el('span', { class: 'path', text: shortenUrl(node.url, 110) }),
              node.failed ? el('span', { class: 'fail', text: `Niet opgehaald: ${node.reason}` }) : null,
            ]),
          ]);
        }),
      ]);
    });

    const setAll = (value) => {
      for (const node of nodes) node.selected = value && !node.failed;
      renderReview();
    };

    const fetchedCount = nodes.filter((node) => node.fetched).length;
    const summary = el('div', { class: 'summary' }, [
      el('strong', { text: `${formatNumber(nodes.length)} pagina's gevonden` }),
      el('div', {
        text: `Diepte ${options.depth}. ${formatNumber(fetchedCount)} al opgehaald, `
          + `${formatNumber(nodes.length - fetchedCount)} nog te doen.`,
      }),
    ]);

    panel.render([
      summary,
      state.crawler.truncated
        ? el('div', { class: 'warn', text: `Er zijn meer pagina's dan het maximum van ${options.maxPages}. De lijst is afgekapt.` })
        : null,
      el('div', { class: 'toolbar' }, [
        counter,
        el('button', { class: 'link', type: 'button', text: 'alles aan', onclick: () => setAll(true) }),
        el('button', { class: 'link', type: 'button', text: 'alles uit', onclick: () => setAll(false) }),
      ]),
      ...groups,
    ], [
      el('button', { class: 'action', type: 'button', text: '← Terug', onclick: renderStart }),
      primary,
    ]);

    primary.addEventListener('click', () => runCollect(nodes.filter((node) => node.selected)));
    updateCount();
  }

  /* ---------------- stap 4: ophalen en opslaan ---------------- */

  async function runCollect(selected) {
    state.cancelled = false;
    panel.setStep('Ophalen…');
    renderProgress("Pagina's ophalen en omzetten…");
    let result;
    try {
      result = await state.crawler.collect(selected);
    } catch (error) {
      panel.setStatus(`Ophalen mislukt: ${error && error.message ? error.message : error}`);
      return;
    }
    if (state.cancelled) return;
    if (!result.pages.length) {
      panel.setStatus('Geen enkele pagina kon worden opgehaald.');
      renderReview();
      return;
    }
    state.document = assembleDocument({
      startUrl: options.url,
      depth: options.depth,
      pages: result.pages,
      failures: result.failures,
    });
    renderDone(result);
  }

  function renderDone(result) {
    panel.setStep('Klaar');
    panel.setStatus('');
    const { markdown, stats } = state.document;
    const suggestedName = buildFilename(options.url, result.pages[0] ? result.pages[0].title : '');
    const nameInput = el('input', { type: 'text', value: suggestedName, spellcheck: 'false' });
    const splitSelect = el('select', {}, SPLIT_CHOICES.map((choice) =>
      el('option', { value: String(choice.value), text: choice.label })));
    splitSelect.value = String(options.splitWords);

    const download = () => {
      const words = Number(splitSelect.value) || 0;
      options.splitWords = words;
      rememberOptions(options);
      const parts = splitDocument(markdown, nameInput.value.trim() || suggestedName, words);
      const failed = [];
      for (const part of parts) {
        const outcome = saveTextFile(part.name, part.content);
        if (!outcome.ok) failed.push(part.name);
      }
      panel.setStatus(failed.length
        ? `Download geweigerd voor ${failed.join(', ')} — probeer "Via Tampermonkey".`
        : `${parts.length === 1 ? 'Bestand' : `${parts.length} bestanden`} gedownload.`);
    };

    panel.render([
      el('div', { class: 'stats' }, [
        el('div', {}, [el('strong', { text: formatNumber(stats.pages) }), el('span', { text: "pagina's" })]),
        el('div', {}, [el('strong', { text: formatNumber(stats.words) }), el('span', { text: 'woorden' })]),
        el('div', {}, [el('strong', { text: `≈${formatNumber(stats.tokens)}` }), el('span', { text: 'tokens' })]),
        el('div', {}, [el('strong', { text: formatBytes(markdown.length) }), el('span', { text: 'grootte' })]),
      ]),
      stats.tokens > TOKEN_WARNING_THRESHOLD
        ? el('div', { class: 'warn', text: 'Dit document is erg groot voor één contextvenster. Overweeg te splitsen of minder pagina\'s te selecteren.' })
        : null,
      result.failures.length
        ? el('div', { class: 'warn' }, [
          el('div', { text: `${result.failures.length} pagina('s) konden niet worden opgehaald; ze staan onderaan het document.` }),
        ])
        : null,
      el('label', { class: 'field' }, [
        el('span', { class: 'label', text: 'Bestandsnaam' }),
        nameInput,
      ]),
      el('label', { class: 'field' }, [
        el('span', { class: 'label', text: 'Grote documenten' }),
        splitSelect,
      ]),
      el('label', { class: 'field' }, [
        el('span', { class: 'label', text: 'Voorbeeld' }),
        el('textarea', { readonly: true, text: markdown.slice(0, 4000) }),
        el('span', { class: 'hint', text: 'Leg het bestand in je repository en verwijs er in Copilot Chat naar met #file:' }),
      ]),
    ], [
      el('button', { class: 'action', type: 'button', text: 'Opnieuw', onclick: renderStart }),
      el('button', {
        class: 'action',
        type: 'button',
        text: 'Kopiëren',
        onclick: () => {
          const outcome = copyToClipboard(markdown);
          panel.setStatus(outcome.ok ? 'Naar klembord gekopieerd.' : `Kopiëren mislukt: ${outcome.reason}`);
        },
      }),
      el('button', {
        class: 'action',
        type: 'button',
        text: 'Via Tampermonkey',
        onclick: () => {
          const outcome = saveViaGm(nameInput.value.trim() || suggestedName, markdown);
          panel.setStatus(outcome.ok ? 'Download gestart via Tampermonkey.' : `Mislukt: ${outcome.reason}`);
        },
      }),
      el('button', { class: 'action primary', type: 'button', text: 'Download .md', onclick: download }),
    ]);
  }

  renderStart();
}
