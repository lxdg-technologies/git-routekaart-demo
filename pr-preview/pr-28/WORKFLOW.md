# Werkwijze volgens de Git Routekaart

Deze repository volgt bewust de route uit de simulator:

```
issue → branch → commits → PR → review/CI → merge naar main → test → live
```

## Regels

1. Begin elk stukje werk met een issue.
2. Maak een branch vanaf `main` met prefix `feat/` of `fix/`.
3. Commit op de werkbranch; commit nooit rechtstreeks op `main`.
4. Open een pull request en laat de CI-checks slagen.
5. Merge de PR via GitHub.
6. Start daarna bewust handmatig de workflow **Routekaart — test en live** vanuit `main`.
7. Die workflow maakt één build en valideert die automatisch in de omgeving **test**.
8. Daarna wacht dezelfde build op goedkeuring in de omgeving **live**.
9. Een fout wordt teruggedraaid met een nieuwe revert-commit, niet door geschiedenis te herschrijven.

## GitHub-instellingen

De gratis repository-instellingen zijn als volgt ingericht:

- `main` is beschermd;
- pull requests en minimaal één approval zijn vereist;
- de status check `quality` is vereist;
- directe pushes, force-pushes en branch deletion zijn geblokkeerd;
- Environments `test` en `live` bestaan;
- `live` heeft een required reviewer en self-review is uitgeschakeld;
- GitHub Pages gebruikt **GitHub Actions**.

De instellingen zijn bewust niet als workflowcode opgenomen: GitHub behandelt repository protection en environment approvals als beheerdersinstellingen, niet als bestanden in de repository.

## Kosten

De workflow gebruikt alleen standaard GitHub Actions op een publieke repository en GitHub Pages. Er zijn geen betaalde runners, externe services of licenties nodig.
