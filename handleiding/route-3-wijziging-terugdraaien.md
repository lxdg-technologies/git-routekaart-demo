> Route 3 van 7. Terug naar de [Handleiding - start](start.md) · Vaste vorm: [Handleiding - sjabloon voor een route](sjabloon.md)

> [!warning] Ook deze route is nooit in het echt gelopen
> De knoppen bestaan en de omgeving is er klaar voor, maar er is nog nooit iets teruggedraaid. Kom je iets tegen dat anders werkt dan hier staat, meld het.

## Wanneer gebruik je dit

Er is iets samengevoegd of live gezet dat er weer uit moet. Niet omdat het stuk is — dan is het [Handleiding 2 - Er is iets stuk op live](route-2-storing-op-live.md) — maar omdat het niet had gemoeten.

## Voordat je begint: kies de goede van de twee

Dit is het enige echt lastige aan deze route. De twee woorden lijken op elkaar en betekenen iets heel anders.

| | **Revert** | **Rollback** |
|---|---|---|
| Wat het doet | Maakt een wijziging ongedaan met een **nieuwe** wijziging | Zet de echte site terug op een **oudere** versie |
| Wat er met de geschiedenis gebeurt | Alles blijft staan; er komt iets bij | Er verandert niets aan de geschiedenis |
| Waar het terechtkomt | Eerst op test, daarna pas live | Rechtstreeks op live, zonder eerst langs test |
| Hoeveel stappen | De gewone route: beoordeling, samenvoegen, test, promoveren | Werkschema starten én laten goedkeuren — twee handelingen, geen knop |
| Wanneer | Het moet er blijvend uit | Het moet er nú af, blijvend regel je later |
| Wie kan het | Iedereen met schrijfrechten | Alleen de repository-eigenaar |

**Vuistregel:** *rollback* is een noodrem, *revert* is een besluit. Een noodrem gebruik je om tijd te kopen; daarna neem je alsnog het besluit.

---

## Stap 1 — Bepalen wat er weg moet

**Wat je doet:** zoek de pull request die de wijziging bracht. In de [lijst met pull requests](https://github.com/lxdg-technologies/git-routekaart-demo/pulls?q=is%3Apr+is%3Amerged) staan ze op volgorde van samenvoegen.

**Wat je hoort te zien:** een pull request met de paarse melding *Merged*, en daaronder welke commit het geworden is.

**Klopt het niet:** weet je niet welke het was, kijk dan in de [releases](https://github.com/lxdg-technologies/git-routekaart-demo/releases). Elke versie noemt wat erin zat.

## Stap 2a — Revert: ongedaan maken met een nieuwe wijziging

**Wat je doet:** open de samengevoegde pull request en klik onderaan op **Revert**. GitHub maakt dan zelf een nieuwe branch en een nieuwe pull request die het tegenovergestelde doet.

**Wat je hoort te zien:** een nieuwe pull request met een titel die begint met *Revert*, en een wijziging die precies het spiegelbeeld is van de oorspronkelijke.

**Klopt het niet:**
- Zie je de knop **Revert** niet? Dan ben je niet ingelogd, of de pull request is niet samengevoegd.
- Meldt GitHub een conflict? Dan is er ná die wijziging in dezelfde regels gewerkt. Automatisch terugdraaien kan dan niet; vraag Coder het met de hand te doen.

**Daarna:** die nieuwe pull request volgt de gewone route — beoordeling, samenvoegen, test. Zie [Handleiding 1 - Van wens naar live](route-1-van-wens-naar-live.md) vanaf stap 5.

## Stap 2b — Rollback: de site terug op een oudere versie

**Wat je doet:** vraag de repository-eigenaar de promotiepagina te openen en dit keer **wél een versienummer in te vullen** — het nummer van de versie die je terug wilt. Verder gelijk aan een gewone promotie.

Let op dat dit géén enkele knop is. Er zijn twee handelingen nodig, en ze worden vaak door verschillende momenten gescheiden:

1. Het werkschema starten, met het versienummer erin.
2. De livegang goedkeuren als de run daarom vraagt.

Zolang die tweede niet gebeurt, staat de run stil en verandert er niets aan de site. Dat is geen storing.

**Wat je hoort te zien:** ná de goedkeuring staat binnen enkele minuten op `…/version.json` het oudere nummer.

**Klopt het niet:**
- Faalt de run met een melding over de versie? Dat nummer bestaat niet of hoort niet bij die commit. Kijk in de releases welke er echt zijn.
- Op de routekaartpagina staat ook een keuzelijst *Terugrollen naar eerdere live-versie*. Dat is de **oefening**, niet de echte handeling. De echte gaat via Actions.

**Let op:** test blijft gewoon vooruit staan. De volgende promotie zet die nieuwere versie er weer op — dus een rollback is tijdelijk zolang je niet ook een revert doet.

## Stap 3 — Vastleggen waarom

**Wat je doet:** zet in het issue of in de pull request één zin waarom het teruggedraaid is.

**Wat je hoort te zien:** een regel die over drie maanden nog te begrijpen is.

**Klopt het niet:** is er geen issue, maak er dan alsnog een. Een terugdraaiing zonder reden ziet er later uit als een vergissing, en dan wordt het opnieuw gebouwd.

## Eindcontrole

1. Op de echte site is de wijziging weg — zelf gekeken.
2. Bij een **rollback**: er staat ook een revert klaar of gepland. Anders komt het terug bij de volgende promotie.
3. De reden staat ergens opgeschreven.

Klopt punt 2 niet, dan is het niet af.

## Wat de simulatie hiervan laat zien

Twee missies gaan hierover, en samen laten ze precies het verschil zien:

- **Missie 10** — *draai een merge terug met een revert*. Je ziet dat er een station bijkomt op de hoofdlijn: de geschiedenis wordt langer, niet korter.
- **Missie 13** — *zet live terug naar een eerdere versie*. Je ziet dat het 🚀-vlaggetje terugspringt en het 🧪-vlaggetje gewoon vooruit blijft staan.

Speel ze achter elkaar. Het verschil dat je op de kaart ziet is precies het verschil dat in de tabel hierboven staat.
