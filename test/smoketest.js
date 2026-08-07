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
const ids = ["map-scroll", "legend", "begrippen-lijst", "commandoreferentie-lijst", "release-history", "release-badge-label", "release-current-link", "release-build-note", "release-history-list", "branch-chips", "tickets", "missie-list", "progress", "trophy",
  "log", "btn-issue", "btn-commit", "btn-collega", "commit-sub", "reset", "btn-promote", "btn-revert", "btn-rollback", "rollback-version", "env-filter-note", "env-dev-box", "env-test-box",
  "env-dev", "env-test", "env-live", "env-live-box", "start-label", "start-hint", "btn-clear-start", "repository-link", "repository-updated", "repository-refresh", "repository-status", "repository-summary",
  "repository-commits", "repository-branches", "repository-issues", "repository-prs"];
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
  if (fetchMode === "version" && url === "version.json") return response({ version: "v9.9.9", commitsAhead: 2, sha: "abc1234" });
  if (fetchMode === "history" && String(url).includes("releases?")) return response([
    { tag_name: "v9.9.8", published_at: "2026-08-01T12:00:00Z", html_url: "https://example.test/releases/v9.9.8" },
    { name: "untagged", created_at: "2026-07-31T12:00:00Z", html_url: "https://example.test/releases/untagged" },
  ]);
  if (fetchMode === "fallback") {
    if (url === "version.json") return response({}, 404);
    if (String(url).includes("releases/latest")) return response({ tag_name: "v8.0.0", html_url: "https://example.test/releases/v8.0.0" });
    if (String(url).includes("compare/")) return response({ ahead_by: 4 });
  }
  if (fetchMode === "tag-fallback") {
    if (url === "version.json") return response({}, 404);
    if (String(url).includes("releases/latest")) return response({}, 404);
    if (String(url).includes("/tags?")) return response([{ name: "v7.0.0", commit: { sha: "tag1234" } }]);
    if (String(url).includes("compare/")) return response({ ahead_by: 6 });
  }
  return response({}, 503);
};

global.document = { getElementById: id => byIdMap[id], createElement: tag => makeEl(tag), documentElement: {} };
global.getComputedStyle = () => ({ getPropertyValue: () => "#1e5aa8" });
const sessionValues = new Map();
global.sessionStorage = { getItem: key => sessionValues.get(key) ?? null, setItem: (key, value) => sessionValues.set(key, value) };
global.window = global;

// De delen draaien in deze volgorde; de controles bouwen op elkaars toestand voort.
const delen = [
  ["release-badge", require("./checks/release-badge")],
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
    verwijderBranch: () => findBtn("Verwijder branch").onclick(),
    promote: () => byIdMap["btn-promote"].onclick(),
    revert: () => byIdMap["btn-revert"].onclick(),
    kiesRollback: index => { byIdMap["rollback-version"].value = String(index); byIdMap["rollback-version"].onchange(); },
    rollback: () => byIdMap["btn-rollback"].onclick(),
    collega: () => byIdMap["btn-collega"].onclick(),
    kiesOmgeving: filter => byIdMap[`env-${filter}-box`].onclick(),
    // issue → branch → twee commits → PR → merge; soort is "merge" of "squash"
    mergeRonde: soort => {
      stappen.nieuwIssue(); stappen.maakBranch();
      stappen.commit(); stappen.commit();
      stappen.openPR();
      if (soort === "squash") stappen.squashMerge(); else stappen.mergeCommit();
    },
  };

  // Vóór de eerste await uitlezen: het deel release-badge controleert de beginwaarde van de badge.
  const initialBadge = byIdMap["release-badge-label"].textContent;
  const gereedschap = { assert, flush, byIdMap, created, makeEl, fetchCalls, findBtn, mapResult, glossaryResult, state, setFetchMode, stappen, initialBadge };

  for (const [, deel] of delen) await deel(gereedschap);

  if (failed) { console.error(`\n${failed} van ${total} CHECK(S) GEFAALD`); process.exit(1); }
  console.log(`\nALLE ${total} CHECKS GESLAAGD`);
})();
