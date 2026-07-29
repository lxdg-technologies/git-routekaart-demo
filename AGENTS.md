# AGENTS.md — context en werkwijze voor AI-agents en ontwikkelaars

Dit bestand is de volledige overdracht: alles wat je moet weten om aan deze repo te werken zonder de oorspronkelijke chatsessie.

## Wat is dit?

Een **interactieve git-simulatie als metrokaart**: issue → branch → PR → merge → test → live. Leermiddel voor mensen zonder software-achtergrond. Eén HTML-bestand, geen dependencies, geen build, geen server.

**Live versie (GitHub Pages, publiek):** https://lxdg-technologies.github.io/git-routekaart-demo/

⚠️ **Pages deployt automatisch vanaf `main`.** Elke merge naar `main` staat binnen ±1 minuut live op die URL. Dit is bewust — het is zelf een demonstratie van "merge = automatische deploy". Maar besef het vóór je merget.

## Werkwijze: deze repo is de hoofdlijn — niet continu synchroniseren

**Deze publieke repo is waar actief aan doorgebouwd wordt.** Geen doorlopende synchronisatie met een artifact of de privérepo meer — dat kostte eerder onnodig veel moeite (3 kopieën bijwerken voor één wijziging).

- De **Claude-artifact is gearchiveerd** (29-07-2026) en wordt niet meer bijgewerkt. Als je een link naar een `claude.ai/code/artifact/...`-URL tegenkomt: negeer 'm, deze repo is de bron van waarheid.
- De **privérepo** (`lxdg-technologies/git-routekaart`, LXDG-specifieke inhoud) neemt op een bewust gekozen moment de geschiedenis van deze repo over via `git merge --allow-unrelated-histories` — geen doorlopende sync, één keer, met behoud van volledige commit-historie. Tot dat moment hoeft niemand hier iets voor de privérepo te doen.
- **Regel voor déze repo: geen organisatie-specifieke inhoud.** Geen interne projectnamen, machines, personen of URL's — dat komt pas na de overname in de privérepo.

**Nieuwe features: bij voorkeur via Hermes/Luna, niet via interactieve Claude-chat.** Dit is generiek, laag-risico webwerk — prima geschikt om te delegeren i.p.v. duur, interactief te laten bouwen. Geef Hermes een scherp afgebakende opdracht (dit bestand + de gewenste wijziging), laat hem een PR openen, Rob merget.

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

Gestart als Claude-artifact voor het LXDG-robotproject (juli 2026); de drie-omgevingen-uitbreiding (ontwikkel/test/live) kwam voort uit extern advies om dev-, test- en productieomgevingen te scheiden. Deze publieke variant is de generieke afsplitsing daarvan. Sinds 29-07-2026 is dit de enige actief onderhouden kopie (zie "Werkwijze" hierboven).
