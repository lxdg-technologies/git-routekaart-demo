// Controles rond het omgevingsmodel: wat komt op test, wat op live, en wanneer.
module.exports = async function omgevingen({ assert, byIdMap, state, stappen }) {
  stappen.opnieuw();
  assert(byIdMap["env-test"].textContent === "v0.1.0", "test start op v0.1.0");
  assert(byIdMap["env-live"].textContent === "v0.1.0", "live start op v0.1.0");
  assert(byIdMap["btn-promote"].disabled === true, "promote start uitgeschakeld als test gelijk is aan live");
  assert(byIdMap["btn-revert"].disabled === true, "revert start uitgeschakeld zonder merge-head");

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
};
