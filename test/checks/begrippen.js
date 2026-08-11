// Controles rond de begrippenlijst en de klikbare begrippen in het logboek.
module.exports = async ({ assert, byIdMap, glossaryResult, stappen, decorateLogTerms }) => {
  const glossary = glossaryResult();
  assert((glossary.match(/<details class="term-item"/g) || []).length === 29, "begrippenlijst rendert precies 29 termen");
  assert(glossary.includes('id="term-hotfix"') && glossary.includes("<summary>Hotfix</summary>"), "Hotfix bestaat als klikbaar begrip");
  assert(glossary.includes("noodgreep vanaf wat nu live staat") && glossary.includes("kans op een nieuwe fout") && glossary.includes("alsnog via de gewone route terug"), "Hotfix legt de start, prijs en terugkeer naar de gewone route uit");
  assert(glossary.includes("Voorbeeld:") && glossary.includes("start een hotfix vanaf live v0.1.1") && glossary.match(/term-explanation/g).length === 29 && glossary.match(/term-example/g).length === 29, "Hotfix volgt de bestaande uitleg-/voorbeeldstructuur");
  assert(glossary.includes("<summary>CI-status ontbreekt</summary>") && !glossary.includes("<summary>CI monitoring unavailable</summary>") && decorateLogTerms("CI monitoring unavailable").includes("focusTerm('CI-status ontbreekt')") && glossary.includes("iets anders dan een rode check") && glossary.includes("Actions-run"), "CI-status ontbreekt heeft een Nederlands kopje en behoudt technische uitleg en voorbeeld");
  assert(decorateLogTerms("hotfix").includes("focusTerm('Hotfix')"), "logboek-koppeling herkent het begrip Hotfix");
  stappen.nieuwIssue(); stappen.maakBranch();
  assert(byIdMap["log"].children[0].innerHTML.includes("focusTerm('Branch')"), "branch-logregel bevat een klikbare Branch-term");
  stappen.commit(); stappen.commit(); stappen.openPR(); stappen.mergeCommit();
  assert(byIdMap["log"].children[0].innerHTML.includes("focusTerm('CI (Continuous Integration)')"), "release-logregel bevat een klikbare CI-term");
};
