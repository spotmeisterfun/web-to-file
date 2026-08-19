/* Gegenereerd door tools/fixtures.mjs — pas de .html-bestanden aan. */
var FIXTURES = (globalThis.FIXTURES = globalThis.FIXTURES || {});

FIXTURES["confluence.html"] = String.raw`<!doctype html>
<html lang="nl">
<head>
  <title>Deployproces - Platform - Confluence</title>
  <link rel="canonical" href="/wiki/spaces/PLAT/pages/100/Deployproces">
  <meta property="article:modified_time" content="2026-04-02T10:00:00Z">
</head>
<body>
  <div id="header"><nav class="aui-header"><a href="/wiki/dashboard.action">Dashboard</a><a href="/login">Inloggen</a></nav></div>
  <ol class="breadcrumb"><li><a href="/wiki/spaces/PLAT">Platform</a></li><li><a href="/wiki/spaces/PLAT/pages/1/Ops">Ops</a></li></ol>
  <div id="main-content" class="wiki-content">
    <h1>Deployproces</h1>
    <p>Het deployproces bestaat uit drie stappen. Zie ook de <a href="/wiki/spaces/PLAT/pages/101/Rollback">rollbackpagina</a>
       en de <a href="pages/102/Checklist">checklist</a>. Externe naslag staat op <a href="https://elders.example.com/x">een andere site</a>.</p>
    <h2>Stappen</h2>
    <ol><li>Bouwen</li><li>Testen</li><li>Uitrollen</li></ol>
    <table>
      <thead><tr><th>Omgeving</th><th>Doorlooptijd</th></tr></thead>
      <tbody><tr><td>Acceptatie</td><td>10 min</td></tr><tr><td>Productie</td><td>25 min</td></tr></tbody>
    </table>
    <div class="confluence-information-macro confluence-information-macro-warning">
      <span class="confluence-information-macro-icon aui-icon"></span>
      <div class="confluence-information-macro-body"><p>Nooit vrijdagmiddag uitrollen.</p></div>
    </div>
    <pre class="syntaxhighlighter-pre" data-syntaxhighlighter-params="brush: bash; gutter: false">make deploy ENV=prod</pre>
    <p>Een plaatje: <img src="/wiki/download/thumbnails/1/diagram.png" alt="Stroomschema"></p>
    <div class="pageSection group comment-list"><h2>2 opmerkingen</h2><p>Dit stuk hoort er niet bij.</p></div>
  </div>
  <div class="page-metadata"><a href="/wiki/spaces/PLAT/pages/100/Deployproces?showComments=true">Reacties</a></div>
  <footer id="footer"><a href="/wiki/spaces/PLAT/pages/999/Footerlink">Footer</a></footer>
</body>
</html>
`;
FIXTURES["generiek.html"] = String.raw`<!doctype html>
<html lang="nl">
<head><title>Handleiding — Interne Tools</title></head>
<body>
  <div class="topbar"><a href="/">Home</a> <a href="/zoeken/">Zoeken</a></div>
  <div class="layout">
    <div class="sidebar"><ul><li><a href="/handleiding/a">A</a></li><li><a href="/handleiding/b">B</a></li></ul></div>
    <div class="page-body">
      <h1>Handleiding</h1>
      <p>Deze handleiding beschrijft de werkwijze voor het inrichten van een nieuwe omgeving.
         Er zijn drie fasen, en elke fase kent een eigen checklist met controles die je moet
         doorlopen voordat je verder gaat. Lees eerst de <a href="/handleiding/voorbereiding">voorbereiding</a>.</p>
      <h2>Fase 1</h2>
      <p>In de eerste fase inventariseer je de bestaande situatie en leg je vast welke onderdelen
         hergebruikt kunnen worden. Dit levert een lijst op die je later nodig hebt bij de
         inrichting van de tweede fase. Zie <a href="/handleiding/fase-2">fase 2</a> voor het vervolg.</p>
      <p><strong>Let op:</strong> noteer <em>alle</em> afwijkingen in het logboek van het project.</p>
      <pre><code class="language-js">const x = 1;
console.log(x);</code></pre>
    </div>
  </div>
  <div class="footer-nav"><a href="/contact">Contact</a></div>
</body>
</html>
`;
