// Headless rooktest voor index.html — draai met: node test/smoketest.js
// Geen dependencies; test gedrag via de minimale DOM- en fetch-stub hieronder.
// De controles zelf staan per gebied in test/checks/. Dit bestand zet de stub op,
// draait de delen in vaste volgorde, telt de controles en rapporteert het eindresultaat.
const fs = require("fs");
const path = require("path");

const html = fs.readFileSync(path.join(__dirname, "..", "index.html"), "utf8");
const js = html.substring(html.indexOf("<script>") + 8, html.lastIndexOf("</script>"));
const created = [];
const classSets = new WeakMap();

function makeEl(tag) {
  const classes = new Set();
  const el = {
    tag, style: {}, dataset: {}, attributes: {}, children: [], _text: "", _html: "", scrolled: false,
    classList: {
      toggle(name, force) { if (force === undefined ? !classes.has(name) : force) classes.add(name); else classes.delete(name); },
      add(...names) { names.forEach(name => classes.add(name)); }, remove(...names) { names.forEach(name => classes.delete(name)); }, contains(name) { return classes.has(name); },
    },
    set className(v) { this._cls = v; }, get className() { return this._cls || ""; },
    set innerHTML(v) { this._html = v; this.children.length = 0; }, get innerHTML() { return this._html; },
    set textContent(v) { this._text = v; }, get textContent() { return this._text; },
    appendChild(c) { this.children.push(c); }, append(...c) { this.children.push(...c); },
    addEventListener(name, handler) { this[`on${name}`] = handler; },
    setAttribute(name, value) { this.attributes[name] = String(value); },
    prepend(c) { this.children.unshift(c); }, scrollIntoView() { this.scrolled = true; },
    firstElementChild: null,
  };
  el.firstElementChild = { style: {} };
  classSets.set(el, classes);
  created.push(el);
  return el;
}

const byIdMap = {};
const ids = ["map-scroll", "legend", "begrippen-lijst", "commandoreferentie-lijst", "release-history", "release-badge-label", "release-current-link", "release-build-note", "release-source-label", "release-history-list", "branch-chips", "tickets", "missie-list", "progress", "trophy",
  "log", "btn-issue", "btn-commit", "btn-collega", "btn-hotfix", "commit-sub", "reset", "btn-promote", "btn-revert", "btn-rollback", "rollback-version", "env-filter-note", "env-dev-box", "env-test-box",
  "env-dev", "env-test", "env-live", "env-live-age", "env-live-box", "env-source-label", "start-label", "start-hint", "btn-clear-start", "repository-link", "repository-updated", "repository-refresh", "repository-status", "repository-source-label", "repository-summary",
  "repository-title", "repository-commits", "repository-branches", "repository-issues", "repository-prs", "test-live-status", "test-live-status-text", "test-live-check", "test-live-promote-link", "real-test-version", "real-live-version"];
for (const id of ids) byIdMap[id] = makeEl("div");
for (const id of ["env-dev-box", "env-test-box", "env-live-box"]) byIdMap[id] = makeEl("button");
byIdMap["release-badge-label"].textContent = "release: onbekend";

