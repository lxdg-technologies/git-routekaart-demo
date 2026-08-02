// Headless rooktest voor index.html — draai met: node test/smoketest.js
// Geen dependencies; test gedrag via de minimale DOM- en fetch-stub hieronder.
const fs = require("fs");
const path = require("path");

const html = fs.readFileSync(path.join(__dirname, "..", "index.html"), "utf8");
const js = html.substring(html.indexOf("<script>") + 8, html.lastIndexOf("</script>"));
const created = [];
const classSets = new WeakMap();

function makeEl(tag) {
  const classes = new Set();
  const el = {
    tag, style: {}, dataset: {}, children: [], _text: "", _html: "", scrolled: false,
    classList: {
      toggle(name, force) { if (force === undefined ? !classes.has(name) : force) classes.add(name); else classes.delete(name); },
      add(...names) { names.forEach(name => classes.add(name)); }, remove(...names) { names.forEach(name => classes.delete(name)); }, contains(name) { return classes.has(name); },
    },
    set className(v) { this._cls = v; }, get className() { return this._cls || ""; },
    set innerHTML(v) { this._html = v; this.children.length = 0; }, get innerHTML() { return this._html; },
    set textContent(v) { this._text = v; }, get textContent() { return this._text; },
    appendChild(c) { this.children.push(c); }, append(...c) { this.children.push(...c); },
    addEventListener(name, handler) { this[`on${name}`] = handler; },
    prepend(c) { this.children.unshift(c); }, scrollIntoView() { this.scrolled = true; },
    firstElementChild: null,
  };
  el.firstElementChild = { style: {} };
  classSets.set(el, classes);
  created.push(el);
  return el;
}

const byIdMap = {};
const ids = ["map-scroll", "legend", "begrippen-lijst", "release-history", "release-badge-label", "release-current-link", "release-build-note", "release-history-list", "branch-chips", "tickets", "missie-list", "progress", "trophy",
  "log", "btn-issue", "btn-commit", "commit-sub", "reset", "btn-promote", "btn-revert", "btn-rollback", "rollback-version",
  "env-dev", "env-test", "env-live", "env-live-box", "start-label", "start-hint", "btn-clear-start"];
for (const id of ids) byIdMap[id] = makeEl("div");
byIdMap["release-badge-label"].textContent = "release: onbekend";

let fetchMode = "version";
const fetchCalls = [];
const response = (payload, status = 200) => ({ ok: status >= 200 && status < 300, status, async json() { return payload; } });
global.fetch = async url => {
  fetchCalls.push(String(url));
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
  return response({}, 503);
};

global.document = { getElementById: id => byIdMap[id], createElement: tag => makeEl(tag), documentElement: {} };
global.getComputedStyle = () => ({ getPropertyValue: () => "#1e5aa8" });
global.window = global;

