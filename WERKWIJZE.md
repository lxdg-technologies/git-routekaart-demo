# WERKWIJZE.md — waarvoor dit ding bestaat en waar het stopt

> **Begin hier.** Lees dit bestand vóór `AGENTS.md`. `AGENTS.md` legt uit *hoe* je aan de code werkt; dit bestand legt uit *wat* de simulatie moet leren en waar hij ophoudt. Leid dat nooit zelf af uit `index.html` — dan ontstaat er bij elke sessie een nieuwe interpretatie.

## 1. Waarvoor is dit

Een leermiddel voor mensen **zonder software-achtergrond** die git van nul leren. Geen naslagwerk voor programmeurs, geen showcase, geen product.

Alles wat je toevoegt moet die ene persoon helpen. Een uitbreiding die alleen een programmeur waardeert, hoort hier niet.

**Deze repo blijft generiek.** Geen organisatienamen, machines, personen, interne URL's of projectafspraken. Alles wat wél over een specifieke organisatie gaat, hoort in een eigen privé-companion-repo — voor dit project is dat [`lxdg-technologies/git-routekaart`](https://github.com/lxdg-technologies/git-routekaart), waar de werkelijke rolverdeling, route en regels staan. Zie het `README` voor hoe je toegang aanvraagt.

## 2. Wat de simulatie nabootst

Ben je nieuw: lees dit hoofdstuk eerst. Daarna weet je waar elke knop in de simulatie in het echt over gaat.

De simulatie speelt de route na die een wijziging in een echt softwareproject aflegt, van "iemand bedenkt iets" tot "het draait bij de gebruiker". Elke knop hoort bij een echte handeling.

| Wat je in de simulatie doet | Wat er in het echt gebeurt | Waar je dat in het echt terugziet |
|---|---|---|
| Nieuw issue | Iemand schrijft op wát er moet gebeuren en waarom — nog geen code | Het issuebord van het project |
| Maak branch | Er ontstaat een eigen werkkopie waarin je vrij kunt experimenteren | Bij de branches van de repository |
| Commit | Een tussenstap wordt vastgelegd met een korte omschrijving | Bij de commits van die branch |
| Open pull request | Het voorstel om jouw werk aan te sluiten op de hoofdlijn | Bij de pull requests |
| Merge (merge commit of squash) | Het werk komt op de hoofdlijn `main` terecht | Op `main` |
| Er verschijnt een versie op test | Er wordt automatisch een pakket gebouwd en op de testomgeving gezet | Op het test-adres van het project |
| Promoveer test → live | Iemand zet bewust exact hetzelfde pakket op het echte systeem | Op het live-adres |
| Rollback | Een eerder bewezen pakket wordt teruggezet — er wordt niets opnieuw gebouwd | Op het live-adres |
| Revert | Een nieuwe commit draait de wijziging om; die gaat zelf ook weer eerst naar test | Op `main` |

**Twee stappen zitten er in het echt tussen, maar niet in de simulatie:** de automatische controles die een pull request tegenhouden als er iets stuk is, en de beoordeling door een mens die goedkeurt of wijzigingen vraagt. Allebei bewust weggelaten — zie hoofdstuk 5.

## 3. De eindstreep

**v1 is af** als iemand na één keer doorlopen, zonder hulp:

1. een issue kan oppakken en er een branch bij maken;
2. een pull request kan openen;
3. kan uitleggen waaróm een merge niet meteen op live staat.

**Status: v1 is af** (03-08-2026). De lijst in hoofdstuk 4 staat volledig op `af`.

Dat betekent niet dat er niets meer bij mag. Het betekent dat er niets meer bij komt **zonder de route uit hoofdstuk 6**.

## 4. Wat je oefent

Elke regel hieronder is één missie in de simulatie. Deze tabel is de enige bron: een missie in de code die hier niet staat, is een fout — en de rooktest weigert hem.

