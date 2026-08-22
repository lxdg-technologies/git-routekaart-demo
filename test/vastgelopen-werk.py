#!/usr/bin/env python3
"""Gedragstests voor de bewaker op stilstaand werk. Praat niet met GitHub."""
import datetime as dt
import importlib.util
import unittest
from pathlib import Path

ROOT = Path(__file__).parents[1]
spec = importlib.util.spec_from_file_location(
    "bewaker", ROOT / ".github/scripts/meld-vastgelopen-werk.py"
)
if spec is None or spec.loader is None:
    raise RuntimeError("kan de bewaker niet laden")
bewaker = importlib.util.module_from_spec(spec)
spec.loader.exec_module(bewaker)

NU = dt.datetime(2026, 8, 22, 15, 0, tzinfo=dt.timezone.utc)


def geleden(minuten: int) -> str:
    return (NU - dt.timedelta(minutes=minuten)).isoformat().replace("+00:00", "Z")


def issue(nummer, minuten, toegewezen=(), etiketten=()):
    return {
        "number": nummer,
        "updatedAt": geleden(minuten),
        "assignees": [{"login": naam} for naam in toegewezen],
        "labels": [{"name": naam} for naam in etiketten],
    }


def voorstel(nummer, minuten, sluit=(), oordeel=None, etiketten=()):
    return {
        "number": nummer,
        "updatedAt": geleden(minuten),
        "reviewDecision": oordeel,
        "sluit_issues": list(sluit),
        "labels": [{"name": naam} for naam in etiketten],
    }


def beoordeel(issues=(), voorstellen=(), geduld=45):
    return bewaker.beoordeel(list(issues), list(voorstellen), geduld, NU)


class Geduld(unittest.TestCase):
    def test_werk_dat_net_bezig_is_geeft_geen_alarm(self):
        # Een run van Coder duurt vijf tot vijftien minuten. Alarm slaan op werk
        # dat gewoon nog loopt, is erger dan geen alarm: dan gaat iedereen het
        # negeren.
        bevindingen = beoordeel(
            issues=[issue(1, minuten=10, toegewezen=["lxdg-agents"])],
        )
        self.assertEqual(bevindingen, [])

    def test_precies_op_de_grens_telt_nog_niet(self):
        bevindingen = beoordeel(
            issues=[issue(1, minuten=44, toegewezen=["lxdg-agents"])],
        )
        self.assertEqual(bevindingen, [])


class TeruggelegdWerk(unittest.TestCase):
    """Het geval van 22-08: afgekeurd, teruggelegd, en daarna niets."""

    def test_voorstel_zonder_toegewezen_issue_valt_op(self):
        bevindingen = beoordeel(
            issues=[issue(185, minuten=60)],
            voorstellen=[voorstel(186, minuten=60, sluit=[185], oordeel="CHANGES_REQUESTED")],
        )
        issue_bevindingen = [b for b in bevindingen if b.soort == "issue"]
        self.assertEqual(len(issue_bevindingen), 1)
        self.assertEqual(issue_bevindingen[0].nummer, 185)

    def test_de_uitleg_noemt_het_voorstel_dat_er_al_ligt(self):
        # Zonder dat nummer moet de lezer zelf gaan zoeken, en dan is het
        # bericht net zo nutteloos als geen bericht.
        bevindingen = beoordeel(
            issues=[issue(185, minuten=60)],
            voorstellen=[voorstel(186, minuten=60, sluit=[185])],
        )
        uitleg = next(b for b in bevindingen if b.soort == "issue").uitleg
        self.assertIn("#186", uitleg)

    def test_een_issue_zonder_voorstel_en_zonder_toewijzing_is_gewoon_werkvoorraad(self):
        # Dit is de normale toestand van elk issue op de stapel. Daar mag nooit
        # alarm op komen, anders staat het hele bord vol.
        bevindingen = beoordeel(issues=[issue(120, minuten=60 * 24 * 30)])
        self.assertEqual(bevindingen, [])


class AgentOmgevallen(unittest.TestCase):
    def test_toegewezen_zonder_voorstel_valt_op(self):
        bevindingen = beoordeel(
            issues=[issue(149, minuten=90, toegewezen=["lxdg-agents"])],
        )
        self.assertEqual(len(bevindingen), 1)
        self.assertEqual(bevindingen[0].nummer, 149)

    def test_toegewezen_aan_een_mens_valt_niet_op(self):
        # Een mens werkt op zijn eigen tempo en hoeft geen agentbewaking.
        bevindingen = beoordeel(
            issues=[issue(133, minuten=60 * 24 * 7, toegewezen=["Rraaiimmoonndd"])],
        )
        self.assertEqual(bevindingen, [])

    def test_toegewezen_met_voorstel_valt_niet_op(self):
        bevindingen = beoordeel(
            issues=[issue(149, minuten=90, toegewezen=["lxdg-agents"])],
            voorstellen=[voorstel(183, minuten=5, sluit=[149])],
        )
        self.assertEqual([b for b in bevindingen if b.soort == "issue"], [])


