// Controles rond de begrippenlijst en de klikbare begrippen in het logboek.
module.exports = async function begrippen({ assert, byIdMap, makeEl, glossaryResult, stappen, decorateLogTerms }) {
  assert((glossaryResult().match(/<details class="term-item"/g) || []).length === 29, "begrippenlijst rendert precies 29 termen");
  assert(glossaryResult().includes('id="term-rebase"') && glossaryResult().includes('id="term-fork"') && glossaryResult().includes("<summary>Rebase</summary>") && glossaryResult().includes("<summary>Fork</summary>"), "Rebase en Fork bestaan als klikbare begrippen");
  assert(glossaryResult().includes("opnieuw boven op een andere basis") && glossaryResult().includes("rechte geschiedenis zonder merge-commit") && glossaryResult().includes("nieuwste basis"), "Rebase toont uitleg, merge-onderscheid en workflowvoorbeeld");
  assert(glossaryResult().includes("eigen kopie van een repository onder je eigen account") && glossaryResult().includes("aparte repository") && glossaryResult().includes("via een pull request terug"), "Fork toont uitleg, branch-onderscheid en workflowvoorbeeld");
  assert(glossaryResult().includes('id="term-rebase"') && glossaryResult().includes('id="term-fork"') && glossaryResult().match(/term-explanation/g).length === 29 && glossaryResult().match(/term-example/g).length === 29, "Rebase en Fork volgen de bestaande uitleg-/voorbeeldstructuur");
  assert(glossaryResult().includes("Voorbeeld:") && glossaryResult().includes("<summary>CI-status ontbreekt</summary>") && !glossaryResult().includes("<summary>CI monitoring unavailable</summary>") && decorateLogTerms("CI monitoring unavailable").includes("focusTerm('CI-status ontbreekt')") && glossaryResult().includes("iets anders dan een rode check") && glossaryResult().includes("Actions-run"), "CI-status ontbreekt heeft een Nederlands kopje en behoudt technische uitleg en voorbeeld");
  const newTermsLog = decorateLogTerms("rebase fork");
  assert(newTermsLog.includes("focusTerm('Rebase')") && newTermsLog.includes("focusTerm('Fork')"), "logboek-koppeling herkent de keywords rebase en fork");
  const commandReference = byIdMap["commandoreferentie-lijst"].innerHTML;
  assert((commandReference.match(/<details class="command-group"/g) || []).length === 6, "commandoreferentie rendert zes commandogroepen");
  assert((commandReference.match(/class="command-item"/g) || []).length === 40, "commandoreferentie bevat alle 40 gevraagde commando's");
  assert(commandReference.includes("git add &lt;bestand&gt;") && commandReference.includes("git branch &lt;naam&gt;") && commandReference.includes("git merge &lt;branch&gt;") && commandReference.includes("git reset --soft &lt;commit&gt;"), "invulnamen blijven zichtbaar in commandovoorbeelden");
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