| # | Wat je oefent | Wat het in het echt betekent | Status |
|---|---|---|---|
| 1 | Een issue aanmaken | Werk begint met opschrijven wát er moet gebeuren, nog geen code | af |
| 2 | Een branch maken bij het issue | Je eigen zijspoor; fouten raken hier niemand | af |
| 3 | Minstens twee commits zetten | Werk in kleine, terugvindbare stappen vastleggen | af |
| 4 | Een pull request openen | Het voorstel om je werk aan te sluiten — het moment voor beoordeling | af |
| 5 | Mergen met een merge commit | De volledige historie van het zijspoor blijft zichtbaar | af |
| 6 | Mergen met squash & merge | Alles wordt één commit; rustige hoofdlijn, minder detail | af |
| 7 | Een gemergde branch opruimen | Het naambordje weg, de geschiedenis blijft | af |
| 8 | Zien dat een merge alléén op test komt | De kernregel: een merge gaat nooit rechtstreeks live | af |
| 9 | Test bewust naar live promoveren | De enige knop die het echte systeem raakt, altijd met de hand | af |
| 10 | Een merge terugdraaien met een revert | Terugdraaien is vooruit werken: een nieuwe commit, niets weggegooid | af |
| 11 | Branchen vanaf een oudere commit | "Tijdreizen": je hoeft niet altijd vanaf de laatste stand te vertrekken | af |
| 12 | Branchen vanaf een andere branch | Werk stapelen dat afhangt van iets wat nog in beoordeling staat | af |
| 13 | Live terugzetten naar een eerdere versie | Rollback: een bewezen pakket terug, zonder te bouwen of te testen | af |

Statuswaarden: `af` · `gepland` · `wens` · `niet`.

## 5. Wat er bewust NIET in zit

Dit is geen achterstand. Dit zijn keuzes, met datum. Constateer je een van deze punten opnieuw: het is bekend, maak er geen issue van.

| Wat ontbreekt | Waarom bewust | Besloten |
|---|---|---|
| Een tweede persoon die ook mergt | v1 leert de keten, niet het samenwerken. Zonder tweede hand beweegt de hoofdlijn nooit onder je voeten — dat hoort bij v2 | 03-08-2026 |
| Een review-poort (goedkeuren / wijzigingen vragen) | Hoort niet in een nagespeelde omgeving thuis maar in de instellingen van een echte repo, waar hij echt tegenhoudt | 03-08-2026 |
| Merge-conflicten | Het enige dat samenwerken spannend maakt, en juist daarom slecht na te spelen met knopjes. Kandidaat voor v2 | 03-08-2026 |
| Een controle die een merge tegenhoudt | Zelfde reden als de review-poort: echt of niet | 03-08-2026 |
| Een kapotte live-omgeving | Rollback kun je nu oefenen zonder ooit paniek te voelen. Kandidaat voor v2 | 03-08-2026 |
| Semver-nuance (major/minor) | Versienummers zijn bewust simpel (`v0.1.n`); versiebeleid is hier geen leerdoel | 29-07-2026 |

**v2, als het er ooit komt, heet:** *wat gaat er mis en hoe kom je eruit.* Eigen eindstreep, apart te starten. Niet stukje bij beetje in v1 laten sijpelen.

## 6. Hoe komt er iets nieuws bij

Één route, geen uitzonderingen:

1. Het idee wordt een regel in de tabel van hoofdstuk 4, met status `wens`.
2. De eigenaar van de repo zet hem op `gepland` — dát is het akkoord om te bouwen.
3. Pas dan wordt het gebouwd, en gaat de status naar `af`.
4. Wordt het afgewezen? Dan verhuist de regel naar hoofdstuk 5 met een datum, zodat niemand hem opnieuw "ontdekt".

**Dit wordt afgedwongen, niet onthouden.** De rooktest telt de missies in `index.html` en vergelijkt dat met het aantal regels op `af` in hoofdstuk 4. Klopt het niet, dan is de test rood en kan de wijziging niet gemergd worden.

Wat dat wél doet: voorkomen dat er ongemerkt iets binnenkomt. Wat het níet doet: beoordelen of het een goed idee was — dat blijft een mens.

## 7. Besluiten

Nieuwste bovenaan. Eén regel per besluit, altijd met datum.

- **03-08-2026** — Verwijzing naar de privé-companion-repo toegevoegd in `README.md`. De knip blijft: publiek = generiek leermiddel, privé = de werkwijze van de organisatie zelf.
- **03-08-2026** — v1 verklaard tot eindstreep. Alles wat verder gaat dan de keten van issue tot live valt onder v2 en wordt niet stilzwijgend toegevoegd.
- **03-08-2026** — Dit bestand toegevoegd, omdat de bedoeling van de simulatie tot nu toe alleen uit de code viel af te leiden en elke sessie op een eigen interpretatie uitkwam.
- **02-08-2026** — Rooktests testen gedrag of het uiteindelijke scherm, nooit de letterlijke brontekst van het script.
- **02-08-2026** — Versienummers verschijnen op de kaart bij de stations die een release opleverden, zodat zichtbaar is dat niet elke commit een versie is.
- **29-07-2026** — Deze repo is de enige actief onderhouden kopie; het oorspronkelijke chat-artefact is gearchiveerd.
