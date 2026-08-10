# Technische review

De technische review door `lxdg-dcs-reviewer[bot]` beantwoordt drie vragen:

1. **Klopt de wijziging met het issue?** De reviewer controleert of de PR doet wat het issue vraagt en of de gekozen oplossing het beschreven gedrag correct uitvoert.
2. **Dekt de test het gedrag?** De reviewer controleert of de tests het gewijzigde gedrag werkelijk afdekken. De reviewer beoordeelt dus gedrag of het uiteindelijke resultaat, niet de letterlijke brontekst van een script. De regel daarover staat ook in `AGENTS.md`.
3. **Blijft de PR binnen scope?** De reviewer controleert de volledige diff op wijzigingen zonder grond in het issue. Iedere wijziging buiten de gevraagde scope wordt expliciet gesignaleerd en niet als onderdeel van dezelfde PR goedgekeurd. Dat geldt ook voor een nuttige of technisch aantrekkelijke verbetering die niet door Rob is gevraagd.

De technische review is geen vervanging voor de functionele controle. DCS-Rob en vdbergkevin beoordelen via de PR-preview wat er voor een gebruiker zichtbaar en uitprobeerbaar is, en zijn samen de goedkeurders voor de uitrol naar Environment `live`.

## Niet in scope

De reviewer:

- verzint geen nieuwe features;
- stelt geen refactors voor buiten de diff;
- beoordeelt geen visuele smaak. Dat laatste doet Rob via de PR-preview.

Een punt buiten deze scope hoort niet als technische blokkade in de review terecht te komen. Als het toch relevant lijkt, kan de reviewer het als losse observatie benoemen zonder de PR daarvoor af te keuren.
