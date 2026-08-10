// Controles voor de read-only koppeling met de echte publieke GitHub-repository.
module.exports = async function repositoryDashboard({ assert, flush, byIdMap, fetchCalls, stappen, setFetchMode }) {
  await flush(); await flush(); await flush();
  assert(byIdMap["repository-link"].href === "https://github.com/lxdg-technologies/git-routekaart-demo", "repositorydashboard linkt naar de gekoppelde repository");
  assert(byIdMap["repository-status"].textContent.includes("Rechtstreeks uit GitHub") && !byIdMap["repository-status"].className.includes("error"), "repositorydashboard meldt een geslaagde publieke API-koppeling");
  assert(byIdMap["repository-source-label"].textContent.includes("Echte GitHub-gegevens") && byIdMap["repository-source-label"].textContent.includes("dashboardversie"), "echt dashboard labelt de getoonde GitHub-gegevens");
  assert(byIdMap["release-source-label"].textContent.includes("echte deploymentgegevens"), "echte releasebadge labelt deploymentgegevens als echt");
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

  const cachedCommit = byIdMap["repository-commits"].innerHTML;
  setFetchMode("repository-error");
  byIdMap["repository-refresh"].onclick();
  await flush(); await flush(); await flush();
  assert(!byIdMap["repository-status"].className.includes("error") && byIdMap["repository-status"].innerHTML.includes("Bekijk de repository op GitHub"), "mislukte repository-aanvraag toont een neutrale GitHub-link");
  assert(!byIdMap["repository-commits"].innerHTML.includes("Laden…") && byIdMap["repository-commits"].innerHTML === cachedCommit, "repositorydashboard behoudt bestaande cache bij een mislukte vernieuwing");

  const callsBeforeDevelopment = fetchCalls.length;
  setFetchMode("version");
  global.location = { protocol: "https:", hostname: "lxdg-technologies.github.io", pathname: "/git-routekaart-demo/dev/pr-51/" };
  stappen.opnieuw();
  byIdMap["repository-refresh"].onclick();
  await flush(); await flush(); await flush();
  assert(fetchCalls.length === callsBeforeDevelopment, "ontwikkelomgeving doet geen fetch naar GitHub of een andere databron");
  assert(byIdMap["repository-title"].textContent === "Gesimuleerde repository", "ontwikkelomgeving noemt de voorbeeldrepository niet echt");
  assert(byIdMap["repository-source-label"].textContent.includes("Oefengegevens") && byIdMap["repository-source-label"].textContent.includes("dashboardversie"), "gesimuleerd dashboard labelt de voorbeeldgegevens als oefengegevens");
  assert(byIdMap["repository-status"].textContent.includes("Gesimuleerde GitHub-gegevens") && byIdMap["repository-status"].textContent.includes("geen verbinding met de GitHub API"), "ontwikkelomgeving benoemt de gesimuleerde databron duidelijk");
  assert(byIdMap["repository-commits"].innerHTML.includes("voorbeeldwijziging") && byIdMap["repository-prs"].innerHTML.includes("Voorbeeld: verbeter de startpagina"), "ontwikkelomgeving rendert de vaste voorbeeldgegevens");
  assert(byIdMap["release-history"].dataset.source === "simulated" && byIdMap["release-badge-label"].textContent.includes("voorbeeld"), "ontwikkelomgeving simuleert ook de buildinformatie");
  assert(byIdMap["release-current-link"].textContent.includes("pull requests"), "gesimuleerde build linkt niet naar een niet-bestaande voorbeeldrelease");
  byIdMap["release-history"].open = true;
  byIdMap["release-history"].dataset.historyLoaded = "false";
  byIdMap["release-history"].ontoggle();
  await flush(); await flush();
  assert(fetchCalls.length === callsBeforeDevelopment && byIdMap["release-history-list"].children.length === 2, "ontwikkelomgeving toont gesimuleerde releasehistorie zonder API-call");

  global.location = { protocol: "https:", hostname: "lxdg-technologies.github.io", pathname: "/git-routekaart-demo/test/" };
  setFetchMode("test-live-behind");
  stappen.opnieuw(); await flush(); await flush(); await flush();
  assert(!byIdMap["test-live-status"].hidden && byIdMap["test-live-status-text"].textContent.includes("Testversie: v9.9.9") && byIdMap["test-live-status-text"].textContent.includes("Liveversie: v9.9.8") && byIdMap["test-live-status-text"].textContent.includes("Test loopt voor"), "testomgeving meldt beide versies en het verschil als live achterloopt");
  assert(byIdMap["test-live-promote-link"].hidden && byIdMap["test-live-check"].disabled === false, "achterstand vraagt eerst om een veiligheidscontrole");
  setFetchMode("test-live-equal");
  stappen.opnieuw(); await flush(); await flush(); await flush();
  assert(!byIdMap["test-live-status"].hidden && byIdMap["test-live-status-text"].textContent.includes("er is niets nieuws te controleren") && byIdMap["test-live-status-text"].textContent.includes("v9.9.9"), "testomgeving meldt dat gelijke versies niets nieuws te controleren geven");
  assert(byIdMap["test-live-promote-link"].hidden, "gelijke versies tonen geen overbodige promotielink");
  setFetchMode("version");
  stappen.opnieuw(); await flush(); await flush(); await flush();
  assert(byIdMap["test-live-status"].hidden || byIdMap["test-live-status"].classList.contains("is-blocked"), "onbekende live-versie blijft zonder groene veiligheidsmelding");
  delete global.location;
};
