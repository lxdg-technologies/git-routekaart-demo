#!/usr/bin/env python3
"""Merkt werk op dat stilstaat zonder dat iemand het ziet.

Waarom dit bestaat
------------------
Op 22-08-2026 is een pull request afgekeurd. Het bijbehorende issue ging
daardoor terug naar Backlog en de toewijzing werd eraf gehaald — zo is dat
bedoeld: het werk wordt teruggelegd bij een mens. Maar daarna gebeurde er
niets. Er lag een half af voorstel, er was niemand aan het werk, en op het bord
was dat niet te zien: een teruggelegd issue ziet er precies zo uit als een
issue dat nooit begonnen is.

Iemand moet dus merken dat er werk stilstaat. Dat is wat dit script doet.

Wat het bewust NIET doet
------------------------
Het kijkt niet naar het projectbord. Een bord is een weergave, en die kan
verkeerd staan — dat is deze maand meerdere keren gebeurd. Een bewaker die
naar de weergave kijkt, liegt mee met de fout die hij moet vinden. Daarom
kijkt dit script alleen naar feiten die in de issues en pull requests zelf
staan: wie is toegewezen, is er een voorstel, is er om wijzigingen gevraagd,
en wanneer is er voor het laatst iets gebeurd.

Het lost ook niets op. Het wijst alleen aan, in gewone taal, zodat een mens
kan besluiten wat er moet gebeuren. Iets automatisch weer in gang zetten is
een aparte beslissing en hoort hier niet.
"""
from __future__ import annotations

import argparse
import datetime as dt
import json
import os
import subprocess
import sys
from typing import Any, Iterable, NamedTuple

# Het account waaronder de agents werken. Werk dat hieraan toegewezen staat,
# hoort door een agent opgepakt te worden.
AGENT_ACCOUNT = "lxdg-agents"

# Hoe lang werk mag stilstaan voordat het opvalt. Een run van Coder duurt in
# de praktijk vijf tot vijftien minuten; drie kwartier is dus ruim genoeg om
# geen vals alarm te geven op werk dat gewoon nog bezig is.
STANDAARD_GEDULD_MINUTEN = 45

# Het etiket dat op stilstaand werk komt. Eén etiket, geen kleurenschema:
# het moet in één oogopslag duidelijk zijn op het bord en in de lijst.
ETIKET = "staat stil"


class Bevinding(NamedTuple):
    """Eén stuk werk dat stilstaat, met de reden in gewone taal."""

    nummer: int
    soort: str  # "issue" of "pull request"
    stilstand_minuten: int
    uitleg: str
    wat_nu: str

    @property
    def bericht(self) -> str:
        uren, minuten = divmod(self.stilstand_minuten, 60)
        if uren:
            duur = f"{uren} uur en {minuten} minuten" if minuten else f"{uren} uur"
        else:
            duur = f"{minuten} minuten"
        return (
            f"### Dit werk staat stil\n\n"
            f"Er is hier {duur} niets gebeurd.\n\n"
            f"{self.uitleg}\n\n"
            f"**Wat je kunt doen:** {self.wat_nu}\n\n"
            f"<sub>Dit bericht komt van de bewaker die elk half uur kijkt of er werk "
            f"stilstaat. Hij lost niets op en verandert niets aan de code; hij wijst "
            f"alleen aan. Zodra er weer iets gebeurt, verdwijnt het etiket "
            f"`{ETIKET}` vanzelf.</sub>"
        )


def gh(*argumenten: str) -> Any:
    """Roep de GitHub-opdrachtregel aan en geef het antwoord als gegevens terug."""
    resultaat = subprocess.run(
        ["gh", *argumenten],
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="replace",
    )
    if resultaat.returncode != 0:
        raise RuntimeError(f"gh {' '.join(argumenten)} mislukte: {resultaat.stderr.strip()}")
    tekst = resultaat.stdout.strip()
    return json.loads(tekst) if tekst else None


def nu() -> dt.datetime:
    return dt.datetime.now(dt.timezone.utc)


def lees_tijd(waarde: str) -> dt.datetime:
    return dt.datetime.fromisoformat(waarde.replace("Z", "+00:00"))


