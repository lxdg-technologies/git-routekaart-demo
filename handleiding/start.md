> Startpagina van de handleiding. Zoek hier je situatie op en klik door naar de route. Achtergrond en analyse: [WERKWIJZE.md](../WERKWIJZE.md) · Hoe we werken: [WERKWIJZE.md](../WERKWIJZE.md)

## Waar wil je heen?

| Mijn situatie | Route |
|---|---|
| Ik heb een wens of ik zie iets misgaan, en het moet uiteindelijk live | [Handleiding 1 - Van wens naar live](route-1-van-wens-naar-live.md) |
| Er is nú iets stuk op de echte site | [Handleiding 2 - Er is iets stuk op live](route-2-storing-op-live.md) |
| Er is iets live gegaan dat eruit moet | [Handleiding 3 - Een wijziging terugdraaien](route-3-wijziging-terugdraaien.md) |
| Iemand anders heeft iets samengevoegd terwijl ik bezig was | [Handleiding 4 - Werken terwijl een ander bezig is](route-4-werken-terwijl-een-ander-bezig-is.md) |
| De beoordelaar vraagt wijzigingen op mijn werk | [Handleiding 5 - De beoordeling vraagt wijzigingen](route-5-beoordeling-vraagt-wijzigingen.md) |
| Mijn werk is klaar; wat ruim ik op? | [Handleiding 6 - Een branch opruimen](route-6-branch-opruimen.md) |
| Ik wil beginnen vanaf een ouder punt in de geschiedenis | [Handleiding 7 - Tijdreis en branch-van-branch](route-7-tijdreis-en-branch-van-branch.md) |

Weet je het niet? Begin bij route 1. Negen van de tien keer is dat de goede.

## Wat je nodig hebt voordat je begint

- **Een GitHub-account** dat lid is van `lxdg-technologies`. Zonder lidmaatschap kun je lezen maar niets doen.
- **Schrijfrechten** op `git-routekaart-demo` om een issue te beantwoorden, een branch te maken of een pull request te openen.
- **Toegang tot de afgesproken issue-route** als je hulp van de issuebeheerder nodig hebt.

**Wat je níét zelf kunt, ook niet met rechten:**

| Handeling | Wie dan wel |
|---|---|
| Iets naar de echte site zetten | de repository-eigenaar — zij zijn de enige twee goedkeurders |
| Rechten, instellingen of sleutels van de repository wijzigen | de repository-eigenaar |
| Iets aan de machines of de agents veranderen | de beheerder van de agentomgeving |

Loop je hier tegenaan, ga dan niet zoeken naar een omweg. Zeg wat je nodig hebt en wie het kan regelen.

## De drie plekken waar je kijkt

Dit verwart iedereen in het begin, dus onthoud deze drie adressen:

| Naam | Adres | Wat het is |
|---|---|---|
| **Ontwikkel** | `…/dev/pr-<nummer>/` | Een eigen kopie per pull request. Om te kijken vóór het samenvoegen |
| **Test** | `…/test/` | Waar elke samenvoeging automatisch terechtkomt. Fouten mogen hier |
| **Live** | het adres zonder toevoeging | Wat bezoekers echt zien. Hier komt alleen wat op test bewezen is |

Volledig: `https://lxdg-technologies.github.io/git-routekaart-demo/`

**Let op de valkuil:** op de routekaartpagina staat ook een knop **TEST**. Dat is de oefening, niet de testomgeving. Wie op die knop klikt denkt op test te kijken en kijkt naar een plaatje. Ga altijd naar het adres.

## Woordenlijst

Alleen wat je nodig hebt om de routes te volgen.

