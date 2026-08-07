# Deploymentmodel

Deze repository gebruikt één beschermde bronbranch, automatisch genummerde versies en één
GitHub Pages-site.

| Omgeving | Bron | URL |
|---|---|---|
| Ontwikkel | iedere open pull request, met gesimuleerde GitHub-data | `https://lxdg-technologies.github.io/git-routekaart-demo/dev/pr-<nummer>/` |
| Test | automatisch genummerde versie van iedere merge naar `main` | `https://lxdg-technologies.github.io/git-routekaart-demo/test/` |
| Productie | handmatige promotie van één gekozen, opgeslagen testversie | `https://lxdg-technologies.github.io/git-routekaart-demo/` |

GitHub Pages ondersteunt één site per repository. De deploymentbranch `gh-pages` bevat daarom
productie in de root, test in `test/`, onveranderlijke versies in `versions/<tag>/` en een
ontwikkelkopie per pull request in `dev/pr-<nummer>/`.

## Versienummers

Iedere push naar de beschermde `main`-branch start `.github/workflows/deploy-test.yml`. De eerste
job werkt altijd met exact de event-commit, niet met een later verschoven `main`:

1. `.github/VERSION_BASE` legt de bewust gekozen basis vast. Deze wijziging start de automatische
   lijn op `v1.2.0`; eerdere handmatige tags blijven ongewijzigd.
2. `.github/scripts/bepaal-versie.sh` zoekt op de first-parentlijn de commit die deze basis voor
   het laatst wijzigde. Die commit krijgt exact de basisversie; iedere volgende main-commit telt
   één bij de patch op: `v1.2.1`, `v1.2.2`, enzovoort.
3. De workflow zet één geannoteerde Git-tag op exact die commit en maakt één GitHub Release.
4. Een handmatige herstart hergebruikt de bestaande tag als die naar dezelfde SHA wijst en stopt
   met een fout als tag en commit niet overeenkomen.

De berekening is deterministisch. Twee parallelle runs voor verschillende main-commits kiezen
verschillende versies zonder voor iedere merge een extra versiebumpcommit te maken. Een bewuste
major- of minorstap gebeurt later via een gewone PR die `.github/VERSION_BASE` wijzigt; de merge
van die PR krijgt exact de nieuwe basis en daarna telt patch weer verder.

## Onveranderlijke versieopslag en test

Na het taggen bewaart de workflow de schone bronbestanden eenmalig onder `versions/<tag>/` op
`gh-pages`. Een bestaande versiemap mag alleen worden hergebruikt wanneer de opgeslagen SHA exact
overeenkomt; overschrijven met een andere commit stopt fail-closed.

Test wordt uit diezelfde versiemap gekopieerd. Alleen de testkopie krijgt de zichtbare
omgevingsbalk. Daardoor bevat productie nooit per ongeluk een testwaarschuwing. `version.json` en
`environment.json` tonen op test zowel de versie-tag als de volledige commit-SHA.

Ontwikkel gebruikt vaste ingebedde voorbeeldgegevens voor het repositorydashboard en de
releasebadge; alleen test en productie verbinden met de publieke GitHub API.

## GitHub Environments

De repository heeft drie echte GitHub Environments:

- `development` — gebruikt door de tijdelijke ontwikkelkopie van iedere open pull request.
- `test` — gebruikt door de automatische testdeployment na een merge naar `main`.
- `live` — gebruikt door de handmatig gestarte promotieworkflow; vereist goedkeuring door
  `DCS-Rob` of `vdbergkevin` en staat zelfgoedkeuring niet toe. Eén van beide goedkeuringen
  is voldoende, zolang de reviewer de workflow niet zelf heeft gestart.

De omgevingen accepteren alleen deployments vanaf beschermde branches. De jobs publiceren hun
eigen omgevings-URL, zodat GitHub de deploymenthistorie en de juiste doellink toont.

## Gewone wijziging

1. Maak een featurebranch vanaf `main`.
2. Open een pull request naar `main`.
3. Laat de verplichte `quality`-controle en review slagen.
4. Merge: GitHub maakt de volgende patchversie, Git-tag en Release en publiceert die versie op test.
5. Controleer de zichtbare versie op test of lees `/test/environment.json`.

## Een versie naar productie promoveren

1. Kies een versie die onder `https://lxdg-technologies.github.io/git-routekaart-demo/versions/<tag>/`
   is opgeslagen en op test is beoordeeld.
2. Start in GitHub Actions de workflow `Promote a tested version to production` handmatig.
3. Vul de volledige tag in, bijvoorbeeld `v1.1.12`, en vink de bevestiging aan.
4. De workflow controleert dat de tag, opgeslagen metadata en commit-SHA exact overeenkomen.
5. De aparte reviewer keurt de deployment in GitHub Environment `live` goed.
6. De workflow kopieert uitsluitend de opgeslagen bestanden en bouwt niets opnieuw.

## Rollback

Rollback gebruikt bewust dezelfde promotieworkflow. Kies een oudere versie uit `versions/`, vink
de bevestiging aan en laat de `live`-goedkeuring uitvoeren. De oudere, al opgeslagen bestanden
worden rechtstreeks teruggezet; er ontstaat geen nieuwe build en `main` wordt niet gewijzigd.

Alleen versies die door deze nieuwe workflow zijn opgeslagen zijn direct op deze manier te kiezen.
De oudere handmatige releases `v1.0.0` en `v1.1.0` blijven tags/releases, maar worden niet achteraf
als bewezen deploymentartifact aangemerkt.

## Verificatie

Beide omgevingen publiceren metadata met versie, bronbranch en volledige commit-SHA:

- productie: `/environment.json` en `/version.json`
- test: `/test/environment.json` en `/test/version.json`

De branchbeveiliging blokkeert directe pushes, force-pushes en verwijdering van `main`. `main`
vereist een pull request, één goedkeuring, opgeloste gesprekken en de statuscontrole `quality`.
`gh-pages` is uitsluitend een door de deploymentworkflows beheerde artifactbranch.
