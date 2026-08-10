# AGENTS.md — context en werkwijze voor AI-agents en ontwikkelaars

Dit bestand is de volledige overdracht: alles wat je moet weten om aan deze repo te werken zonder de oorspronkelijke chatsessie.

Lees eerst `WERKWIJZE.md` — dat legt vast wat de simulatie moet leren en waar hij ophoudt. Dit bestand gaat alleen over hoe je aan de code werkt.

## Wat is dit?

Een **publiek repositorydashboard plus interactieve git-simulatie als metrokaart**: issue → branch → PR → merge → test → live. Leermiddel voor mensen zonder software-achtergrond. Eén HTML-bestand, geen dependencies, geen build, geen server.

**Productie (GitHub Pages, publiek):** https://lxdg-technologies.github.io/git-routekaart-demo/

**Test (GitHub Pages, publiek):** https://lxdg-technologies.github.io/git-routekaart-demo/test/

⚠️ **Iedere merge naar de beschermde `main`-branch krijgt automatisch een versie en deployt naar test.** Productie verandert alleen via de handmatig gestarte promotieworkflow, die exact een gekozen, eerder op test opgeslagen versie kopieert.

## Werkwijze: main naar test, bewust promoveren naar productie

**Deze publieke repo is de bron van waarheid voor de generieke Git Routekaart en demonstreert een test- en productieroute.** Nieuwe wijzigingen landen via een PR op `main` en verschijnen daarna op test. Alleen een bewuste handmatige promotie verandert productie.

- De **Claude-artifact is gearchiveerd** (29-07-2026) en wordt niet meer bijgewerkt. Als je een link naar een `claude.ai/code/artifact/...`-URL tegenkomt: negeer 'm, deze repo is de bron van waarheid.
- De **privérepo** (`lxdg-technologies/git-routekaart`, LXDG-specifieke inhoud) neemt op een bewust gekozen moment de geschiedenis van deze repo over via `git merge --allow-unrelated-histories` — geen doorlopende sync, één keer, met behoud van volledige commit-historie. Tot dat moment hoeft niemand hier iets voor de privérepo te doen.
- **Regel voor déze repo: geen organisatie-specifieke inhoud.** Geen interne projectnamen, machines, personen of URL's — dat komt pas na de overname in de privérepo.

**Nieuwe features: bij voorkeur via Hermes/Luna, niet via interactieve Claude-chat.** Dit is generiek, laag-risico webwerk — prima geschikt om te delegeren i.p.v. duur, interactief te laten bouwen. Geef Hermes een scherp afgebakende opdracht (dit bestand + de gewenste wijziging), laat hem een PR openen, Rob merget.

## Bestandsstructuur

- `index.html` — de complete simulatie: CSS, HTML en JavaScript in één bestand
- `test/smoketest.js` — headless rooktest (Node, geen dependencies): `node test/smoketest.js`
- `sveltekit/` — de nieuwe uitbreidbare SvelteKit-app met Bun, Tailwind CSS 4, daisyUI 5 en TypeScript
- `README.md` — gebruikersuitleg
- `AGENTS.md` — dit bestand

De nul-dependency `index.html` blijft de downloadbare referentiedemo. `sveltekit/` staat er, wordt op dit moment niet doorontwikkeld, en het besluit erover ligt bij de repo-eigenaar.

## Hoe de simulatie werkt (architectuur)

Alle logica zit in één IIFE onderin `index.html`. Kernstate is het object `S` (aangemaakt in `freshState()`):

- `loadRepositoryDashboard()` gebruikt in de ontwikkelomgeving van pull requests een vaste gesimuleerde snapshot en doet daar geen GitHub API-calls. Op test en live leest hij read-only de publieke GitHub REST API van deze repository. Eén echte snapshot bestaat uit metadata, maximaal 100 commits op de standaardbranch, branches, issues en PR's; `sessionStorage` bewaart hem vijf minuten. De API-fouttoestand mag de simulatie nooit blokkeren.
- API-inhoud wordt voor weergave altijd ge-escaped en GitHub-links worden op het verwachte HTTPS-domein gecontroleerd. Voeg nooit een token, login of private-repositoryroute aan browsercode toe.