class WachtendeVoorstellen(unittest.TestCase):
    def test_om_wijzigingen_gevraagd_en_daarna_niets(self):
        bevindingen = beoordeel(
            voorstellen=[voorstel(186, minuten=60, oordeel="CHANGES_REQUESTED")],
        )
        self.assertEqual(len(bevindingen), 1)
        self.assertEqual(bevindingen[0].soort, "pull request")

    def test_goedgekeurd_maar_blijft_liggen(self):
        bevindingen = beoordeel(voorstellen=[voorstel(186, minuten=120, oordeel="APPROVED")])
        self.assertEqual(len(bevindingen), 1)
        self.assertIn("goedgekeurd", bevindingen[0].uitleg)

    def test_nog_niet_beoordeeld_valt_niet_op(self):
        # Wacht op de beoordelaar; die is misschien net begonnen. Dat is geen
        # stilstand maar de normale gang van zaken.
        bevindingen = beoordeel(voorstellen=[voorstel(186, minuten=120, oordeel=None)])
        self.assertEqual(bevindingen, [])


class HetBericht(unittest.TestCase):
    def test_het_bericht_is_in_gewone_taal_en_zegt_wat_je_moet_doen(self):
        bevinding = beoordeel(
            issues=[issue(185, minuten=60)],
            voorstellen=[voorstel(186, minuten=60, sluit=[185])],
        )[0]
        bericht = bevinding.bericht
        self.assertIn("Wat je kunt doen", bericht)
        for jargon in ("assignee", "reviewDecision", "CHANGES_REQUESTED", "workflow", "sync"):
            with self.subTest(woord=jargon):
                self.assertNotIn(jargon, bericht)

    def test_de_duur_staat_er_leesbaar_in(self):
        bevinding = beoordeel(
            issues=[issue(185, minuten=135)],
            voorstellen=[voorstel(186, minuten=135, sluit=[185])],
        )[0]
        self.assertIn("2 uur en 15 minuten", bevinding.bericht)

    def test_een_hele_uur_krijgt_geen_nul_minuten(self):
        bevinding = beoordeel(
            issues=[issue(185, minuten=120)],
            voorstellen=[voorstel(186, minuten=120, sluit=[185])],
        )[0]
        self.assertIn("2 uur", bevinding.bericht)
        self.assertNotIn("0 minuten", bevinding.bericht)


class Koppeling(unittest.TestCase):
    def test_verschillende_schrijfwijzen_van_de_koppeling_worden_gevonden(self):
        for tekst in ("Fixes #185", "fixes #185", "Closes #185", "resolved: #185"):
            with self.subTest(tekst=tekst):
                self.assertEqual(bewaker.gekoppelde_issues("", tekst), [185])

    def test_een_los_nummer_telt_niet_als_koppeling(self):
        # "zie #185" sluit niets; anders zou elke verwijzing werk claimen.
        self.assertEqual(bewaker.gekoppelde_issues("", "zie #185 voor de achtergrond"), [])


class Werkschema(unittest.TestCase):
    """De bewaker moet ook echt aanstaan; een script dat nergens draait, bewaakt niets."""

    def setUp(self):
        self.werkschema = (ROOT / ".github/workflows/vastgelopen-werk.yml").read_text(
            encoding="utf-8"
        )

    def test_de_bewaker_draait_op_een_tijdschema(self):
        self.assertIn("schedule:", self.werkschema)
        self.assertIn("cron:", self.werkschema)

    def test_de_bewaker_is_ook_met_de_hand_te_starten(self):
        # Anders kun je hem niet uitproberen zonder een half uur te wachten.
        self.assertIn("workflow_dispatch:", self.werkschema)

    def test_het_werkschema_roept_het_script_echt_aan(self):
        self.assertIn("meld-vastgelopen-werk.py", self.werkschema)

    def test_de_bewaker_mag_etiketten_zetten(self):
        # Zonder schrijfrecht op issues doet hij stil niets, en dat ziet er
        # precies zo groen uit als werk dat wel gebeurt.
        self.assertIn("issues: write", self.werkschema)
        self.assertIn("pull-requests: write", self.werkschema)


if __name__ == "__main__":
    unittest.main(verbosity=2)
