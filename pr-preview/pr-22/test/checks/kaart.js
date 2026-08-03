// Controles rond de metrokaart en de legenda: stations, lijnen, versielabels en vlaggen.
module.exports = async function kaart({ assert, byIdMap, mapResult, stappen }) {
  stappen.opnieuw();
  assert(mapResult().includes("🧪🚀"), "kaart toont gecombineerde test/live-vlag bij de start");
  assert(mapResult().includes("station-hit") && mapResult().includes("v0.1.0"), "kaart toont release-station en versielabel");
  assert(mapResult().includes('role="button"') && mapResult().includes("branch-line"), "kaart rendert klikbare branch-lijn en stations");
  assert(mapResult().includes("branch-line-hit") && mapResult().includes("station-hit"), "kaart rendert ruime klikdoelen");
  assert(byIdMap["legend"].innerHTML.includes("release station"), "legenda benoemt release-stations");

  stappen.mergeRonde("merge");
  assert(mapResult().includes("v0.1.1") && mapResult().includes("release station v0.1.1"), "nieuwe release krijgt label op het juiste station");
  stappen.promote();
  assert(mapResult().includes("🧪🚀"), "kaart toont gecombineerde vlag na promotie");

  stappen.mergeRonde("squash");
  stappen.revert();
  stappen.promote();
  stappen.kiesRollback(1);
  assert(mapResult().includes("terugrol naar v0.1.1"), "rollback-preview markeert het gekozen release-station");
};
