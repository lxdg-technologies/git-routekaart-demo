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
    remove() { this.removed = true; },
    setAttribute(name, value) { this.attributes[name] = String(value); },
    prepend(c) { this.children.unshift(c); }, scrollIntoView() { this.scrolled = true; },
    firstElementChild: null,
  };
  el.firstElementChild = { style: {} };
  classSets.set(el, classes);
  created.push(el);
  return el;
}

global.location = undefined;
const byIdMap = {};
const ids = ["map-scroll", "legend", "begrippen-lijst", "commandoreferentie-lijst", "release-history", "release-badge-label", "release-current-link", "release-build-note", "release-source-label", "release-history-list", "branch-chips", "tickets", "missie-list", "progress", "trophy",
  "log", "btn-issue", "btn-commit", "btn-collega", "btn-hotfix", "commit-sub", "promote-sub", "revert-sub", "rollback-sub", "collega-sub", "hotfix-sub", "reset", "btn-promote", "btn-revert", "btn-rollback", "rollback-version", "env-filter-note", "env-dev-box", "env-test-box",
  "env-dev", "env-test", "env-live", "env-live-age", "env-live-box", "env-source-label", "start-label", "start-hint", "btn-clear-start", "repository-link", "repository-updated", "repository-refresh", "repository-status", "repository-source-label", "repository-summary",
  "repository-title", "repository-commits", "repository-branches", "repository-issues", "repository-prs", "test-live-status", "test-live-status-text", "test-live-conditions", "test-live-condition-checks", "test-live-condition-published", "test-live-condition-human", "test-live-check", "test-live-promote-link", "real-test-version", "real-live-version",
  "live-promotion-overlay", "live-promotion-panel", "promotion-description", "promotion-modes", "promotion-checks", "promotion-error", "promotion-demo-note", "review-actions"];
for (const id of ids) byIdMap[id] = makeEl("div");
for (const id of ["btn-live-overlay", "btn-close-live-overlay", "btn-promotion-green", "btn-promotion-red", "btn-promotion-recover", "btn-promotion-live"]) byIdMap[id] = makeEl("button");
for (const id of ["env-dev-box", "env-test-box", "env-live-box"]) byIdMap[id] = makeEl("button");
byIdMap["btn-live-overlay"].textContent = "Naar live zetten";
byIdMap["live-promotion-overlay"].hidden = true;
byIdMap["live-promotion-overlay"].setAttribute("aria-hidden", "true");
byIdMap["live-promotion-panel"].setAttribute("role", "dialog");
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
    if (["test-live-behind", "test-live-equal", "checks-green", "checks-failed", "checks-missing"].includes(fetchMode)) return response({ environment: "test", branch: "main", version: "v9.9.9", sha: "abc1234" });
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

global.document = { getElementById: id => byIdMap[id], createElement: tag => makeEl(tag), documentElement: { dataset: {} } };
global.getComputedStyle = () => ({ getPropertyValue: () => "#1e5aa8" });
const sessionValues = new Map();
global.sessionStorage = { getItem: key => sessionValues.get(key) ?? null, setItem: (key, value) => sessionValues.set(key, value) };
global.window = global;