- `S.commits[]` — elke commit: `{id, branch, msg, parents[], kind, x}`. `kind` ∈ `normal | merge | squash | revert`. `x` is de horizontale positie op de kaart (globale volgorde).
- `S.branches{}` — per branch: `{name, lane, color, head, merged, deleted, issue}`. `main` heeft altijd lane 0. Zijbranches krijgen een lane uit `S.laneFree` (max 4 tegelijk, lanes worden hergebruikt na opruimen).
- `S.issues[]`, `S.prs[]` — de kaartjes in het actie-paneel.
- `S.missions[]` — de missies uit `WERKWIJZE.md`; `tick(i)` vinkt af, `renderMissions()` toont voortgang + trofee.
- `S.env` — `{test, live}` met versiestrings; `S.relNum` telt releases (`v0.1.<n>`).

Gedragsregels van het omgevingsmodel (de kern van het leerdoel):

1. **Elke merge naar main** (`doMerge`) roept `release()` aan: versienummer +1, **alleen `S.env.test` wordt bijgewerkt**.
2. **`promote()`** kopieert test → live. Knop is alleen actief als test vooruitloopt op live. Live verandert nooit automatisch.
3. **`revertLast()`** kan alleen als de head van main een merge/squash-commit is; voegt een `revert`-commit toe (historie blijft staan) en triggert opnieuw `release()` — de fix gaat dus zelf ook eerst naar test.

Renderpipeline: elke actie muteert `S` en roept `render()` aan, die alles opnieuw tekent: `renderMap()` (SVG-metrokaart, puur string-concatenatie), `renderChips()`, `renderTickets()`, `renderMissions()`, `renderEnv()`. Er is geen framework en geen incrementele DOM-update — bewust simpel gehouden.

Squash-gedrag op de kaart: gesquashte commits krijgen `c.squashed = true` en worden vervaagd/gestippeld getekend — ze bestaan nog, maar zitten niet in de main-historie. Dat visuele verschil is een leerdoel, niet een bug.

## Ontwerpbeslissingen (niet zomaar terugdraaien)

- **Metro-metafoor**: lijn = branch, station = commit, overstapstation = merge-commit. Alle uitleg in de logboek-teksten bouwt hierop voort.
- **Logboek legt elk begrip uit op het moment dat het gebeurt** (`log(titel, waarom)`). Nieuwe acties horen altijd een "waarom"-uitleg in gewone taal te krijgen — doelgroep is een niet-programmeur.
- **Nederlands** is de taal van de hele UI.
- **Eén bestand, nul dependencies** — zodat downloaden + dubbelklikken altijd werkt. Geen frameworks, geen CDN's, geen build-stap toevoegen.
- **De echte repositoryweergave is read-only en aanvullend.** Zij laat zien wat er werkelijk op GitHub staat; de metrokaart eronder blijft de veilige oefenomgeving en voert nooit GitHub-acties uit.
- **Licht + donker thema** via CSS-variabelen (`prefers-color-scheme` én `data-theme`-override). Nieuwe kleuren altijd als variabele in `:root` + beide donker-blokken.
- Versienummers zijn bewust simpel (`v0.1.n`, alleen patch-bump) — semver-nuance is hier geen leerdoel.

## Werkwijze voor wijzigingen

1. Branch vanaf `main` (`feat/...` of `fix/...`) — nooit direct op `main` committen.
2. Pas `index.html` aan; werk zo nodig `test/smoketest.js` mee bij.
3. **Draai `node test/smoketest.js` — moet 100% groen zijn** vóór je de PR als klaar beschouwt. Voeg voor nieuw gedrag nieuwe asserts toe. **Een nieuwe assert controleert gedrag of een uiteindelijk DOM-resultaat, nooit de letterlijke inhoud van het `<script>`-blok.**
4. **Bouw uitsluitend de gevraagde uitkomst.** Een nuttige, technisch aantrekkelijke of voor de hand liggende verbetering die Rob niet heeft gevraagd, valt nog steeds buiten scope. Meld zo'n idee als een afzonderlijk voorstel en bouw het niet mee in deze PR. De gevallen uit PR #113 en PR #117 laten zien waarom: beide gevraagde reparaties waren goed, maar de ongevraagde aanvullingen hadden bestaand gedrag kunnen beschadigen.

