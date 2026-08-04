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
6. Een merge naar `main` maakt één build en valideert die automatisch in de omgeving **test**.
7. Dezelfde build wacht daarna op goedkeuring in de omgeving **live**.
8. Een fout wordt teruggedraaid met een nieuwe revert-commit, niet door geschiedenis te herschrijven.

## GitHub-instellingen

Na het mergen van deze bootstrap-PR moeten in GitHub nog eenmalig de gratis repository-instellingen worden aangezet:

- bescherm `main`;
- vereis pull requests en minimaal één approval;
- vereis de status check `quality`;
- blokkeer directe pushes en force-pushes;
- maak Environments `test` en `live`;
- voeg bij `live` een required reviewer toe en schakel self-review uit;
- stel GitHub Pages in op **GitHub Actions**.

De instellingen zijn bewust niet als workflowcode opgenomen: GitHub behandelt repository protection en environment approvals als beheerdersinstellingen, niet als bestanden in de repository.

## Kosten

De workflow gebruikt alleen standaard GitHub Actions op een publieke repository en GitHub Pages. Er zijn geen betaalde runners, externe services of licenties nodig.
