# AGENTS.md — context en werkwijze voor AI-agents en ontwikkelaars

Dit bestand is de volledige overdracht: alles wat je moet weten om aan deze repo te werken zonder de oorspronkelijke chatsessie.

## Wat is dit?

Een **interactieve git-simulatie als metrokaart**: issue → branch → PR → merge → test → live. Leermiddel voor mensen zonder software-achtergrond. Eén HTML-bestand, geen dependencies, geen build, geen server.

**Live versie (GitHub Pages, publiek):** https://lxdg-technologies.github.io/git-routekaart-demo/

⚠️ **Pages deployt automatisch vanaf `main`.** Elke merge naar `main` staat binnen ±1 minuut live op die URL. Dit is bewust — het is zelf een demonstratie van "merge = automatische deploy". Maar besef het vóór je merget.

## Twee varianten — verwar ze niet

| repo | zichtbaarheid | doel |
|---|---|---|
| `lxdg-technologies/git-routekaart-demo` (deze) | **publiek**, MIT | generiek leermiddel, deelbaar met derden |
| `lxdg-technologies/git-routekaart` | privé | LXDG-specifieke inhoud; later koppeling met de echte robotproject-workflow |

**Regel voor deze publieke repo: geen organisatie-specifieke inhoud.** Geen interne projectnamen, machines, personen of URL's. Bij het overnemen van verbeteringen uit de privérepo: eerst genericeren (daar staat bv. "de robot" waar hier "het echte systeem" staat).

## Bestandsstructuur

- `index.html` — de complete simulatie: CSS, HTML en JavaScript in één bestand
- `test/smoketest.js` — headless rooktest (Node, geen dependencies): `node test/smoketest.js`
- `README.md` — gebruikersuitleg
- `AGENTS.md` — dit bestand

## Hoe de simulatie werkt (architectuur)

Alle logica zit in één IIFE onderin `index.html`. Kernstate is het object `S` (aangemaakt in `freshState()`):

- `S.commits[]` — elke commit: `{id, branch, msg, parents[], kind, x}`. `kind` ∈ `normal | merge | squash | revert`. `x` is de horizontale positie op de kaart (globale volgorde).
- `S.branches{}` — per branch: `{name, lane, color, head, merged, deleted, issue}`. `main` heeft altijd lane 0. Zijbranches krijgen een lane uit `S.laneFree` (max 4 tegelijk, lanes worden hergebruikt na opruimen).
- `S.issues[]`, `S.prs[]` — de kaartjes in het actie-paneel.
- `S.missions[]` — 10 booleans; `tick(i)` vinkt af, `renderMissions()` toont voortgang + trofee bij 10/10.
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
- **Licht + donker thema** via CSS-variabelen (`prefers-color-scheme` én `data-theme`-override). Nieuwe kleuren altijd als variabele in `:root` + beide donker-blokken.
- Versienummers zijn bewust simpel (`v0.1.n`, alleen patch-bump) — semver-nuance is hier geen leerdoel.

## Werkwijze voor wijzigingen

1. Branch vanaf `main` (`feat/...` of `fix/...`) — nooit direct op `main` committen.
2. Pas `index.html` aan; werk zo nodig `test/smoketest.js` mee bij.
3. **Draai `node test/smoketest.js` — moet 100% groen zijn** vóór je de PR als klaar beschouwt. Voeg voor nieuw gedrag nieuwe asserts toe.
4. Open een PR met een duidelijke omschrijving in gewone taal (de reviewer is niet altijd technisch).
5. **Mergen doet een mens** (repo-eigenaar beslist) — een agent merget nooit zelf. Onthoud: merge = binnen een minuut live op de Pages-URL.

## Herkomst

Gestart als Claude-artifact voor het LXDG-robotproject (juli 2026); de drie-omgevingen-uitbreiding (ontwikkel/test/live) kwam voort uit extern advies om dev-, test- en productieomgevingen te scheiden. Deze publieke variant is de generieke afsplitsing daarvan.
