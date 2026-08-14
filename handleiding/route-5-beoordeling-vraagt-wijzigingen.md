> Route 5 van 7. Terug naar de [Handleiding - start](start.md) · Vaste vorm: [Handleiding - sjabloon voor een route](sjabloon.md)

## Wanneer gebruik je dit

Er ligt een beoordeling op je pull request en die vraagt wijzigingen. Of jij bent het zelf die iets ziet dat niet klopt.

Dit is normaal en het is goed nieuws: op 10-08 zijn er twee wijzigingen tegengehouden die anders schade hadden aangericht. Een afkeuring is geen fout, het is de bedoeling.

## Voordat je begint

- Er komt **geen nieuwe pull request**. Alles gebeurt op dezelfde branch.
- De beoordelaar plaatst hoogstens **twee** afkeuringen op dezelfde pull request. Bij de derde ronde stopt hij en gaat de vraag naar de repository-eigenaar. Dat is bewust: een lus die zichzelf voedt kostte op 08-08 twee uur.

---

## Stap 1 — Lezen wat er gevraagd wordt

**Wat je doet:** open de pull request en scroll naar de beoordeling onderaan.

**Wat je hoort te zien:** een lijst met regels die beginnen met **GOED**, **NIET GOED** of **ONVOLDOENDE INFORMATIE**, en daaronder een blok **VOOR DE EIGENAAR** in gewone taal.

**Klopt het niet:**
- Staat er *ONVOLDOENDE INFORMATIE*, dan kon de beoordelaar iets niet zien. Vaak omdat het over echte gegevens gaat, en die staan niet in de ontwikkelomgeving. Dat is geen afkeuring van je werk.
- Staat er een pad naar een bestand op de machine, zoals `/tmp/…`? Dat is een fout in de melding, geen aanwijzing voor jou. Negeer het.

## Stap 2 — Beoordelen of je het eens bent

**Wat je doet:** lees het punt en kijk zelf in de code of op het scherm of het klopt.

**Wat je hoort te zien:** ofwel je ziet wat de beoordelaar zag, ofwel je ziet dat hij iets verkeerd begrepen heeft. Allebei is een geldige uitkomst.

**Klopt het niet:** ben je het oneens, schrijf dan een opmerking op de pull request met wat je hebt gecontroleerd en wat je zag. Niet "dit klopt niet", maar "ik heb X geopend en daar staat Y". Een oordeel zonder waarneming is niet te wegen.

## Stap 3 — Laten repareren

**Wat je doet:** stuur Coder terug met de precieze fout. Noem het regelnummer of de letterlijke tekst, en zeg wat er in plaats daarvan moet.

**Wat je hoort te zien:** een nieuwe commit op **dezelfde** branch, en de kaart op het bord springt terug naar **In progress**.

**Klopt het niet:**
- Maakt Coder een nieuwe pull request aan? Dan is de opdracht verkeerd begrepen. Sluit de nieuwe en zeg dat hij op dezelfde tak moet werken.
- Blijft de kaart op **In review** staan? Dan is de bordsynchronisatie nog niet gedraaid. Dat komt vanzelf goed.

**Wat hier het meeste helpt:** precisie. Op 10-08 kostte "het werkt niet" twee rondes, en "regel 203 gebruikt een variabele die in die shell niet bestaat" één.

## Stap 4 — Opnieuw laten beoordelen

**Wat je doet:** niets. De beoordelaar start vanzelf opnieuw als Coder klaar is.

**Wat je hoort te zien:** binnen vier tot acht minuten een tweede beoordeling onder de eerste.

**Klopt het niet:** begint er geen nieuwe beoordeling, dan draait er misschien nog een oude. Er kan er maar één tegelijk per pull request; dat is expres.

## Stap 5 — Zelf nakijken vóór het samenvoegen

**Wat je doet:** open de ontwikkelomgeving van de pull request en probeer de wijziging in de stand waarin een bezoeker binnenkomt: verse pagina, niets aangeklikt.

**Wat je hoort te zien:** wat er in de pull request beloofd wordt, en niets anders.

**Klopt het niet:** zie je iets veranderen dat niet gevraagd was, houd het dan tegen. Dat gebeurde op 10-08 twee keer, en beide keren zag de beoordelaar het niet. Sinds die dag staat in de afspraken dat er alleen gebouwd wordt wat gevraagd is.

## Eindcontrole

1. Elk punt uit de beoordeling is opgelost of beantwoord — geen enkele blijft zwijgend liggen.
2. `quality` is groen.
3. Je hebt de wijziging zelf gezien in de stand waarin een bezoeker binnenkomt.
4. Er is nog steeds maar één pull request voor dit issue.

## Wat de simulatie hiervan laat zien

Niets. De simulatie kent geen beoordeling — daar sluit je zijspoor aan zodra jij dat wilt.

Dat is meteen het grootste verschil tussen de oefening en de werkelijkheid: in het echt zit er tussen "ik ben klaar" en "het staat op test" altijd iemand die meekijkt.