### Controle vóór oplevering

5. Controleer vóór het openen van de PR de volledige diff tegen de opdracht in het issue. Verwijder elke wijziging zonder grond in het issue, of breng die terug tot een los voorstel buiten de PR. Controleer daarbij ook of een verbetering die nuttig of technisch aantrekkelijk lijkt toch buiten de gevraagde scope valt.
6. Open een PR met een duidelijke omschrijving in gewone taal (de reviewer is niet altijd technisch). **Elke PR die de simulatie zelf verandert (dus niet alleen CI/docs) krijgt een expliciete "wat te checken"-regel**, bijv. "Klik X aan en kijk of Y verschijnt". De beoordelaar kijkt in de ontwikkelomgeving van die pull request: `https://lxdg-technologies.github.io/git-routekaart-demo/dev/pr-<nummer>/`. Zonder zo'n regel is dat adres net zo nietszeggend als geen adres — het toont dát er iets is, niet wát.
7. **Mergen doet een mens** (repo-eigenaar beslist) — een agent merget nooit zelf. Een merge naar `main` maakt automatisch één nieuwe patchversie en vernieuwt test; productie vereist daarna nog een afzonderlijke handmatige promotie van een expliciet gekozen versie.

## Wie regelt wat

| Onderwerp | Verantwoordelijke |
|---|---|
| GitHub-rechten, GitHub Apps en branchbeveiliging | Rob of Kevin |
| Machines, scripts en agentinstellingen | Hermes IT |
| Code en tests | Coder |
| PR-beoordeling | Reviewer |
| Issues, volgorde en projectbord | Planner |
| Productbeslissingen, mergen en live | Rob |

Voor de bedoeling van de simulatie en de vaste werkwijze geldt `WERKWIJZE.md` als bron. Voor de inhoud en grenzen van de technische review geldt `.github/REVIEW.md`; die tekst wordt hier niet herhaald.

### Als je tegen een muur loopt

Stop bij een ontbrekend recht, een ontbrekende instelling of een andere blokkade. Probeer niet opnieuw, zoek geen omweg en gebruik nooit de identiteit van een andere agent. Meld in gewone taal, elk als afzonderlijk punt:

- **Ontbreekt:** welk recht of welke instelling ontbreekt;
- **Wie regelt:** wie dit kan regelen volgens de tabel hierboven;
- **Blijft kapot:** wat daardoor niet werkt of geblokkeerd blijft;
- **Afgerond:** wat je wél hebt afgemaakt.

