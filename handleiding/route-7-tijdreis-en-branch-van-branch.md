> Route 7 van 7. Terug naar de [Handleiding - start](start.md) · Vaste vorm: [Handleiding - sjabloon voor een route](sjabloon.md)

> [!info] Zelden nodig
> Deze route is bij ons nog nooit gebruikt. Hij staat erbij omdat de simulatie er twee missies aan wijdt en omdat het uitlegt hoe git werkt. Kom je hier terecht, vraag dan eerst of het echt nodig is — meestal is een gewone branch vanaf `main` het antwoord.

## Wanneer gebruik je dit

Twee situaties, allebei zeldzaam:

| | Wanneer |
|---|---|
| **Tijdreis** — beginnen vanaf een ouder punt | Je wilt uitzoeken wanneer iets stuk ging, of je wilt bouwen op een versie van vóór een wijziging die eruit gaat |
| **Branch-van-branch** — voortbouwen op werk dat nog niet af is | Je hebt iets nodig uit een pull request die nog openstaat |

**Niet deze route** als je gewoon iets nieuws bouwt. Vertrek dan vanaf `main`, dat is bijna altijd goed.

## Voordat je begint

- Bij een **branch-van-branch** neem je een risico: verandert de branch waarop je voortbouwt, dan verandert jouw vertrekpunt mee. Wordt die pull request afgekeurd, dan sta je op een zijspoor dat nergens meer op aansluit.
- Overleg daarom eerst met degene die aan die andere branch werkt.

---

## Stap 1 — Het startpunt kiezen

**Wat je doet:** open de [commits op main](https://github.com/lxdg-technologies/git-routekaart-demo/commits/main) en zoek het punt waar je wilt beginnen. Elke regel toont de tekst van de wijziging en de datum.

**Wat je hoort te zien:** een lijst met wijzigingen, nieuwste bovenaan, elk met een kort commitnummer rechts.

**Klopt het niet:** weet je niet welk punt je moet hebben, kijk dan in de [releases](https://github.com/lxdg-technologies/git-routekaart-demo/releases). Daar staat welk versienummer bij welke wijziging hoort — makkelijker te lezen dan losse commits.

## Stap 2 — Bij dat punt gaan staan

**Wat je doet:** klik op het commitnummer, en klik daarna rechtsboven op **Browse files**.

**Wat je hoort te zien:** de hele repository zoals hij er op dát moment uitzag. Bovenaan staat het commitnummer in plaats van `main`.

**Klopt het niet:** zie je toch de nieuwste stand, dan heb je op de verkeerde plek geklikt. Het commitnummer moet linksboven in de takkiezer staan.

## Stap 3 — Een branch maken vanaf dat punt

**Wat je doet:** klik linksboven op de takkiezer, typ een nieuwe naam en kies **Create branch … from `<commitnummer>`**.

**Wat je hoort te zien:** GitHub bevestigt dat de branch is gemaakt *vanaf dat commitnummer* — niet vanaf `main`. Lees die regel; het is het enige verschil met een gewone branch.

**Klopt het niet:** staat er *from main*, dan sta je alsnog op de nieuwste stand. Ga terug naar stap 2.

## Stap 4 — Voortbouwen op een branch die nog openstaat

**Wat je doet:** hetzelfde als stap 3, maar kies in de takkiezer de naam van de andere branch in plaats van een commitnummer.

**Wat je hoort te zien:** je nieuwe branch bevat het werk van die ander, ook al is dat nog niet samengevoegd.

**Klopt het niet:** wordt die andere pull request afgekeurd of gesloten, dan hangt jouw werk aan iets dat nooit in de hoofdlijn komt. Vraag Coder dan je branch opnieuw te maken vanaf `main`.

## Stap 5 — Terug naar de gewone route

**Wat je doet:** vanaf hier is er niets bijzonders meer. Commits, pull request, beoordeling, samenvoegen — zie [Handleiding 1 - Van wens naar live](route-1-van-wens-naar-live.md) vanaf stap 3.

**Wat je hoort te zien:** bij het openen van de pull request staat er soms *This branch is out-of-date with the base branch*. Dat is te verwachten: je bent immers vanaf een ouder punt vertrokken.

**Klopt het niet:** krijg je een conflict, ga dan naar [Handleiding 4 - Werken terwijl een ander bezig is](route-4-werken-terwijl-een-ander-bezig-is.md).

## Eindcontrole

1. Je pull request wijst naar `main` als doel, ook als je ergens anders bent begonnen.
2. In *Files changed* staat alleen jouw wijziging — niet ook alles wat er sinds jouw startpunt op main is gebeurd.

Staat er meer in dan je verwacht, stop dan. Je gaat dan andermans werk terugdraaien zonder het te bedoelen. Dat is het echte risico van deze route.

## Wat de simulatie hiervan laat zien

Twee missies, en die zijn hier onmisbaar omdat ze laten zien wat er met de kaart gebeurt:

- **Missie 11** — klik een oudere commit op main aan en maak daar een branch vanaf. Je ziet je zijspoor vertrekken vanaf een station in het midden van de lijn in plaats van aan het eind.
- **Missie 12** — doe hetzelfde vanaf een branch die nog niet is samengevoegd. Je ziet een zijspoor van een zijspoor.

Vooral missie 12 maakt in vijf seconden duidelijk waarom dat riskant is: valt de onderste tak weg, dan hangt de bovenste in de lucht.