(async () => {
  eval(js);
  const flush = () => new Promise(resolve => setImmediate(resolve));
  const assert = (cond, msg) => {
    if (!cond) { console.error("FAIL: " + msg); failed++; }
    else console.log("ok  : " + msg);
  };
  const findBtn = txt => created.filter(e => e.tag === "button" && e.textContent.includes(txt)).pop();
  const mapResult = () => byIdMap["map-scroll"].innerHTML;
  const glossaryResult = () => byIdMap["begrippen-lijst"].innerHTML;
  let failed = 0;

  const initialBadge = byIdMap["release-badge-label"].textContent;
  await flush(); await flush();
  assert(initialBadge === "release: onbekend", "badge heeft een veilige beginwaarde vóór de fetch-response");
  assert(byIdMap["release-badge-label"].textContent === "release: v9.9.9 +2 · abc1234", "badge toont de gestempelde versie, commits-ahead en sha");
  assert(byIdMap["release-current-link"].textContent.includes("v9.9.9"), "badge-link toont de actieve versie");
  assert(byIdMap["release-current-link"].href.endsWith("/v9.9.9"), "badge-link verwijst naar de actieve release");
  assert(fetchCalls.includes("version.json"), "badge vraagt buildinformatie op via fetch");
  assert(byIdMap["release-history"].classList.contains("release-badge") && byIdMap["release-history"].classList.contains("dev"), "badge krijgt de ontwikkelstatus in de DOM");
  fetchMode = "fallback";
  byIdMap["reset"].onclick(); await flush(); await flush();
  assert(byIdMap["release-badge-label"].textContent === "release: v8.0.0 +4", "badge valt terug op GitHub-release plus compare-resultaat");
  assert(byIdMap["release-build-note"].textContent.includes("nieuwste GitHub-release"), "fallback-note legt uit dat main nieuwer kan zijn");
  assert(fetchCalls.some(url => url.includes("releases/latest")) && fetchCalls.some(url => url.includes("compare/")), "fallback gebruikt release- en compare-endpoint");
  fetchMode = "version";
  byIdMap["reset"].onclick(); await flush(); await flush();
  assert(byIdMap["release-badge-label"].textContent.startsWith("release: v9.9.9"), "badge kan na fallback opnieuw een version-file gebruiken");
  fetchMode = "history";
  byIdMap["release-history"].open = true;
  byIdMap["release-history"].dataset.historyLoaded = "false";
  byIdMap["release-history"].ontoggle(); await flush(); await flush();
  assert(byIdMap["release-history-list"].children.length === 2, "releasehistorie rendert alle ontvangen items");
  const historyLink = byIdMap["release-history-list"].children[0].children[0];
  assert(historyLink.textContent === "v9.9.8", "releasehistorie toont tagnaam");
  assert(historyLink.href === "https://example.test/releases/v9.9.8" && historyLink.target === "_blank", "releasehistorie-item linkt naar release-notes in nieuw tabblad");
  assert(byIdMap["release-history-list"].children[0].children[1].textContent.length > 0, "releasehistorie toont publicatiedatum");
  fetchMode = "error";
  byIdMap["release-history"].dataset.historyLoaded = "false";
  byIdMap["release-history"].ontoggle(); await flush(); await flush();
  assert(byIdMap["release-history-list"].children[0]._html.indexOf("Geen eerdere releases") >= 0, "releasehistorie toont een foutveilige lege toestand");

  assert((glossaryResult().match(/<details class="term-item"/g) || []).length === 26, "begrippenlijst rendert precies 26 termen");
  assert(glossaryResult().includes("Voorbeeld:") && glossaryResult().includes("CI monitoring unavailable"), "elke begrippenlijst-entry bevat uitleg en voorbeeld");
  const branchTerm = makeEl("details");
  byIdMap["term-branch"] = branchTerm;
  focusTerm("Branch");
  assert(branchTerm.open === true, "focusTerm opent de gekozen glossary-entry");
  assert(branchTerm.classList.contains("term-focus") && branchTerm.scrolled, "focusTerm markeert en scrollt naar de gekozen entry");

  assert(byIdMap["env-test"].textContent === "v0.1.0", "test start op v0.1.0");
  assert(byIdMap["env-live"].textContent === "v0.1.0", "live start op v0.1.0");
  assert(byIdMap["btn-promote"].disabled === true, "promote start uitgeschakeld als test gelijk is aan live");
  assert(byIdMap["btn-revert"].disabled === true, "revert start uitgeschakeld zonder merge-head");
  assert(mapResult().includes("🧪🚀"), "kaart toont gecombineerde test/live-vlag bij de start");
  assert(mapResult().includes("station-hit") && mapResult().includes("v0.1.0"), "kaart toont release-station en versielabel");
  assert(mapResult().includes('role="button"') && mapResult().includes("branch-line"), "kaart rendert klikbare branch-lijn en stations");
  assert(mapResult().includes("branch-line-hit") && mapResult().includes("station-hit"), "kaart rendert ruime klikdoelen");
  assert(byIdMap["legend"].innerHTML.includes("release station"), "legenda benoemt release-stations");

  byIdMap["btn-issue"].onclick();
  findBtn("Maak branch").onclick();
  assert(byIdMap["log"].children[0].innerHTML.includes("focusTerm('Branch')"), "branch-logregel bevat een klikbare Branch-term");
  const branchLog = byIdMap["log"].children[0];
  assert((branchLog.innerHTML.match(/class="log-term"/g) || []).length >= 1, "logregel rendert minstens één termknop");
  byIdMap["btn-commit"].onclick();
  assert(byIdMap["btn-commit"].disabled === false, "commit-knop is actief op een branch");
  byIdMap["btn-commit"].onclick();
  assert(__state().branches[__state().active].head === __state().commits[__state().commits.length - 1].id, "branch-head volgt de laatste commit");
  findBtn("Open PR").onclick();
  assert(__state().prs[0].state === "open", "open PR krijgt de status open");
  findBtn("Merge commit").onclick();
  assert(byIdMap["env-test"].textContent === "v0.1.1", "merge zet de nieuwe release op test");
  assert(byIdMap["env-live"].textContent === "v0.1.0", "merge wijzigt live niet automatisch");
  assert(byIdMap["btn-promote"].disabled === false, "promote wordt actief zodra test vooruitloopt");
  assert(mapResult().includes("v0.1.1") && mapResult().includes("release station v0.1.1"), "nieuwe release krijgt label op het juiste station");
  assert(byIdMap["log"].children[0].innerHTML.includes("focusTerm('CI (Continuous Integration)')"), "release-logregel bevat een klikbare CI-term");
  const releaseLogTermCounts = [...byIdMap["log"].children[0].innerHTML.matchAll(/focusTerm\('([^']+)'\)/g)].map(m => m[1]);
  assert(new Set(releaseLogTermCounts).size === releaseLogTermCounts.length, "elk begrip staat maximaal één keer in dezelfde logregel");
  byIdMap["btn-promote"].onclick();
  assert(byIdMap["env-live"].textContent === "v0.1.1", "promote zet test exact naar live");
  assert(byIdMap["btn-promote"].disabled === true, "promote schakelt uit zodra test gelijk is aan live");
  assert(mapResult().includes("🧪🚀"), "kaart toont gecombineerde vlag na promotie");

  byIdMap["btn-issue"].onclick();
  findBtn("Maak branch").onclick();
  byIdMap["btn-commit"].onclick();
  byIdMap["btn-commit"].onclick();
  findBtn("Open PR").onclick();
  findBtn("Squash & merge").onclick();
  assert(byIdMap["env-test"].textContent === "v0.1.2", "squash-merge maakt v0.1.2 op test");
  assert(__state().mergeKinds.has("merge") && __state().mergeKinds.has("squash"), "simulatie registreert beide merge-vormen");
  byIdMap["btn-revert"].onclick();
  assert(byIdMap["env-test"].textContent === "v0.1.3", "revert maakt een nieuwe testversie");
  assert(__state().commits.at(-1).kind === "revert", "revert voegt een nieuwe revert-commit toe");
  assert(byIdMap["env-live"].textContent === "v0.1.1", "revert laat live ongemoeid");
  byIdMap["btn-promote"].onclick();
  assert(byIdMap["env-live"].textContent === "v0.1.3", "promote zet de gerepareerde versie op live");
  byIdMap["rollback-version"].value = "1";
  byIdMap["rollback-version"].onchange();
  assert(mapResult().includes("terugrol naar v0.1.1"), "rollback-preview markeert het gekozen release-station");
  byIdMap["btn-rollback"].onclick();
  assert(byIdMap["env-live"].textContent === "v0.1.1" && byIdMap["env-test"].textContent === "v0.1.3", "rollback zet alleen live terug");
  assert(__state().env.liveCommit !== __state().env.testCommit, "rollback houdt live en test op verschillende commits");
  findBtn("Verwijder branch").onclick();

  const initialCommitId = __state().commits.find(c => c.msg === "initiële versie").id;
  selectStart(initialCommitId);
  assert(byIdMap["start-label"].textContent.includes(initialCommitId.slice(0, 5)), "gekozen ouder startpunt verschijnt in de DOM");
  byIdMap["btn-issue"].onclick();
  findBtn("Maak branch").onclick();
  assert(__state().branches[__state().active].head === initialCommitId, "branch vanaf ouder commit gebruikt het gekozen startpunt");
  byIdMap["btn-issue"].onclick();
  findBtn("Maak branch").onclick();
  byIdMap["btn-commit"].onclick();
  const branchHead = __state().branches[__state().active].head;
  selectStart(branchHead);
  byIdMap["btn-issue"].onclick();
  findBtn("Maak branch").onclick();
  assert(__state().branches[__state().active].head === branchHead, "branch-van-branch gebruikt de gekozen branch-head");
  assert(byIdMap["progress"].firstElementChild.style.width === "100%", "alle 13 missies voltooid → 100%");

  if (failed) { console.error("\n" + failed + " CHECK(S) GEFAALD"); process.exit(1); }
  console.log("\nALLE CHECKS GESLAAGD");
})();
