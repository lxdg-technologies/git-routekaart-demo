// Controles rond de acties zelf: commit, PR, merge-vormen, startpunt kiezen en de missievoortgang.
module.exports = async function acties({ assert, byIdMap, state, stappen }) {
  stappen.opnieuw();
  stappen.nieuwIssue();
  stappen.maakBranch();
  stappen.commit();
  assert(byIdMap["btn-commit"].disabled === false, "commit-knop is actief op een branch");
  stappen.commit();
  assert(state().branches[state().active].head === state().commits[state().commits.length - 1].id, "branch-head volgt de laatste commit");
  stappen.openPR();
  assert(state().prs[0].state === "open", "open PR krijgt de status open");
  stappen.mergeCommit();
  stappen.promote();

  stappen.mergeRonde("squash");
  assert(state().mergeKinds.has("merge") && state().mergeKinds.has("squash"), "simulatie registreert beide merge-vormen");
  stappen.revert();
  assert(state().commits.at(-1).kind === "revert", "revert voegt een nieuwe revert-commit toe");
  stappen.promote();
  stappen.kiesRollback(1);
  stappen.rollback();
  stappen.verwijderBranch();

  const initialCommitId = state().commits.find(c => c.msg === "initiële versie").id;
  selectStart(initialCommitId);
  assert(byIdMap["start-label"].textContent.includes(initialCommitId.slice(0, 5)), "gekozen ouder startpunt verschijnt in de DOM");
  stappen.nieuwIssue();
  stappen.maakBranch();
  assert(state().branches[state().active].head === initialCommitId, "branch vanaf ouder commit gebruikt het gekozen startpunt");
  stappen.nieuwIssue();
  stappen.maakBranch();
  stappen.commit();
  const branchHead = state().branches[state().active].head;
  selectStart(branchHead);
  stappen.nieuwIssue();
  stappen.maakBranch();
  assert(state().branches[state().active].head === branchHead, "branch-van-branch gebruikt de gekozen branch-head");
  assert(byIdMap["progress"].firstElementChild.style.width === (13 / 15 * 100) + "%", "13 van 15 missies voltooid vóór de collega-actie");

  const colleagueBranch = state().active;
  const mainBeforeColleague = state().branches.main.head;
  const testBeforeColleague = state().env.test;
  const liveBeforeColleague = state().env.live;
  stappen.collega();
  const colleagueCommit = state().commits.at(-1);
  assert(colleagueCommit.branch === "main" && colleagueCommit.msg.startsWith("collega:") && colleagueCommit.byCollega === true && state().branches.main.head !== mainBeforeColleague && state().branches[colleagueBranch].head !== colleagueCommit.id && state().env.test !== testBeforeColleague && state().env.live === liveBeforeColleague && state().missions[13] === true && byIdMap["map-scroll"].innerHTML.includes("👤") && byIdMap["log"].children[0].innerHTML.includes("Een collega heeft iets naar main gemerged"), "collega-actie schuift main op, laat test oplopen, houdt live gelijk en markeert kaart/logboek/missie");
};
