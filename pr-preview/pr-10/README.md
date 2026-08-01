# Git Routekaart

Interactieve simulatie van een moderne git-werkstroom: **issue → branch → PR → merge → test → live**, weergegeven als metrokaart. Elke lijn is een branch, elk station een commit.

**▶ [Direct spelen](https://lxdg-technologies.github.io/git-routekaart-demo/)** — geen installatie nodig.

## Wat je ermee oefent

- Issues aanmaken en er branches bij maken
- Committen op een branch (nooit direct op `main`)
- Pull requests openen
- Het verschil tussen **merge commit** en **squash & merge** — zichtbaar op de kaart
- De drie omgevingen: **ontwikkel → test → live**, met bewuste promotie naar live
- Een merge terugdraaien met een **revert** — zonder historie weg te gooien

## Lokaal draaien

Download of clone deze repo en open `index.html` in een browser. Eén bestand, geen build, geen server.

## SvelteKit-app

De nieuwe uitbreidbare versie staat in [`sveltekit/`](sveltekit/). Deze gebruikt SvelteKit, Bun, Tailwind CSS 4 en daisyUI 5:

```sh
cd sveltekit
bun install
bun run dev
```

Zie [`sveltekit/README.md`](sveltekit/README.md) voor de huidige scope en verificatiecommando's. De bestaande `index.html` blijft beschikbaar als downloadbare nul-dependency demo.

## Licentie

[MIT](LICENSE) — vrij te gebruiken, delen en aanpassen.
