#!/usr/bin/env python3
"""Controleer dat een pull request de afspraken van zijn route nakomt.

Twee regels, allebei afgedwongen in plaats van onthouden:

1. Elke pull request heeft precies één `soort:`-label — op de PR zelf of op het
   gekoppelde issue. Zonder dat label valt `synchroniseer-projectbord.py` terug
   op een andere tak en zet de kaart in een baan die niet klopt; een kaart die
   verkeerd staat komt daar nooit meer uit (issue #127).

2. Een pull request met `route:sneltrein` is door Claude geschreven en geopend,
   zonder Coder die test en zonder Reviewer die onafhankelijk meekijkt. Zo'n PR
   mag daarom niets raken dat gedrag verandert. Gedrag gaat via de bouwroute.

Deze controle faalt ook als hij zijn eigen gegevens niet kan vaststellen. Een
groene uitslag moet betekenen dat er echt iets is nagekeken — niet dat er niets
te vinden was.
"""
from __future__ import annotations

import json
import os
import re
import sys
from typing import Any, Iterable
from urllib.error import HTTPError
from urllib.request import Request, urlopen

SOORT_LABELS = frozenset({"soort:routekaart", "soort:gittooling"})
SNELTREIN_LABEL = "route:sneltrein"

# Wat "gedrag" is: alles wat de bezoeker ziet, wat de tests bewaken, en de
# werkschema's en scripts die publiceren. Een fout hierin heeft de site eerder
# twee dagen platgelegd, dus dit is precies wat een onafhankelijke blik nodig
# heeft.
GEDRAGSBESTANDEN = frozenset({"index.html"})
GEDRAGSMAPPEN = ("test/", ".github/workflows/", ".github/scripts/")

# Dezelfde vorm als `synchroniseer-projectbord.py` gebruikt om een PR aan een
# issue te koppelen. Wijkt dit af, dan kan de controle iets anders vinden dan
# het bord — en dan bewaakt hij de verkeerde werkelijkheid.
KOPPELING = re.compile(r"\b(?:close[sd]?|fix(?:e[sd])?|resolve[sd]?)\s+#(\d+)\b", re.I)


def raakt_gedrag(pad: str) -> bool:
    """Verandert dit bestand gedrag, of alleen tekst eromheen?"""
    if pad in GEDRAGSBESTANDEN:
        return True
    return any(pad.startswith(map_) for map_ in GEDRAGSMAPPEN)


def soort_labels(labels: Iterable[str]) -> frozenset[str]:
    return frozenset(label for label in labels if label in SOORT_LABELS)


def gekoppeld_issue(titel: str, tekst: str) -> int | None:
    """Het issuenummer dat deze PR sluit, of None."""
    match = KOPPELING.search(f"{titel}\n{tekst}")
    return int(match.group(1)) if match else None


def controleer(
    pr_labels: Iterable[str],
    issue_labels: Iterable[str],
    bestanden: Iterable[str],
) -> list[str]:
    """Geef de problemen terug; een lege lijst betekent dat alles klopt."""
    pr_labels = set(pr_labels)
    bestanden = list(bestanden)
    problemen: list[str] = []

    # Het bord leest het soort van het gekoppelde issue, en pas daarna van de
    # PR zelf. Dezelfde volgorde, zodat controle en bord niet van mening
    # kunnen verschillen.
    soorten = soort_labels(issue_labels) or soort_labels(pr_labels)
    if not soorten:
        problemen.append(
            "Geen soort:-label. Zet soort:routekaart (de bezoeker ziet het) of "
            "soort:gittooling (het gereedschap zelf) op deze pull request, of op het "
            "issue dat hij sluit. Zonder dat label komt de kaart op het bord in "
            "de verkeerde baan te staan."
        )
    elif len(soorten) > 1:
        problemen.append(
            "Meer dan één soort:-label: "
            + ", ".join(sorted(soorten))
            + ". Kies er één, anders is niet te bepalen welke route het werk aflegt."
        )

    if SNELTREIN_LABEL in pr_labels:
        geraakt = sorted(pad for pad in bestanden if raakt_gedrag(pad))
        if geraakt:
            problemen.append(
                "Deze pull request draagt "
                + SNELTREIN_LABEL
                + " maar verandert gedrag: "
                + ", ".join(geraakt)
                + ". De sneltrein heeft geen onafhankelijke beoordeling. Haal het "
                "label weg en laat dit via de bouwroute lopen (issue → Coder → "
                "Reviewer), of splits de tekstwijziging af in een eigen pull request."
            )

    return problemen