Een wijziging die niet is uitgeprobeerd, meld je als **niet af**. Meld dus niet dat iets geslaagd of klaar is zonder een echt uitvoerresultaat. De regel dat je nooit de identiteit van een andere agent gebruikt, geldt ook zolang de situatie uit [issue #111](https://github.com/lxdg-technologies/git-routekaart-demo/issues/111) openstaat; die situatie is daarmee niet opgelost.

### Hotfix

Een hotfix is alleen een kleine, dringende reparatie. Alleen Rob of Kevin bepaalt dat iets een hotfix is. Ook bij een hotfix blijven controles, beoordeling en melding verplicht. Daarna komt de wijziging terug in de gewone route.

### Controle vóór oplevering

- [ ] De tabel bevat alle zes onderwerpen en verantwoordelijken.
- [ ] Een muurmelding noemt afzonderlijk wat ontbreekt, wie het regelt, wat kapot blijft en wat is afgemaakt.
- [ ] De muur-regel zegt: niet opnieuw proberen, geen omweg zoeken en geen andere identiteit gebruiken.
- [ ] Een niet-uitgeprobeerde wijziging is als niet af gemeld.
- [ ] De hotfixdefinitie noemt de kleine dringende reparatie, Rob of Kevin, verplichte controles/beoordeling/melding en de terugkeer naar de gewone route.

## Met meerdere mensen tegelijk werken

**Git voegt per regel samen, niet per bestand.** Twee mensen die verschillende stukken van `index.html` aanpassen, gaan vanzelf goed samen. Een conflict ontstaat alleen als jullie dezelfde regels aanraken.

**Elk issue begint met een regel `Raakt: <bestand of sectie>`.** Voor `index.html` gebruik je de sectienaam uit de bannerkoppen (`/* ==== SECTIE: KAART ==== */`). Twee taken in verschillende secties mogen tegelijk lopen; in dezelfde sectie doe je ze achter elkaar. De vaste secties zijn:

`THEMA`, `LAYOUT`, `REPOSITORY`, `RELEASE-BADGE`, `KAART`, `OMGEVINGEN`, `ACTIES`, `MISSIES`, `LOGBOEK`, `BEGRIPPEN`, `STATE`.

**Vóór het openen van een PR:** haal de laatste `main` op, zet je werk daar bovenop, en draai de rooktest opnieuw. Dat vangt de meeste botsingen weg voordat iemand ze ziet.

**Botst het toch?** Dat is routinewerk, geen storing:

1. Bekijk beide versies naast elkaar.
2. Kies wat blijft (of allebei, in de goede volgorde).
3. Draai de rooktest opnieuw.
4. Zet in de PR-tekst wat je gekozen hebt en waarom — die keuze moet zichtbaar zijn voor de beoordelaar.

## Omgevingsdeployments

Deze repository heeft drie echte omgevingen, met dezelfde namen en regels als op de kaart:

- openstaande pull request → **ontwikkel** op `/dev/pr-<nummer>/` (`.github/workflows/deploy-dev.yml`)
- `main` → **test** op `/test/` (`.github/workflows/deploy-test.yml`)
- handmatige `.github/workflows/promote-production.yml` → **productie** op `/`

De ontwikkelpagina gebruikt ingebedde gesimuleerde repository-, build- en releasegegevens en
maakt geen verbinding met de GitHub API. Test en productie gebruiken juist de echte publieke
GitHub-gegevens. Zo is de pull-requestweergave deterministisch, terwijl na merge de echte
integratie op test wordt gecontroleerd.

Elke workflow raakt uitsluitend zijn eigen map aan. De ontwikkelomgeving wordt bijgewerkt bij
elke push naar de pull request en automatisch opgeruimd zodra die sluit.

`deploy-dev.yml` gebruikt bewust `pull_request` en **niet** `pull_request_target`: dit is een
publieke repository, dus iedereen kan een pull request openen. Bij `pull_request` krijgt een
fork een leestoken en faalt de publicatiestap onschuldig, in plaats van vreemde code met
schrijfrechten uit te voeren. Draai die keuze niet om.

`deploy-test.yml` bepaalt voor iedere main-commit een SemVer patch-tag. `.github/VERSION_BASE`
legt een bewust gekozen major/minor-start vast; de commit die dat bestand wijzigt krijgt exact die
versie en iedere volgende commit op de first-parentlijn verhoogt de patch. De workflow tagt exact
de event-commit, maakt één GitHub Release, en bewaart de schone bestanden onveranderlijk onder
`versions/<tag>/` op `gh-pages`. Test is een kopie van die map met een omgevingsbalk;
`environment.json` en `version.json` noemen tag én SHA.

De promotieworkflow vraagt om zo'n opgeslagen tag en een Boolean bevestiging. Zij controleert dat
tag, archief en SHA bij elkaar horen en kopieert daarna exact die bestanden naar productie. Een
oudere opgeslagen tag kiezen is dezelfde veilige route voor rollback; er wordt niet opnieuw
gebouwd. Beide jobs verwijzen naar de echte GitHub Environments `test` en `live`, zodat deployments
en doel-URL's in GitHub worden bijgehouden. `live` vereist een aparte menselijke goedkeuring en
blokkeert zelfgoedkeuring. Zie `DEPLOYMENT.md`.

## Herkomst

De omgevingsroute is eerst end-to-end beproefd in `lxdg-technologies/git-routekaart-demo-environments` en daarna op de actuele `main` van deze bronrepository toegepast.
