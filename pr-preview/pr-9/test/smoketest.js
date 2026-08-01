// Headless rooktest voor index.html — draai met: node test/smoketest.js
// Geen dependencies; stubt net genoeg DOM om de hele flow door te lopen.
const fs = require("fs");
const path = require("path");

const html = fs.readFileSync(path.join(__dirname, "..", "index.html"), "utf8");
const js = html.substring(html.indexOf("<script>") + 8, html.lastIndexOf("</script>"));

const created = []; // alle dynamisch gemaakte elementen
function makeEl(tag) {
  const el = {
    tag, style: {}, dataset: {}, children: [], _text: "", _html: "",
    classList: { toggle() {}, add() {}, remove() {} },
    set className(v) { this._cls = v; }, get className() { return this._cls || ""; },
    set innerHTML(v) { this._html = v; },
    get innerHTML() { return this._html; },
    set textContent(v) { this._text = v; }, get textContent() { return this._text; },
    appendChild(c) { this.children.push(c); }, append(...c) { this.children.push(...c); },
    prepend(c) { this.children.unshift(c); },
    firstElementChild: null,
  };
  el.firstElementChild = { style: {} };
  created.push(el);
  return el;
}
const byIdMap = {};
const ids = ["map-scroll", "legend", "begrippen-lijst", "release-badge", "release-badge-label", "branch-chips", "tickets", "missie-list", "progress", "trophy",
  "log", "btn-issue", "btn-commit", "commit-sub", "reset", "btn-promote", "btn-revert",
  "env-dev", "env-test", "env-live", "env-live-box",
  "start-label", "start-hint", "btn-clear-start"];
for (const id of ids) byIdMap[id] = makeEl("div");

global.document = {
  getElementById: id => byIdMap[id],
  createElement: tag => makeEl(tag),
  documentElement: {},
};
global.getComputedStyle = () => ({ getPropertyValue: () => "#1e5aa8" });
global.window = global; // zodat "window.selectStart = ..." in de app-code werkt

eval(js);

let failed = 0;
const assert = (cond, msg) => {
  if (!cond) { console.error("FAIL: " + msg); failed++; }
  else console.log("ok  : " + msg);
};
// helper: vind de laatst gemaakte dynamische knop met deze tekst
const findBtn = txt => created.filter(e => e.tag === "button" && e.textContent.includes(txt)).pop();

assert(byIdMap["begrippen-lijst"].innerHTML.includes("CI monitoring unavailable"), "vaktermen bevatten CI monitoring unavailable");
assert(byIdMap["begrippen-lijst"].innerHTML.includes("Voorbeeld:"), "elke vakterm heeft een voorbeeld");

assert(html.includes("RELEASE_API_URL") && html.includes("fetch(RELEASE_API_URL"), "badge haalt releases live op via GitHub API");
assert(html.includes("RELEASE_FALLBACK") && html.includes("catch (error)"), "badge heeft een netwerkfallback");
assert(html.includes('id="release-badge-label">release: onbekend</span>'), "badge heeft veilige beginwaarde vóór de API-response");
assert(html.includes("release-badge.dev") && html.includes("release-badge.test") && html.includes("release-badge.live"), "badge heeft ontwikkel-, test- en livekleur");

assert(byIdMap["env-test"].textContent === "v0.1.0", "test start op v0.1.0");
assert(byIdMap["env-live"].textContent === "v0.1.0", "live start op v0.1.0");
assert(byIdMap["btn-promote"].disabled === true, "promote start uitgeschakeld (test == live)");
assert(byIdMap["btn-revert"].disabled === true, "revert start uitgeschakeld (geen merge op main)");
assert(byIdMap["map-scroll"].innerHTML.includes("🧪🚀"), "kaart toont gecombineerde vlag bij de start (test == live)");

byIdMap["btn-issue"].onclick();                       // missie 1
findBtn("Maak branch").onclick();                     // missie 2
byIdMap["btn-commit"].onclick();                      // commit 1
byIdMap["btn-commit"].onclick();                      // commit 2 → missie 3
const autoBranch = __state().active;
const autoHead = __state().branches[autoBranch].head;
const autoChip = created.filter(e => e.tag === "button" && e.className.includes("chip") && e.textContent === autoBranch).pop();
autoChip.onclick();
assert(__state().selectedStart === autoHead, "actieve branch kiest automatisch zijn laatste commit als startpunt");
assert(byIdMap["start-label"].textContent.startsWith("automatisch:"), "automatisch startpunt is duidelijk gelabeld");
byIdMap["btn-clear-start"].onclick();
assert(__state().selectedStart === null && byIdMap["btn-clear-start"].style.display === "none", "wissen zet automatisch startpunt terug naar main");
findBtn("Open PR").onclick();                         // missie 4
findBtn("Merge commit").onclick();                    // missie 5 + release → test