def bericht(problemen: list[str]) -> str:
    """Maak het bericht dat iemand op de pull request moet kunnen begrijpen."""
    if not problemen:
        return "<!-- routecontrole -->\n\n### Dit is opgelost\n\nDe controle is opnieuw gedraaid en heeft niets meer te melden. Je kunt verder."

    if problemen[0].startswith("Geen soort:-label"):
        return """<!-- routecontrole -->

### Deze wijziging kan nog niet door

Er ontbreekt één herkenningsteken voor deze wijziging. Zonder dat weet het overzicht niet waar deze kaart hoort.

**Wat je kunt doen:** zet één van deze blokjes erbij. Op een laptop staat *Labels* rechts naast de tekst; in de GitHub-app staat *Labels* in de gegevens onder de titel. Kies daar één van:

- **`soort:routekaart`** — de bezoeker van de website merkt er iets van.
- **`soort:gittooling`** — het gaat om de hulpmiddelen achter de schermen.

Doe dit bij deze wijziging of op het issue dat erbij hoort.

Daarna wordt opnieuw gekeken; je hoeft niets te starten."""

    if problemen[0].startswith("Meer dan één soort:-label"):
        return """<!-- routecontrole -->

### Deze wijziging kan nog niet door

Er staan twee herkenningstekens op die elkaar tegenspreken: `soort:routekaart` en `soort:gittooling`. Daardoor weet het overzicht niet waar deze kaart hoort.

**Wat je kunt doen:** open op een laptop rechts naast de tekst *Labels*, of tik in de GitHub-app onder de titel op *Labels*. Haal één van de twee blokjes weg, zodat er precies één overblijft.

Daarna wordt opnieuw gekeken; je hoeft niets te starten."""

    if any("maar verandert gedrag:" in probleem for probleem in problemen):
        bestanden = next(
            probleem.split("maar verandert gedrag: ", 1)[1].split(". De sneltrein", 1)[0]
            for probleem in problemen if "maar verandert gedrag:" in probleem
        )
        return f"""<!-- routecontrole -->

### Deze wijziging kan nog niet door

Deze wijziging heeft het blokje `route:sneltrein`, maar verandert iets op de website. Bij dit blokje kijkt niemand de wijziging na.

Dat mag alleen wanneer iemand de wijziging wel heeft nagekeken.

**Wat je kunt doen:** haal op een laptop rechts naast de tekst, of in de GitHub-app onder de titel bij *Labels*, het blokje `route:sneltrein` weg. Of haal de onderdelen voor de website uit deze wijziging.

Daarna wordt opnieuw gekeken; je hoeft niets te starten.

<sub>Om deze onderdelen gaat het: `{bestanden.replace(', ', '`, `')}`</sub>"""

    return "<!-- routecontrole -->\n\n### Deze wijziging kan nog niet door\n\nDe routecontrole heeft een probleem gevonden. Los de gemelde routeafspraak op."


class GitHub:
    def __init__(self, token: str, repository: str):
        self.token = token
        self.repository = repository

    def rest(self, path: str, method: str = "GET", data: dict[str, Any] | None = None) -> Any:
        request = Request(
            "https://api.github.com" + path,
            data=json.dumps(data).encode() if data is not None else None,
            method=method,
            headers={
                "Authorization": f"Bearer {self.token}",
                "Accept": "application/vnd.github+json",
                "Content-Type": "application/json",
            },
        )
        try:
            with urlopen(request) as response:
                body = response.read()
                return json.loads(body) if body else None
        except HTTPError as error:
            try:
                antwoord = error.read().decode("utf-8", errors="replace")
            except Exception:
                antwoord = "(antwoord kon niet worden gelezen)"
            raise RuntimeError(
                f"GitHub-aanroep {path} mislukt: HTTP {error.code} {error.reason}; "
                f"antwoord: {antwoord or '(leeg)'}"
            ) from error

    def bestanden(self, nummer: int) -> list[str]:
        paden: list[str] = []
        pagina = 1
        while True:
            batch = self.rest(f"/repos/{self.repository}/pulls/{nummer}/files?per_page=100&page={pagina}")
            if not batch:
                break
            paden.extend(item["filename"] for item in batch)
            if len(batch) < 100:
                break
            pagina += 1
        return paden

    def issue_labels(self, nummer: int) -> list[str]:
        issue = self.rest(f"/repos/{self.repository}/issues/{nummer}")
        return [label["name"] for label in issue.get("labels", []) if label.get("name")]

    def plaats_of_bewerk_bericht(self, nummer: int, tekst: str) -> None:
        comments = self.rest(f"/repos/{self.repository}/issues/{nummer}/comments?per_page=100") or []
        bestaand = next((comment for comment in comments if "<!-- routecontrole -->" in comment.get("body", "")), None)
        if bestaand:
            self.rest(f"/repos/{self.repository}/issues/comments/{bestaand['id']}", "PATCH", {"body": tekst})
        elif "Dit is opgelost" not in tekst:
            self.rest(f"/repos/{self.repository}/issues/{nummer}/comments", "POST", {"body": tekst})


