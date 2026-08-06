// Controles rond de begrippenlijst en de klikbare begrippen in het logboek.
module.exports = async function begrippen({ assert, byIdMap, makeEl, glossaryResult, stappen }) {
  assert((glossaryResult().match(/<details class="term-item"/g) || []).length === 26, "begrippenlijst rendert precies 26 termen");
  assert(glossaryResult().includes("Voorbeeld:") && glossaryResult().includes("CI monitoring unavailable"), "elke begrippenlijst-entry bevat uitleg en voorbeeld");
  const commandReference = byIdMap["commandoreferentie-lijst"].innerHTML;
  assert((commandReference.match(/<details class="command-group"/g) || []).length === 6, "commandoreferentie rendert zes commandogroepen");
  assert((commandReference.match(/class="command-item"/g) || []).length === 40, "commandoreferentie bevat alle 40 gevraagde commando's");
  assert(commandReference.includes("Wat:") && commandReference.includes("Wanneer:") && commandReference.includes("Voorbeeld:"), "elk commando toont wat het doet, wanneer je het gebruikt en een voorbeeld");
  assert((commandReference.match(/command-warning/g) || []).length === 2 && commandReference.includes("git reset --hard") && commandReference.includes("git checkout -f main"), "destructieve commando's hebben zichtbare waarschuwingen");
  const branchTerm = makeEl("details");
  byIdMap["term-branch"] = branchTerm;
  focusTerm("Branch");
  assert(branchTerm.open === true, "focusTerm opent de gekozen glossary-entry");
  assert(branchTerm.classList.contains("term-focus") && branchTerm.scrolled, "focusTerm markeert en scrollt naar de gekozen entry");

  stappen.opnieuw();
  stappen.nieuwIssue();
  stappen.maakBranch();
  assert(byIdMap["log"].children[0].innerHTML.includes("focusTerm('Branch')"), "branch-logregel bevat een klikbare Branch-term");
  const branchLog = byIdMap["log"].children[0];
  assert((branchLog.innerHTML.match(/class="log-term"/g) || []).length >= 1, "logregel rendert minstens één termknop");
  stappen.commit();
  stappen.commit();
  stappen.openPR();
  stappen.mergeCommit();
  assert(byIdMap["log"].children[0].innerHTML.includes("focusTerm('CI (Continuous Integration)')"), "release-logregel bevat een klikbare CI-term");
  const releaseLogTermCounts = [...byIdMap["log"].children[0].innerHTML.matchAll(/focusTerm\('([^']+)'\)/g)].map(m => m[1]);
  assert(new Set(releaseLogTermCounts).size === releaseLogTermCounts.length, "elk begrip staat maximaal één keer in dezelfde logregel");
};