let fetchMode = "version";
const fetchCalls = [];
const response = (payload, status = 200) => ({ ok: status >= 200 && status < 300, status, async json() { return payload; } });
global.fetch = async url => {
  fetchCalls.push(String(url));
  if (fetchMode === "repository-error" && String(url).startsWith("https://api.github.com/repos/lxdg-technologies/git-routekaart-demo")) return response({}, 503);
  if (String(url) === "https://api.github.com/repos/lxdg-technologies/git-routekaart-demo") return response({
    full_name: "lxdg-technologies/git-routekaart-demo", default_branch: "main", html_url: "https://github.com/lxdg-technologies/git-routekaart-demo",
  });
  if (String(url).includes("/commits?sha=main")) return response([
    { sha: "abc123456789", html_url: "https://github.com/lxdg-technologies/git-routekaart-demo/commit/abc1234", commit: { message: "feat: live dashboard\n\nDetails", author: { date: "2026-08-07T10:00:00Z" } } },
    { sha: "def567890123", html_url: "https://github.com/lxdg-technologies/git-routekaart-demo/commit/def5678", commit: { message: "docs: update", committer: { date: "2026-08-06T10:00:00Z" } } },
  ]);
  if (String(url).includes("/branches?")) return response([
    { name: "main", protected: true, commit: { sha: "abc123456789" } },
    { name: "gh-pages", protected: false, commit: { sha: "987654321abc" } },
  ]);
  if (String(url).includes("/issues?")) return response([
    { number: 7, title: "Open echt issue", state: "open", updated_at: "2026-08-07T10:00:00Z", html_url: "https://github.com/lxdg-technologies/git-routekaart-demo/issues/7" },
    { number: 6, title: "Gesloten issue", state: "closed", updated_at: "2026-08-06T10:00:00Z", html_url: "https://github.com/lxdg-technologies/git-routekaart-demo/issues/6" },
    { number: 5, title: "PR vermomd als issue", state: "open", pull_request: {}, updated_at: "2026-08-05T10:00:00Z", html_url: "https://github.com/lxdg-technologies/git-routekaart-demo/pull/5" },
  ]);
  if (String(url).includes("/pulls?")) return response([
    { number: 5, title: "Open dashboard-PR", state: "open", merged_at: null, html_url: "https://github.com/lxdg-technologies/git-routekaart-demo/pull/5", head: { ref: "feat/dashboard" }, base: { ref: "main" } },
    { number: 1, title: "Omgevingen ingericht", state: "closed", merged_at: "2026-08-07T09:00:00Z", html_url: "https://github.com/lxdg-technologies/git-routekaart-demo/pull/1", head: { ref: "agent/setup" }, base: { ref: "main" } },
  ]);
  if (String(url) === "environment.json") {
    if (["test-live-behind", "test-live-equal", "checks-green", "checks-failed", "checks-missing"].includes(fetchMode)) return response({ environment: "test", version: "v9.9.9", sha: "abc1234" });
    if (fetchMode === "test-live-invalid-published") return response({ environment: "test", version: "v9.9.9", sha: "wrongsha" });
    return response({}, 404);
  }
  if (String(url) === "../environment.json") {
    if (["test-live-behind", "checks-green", "checks-failed", "checks-missing", "test-live-invalid-published"].includes(fetchMode)) return response({ environment: "production", version: "v9.9.8" });
    if (fetchMode === "test-live-equal") return response({ environment: "production", version: "v9.9.9" });
    return response({}, 404);
  }
  if (["version", "test-live-behind", "test-live-equal", "checks-green", "checks-failed", "checks-missing", "test-live-invalid-published"].includes(fetchMode) && url === "version.json") return response({ version: "v9.9.9", commitsAhead: 2, sha: "abc1234" });
  if (fetchMode === "invalid" && url === "version.json") return response({ version: "" });
  if (fetchMode === "missing" && url === "version.json") return response({}, 404);
  if (fetchMode === "history" && String(url).includes("releases?")) return response([
    { tag_name: "v9.9.8", published_at: "2026-08-01T12:00:00Z", html_url: "https://example.test/releases/v9.9.8" },
    { name: "untagged", created_at: "2026-07-31T12:00:00Z", html_url: "https://example.test/releases/untagged" },
  ]);
  if (String(url).includes("/commits/abc1234/check-runs")) {
    if (fetchMode === "checks-green") return response({ check_runs: [{ name: "quality", head_sha: "abc1234", status: "completed", conclusion: "success" }] });
    if (fetchMode === "checks-failed") return response({ check_runs: [{ name: "quality", head_sha: "abc1234", status: "completed", conclusion: "failure" }] });
    if (fetchMode === "checks-missing") return response({ check_runs: [] });
  }

  return response({}, 503);
};

global.document = { getElementById: id => byIdMap[id], createElement: tag => makeEl(tag), documentElement: {} };
global.getComputedStyle = () => ({ getPropertyValue: () => "#1e5aa8" });
const sessionValues = new Map();
global.sessionStorage = { getItem: key => sessionValues.get(key) ?? null, setItem: (key, value) => sessionValues.set(key, value) };
global.window = global;

// De delen draaien in deze volgorde; de controles bouwen op elkaars toestand voort.
const begrippenCheck = async ({ assert, byIdMap, glossaryResult, stappen, decorateLogTerms }) => {
  const glossary = glossaryResult();
  assert((glossary.match(/<details class="term-item"/g) || []).length === 29, "begrippenlijst rendert precies 29 termen");
  assert(glossary.includes('id="term-hotfix"') && glossary.includes("<summary>Hotfix</summary>"), "Hotfix bestaat als klikbaar begrip");
  assert(glossary.includes("noodgreep vanaf wat nu live staat") && glossary.includes("kans op een nieuwe fout") && glossary.includes("alsnog via de gewone route terug"), "Hotfix legt de start, prijs en terugkeer naar de gewone route uit");
  assert(glossary.includes("Voorbeeld:") && glossary.includes("start een hotfix vanaf live v0.1.1") && glossary.match(/term-explanation/g).length === 29 && glossary.match(/term-example/g).length === 29, "Hotfix volgt de bestaande uitleg-/voorbeeldstructuur");
  assert(decorateLogTerms("hotfix").includes("focusTerm('Hotfix')"), "logboek-koppeling herkent het begrip Hotfix");
  stappen.nieuwIssue(); stappen.maakBranch();
  assert(byIdMap["log"].children[0].innerHTML.includes("focusTerm('Branch')"), "branch-logregel bevat een klikbare Branch-term");
  stappen.commit(); stappen.commit(); stappen.openPR(); stappen.mergeCommit();
  assert(byIdMap["log"].children[0].innerHTML.includes("focusTerm('CI (Continuous Integration)')"), "release-logregel bevat een klikbare CI-term");
};
const delen = [
  ["release-badge", require("./checks/release-badge")],
  ["repository-dashboard", require("./checks/repository-dashboard")],
  ["begrippen", begrippenCheck],
  ["omgevingen", require("./checks/omgevingen")],
  ["kaart", require("./checks/kaart")],
  ["acties", require("./checks/acties")],
  ["handboek", require("./checks/handboek")],
];

