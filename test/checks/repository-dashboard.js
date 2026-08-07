// Controles voor de read-only koppeling met de echte publieke GitHub-repository.
module.exports = async function repositoryDashboard({ assert, flush, byIdMap, fetchCalls }) {
  await flush(); await flush(); await flush();
  assert(byIdMap["repository-link"].href === "https://github.com/lxdg-technologies/git-routekaart-demo", "repositorydashboard linkt naar de gekoppelde repository");
  assert(byIdMap["repository-status"].textContent.includes("Rechtstreeks uit GitHub") && !byIdMap["repository-status"].className.includes("error"), "repositorydashboard meldt een geslaagde publieke API-koppeling");
  assert(byIdMap["repository-summary"].innerHTML.includes(">2</b><span>branches") && byIdMap["repository-summary"].innerHTML.includes(">1</b><span>open issues"), "repositorydashboard toont actuele aantallen");
  assert(byIdMap["repository-commits"].innerHTML.includes("feat: live dashboard") && byIdMap["repository-commits"].innerHTML.includes("abc1234"), "repositorydashboard toont echte commitgeschiedenis");
  assert(byIdMap["repository-branches"].innerHTML.includes("main") && byIdMap["repository-branches"].innerHTML.includes("beschermd"), "repositorydashboard toont branches en bescherming");
  assert(byIdMap["repository-issues"].innerHTML.includes("Open echt issue") && !byIdMap["repository-issues"].innerHTML.includes("PR vermomd als issue"), "repositorydashboard toont issues zonder pull requests dubbel te tellen");
  assert(byIdMap["repository-prs"].innerHTML.includes("Open dashboard-PR") && byIdMap["repository-prs"].innerHTML.includes("gemerged"), "repositorydashboard toont open en gemergde pull requests");
  assert(fetchCalls.some(url => url.includes("/commits?sha=main")) && fetchCalls.some(url => url.includes("/branches?")) && fetchCalls.some(url => url.includes("/issues?")) && fetchCalls.some(url => url.includes("/pulls?")), "repositorydashboard vraagt alle vier gegevenssoorten op");

  const callsBeforeRefresh = fetchCalls.length;
  byIdMap["repository-refresh"].onclick();
  await flush(); await flush(); await flush();
  assert(fetchCalls.length >= callsBeforeRefresh + 5 && byIdMap["repository-refresh"].disabled === false, "handmatig vernieuwen omzeilt de cache en rondt af");
};