// De delen draaien in deze volgorde; de controles bouwen op elkaars toestand voort.
const delen = [
  ["release-badge", require("./checks/release-badge")],
  ["contrast", require("./checks/contrast")],
  ["repository-dashboard", require("./checks/repository-dashboard")],
  ["begrippen", require("./checks/begrippen")],
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
  const hiddenActDisplay = () => {
    const rules = [...html.matchAll(/\.act\[hidden\]\s*\{([^}]*)\}/g)].map(match => match[1]);
    return rules.some(body => /display\s*:\s*none\s*!important\s*;?/i.test(body)) ? "none" : "block";
  };
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
  const gereedschap = { assert, flush, byIdMap, created, makeEl, fetchCalls, findBtn, mapResult, glossaryResult, hiddenActDisplay, state, setFetchMode, stappen, initialBadge, decorateLogTerms: window.__decorateLogTerms };

  for (const [, deel] of delen) await deel(gereedschap);

  // Promotie-overlay: zelfstandige mockup met vaste voorbeeldtoestanden.
  const overlayStateBefore = {
    test: state().env.test, live: state().env.live, commits: state().commits.length,
    missions: state().missions.join(","), active: state().active,
  };
  global.location = { pathname: "/dev/pr-145/" };
  window.__applyPromotionVisibility();
  const reviewLinks = byIdMap["review-actions"].children;
  assert(byIdMap["btn-live-overlay"].removed === true && reviewLinks.length === 2 && reviewLinks[0].textContent.includes("Goedkeuren") && reviewLinks[1].textContent.includes("Afkeuren"), "ontwikkelomgeving toont Goedkeuren en Afkeuren en geen liveknop");
  assert(reviewLinks[0].href === "https://github.com/lxdg-technologies/git-routekaart-demo/pull/145" && reviewLinks[0].children[0].textContent.includes("samen"), "Goedkeuren verwijst naar het actuele PR-nummer en legt Test uit");
  assert(reviewLinks[1].href === "https://github.com/lxdg-technologies/git-routekaart-demo/pull/145/files" && reviewLinks[1].children[0].textContent.includes("formeel") && reviewLinks[1].children[0].textContent.includes("opmerking"), "Afkeuren opent het files-scherm en legt formeel wijzigingen vragen uit");
  assert(JSON.stringify({ test: state().env.test, live: state().env.live, commits: state().commits.length, missions: state().missions.join(","), active: state().active }) === JSON.stringify(overlayStateBefore), "beoordelingsknoppen veranderen geen simulatiestatus");

  // Testpagina: controleer deploymentmetadata en de verplichte publieke check.
  global.location = { pathname: "/test/" };
  byIdMap["btn-live-overlay"].removed = false;
  byIdMap["live-promotion-overlay"].removed = false;
  window.__applyPromotionVisibility();
  const loadTestStatus = async mode => { setFetchMode(mode); await window.__loadTestLiveStatus(); await flush(); };
  await loadTestStatus("test-live-behind");
  assert(!byIdMap["test-live-status"].hidden && byIdMap["test-live-status-text"].textContent === "Nog niet gecontroleerd" && byIdMap["real-test-version"].textContent === "v9.9.9" && byIdMap["real-live-version"].textContent === "v9.9.8", "beginstand toont alleen Nog niet gecontroleerd en echte versies staan bovenaan");
  assert(byIdMap["test-live-promote-link"].hidden === true && byIdMap["test-live-conditions"].hidden === true, "promotie en voorwaarden blijven verborgen vóór de veiligheidscontrole");
  await loadTestStatus("checks-green");
  byIdMap["test-live-check"].onclick(); await flush();
  assert(byIdMap["test-live-status"].classList.contains("is-safe") && byIdMap["test-live-status-text"].textContent === "✓ Veilig om live te zetten" && byIdMap["test-live-condition-checks"].textContent.includes("Alle verplichte controles zijn geslaagd"), "groene controle toont in één regel dat Test veilig live kan");
  assert(byIdMap["test-live-promote-link"].hidden === false && byIdMap["test-live-condition-human"].textContent.includes("mens"), "alleen groen toont de knop voor handmatige promotie en menselijke bevestiging");
  byIdMap["btn-live-overlay"].onclick(); await flush();
  assert(byIdMap["promotion-modes"].hidden === true && byIdMap["promotion-description"].textContent.includes("echte Test-gegevens"), "de Test-overlay gebruikt geen voorbeeldkeuze en meldt echte Test-gegevens");
  assert(byIdMap["btn-promotion-live"].hidden === false && byIdMap["promotion-error"].hidden === true && byIdMap["promotion-checks"].innerHTML.includes("quality geslaagd"), "echte groene Test-status toont precies één actie naar de menselijke goedkeuringsstap");
  const overlayStateAfterRealGreen = { test: state().env.test, live: state().env.live, commits: state().commits.length, missions: state().missions.join(","), active: state().active };
  byIdMap["btn-promotion-live"].onclick({ preventDefault() {} });
  assert(JSON.stringify({ test: state().env.test, live: state().env.live, commits: state().commits.length, missions: state().missions.join(","), active: state().active }) === JSON.stringify(overlayStateAfterRealGreen), "start menselijke goedkeuring verandert geen simulatiestatus en promoveert niet automatisch");
  await loadTestStatus("checks-failed");
  byIdMap["btn-live-overlay"].onclick(); await flush();
  assert(byIdMap["btn-promotion-live"].hidden === true && byIdMap["promotion-error"].textContent.includes("quality-check"), "echte rode Test-status blokkeert de definitieve live-actie met hersteluitleg");
  await loadTestStatus("repository-error");
  byIdMap["btn-live-overlay"].onclick(); await flush();
  assert(byIdMap["btn-promotion-live"].hidden === true && byIdMap["promotion-error"].textContent.includes("status"), "ontbrekende of onbereikbare Test-status blokkeert de definitieve live-actie");
  await loadTestStatus("checks-green");
  byIdMap["btn-live-overlay"].onclick(); await flush();
  assert(byIdMap["btn-promotion-live"].hidden === false && byIdMap["promotion-error"].hidden === true, "opnieuw beschikbare Test-status herstelt de groene actie");
  await loadTestStatus("test-live-equal");
  assert(byIdMap["test-live-status-text"].textContent === "! Nog niet veilig" && byIdMap["test-live-check"].disabled === true && byIdMap["test-live-promote-link"].hidden === true, "gelijke test- en liveversie toont geen veilige promotie-uitkomst");
  await loadTestStatus("checks-failed");
  byIdMap["test-live-check"].onclick(); await flush();
  assert(byIdMap["test-live-status"].classList.contains("is-blocked") && byIdMap["test-live-status-text"].textContent === "! Nog niet veilig" && byIdMap["test-live-promote-link"].hidden === true, "mislukte verplichte controle toont geen groen resultaat of promotieknop");
  await loadTestStatus("checks-missing");
  byIdMap["test-live-check"].onclick(); await flush();
  assert(byIdMap["test-live-status"].classList.contains("is-blocked") && byIdMap["test-live-condition-checks"].textContent.includes("ontbreekt"), "ontbrekende verplichte controle blokkeert de veiligheidsmelding");
  await loadTestStatus("test-live-invalid-published");
  byIdMap["test-live-check"].onclick(); await flush();
  assert(byIdMap["test-live-status"].classList.contains("is-blocked") && byIdMap["test-live-condition-published"].textContent.includes("klopt niet"), "niet-overeenkomende testpublicatie blokkeert de veiligheidsmelding");
  await loadTestStatus("invalid");
  assert(byIdMap["test-live-status"].classList.contains("is-blocked") && byIdMap["test-live-status-text"].textContent === "! Nog niet veilig", "ongeldige versiegegevens leiden niet tot een onterechte groene veiligheidsmelding");
  global.location = { pathname: "/" };
  await loadTestStatus("checks-green");
  assert(byIdMap["test-live-status"].hidden === true, "veiligheidsblok blijft buiten de testpagina verborgen");

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

  await require("./checks/live-promotion")(gereedschap);

  if (failed) { console.error(`\n${failed} van ${total} CHECK(S) GEFAALD`); process.exit(1); }
  console.log(`\nALLE ${total} CHECKS GESLAAGD`);
})();