def main() -> int:
    event_path = os.environ.get("GITHUB_EVENT_PATH", "")
    if not event_path or not os.path.exists(event_path):
        print("::error::Geen GITHUB_EVENT_PATH; de controle kan niet vaststellen "
              "welke pull request hij moet nakijken.", file=sys.stderr)
        return 1
    try:
        with open(event_path, encoding="utf-8") as bestand:
            payload = json.load(bestand)
    except Exception as fout:
        print(f"::error::Kan de gebeurtenis niet lezen: {fout}", file=sys.stderr)
        return 1

    pull_request = payload.get("pull_request")
    if not isinstance(pull_request, dict) or not pull_request.get("number"):
        print("::error::Deze gebeurtenis gaat niet over een pull request.", file=sys.stderr)
        return 1

    nummer = pull_request["number"]
    pr_labels = [label["name"] for label in pull_request.get("labels", []) if label.get("name")]
    repository = (payload.get("repository") or {}).get("full_name", "")
    if not repository:
        print("::error::De gebeurtenis noemt geen repository.", file=sys.stderr)
        return 1

    token = os.environ.get("GITHUB_TOKEN", "")
    if not token:
        print("::error::GITHUB_TOKEN ontbreekt; zonder token zijn de gewijzigde "
              "bestanden niet op te vragen en zou de controle onterecht slagen.",
              file=sys.stderr)
        return 1

    client = GitHub(token, repository)
    try:
        bestanden = client.bestanden(nummer)
        issue_nummer = gekoppeld_issue(pull_request.get("title") or "", pull_request.get("body") or "")
        issue_labels = client.issue_labels(issue_nummer) if issue_nummer else []
    except RuntimeError as fout:
        print(f"::error::{fout}", file=sys.stderr)
        return 1

    # Een pull request zonder gewijzigde bestanden bestaat niet. Zien we er geen,
    # dan hebben we de verkeerde gegevens en mag de uitslag niet groen zijn.
    if not bestanden:
        print(f"::error::Pull request #{nummer} levert geen gewijzigde bestanden op. "
              "De controle kon zijn gegevens niet vaststellen en slaagt daarom niet.",
              file=sys.stderr)
        return 1

    problemen = controleer(pr_labels, issue_labels, bestanden)
    if problemen:
        try:
            client.plaats_of_bewerk_bericht(nummer, bericht(problemen))
        except RuntimeError as fout:
            print(f"::warning::Het routecontrolebericht kon niet worden geplaatst: {fout}", file=sys.stderr)
        for probleem in problemen:
            print(f"::error::{probleem}", file=sys.stderr)
        return 1

    try:
        client.plaats_of_bewerk_bericht(nummer, bericht(problemen))
    except RuntimeError as fout:
        print(f"::warning::Het opgeloste routecontrolebericht kon niet worden bijgewerkt: {fout}", file=sys.stderr)

    soorten = ", ".join(sorted(soort_labels(issue_labels) or soort_labels(pr_labels)))
    route = SNELTREIN_LABEL if SNELTREIN_LABEL in pr_labels else "bouwroute"
    print(f"Routecontrole geslaagd voor #{nummer}: {len(bestanden)} bestand(en), "
          f"soort {soorten}, route {route}.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
