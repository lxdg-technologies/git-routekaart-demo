

## Identiteiten

De repo gebruikt drie gescheiden GitHub App-identiteiten. Hun rechten zijn bewust klein gehouden, zodat iedere rol alleen de stappen kan uitvoeren die erbij horen.

| Identiteit | Wat het mag | Wat het niet mag |
|---|---|---|
| `lxdg-dcs-planner[bot]` | Issues schrijven en bijhouden | Geen code schrijven en geen approvals geven |
| `lxdg-dcs-author[bot]` | Code schrijven en pull requests openen | Nooit eigen of andermans PR goedkeuren |
| `lxdg-dcs-reviewer[bot]` | De technische review uitvoeren en pull requests reviewen | Geen `contents:write`; daardoor kan deze identiteit geen PR-auteur zijn |
| **DCS-Rob (mens)** | Functionele review doen via de PR-preview en de uitrol naar Environment `live` goedkeuren | Niet vervangen door een agent voor de functionele beoordeling |

`lxdg-dcs-author[bot]` heette tot **04-08-2026** `dcs-lxdg-core`. Oudere commits met die naam horen dus bij dezelfde technische rol.

De workflow-check `review-guard` wordt naast `quality` een verplichte statuscheck. Het aanzetten van deze twee verplichte checks in branch protection is een repository-instelling die Rob handmatig doet; deze PR wijzigt die instelling niet.
