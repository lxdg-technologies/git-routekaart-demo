// Controles rond het omgevingsmodel: wat komt op test, wat op live, en wanneer.
module.exports = async function omgevingen({ assert, byIdMap, mapResult, state, stappen }) {
  stappen.opnieuw();
  assert(byIdMap["env-test"].textContent === "v0.1.0", "test start op v0.1.0");
  assert(byIdMap["env-live"].textContent === "v0.1.0", "live start op v0.1.0");
  assert(byIdMap["btn-promote"].disabled === true, "promote start uitgeschakeld als test gelijk is aan live");
  assert(byIdMap["btn-revert"].disabled === true, "revert start uitgeschakeld zonder merge-head");
  assert(state().envFilter === "all" && !mapResult().includes("data-env-frame") && byIdMap["env-filter-note"].textContent === "" && ["env-dev-box", "env-test-box", "env-live-box"].every(id => byIdMap[id].tag === "button" && typeof byIdMap[id].onclick === "function" && byIdMap[id].attributes["aria-pressed"] === "false"), "omgevingsvakjes starten als native klikbare Alles-weergave zonder kader");

  stappen.mergeRonde("merge");
  assert(byIdMap["env-test"].textContent === "v0.1.1", "merge zet de nieuwe release op test");
  assert(byIdMap["env-live"].textContent === "v0.1.0", "merge wijzigt live niet automatisch");
  assert(byIdMap["btn-promote"].disabled === false, "promote wordt actief zodra test vooruitloopt");
  stappen.promote();
  assert(byIdMap["env-live"].textContent === "v0.1.1", "promote zet test exact naar live");
  assert(byIdMap["btn-promote"].disabled === true, "promote schakelt uit zodra test gelijk is aan live");

  stappen.mergeRonde("squash");
  assert(byIdMap["env-test"].textContent === "v0.1.2", "squash-merge maakt v0.1.2 op test");
  stappen.revert();
  assert(byIdMap["env-test"].textContent === "v0.1.3", "revert maakt een nieuwe testversie");
  assert(byIdMap["env-live"].textContent === "v0.1.1", "revert laat live ongemoeid");
  stappen.promote();
  assert(byIdMap["env-live"].textContent === "v0.1.3", "promote zet de gerepareerde versie op live");

  stappen.kiesRollback(1);
  stappen.rollback();
  assert(byIdMap["env-live"].textContent === "v0.1.1" && byIdMap["env-test"].textContent === "v0.1.3", "rollback zet alleen live terug");
  assert(state().env.liveCommit !== state().env.testCommit, "rollback houdt live en test op verschillende commits");

  stappen.kiesOmgeving("live");
  const liveFaded = (mapResult().match(/data-env-faded="true"/g) || []).length;
  const liveFrame = mapResult().match(/<rect[^>]*data-env-frame="live"[^>]*>/g) || [];
  assert(state().envFilter === "live" && liveFaded > 0 && liveFrame.length === 1 && liveFrame[0].includes('stroke="var(--ok)"') && state().missions[14] === true && byIdMap["env-live-box"].classList.contains("active") && byIdMap["env-live-box"].attributes["aria-pressed"] === "true" && byIdMap["log"].children[0].innerHTML.includes("Dit is wat je gebruikers nu hebben"), "Live toont grijze stations met één groen kader, activeert de knop, logt uitleg en vinkt missie 15 af");

  stappen.kiesOmgeving("test");
  const testFaded = (mapResult().match(/data-env-faded="true"/g) || []).length;
  const testFrame = mapResult().match(/<rect[^>]*data-env-frame="test"[^>]*>/g) || [];
  assert(state().envFilter === "test" && liveFaded > testFaded && testFrame.length === 1 && testFrame[0].includes('stroke="var(--accent)"') && byIdMap["env-filter-note"].textContent.includes("Test"), "Test toont meer main dan Live met één blauw kader wanneer live achterloopt");

  stappen.kiesOmgeving("test");
  assert(state().envFilter === "all" && !mapResult().includes("data-env-faded=\"true\"") && !mapResult().includes("data-env-frame") && byIdMap["env-filter-note"].textContent === "" && byIdMap["env-test-box"].attributes["aria-pressed"] === "false", "nogmaals op Test zet de kaart terug naar Alles zonder grijze filterdelen of kader");

  stappen.opnieuw();
  stappen.mergeRonde("merge");
  stappen.mergeRonde("squash");
  stappen.nieuwIssue();
  stappen.maakBranch();
  stappen.commit();
  stappen.kiesOmgeving("dev");
  const devLayout = state().mapLayout;
  const labelHitsLine = devLayout.branchLabels.some(rect => devLayout.lineSamples.some(point => point.x >= rect.left - 5 && point.x <= rect.right + 5 && point.y >= rect.top - 5 && point.y <= rect.bottom + 5));
  const devFaded = (mapResult().match(/data-env-faded="true"/g) || []).length;
  const devFrame = mapResult().match(/<rect[^>]*data-env-frame="dev"[^>]*>/g) || [];
  assert(!labelHitsLine && devFaded > 0 && devFrame.length === 1 && devFrame[0].includes('stroke="var(--warn)"') && byIdMap["env-filter-note"].textContent.includes("Ontwikkel"), "Ontwikkel toont met drie branches vergrijsde geschiedenis, lijnvrije bordjes en één oranje kader");

  stappen.kiesOmgeving("dev");
  assert(state().envFilter === "all" && !mapResult().includes("data-env-faded=\"true\"") && !mapResult().includes("data-env-frame"), "nogmaals op Ontwikkel zet de kaart terug naar Alles zonder grijze filterdelen of kader");
};