| Woord | In gewone taal |
|---|---|
| **Issue** | Een briefje met wat er moet gebeuren en waarom. Nog geen werk |
| **Branch** | Een eigen zijspoor waar je vrij kunt werken zonder dat anderen er last van hebben |
| **Commit** | Eén vastgelegd tussenpunt op je zijspoor. Je kunt er altijd naar terug |
| **Pull request** | Het voorstel om je zijspoor aan te sluiten op de hoofdlijn. Het moment van beoordelen |
| **Merge / samenvoegen** | Je voorstel wordt onderdeel van de hoofdlijn. Daarna gaat het automatisch naar test |
| **Squash** | Al je tussenpunten worden één punt op de hoofdlijn. Dat is bij ons de gewone manier |
| **Promoveren** | Bewust een geteste versie naar de echte site zetten. Nooit automatisch |
| **Revert** | Een wijziging ongedaan maken met een nieuwe wijziging. De geschiedenis blijft staan |
| **Rollback** | De echte site terugzetten naar een eerdere versie |
| **Hotfix** | Een kleine, dringende reparatie omdat er live iets stuk is |

## Wat kleuren en statussen betekenen

| Wat je ziet | Wat het betekent |
|---|---|
| Groen vinkje bij een controle | Die controle is geslaagd |
| Rood kruis bij `quality` | **Stop.** Dit is de enige controle die samenvoegen tegenhoudt |
| Rood kruis bij `review-guard` | Vervelend om te zien, maar het houdt niets tegen. Dat is bewust |
| Kaart op **Ready** | Het issue is bouwklaar. Nog niemand mee bezig |
| Kaart op **In progress** | Er wordt aan gebouwd, of de beoordeling vroeg wijzigingen |
| Kaart op **In review** | Er ligt een beoordeling |
| Kaart op **Done** | Samengevoegd |
| Kaart in **Geen omgeving** | Nog niet gebouwd, of het gaat over het gereedschap zelf |

## Als er iets anders op je scherm staat dan hier

Dat kan drie dingen betekenen, in deze volgorde van waarschijnlijkheid:

1. **Je bent niet ingelogd op GitHub.** Knoppen als *Run workflow*, *Merge* en *New issue* zie je alleen aangemeld.
2. **Je hebt de rechten niet.** Je ziet de knop dan soms wel, maar hij werkt niet.
3. **GitHub heeft zijn scherm veranderd.** Dat gebeurt regelmatig. Zoek op de tekst van de knop, niet op de plek.

De afbeeldingen in deze handleiding zijn gemaakt door een browser die **niet** was ingelogd. Waar een knop hoort te staan die jij wél ziet, staat dat er in de tekst bij.

**Wat om diezelfde reden niet is nagekeken.** De meeste beweringen in deze handleiding zijn met eigen ogen gecontroleerd op de echte pagina's. Vier knoppen konden dat niet worden, omdat ze alleen verschijnen als je bent aangemeld:

| Wat | Waar het hoort te staan | In welke route |
|---|---|---|
| Het **formulier bij een nieuw issue** | na *New issue* | 1 |
| **Create a branch** | in een issue, rechterkolom onder *Development* | 1 |
| **Revert** | onderaan een samengevoegde pull request | 3 |
| **Update branch** | onderaan een pull request die achterloopt | 4 |
| **Create branch … from `<commit>`** | in de takkiezer op een commitpagina | 7 |

Alle vijf zijn standaardonderdelen van GitHub. Van het formulier weten we zeker dat de sjablonen in de repository staan — die zijn er op 11-08 in gezet — maar niemand heeft het scherm zelf nog gezien. De vier knoppen zijn in deze repository nog nooit gebruikt.

Wijkt jouw scherm af, dan ligt dat waarschijnlijk niet aan jou. Meld het, dan wordt de handleiding beter.

## Hoe elke route is opgebouwd

Steeds hetzelfde, zodat je ze naast elkaar kunt leggen:

- **Wanneer gebruik je dit** — herken je situatie
- **Voordat je begint** — wat je nodig hebt
- **De stappen** — per stap: wat je doet, wat je hoort te zien, en wat je doet als dat er niet staat
- **Eindcontrole** — hoe je weet dat je klaar bent
- **Wat de simulatie hiervan laat zien** — welke oefening op de routekaartpagina hierbij hoort
