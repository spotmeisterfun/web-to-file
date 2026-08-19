# web-to-file

Sla een interne webpagina — en desgewenst de pagina's daaronder — op als **één
Markdown-bestand**, zodat je het als referentiemateriaal aan GitHub Copilot kunt
geven. Bedoeld voor omgevingen waar Copilot geen websites mag bezoeken, maar wel
bestanden in je workspace mag lezen.

Het is een **Tampermonkey-userscript**. Dat is belangrijk: het script draait in de
context van de pagina zelf, dus je bestaande sessie, je SSO-cookies en
intern-only hosts werken zonder enige configuratie. Er is geen aparte extensie,
geen server en geen API-token nodig.

## Zo werkt het

1. Open de pagina die je wilt opslaan (bijvoorbeeld een Confluence-pagina).
2. Start het script via het Tampermonkey-menu of met **Ctrl+Shift+M**.
3. **Stap 1 — instellen:** de URL staat al ingevuld. Kies hoe diep je wilt gaan:
   alleen deze pagina, 1 laag diep, 2 of 3.
4. **Stap 2 — verkennen:** bij diepte 1 wordt alléén de startpagina opgehaald om
   de lijst te maken. Je krijgt dus eerst te zien *hoeveel* pagina's het worden.
5. **Stap 3 — controleren:** een lijst per niveau met titel en pad, en een
   samenvatting zoals _"37 pagina's gevonden"_. Vink af wat je niet wilt.
6. Pas na jouw bevestiging worden de rest van de pagina's opgehaald, omgezet naar
   Markdown en samengevoegd. Je ziet het aantal woorden en een tokenschatting, en
   downloadt het bestand.

Alleen de **hoofdinhoud** gaat mee. Navigatie, zijbalk, footer, cookiebanners en
reactieblokken worden weggelaten, en links naar bestanden (`.pdf`, `.png`, …),
inlogpagina's en systeempagina's worden niet gevolgd.

## Installeren

Je hebt geen Node, npm of internettoegang nodig — het script is één bestand
waarin alles al zit.

1. Zorg dat **Tampermonkey** in Edge geïnstalleerd is.
2. Zet in Edge de ontwikkelaarsmodus aan. Sinds Manifest V3 weigert Edge
   userscripts uit te voeren zonder dit: ga naar `edge://extensions`, en zet
   **Ontwikkelaarsmodus** aan (bij sommige versies heet de optie bij Tampermonkey
   zelf *"Toestaan voor gebruikersscripts"*).
3. Open [`dist/web-to-file.user.js`](dist/web-to-file.user.js) en klik op **Raw**.
   Tampermonkey biedt dan aan het te installeren.
   Werkt dat niet, dan kan het ook met de hand: Tampermonkey-dashboard →
   **Hulpprogramma's** → **Bestand importeren**.

Controleer na installatie of het werkt: open een willekeurige pagina, druk
**Ctrl+Shift+M**, en het paneel hoort te verschijnen.

## Het resultaat gebruiken in Copilot

Het bestand begint met frontmatter (bron-URL, diepte, aantal pagina's, datum),
daarna een inhoudsopgave, en dan per pagina een sectie met de bron-URL erboven.

De handigste manieren om het aan Copilot te geven:

- **In je repository zetten**, bijvoorbeeld in `docs/referentie/`. Copilot
  indexeert dan de workspace en vindt het zelf.
- **Rechtstreeks aanwijzen** in Copilot Chat met `#file:naam-van-bestand.md`.
- **Standaard meegeven** door het bestand te noemen in
  `.github/copilot-instructions.md`, bijvoorbeeld: _"Raadpleeg voor vragen over
  het platform `docs/referentie/platformhandboek.md`."_

Grote exports passen niet in één contextvenster. Het paneel waarschuwt daarvoor
en kan het document in delen opsplitsen.

## Als de inhoud er niet goed uitkomt

Interne wiki's gebruiken soms een eigen opmaak die het script niet herkent.
Daarvoor is de **kalibratiemodus**:

1. Tampermonkey-menu → **Content-element kalibreren…**
2. Beweeg over de pagina; het blok onder je cursor krijgt een kader.
3. Klik het blok met de hoofdinhoud aan.

De selector wordt per domein onthouden en vanaf dan gebruikt. Wissen kan met
**Kalibratie voor dit domein wissen**.

## Opties

| Optie | Wat het doet |
| --- | --- |
| Diepte | 0 = alleen deze pagina, 1 = ook alles waar hij naar linkt, enz. |
| URL-prefix | Beperkt de crawl. Standaard het eerste padsegment van de startpagina (op Confluence Cloud dus `/wiki/`). Leeghalen = heel het domein. |
| Maximum aantal pagina's | Harde grens, standaard 100. Wordt hij gehaald, dan meldt het paneel dat de lijst is afgekapt. |
| Afbeeldingen | Als Markdown-link behouden, vervangen door `[afbeelding: alt]`, of weglaten. |
| URL-patroon uitsluiten | Optionele regex om pagina's over te slaan. |
| Links buiten de hoofdinhoud volgen | Standaard uit. Aanzetten levert veel meer, maar ook veel rommeliger resultaten. |
| Zwevende knop | Optioneel knopje rechtsonder op elke pagina, in plaats van het menu. |

## Beperkingen

- **Zwaar client-side gerenderde sites** (SharePoint, Azure DevOps Wiki) kunnen
  leeg terugkomen, omdat het script de HTML ophaalt en geen JavaScript uitvoert.
  Confluence en de meeste wiki's en documentatiesites werken wel.
- Het script leest alleen; het verandert niets op de site en gebruikt jouw eigen
  sessie. Houd je bij het opslaan van interne documentatie wel aan het beleid van
  je werkgever.
- Er wordt met maximaal 3 verzoeken tegelijk gewerkt, met een kleine pauze
  ertussen, om de site niet te belasten.

## Ontwikkelen

De bron staat in kleine modules in `src/`; `dist/web-to-file.user.js` is de
gebouwde bundel die wordt meegecommit. Er zijn geen dependencies: Turndown en de
GFM-tabelplugin staan gevendord in `vendor/` (beide MIT, licentie in de bestanden).

```sh
node tools/build.mjs         # src/ + vendor/ → dist/web-to-file.user.js
node tools/selfcheck.mjs     # controleert grants, syntax, geen CDN-verwijzingen
node --test test/pure.test.mjs   # URL's, scope, samenstellen, splitsen
node tools/test-browser.mjs      # DOM-tests in een headless Chromium
node tools/vendor.mjs        # libraries opnieuw ophalen (alleen bij een upgrade)
```

`npm test` doet build, selfcheck en beide testsuites achter elkaar.

`test/browser.html` kun je ook zelf openen in een browser; draai dan eerst
`node tools/build.mjs && node tools/fixtures.mjs`.

Wil je de versie verhogen, pas dan `@version` in `src/meta.js` aan; de build zet
die waarde ook in het gegenereerde document.
