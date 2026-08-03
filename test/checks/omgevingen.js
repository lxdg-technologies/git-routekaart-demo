// Controles rond het omgevingsmodel: wat komt op test, wat op live, en wanneer.
module.exports = async function omgevingen({ assert, byIdMap, mapResult, state, stappen }) {
  stappen.opnieuw();
  assert(byIdMap["env-test"].textContent === "v0.1.0", "test start op v0.1.0");
  assert(byIdMap["env-live"].textContent === "v0.1.0", "live start op v0.1.0");
  assert(byIdMap["btn-promote"].disabled === true, "promote start uitgeschakeld als test gelijk is aan live");
  assert(byIdMap["btn-revert"].disabled === true, "revert start uitgeschakeld zonder merge-head");
  assert(state().envFilter === "all" && byIdMap["env-filter-note"].textContent === "" && ["env-dev-box", "env-test-box", "env-live-box"].every(id => byIdMap[id].tag === "button" && typeof byIdMap[id].onclick === "function" && byIdMap[id].attributes["aria-pressed"] === "false"), "omgevingsvakjes starten als native klikbare Alles-weergave");

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
  assert(state().envFilter === "live" && liveFaded > 0 && state().missions[14] === true && byIdMap["env-live-box"].classList.contains("active") && byIdMap["env-live-box"].attributes["aria-pressed"] === "true" && byIdMap["log"].children[0].innerHTML.includes("Dit is wat je gebruikers nu hebben"), "Live toont grijze stations, activeert de knop, logt uitleg en vinkt missie 15 af");

  stappen.kiesOmgeving("test");
  const testFaded = (mapResult().match(/data-env-faded="true"/g) || []).length;
  assert(state().envFilter === "test" && liveFaded > testFaded && byIdMap["env-filter-note"].textContent.includes("Test"), "Test toont meer main dan Live wanneer live achterloopt");

  stappen.kiesOmgeving("test");
  assert(state().envFilter === "all" && !mapResult().includes("data-env-faded=\"true\"") && byIdMap["env-filter-note"].textContent === "" && byIdMap["env-test-box"].attributes["aria-pressed"] === "false", "nogmaals op Test zet de kaart terug naar Alles zonder grijze filterdelen");
};
