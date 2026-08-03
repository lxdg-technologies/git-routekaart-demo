# Git Routekaart

Interactieve simulatie van een moderne git-werkstroom: **issue → branch → PR → merge → test → live**, weergegeven als metrokaart. Elke lijn is een branch, elk station een commit.

**▶ [Direct spelen](https://lxdg-technologies.github.io/git-routekaart-demo/)** — geen installatie nodig.

## Wat je ermee oefent

- Een issue aanmaken
- Een branch maken bij het issue
- Minstens twee commits zetten
- Een pull request openen
- Mergen met een merge commit
- Mergen met squash & merge
- Een gemergde branch opruimen
- Zien dat een merge alléén op test komt
- Test bewust naar live promoveren
- Een merge terugdraaien met een revert
- Branchen vanaf een oudere commit
- Branchen vanaf een andere branch
- Live terugzetten naar een eerdere versie

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
