# Git Routekaart — productie- en testomgevingen

Dashboard en interactieve simulatie van een moderne git-werkstroom: **issue → branch → PR → merge → test → live**. Bovenaan staan de echte commits, branches, issues en pull requests van deze repository; daaronder kun je dezelfde route oefenen als metrokaart.

**▶ [Productie](https://lxdg-technologies.github.io/git-routekaart-demo/)** — alleen bijgewerkt via een bewuste handmatige promotie.

**🧪 [Testomgeving](https://lxdg-technologies.github.io/git-routekaart-demo/test/)** — automatisch bijgewerkt na iedere merge naar de beschermde `main`-branch.

## Branch- en deploymentmodel

- Wijzigingen gaan via een pull request naar `main`; een merge vernieuwt alleen de testomgeving.
- Productie verandert pas wanneer iemand de workflow `Promote tested version to production` handmatig start en `PROMOTE` bevestigt.
- De promotie kopieert exact de huidige geteste versie naar productie; een nieuwere merge kan zo niet ongemerkt meekomen.
- De workflows registreren echte GitHub deployments in de omgevingen `test` en `live`; beide accepteren alleen de beschermde `main`-branch en `live` vereist een aparte menselijke goedkeuring.
- `environment.json` op beide URL's maakt zichtbaar van welke branch en commit de omgeving is gebouwd.

Zie [DEPLOYMENT.md](DEPLOYMENT.md) voor de technische inrichting en controles.

## Echte repositorygegevens

Op test en live leest de dashboardkaart boven de simulatie rechtstreeks uit de publieke GitHub REST API voor [`lxdg-technologies/git-routekaart-demo`](https://github.com/lxdg-technologies/git-routekaart-demo):

- maximaal 100 recente commits op de standaardbranch;
- maximaal 100 branches;
- maximaal 100 recent bijgewerkte issues, zonder pull requests dubbel te tellen;
- maximaal 100 recent bijgewerkte pull requests.

De pagina gebruikt geen token en heeft geen eigen backend. Eén snapshot wordt vijf minuten in de browsersessie bewaard om de publieke API-limiet te ontzien. Als GitHub tijdelijk niet bereikbaar is, blijft de simulatie zelfstandig werken en linken de kolommen rechtstreeks naar GitHub.

De ontwikkelomgeving van een pull request (`/dev/pr-<nummer>/`) gebruikt bewust vaste gesimuleerde repository- en releasegegevens. Daardoor is een wijziging voorspelbaar te beoordelen en doet de ontwikkelpagina zelf geen verzoeken aan de GitHub API. Na merge controleert test dezelfde code met de echte publieke gegevens; live gebruikt eveneens de echte API.

## Wat je ermee oefent

- Een issue aanmaken
- Een branch maken bij het issue
- Minstens twee commits zetten
- Een pull request openen
- Mergen met een merge commit
- Mergen met squash & merge
- Een gemergde branch opruimen
- Zien dat een merge alléén op test komt
- Test bewust naar live promoveren
- Een merge terugdraaien met een revert
- Branchen vanaf een oudere commit
- Branchen vanaf een andere branch
- Live terugzetten naar een eerdere versie

## De werkwijze in de praktijk

Deze simulatie is de **generieke** versie: hij leert de route, zonder afspraken van een specifieke organisatie.

De werkwijze zoals wij die zelf toepassen — rolverdeling, de route van issue tot live, en de regels die daarbij gelden — staat in een **privé-companion-repo**: [`lxdg-technologies/git-routekaart`](https://github.com/lxdg-technologies/git-routekaart).

- **Heb je toegang?** Dan opent die link direct.
- **Nog geen toegang?** Dan zie je een 404-pagina. Open een [issue in deze repo](https://github.com/lxdg-technologies/git-routekaart-demo/issues) om toegang aan te vragen.

## Lokaal draaien

Download of clone deze repo en open `index.html` in een browser. Eén bestand, geen build, geen server.

## SvelteKit-app

De nieuwe uitbreidbare versie staat in [`sveltekit/`](sveltekit/). Deze gebruikt SvelteKit, Bun, Tailwind CSS 4 en daisyUI 5:

```sh
cd sveltekit
bun install
bun run dev
```

Zie [`sveltekit/README.md`](sveltekit/README.md) voor de huidige scope en verificatiecommando's. De bestaande `index.html` blijft beschikbaar als downloadbare nul-dependency demo.

## Licentie

[MIT](LICENSE) — vrij te gebruiken, delen en aanpassen.