(async () => {
  eval(js);
  const flush = () => new Promise(resolve => setImmediate(resolve));
  let total = 0;
  let failed = 0;
  const assert = (cond, msg) => {
    total++;
    if (!cond) { console.error("FAIL: " + msg); failed++; }
    else console.log("ok  : " + msg);
  };
  const findBtn = txt => created.filter(e => e.tag === "button" && e.textContent.includes(txt)).pop();
  const mapResult = () => byIdMap["map-scroll"].innerHTML;
  const glossaryResult = () => byIdMap["begrippen-lijst"].innerHTML;
  const state = () => __state();
  const setFetchMode = mode => { fetchMode = mode; };

  // Gedeelde stappen: één plek voor "wat klik je aan", zodat elk deel dezelfde route kan naspelen.
  const stappen = {
    opnieuw: () => byIdMap["reset"].onclick(),
    nieuwIssue: () => byIdMap["btn-issue"].onclick(),
    maakBranch: () => findBtn("Maak branch").onclick(),
    commit: () => byIdMap["btn-commit"].onclick(),
    openPR: () => findBtn("Open PR").onclick(),
    mergeCommit: () => findBtn("Merge commit").onclick(),
    squashMerge: () => findBtn("Squash & merge").onclick(),
    rebaseMerge: () => findBtn("Rebase & merge").onclick(),
    verwijderBranch: () => findBtn("Verwijder branch").onclick(),
    promote: () => byIdMap["btn-promote"].onclick({ type: "click" }),
    promoteAt: now => window.__promoteAt(now),
    revert: () => byIdMap["btn-revert"].onclick(),
    kiesRollback: index => { byIdMap["rollback-version"].value = String(index); byIdMap["rollback-version"].onchange(); },
    rollback: () => byIdMap["btn-rollback"].onclick(),
    collega: () => byIdMap["btn-collega"].onclick(),
    hotfix: () => byIdMap["btn-hotfix"].onclick({ type: "click" }),
    kiesOmgeving: filter => byIdMap[`env-${filter}-box`].onclick(),
    // issue → branch → twee commits → PR → merge; soort is "merge", "squash" of "rebase"
    mergeRonde: soort => {
      stappen.nieuwIssue(); stappen.maakBranch();
      stappen.commit(); stappen.commit();
      stappen.openPR();
      if (soort === "squash") stappen.squashMerge();
      else if (soort === "rebase") stappen.rebaseMerge();
      else stappen.mergeCommit();
    },
  };

  // Vóór de eerste await uitlezen: het deel release-badge controleert de beginwaarde van de badge.
  const initialBadge = byIdMap["release-badge-label"].textContent;
  const gereedschap = { assert, flush, byIdMap, created, makeEl, fetchCalls, findBtn, mapResult, glossaryResult, state, setFetchMode, stappen, initialBadge, decorateLogTerms: window.__decorateLogTerms };

  for (const [, deel] of delen) await deel(gereedschap);

  // Testpagina: controleer deploymentmetadata en de verplichte publieke check.
  global.location = { pathname: "/test/" };
  const loadTestStatus = async mode => { setFetchMode(mode); await window.__loadTestLiveStatus(); await flush(); };
  await loadTestStatus("test-live-behind");
  assert(!byIdMap["test-live-status"].hidden && byIdMap["real-test-version"].textContent === "v9.9.9" && byIdMap["real-live-version"].textContent === "v9.9.8" && byIdMap["test-live-status-text"].textContent.includes("Test loopt voor") && !byIdMap["test-live-status-text"].textContent.includes("v9.9.9"), "testpagina toont echte versies bovenaan en het verschil zonder dubbele versies");
  assert(byIdMap["test-live-promote-link"].hidden === true, "promotielink blijft verborgen vóór de veiligheidscontrole");
  await loadTestStatus("checks-green");
  byIdMap["test-live-check"].onclick(); await flush();
  assert(byIdMap["test-live-status"].classList.contains("is-safe") && byIdMap["test-live-status-text"].textContent.includes("Alle verplichte controles zijn geslaagd"), "groene verplichte controle meldt dat Test veilig kan worden aangeboden");
  assert(byIdMap["test-live-promote-link"].hidden === false && byIdMap["test-live-status-text"].textContent.includes("mens moet nog bevestigen"), "alleen groen toont de handmatige promotieworkflow en menselijke bevestiging");
  await loadTestStatus("test-live-equal");
  assert(byIdMap["test-live-status-text"].textContent.includes("er is niets nieuws te controleren") && byIdMap["test-live-check"].disabled === true && byIdMap["test-live-promote-link"].hidden === true, "gelijke test- en liveversie geeft geen misleidende promotie-uitnodiging");
  await loadTestStatus("checks-failed");
  byIdMap["test-live-check"].onclick(); await flush();
  assert(byIdMap["test-live-status"].classList.contains("is-blocked") && !byIdMap["test-live-status-text"].textContent.includes("Alle verplichte controles zijn geslaagd") && byIdMap["test-live-promote-link"].hidden === true, "mislukte verplichte controle toont geen groen resultaat of promotielink");
  await loadTestStatus("checks-missing");
  byIdMap["test-live-check"].onclick(); await flush();
  assert(byIdMap["test-live-status"].classList.contains("is-blocked") && byIdMap["test-live-status-text"].textContent.includes("ontbreekt"), "ontbrekende verplichte controle blokkeert de veiligheidsmelding");
  await loadTestStatus("test-live-invalid-published");
  byIdMap["test-live-check"].onclick(); await flush();
  assert(byIdMap["test-live-status"].classList.contains("is-blocked") && byIdMap["test-live-status-text"].textContent.includes("testpublicatie"), "niet-overeenkomende testpublicatie blokkeert de veiligheidsmelding");
  await loadTestStatus("invalid");
  assert(byIdMap["test-live-status"].classList.contains("is-blocked") && !byIdMap["test-live-status-text"].textContent.includes("Alle verplichte controles zijn geslaagd"), "ongeldige versiegegevens leiden niet tot een onterechte groene veiligheidsmelding");

  // Hotfix-route: eerst staat test bewust nieuwer dan live, daarna volstaat één knop.
  stappen.opnieuw();
  stappen.mergeRonde("merge");
  const liveBeforeHotfix = state().env.liveCommit;
  const issuesBeforeHotfix = state().issues.length;
  const prsBeforeHotfix = state().prs.length;
  const commitsBeforeHotfix = state().commits.length;
  assert(byIdMap["btn-hotfix"].disabled === false, "hotfix-knop is actief als test nieuwer is dan live");
  stappen.hotfix();
  const hotfixCommit = state().commits.find(c => c.kind === "hotfix");
  const hotfixMerge = state().commits.at(-1);
  assert(state().env.liveCommit === hotfixMerge.id && state().env.test === state().env.live, "hotfix brengt de nieuwe versie in één actie naar live");
  assert(hotfixCommit && hotfixCommit.parents.length === 1 && hotfixCommit.parents[0] === liveBeforeHotfix, "hotfix vertrekt vanaf de actuele live-commit");
  assert(hotfixMerge.hotfix === true && hotfixMerge.parents.length === 2 && state().commits.length === commitsBeforeHotfix + 2, "hotfix maakt een aparte route met minder tussenstappen dan de gewone route");
  assert(state().issues.length === issuesBeforeHotfix && state().prs.length === prsBeforeHotfix, "hotfix maakt geen gewone issue- of PR-route aan");
  assert(byIdMap["map-scroll"].innerHTML.includes("⚡") && byIdMap["legend"].innerHTML.includes("hotfix"), "kaart en legenda herkennen de hotfix-route");
  assert([...byIdMap["log"].children].some(entry => entry.innerHTML.includes("live") && entry.innerHTML.includes("minder controle vooraf") && entry.innerHTML.includes("gewone route terug")), "logboek benoemt live-start, snelheid, prijs en terugkeer naar de gewone route");
  assert(byIdMap["btn-hotfix"].disabled === true, "hotfix-knop schakelt uit als test en live weer gelijk zijn");

  if (failed) { console.error(`\n${failed} van ${total} CHECK(S) GEFAALD`); process.exit(1); }
  console.log(`\nALLE ${total} CHECKS GESLAAGD`);
})();
