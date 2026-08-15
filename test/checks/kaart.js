// Controles rond de metrokaart en de legenda: stations, lijnen, versielabels en vlaggen.
module.exports = async function kaart({ assert, byIdMap, findBtn, mapResult, state, stappen }) {
  stappen.opnieuw();
  assert(byIdMap["env-filter-note"].textContent.includes("Simulatie/oefening") && byIdMap["env-filter-note"].textContent.includes("wijzigen GitHub niet"), "interactieve kaart labelt zichzelf als veilige simulatie");
  assert(mapResult().includes('data-environment="test"') && mapResult().includes('fill="var(--accent)"') && mapResult().includes('data-environment="live"') && mapResult().includes('fill="var(--ok)"'), "kaart toont de huidige Test- en Live-bolletjes in hun bestaande kleuren");
  assert(mapResult().includes('data-environment="dev"') && mapResult().includes('fill="var(--warn)"') && mapResult().includes('aria-hidden="true"'), "kaart toont het afgesproken Ontwikkel-bolletje als decoratieve marker");
  assert(mapResult().includes("station-hit") && mapResult().includes("v0.1.0"), "kaart toont release-station en versielabel");
  assert(mapResult().includes('role="button"') && mapResult().includes("branch-line"), "kaart rendert klikbare branch-lijn en stations");
  assert(mapResult().includes("branch-line-hit") && mapResult().includes("station-hit"), "kaart rendert ruime klikdoelen");
  assert(byIdMap["legend"].innerHTML.includes("release station") && byIdMap["legend"].innerHTML.includes('class="env-marker test" aria-hidden="true"') && byIdMap["legend"].innerHTML.includes('class="env-marker live" aria-hidden="true"') && !byIdMap["legend"].innerHTML.includes("🧪") && !byIdMap["legend"].innerHTML.includes("🚀"), "legenda toont de test- en live-bolletjes die werkelijk op de kaart staan");

  stappen.nieuwIssue();
  stappen.maakBranch();
  stappen.commit();
  stappen.commit();
  stappen.openPR();
  assert(mapResult().includes('data-pr="1"') && mapResult().includes("PR #1"), "open PR verschijnt als stippellijn met label op de kaart");
  assert(byIdMap["legend"].innerHTML.includes("open pull request"), "legenda benoemt open pull requests");
  stappen.kiesOmgeving("live");
  const prMarker = mapResult().match(/<g data-pr="1"[^>]*>/)?.[0] || "";
  assert(prMarker.includes('data-env-faded="true"'), "open PR vervaagt zelf mee met de branch in Live-weergave");
  stappen.mergeCommit();
  assert(!mapResult().includes('data-pr="1"'), "PR-markering verdwijnt na de merge");

  stappen.opnieuw();
  stappen.nieuwIssue();
  stappen.maakBranch();
  stappen.commit();
  stappen.commit();
  stappen.openPR();
  assert(findBtn("Rebase & merge"), "rebase-actie is zichtbaar in een open PR-kaart");
  stappen.rebaseMerge();
  const rebased = state().commits.filter(c => c.kind === "rebase");
  const rebasedBranch = state().commits.filter(c => c.branch !== "main" && !c.squashed);
  assert(rebased.length === 2 && state().branches.main.head === rebased.at(-1).id, "rebase met twee branchcommits wijst main op de laatste nieuwe commit");
  assert(rebased.every(c => c.parents.length === 1) && rebased.every(c => c.rebasedFrom) && rebasedBranch.length === 2, "rebase maakt nieuwe commitobjecten met één ouder en bewaart de oude branchcommits");
  assert(rebased.every(c => c.parents.length < 2) && mapResult().includes(">↻</text>"), "rebase-resultaat toont een rechte lijn zonder merge-hub");
  assert(state().prs[0].state === "merged" && state().branches[state().prs[0].branch].merged && state().missions[4] === false, "rebase rondt PR en branch af zonder de merge-missie te voltooien");
  assert(byIdMap["legend"].innerHTML.includes("rebase-resultaat"), "legenda benoemt het rebase-resultaat");
  assert([...byIdMap["log"].children].some(entry => entry.innerHTML.includes("rebase")), "logboek benoemt rebase");
  assert([...byIdMap["log"].children].some(entry => entry.innerHTML.includes("zonder") && entry.innerHTML.includes("commit")), "logboek legt uit dat rebase zonder merge-commit werkt");

  stappen.opnieuw();

  stappen.mergeRonde("merge");
  assert(mapResult().includes("v0.1.1") && mapResult().includes("release station v0.1.1"), "nieuwe release krijgt label op het juiste station");
  stappen.promote();
  assert(mapResult().includes('data-environment="test"') && mapResult().includes('fill="var(--accent)"') && mapResult().includes('data-environment="live"') && mapResult().includes('fill="var(--ok)"'), "kaart toont Test en Live na promotie met hun bestaande kleuren");

  stappen.mergeRonde("squash");
  stappen.revert();
  stappen.promote();
  stappen.kiesRollback(1);
  assert(mapResult().includes("terugrol naar v0.1.1"), "rollback-preview markeert het gekozen release-station");
};
