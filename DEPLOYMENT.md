# Deploymentmodel

Deze repository gebruikt één beschermde bronbranch en één GitHub Pages-site.

| Omgeving | Bronbranch | URL |
|---|---|---|
| Ontwikkel | iedere open pull request, met gesimuleerde GitHub-data | `https://lxdg-technologies.github.io/git-routekaart-demo/dev/pr-<nummer>/` |
| Productie | handmatige promotie van de geteste versie | `https://lxdg-technologies.github.io/git-routekaart-demo/` |
| Test | iedere merge naar `main` | `https://lxdg-technologies.github.io/git-routekaart-demo/test/` |

GitHub Pages ondersteunt één site per repository. De deploymentbranch `gh-pages` bevat daarom
productie in de root, test in `test/` en een ontwikkelkopie per pull request in `dev/pr-<nummer>/`.
De workflow `.github/workflows/deploy-test.yml` vervangt na een merge naar `main` uitsluitend de
testmap. Productie blijft ongewijzigd. Ontwikkel gebruikt vaste ingebedde voorbeeldgegevens voor
het repositorydashboard en de releasebadge; alleen test en productie verbinden met de publieke
GitHub API.

## GitHub Environments

De repository heeft drie echte GitHub Environments:

- `development` — gebruikt door de tijdelijke ontwikkelkopie van iedere open pull request.
- `test` — gebruikt door de automatische testdeployment na een merge naar `main`.
- `live` — gebruikt door de handmatig gestarte promotieworkflow; vereist goedkeuring door
  `DCS-Rob` of `vdbergkevin` en staat zelfgoedkeuring niet toe. Eén van beide goedkeuringen
  is voldoende, zolang de reviewer de workflow niet zelf heeft gestart.

Beide omgevingen accepteren alleen deployments vanaf beschermde branches. De jobs publiceren
hun eigen omgevings-URL, zodat GitHub de deploymenthistorie en de juiste doellink toont.

## Gewone wijziging

1. Maak een featurebranch vanaf `main`.
2. Open een pull request naar `main`.
3. Laat de verplichte `quality`-controle en review slagen.
4. Merge: de testomgeving wordt opnieuw gepubliceerd.

## Release naar productie

1. Controleer de testomgeving en lees desgewenst `/test/environment.json` voor de commit-SHA.
2. Start in GitHub Actions de workflow `Promote tested version to production` handmatig.
3. Typ exact `PROMOTE`; geef optioneel de verwachte volledige test-SHA mee.
4. De workflow controleert de SHA en kopieert exact de testbestanden naar productie.

## Verificatie

Beide omgevingen publiceren een `environment.json` met de bronbranch en volledige commit-SHA:

- productie: `/environment.json`
- test: `/test/environment.json`

De branchbeveiliging blokkeert directe pushes, force-pushes en verwijdering van `main`.
`main` vereist een pull request, één goedkeuring, opgeloste gesprekken en de statuscontrole
`quality`. `gh-pages` is uitsluitend een door de twee deploymentworkflows beheerde artifactbranch.