def minuten_sinds(waarde: str, moment: dt.datetime | None = None) -> int:
    return int(((moment or nu()) - lees_tijd(waarde)).total_seconds() // 60)


def beoordeel(
    issues: Iterable[dict],
    pull_requests: Iterable[dict],
    geduld: int = STANDAARD_GEDULD_MINUTEN,
    moment: dt.datetime | None = None,
) -> list[Bevinding]:
    """Geef terug welk werk stilstaat. Een lege lijst betekent: alles loopt.

    Deze functie praat niet met GitHub, zodat hij zonder netwerk te beproeven is.
    """
    moment = moment or nu()
    pull_requests = list(pull_requests)
    bevindingen: list[Bevinding] = []

    # Bij welk issue hoort een openstaand voorstel? Een voorstel noemt het issue
    # dat het sluit; zo weten we of er al werk ligt.
    voorstel_bij_issue: dict[int, dict] = {}
    for pr in pull_requests:
        for nummer in pr.get("sluit_issues", []):
            voorstel_bij_issue[nummer] = pr

    for issue in issues:
        nummer = issue["number"]
        stil = minuten_sinds(issue["updatedAt"], moment)
        if stil < geduld:
            continue

        toegewezen = [a["login"] for a in issue.get("assignees", [])]
        voorstel = voorstel_bij_issue.get(nummer)

        # Geval 1: teruggelegd na een afkeuring. Er ligt half werk, er is
        # niemand aan toegewezen, en niemand kan dat zien. Dit is wat er op
        # 22-08 gebeurde.
        if voorstel is not None and not toegewezen:
            bevindingen.append(
                Bevinding(
                    nummer=nummer,
                    soort="issue",
                    stilstand_minuten=stil,
                    uitleg=(
                        f"Er ligt een voorstel voor dit werk (#{voorstel['number']}), "
                        "maar er is niemand aan dit issue toegewezen. Dat gebeurt "
                        "nadat een voorstel is afgekeurd: het werk komt terug te "
                        "liggen en wacht tot iemand het weer uitdeelt. Zolang dat "
                        "niet gebeurt, staat het stil zonder dat het opvalt."
                    ),
                    wat_nu=(
                        "wijs dit issue opnieuw toe aan de agents om hetzelfde "
                        f"voorstel te laten afmaken, of sluit voorstel "
                        f"#{voorstel['number']} als het niet meer nodig is."
                    ),
                )
            )
            continue

        # Geval 2: toegewezen aan de agents, maar er is nooit een voorstel
        # gekomen. Dan is de agent onderweg omgevallen, of nooit begonnen.
        if AGENT_ACCOUNT in toegewezen and voorstel is None:
            bevindingen.append(
                Bevinding(
                    nummer=nummer,
                    soort="issue",
                    stilstand_minuten=stil,
                    uitleg=(
                        "Dit issue staat toegewezen aan de agents, maar er is nog "
                        "geen voorstel verschenen. Normaal duurt dat vijf tot "
                        "vijftien minuten. Waarschijnlijk is de agent onderweg "
                        "gestopt, of nooit gestart."
                    ),
                    wat_nu=(
                        "haal de toewijzing eraf en zet hem er opnieuw op; daarmee "
                        "begint het werk opnieuw. Gebeurt dat vaker, laat dan "
                        "iemand naar de agentmachine kijken."
                    ),
                )
            )

    for pr in pull_requests:
        stil = minuten_sinds(pr["updatedAt"], moment)
        if stil < geduld:
            continue

        # Geval 3: om wijzigingen gevraagd, maar er is niets veranderd. Het
        # voorstel wacht op de maker.
        if pr.get("reviewDecision") == "CHANGES_REQUESTED":
            bevindingen.append(
                Bevinding(
                    nummer=pr["number"],
                    soort="pull request",
                    stilstand_minuten=stil,
                    uitleg=(
                        "Er is om wijzigingen gevraagd op dit voorstel, maar er is "
                        "daarna niets veranderd. Het wacht dus op degene die het "
                        "gemaakt heeft."
                    ),
                    wat_nu=(
                        "wijs het bijbehorende issue opnieuw toe zodat het werk "
                        "wordt hervat, of sluit dit voorstel als het niet meer "
                        "nodig is."
                    ),
                )
            )
            continue

        # Geval 4: goedgekeurd en groen, maar het blijft liggen. Dan wacht het
        # op een mens die het erin zet.
        if pr.get("reviewDecision") == "APPROVED":
            bevindingen.append(
                Bevinding(
                    nummer=pr["number"],
                    soort="pull request",
                    stilstand_minuten=stil,
                    uitleg=(
                        "Dit voorstel is goedgekeurd maar staat nog open. Het wacht "
                        "op iemand die besluit het door te voeren."
                    ),
                    wat_nu="voeg het samen, of zeg waarom het blijft liggen.",
                )
            )

    return bevindingen


def haal_issues(repo: str) -> list[dict]:
    ruw = gh(
        "issue", "list", "--repo", repo, "--state", "open", "--limit", "100",
        "--json", "number,updatedAt,assignees,labels",
    ) or []
    return ruw


def haal_pull_requests(repo: str) -> list[dict]:
    ruw = gh(
        "pr", "list", "--repo", repo, "--state", "open", "--limit", "100",
        "--json", "number,updatedAt,reviewDecision,body,title,labels",
    ) or []
    for pr in ruw:
        pr["sluit_issues"] = gekoppelde_issues(pr.get("title", ""), pr.get("body", ""))
    return ruw


def gekoppelde_issues(titel: str, tekst: str) -> list[int]:
    """Welke issues sluit dit voorstel? Zelfde schrijfwijze als de routecontrole."""
    import re

    patroon = re.compile(
        r"\b(?:fix(?:e[sd])?|close[sd]?|resolve[sd]?)\s*:?\s*#(\d+)", re.IGNORECASE
    )
    return sorted({int(m) for m in patroon.findall(f"{titel}\n{tekst}")})


def zet_etiket(repo: str, soort: str, nummer: int) -> None:
    opdracht = "issue" if soort == "issue" else "pr"
    gh_stil(opdracht, "edit", str(nummer), "--repo", repo, "--add-label", ETIKET)


def haal_etiket_weg(repo: str, soort: str, nummer: int) -> None:
    opdracht = "issue" if soort == "issue" else "pr"
    gh_stil(opdracht, "edit", str(nummer), "--repo", repo, "--remove-label", ETIKET)


def gh_stil(*argumenten: str) -> None:
    """Als gh, maar zonder antwoord te verwachten."""
    resultaat = subprocess.run(
        ["gh", *argumenten],
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="replace",
    )
    if resultaat.returncode != 0:
        raise RuntimeError(f"gh {' '.join(argumenten)} mislukte: {resultaat.stderr.strip()}")


def main() -> int:
    ontleder = argparse.ArgumentParser(description=__doc__)
    ontleder.add_argument("--repo", default=os.environ.get("GITHUB_REPOSITORY", ""))
    ontleder.add_argument("--geduld", type=int, default=STANDAARD_GEDULD_MINUTEN)
    ontleder.add_argument(
        "--alleen-kijken",
        action="store_true",
        help="niets veranderen, alleen tonen wat er gevonden zou worden",
    )
    keuzes = ontleder.parse_args()

    if not keuzes.repo:
        print("geen repository opgegeven en GITHUB_REPOSITORY is leeg", file=sys.stderr)
        return 2

    issues = haal_issues(keuzes.repo)
    pull_requests = haal_pull_requests(keuzes.repo)
    bevindingen = beoordeel(issues, pull_requests, keuzes.geduld)
    stilstaand = {(b.soort, b.nummer) for b in bevindingen}

    for bevinding in bevindingen:
        print(f"STAAT STIL  {bevinding.soort} #{bevinding.nummer} "
              f"({bevinding.stilstand_minuten} minuten)")
        if not keuzes.alleen_kijken:
            zet_etiket(keuzes.repo, bevinding.soort, bevinding.nummer)

    # Werk dat weer loopt, hoort het etiket kwijt te raken. Zonder dit blijft
    # het staan en went iedereen eraan — dan is het etiket niets meer waard.
    for lijst, soort in ((issues, "issue"), (pull_requests, "pull request")):
        for stuk in lijst:
            heeft_etiket = any(l["name"] == ETIKET for l in stuk.get("labels", []))
            if heeft_etiket and (soort, stuk["number"]) not in stilstaand:
                print(f"loopt weer  {soort} #{stuk['number']}")
                if not keuzes.alleen_kijken:
                    haal_etiket_weg(keuzes.repo, soort, stuk["number"])

    if not bevindingen:
        print("niets staat stil")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
