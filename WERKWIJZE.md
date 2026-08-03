# WERKWIJZE.md — waarvoor dit ding bestaat en waar het stopt

> **Begin hier.** Lees dit bestand vóór `AGENTS.md`. `AGENTS.md` legt uit *hoe* je aan de code werkt; dit bestand legt uit *wat* de simulatie moet leren en waar hij ophoudt. Leid dat nooit zelf af uit `index.html` — dan ontstaat er bij elke sessie een nieuwe interpretatie.

## 1. Waarvoor is dit

Een leermiddel voor mensen **zonder software-achtergrond** die git van nul leren. Geen naslagwerk voor programmeurs, geen showcase, geen product.

Alles wat je toevoegt moet die ene persoon helpen. Een uitbreiding die alleen een programmeur waardeert, hoort hier niet.

## 2. De eindstreep

**v1 is af** als iemand na één keer doorlopen, zonder hulp:

1. een issue kan oppakken en er een branch bij maken;
2. een pull request kan openen;
3. kan uitleggen waaróm een merge niet meteen op live staat.

**Status: v1 is af** (03-08-2026). De lijst in hoofdstuk 3 staat volledig op `af`.

Dat betekent niet dat er niets meer bij mag. Het betekent dat er niets meer bij komt **zonder de route uit hoofdstuk 5**.

## 3. Wat je oefent

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

## 4. Wat er bewust NIET in zit

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

## 5. Hoe komt er iets nieuws bij

Één route, geen uitzonderingen:

1. Het idee wordt een regel in de tabel van hoofdstuk 3, met status `wens`.
2. De eigenaar van de repo zet hem op `gepland` — dát is het akkoord om te bouwen.
3. Pas dan wordt het gebouwd, en gaat de status naar `af`.
4. Wordt het afgewezen? Dan verhuist de regel naar hoofdstuk 4 met een datum, zodat niemand hem opnieuw "ontdekt".

**Dit wordt afgedwongen, niet onthouden.** De rooktest telt de missies in `index.html` en vergelijkt dat met het aantal regels op `af` in hoofdstuk 3. Klopt het niet, dan is de test rood en kan de wijziging niet gemergd worden.

Wat dat wél doet: voorkomen dat er ongemerkt iets binnenkomt. Wat het níet doet: beoordelen of het een goed idee was — dat blijft een mens.

## 6. Besluiten

Nieuwste bovenaan. Eén regel per besluit, altijd met datum.

- **03-08-2026** — v1 verklaard tot eindstreep. Alles wat verder gaat dan de keten van issue tot live valt onder v2 en wordt niet stilzwijgend toegevoegd.
- **03-08-2026** — Dit bestand toegevoegd, omdat de bedoeling van de simulatie tot nu toe alleen uit de code viel af te leiden en elke sessie op een eigen interpretatie uitkwam.
- **02-08-2026** — Rooktests testen gedrag of het uiteindelijke scherm, nooit de letterlijke brontekst van het script.
- **02-08-2026** — Versienummers verschijnen op de kaart bij de stations die een release opleverden, zodat zichtbaar is dat niet elke commit een versie is.
- **29-07-2026** — Deze repo is de enige actief onderhouden kopie; het oorspronkelijke chat-artefact is gearchiveerd.