assert(byIdMap["env-test"].textContent === "v0.1.1", "na merge staat test op v0.1.1");
assert(byIdMap["env-live"].textContent === "v0.1.0", "live blijft op v0.1.0 na merge");
assert(byIdMap["btn-promote"].disabled === false, "promote is nu beschikbaar");
assert(byIdMap["btn-revert"].disabled === false, "revert is nu beschikbaar");
assert(!byIdMap["map-scroll"].innerHTML.includes("🧪🚀") && byIdMap["map-scroll"].innerHTML.includes("🧪") && byIdMap["map-scroll"].innerHTML.includes("🚀"), "kaart toont losse test- en live-vlag na merge (nog niet gepromoveerd)");

byIdMap["btn-promote"].onclick();                     // missie 9
assert(byIdMap["env-live"].textContent === "v0.1.1", "na promotie staat live op v0.1.1");
assert(byIdMap["btn-promote"].disabled === true, "promote weer uitgeschakeld na promotie");
assert(byIdMap["map-scroll"].innerHTML.includes("🧪🚀"), "kaart toont gecombineerde vlag op dezelfde commit na promotie");

// tweede ronde: squash + revert
byIdMap["btn-issue"].onclick();
findBtn("Maak branch").onclick();
byIdMap["btn-commit"].onclick();
byIdMap["btn-commit"].onclick();
findBtn("Open PR").onclick();
findBtn("Squash & merge").onclick();                  // missie 6 + release v0.1.2
assert(byIdMap["env-test"].textContent === "v0.1.2", "na squash-merge staat test op v0.1.2");

byIdMap["btn-revert"].onclick();                      // missie 10 + release v0.1.3
assert(byIdMap["env-test"].textContent === "v0.1.3", "revert bouwt nieuwe versie v0.1.3 naar test");
assert(byIdMap["env-live"].textContent === "v0.1.1", "live nog onaangeroerd door revert");
assert(byIdMap["btn-revert"].disabled === true, "revert uitgeschakeld na revert (head is revert-commit)");
byIdMap["btn-promote"].onclick();
assert(byIdMap["env-live"].textContent === "v0.1.3", "fix gepromoveerd naar live");

findBtn("Verwijder branch").onclick();                // missie 7

// startpunt-picker: begint op main, wissen doet niets als er niets gekozen is
assert(byIdMap["start-label"].textContent === "main (huidige kop)", "startpunt staat standaard op main");
assert(byIdMap["btn-clear-start"].style.display === "none", "wis-knop verborgen als er geen startpunt gekozen is");

// tijdreis: branch vanaf een oudere commit op main (niet de huidige kop)
const initCommitId = byIdMap["map-scroll"].innerHTML.match(/<title>([0-9a-f]+) — initiële versie<\/title>/)[1];
selectStart(initCommitId);
assert(byIdMap["start-label"].textContent.includes(initCommitId.slice(0, 5)), "gekozen startpunt verschijnt in het paneel");
assert(byIdMap["btn-clear-start"].style.display === "inline", "wis-knop zichtbaar zodra een startpunt gekozen is");
byIdMap["btn-issue"].onclick();
findBtn("Maak branch").onclick();                     // missie 11 (tijdreis)
assert(__state().branches[__state().active].head === initCommitId, "nieuwe branch vertrekt echt vanaf de gekozen oudere commit, niet vanaf main-kop");
assert(byIdMap["start-label"].textContent === "main (huidige kop)", "startpunt-keuze is verbruikt en terug naar main na het maken van de branch");

// branch-van-branch: eerst een gewone branch met een eigen commit, dan daarvandaan vertakken
byIdMap["btn-issue"].onclick();
findBtn("Maak branch").onclick();
byIdMap["btn-commit"].onclick();
const branchXName = __state().active;
const branchXHead = __state().branches[branchXName].head;
selectStart(branchXHead);
byIdMap["btn-issue"].onclick();
findBtn("Maak branch").onclick();                     // missie 12 (branch-van-branch)
assert(__state().branches[__state().active].head === branchXHead, "nieuwe branch vertrekt vanaf de commit op de andere (niet-main) branch");

assert(byIdMap["progress"].firstElementChild.style.width === "100%", "alle 12 missies voltooid → 100%");

if (failed) { console.error("\n" + failed + " CHECK(S) GEFAALD"); process.exit(1); }
console.log("\nALLE CHECKS GESLAAGD");
