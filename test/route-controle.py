#!/usr/bin/env python3
"""Gedragstests voor de routecontrole (geen GitHub-aanroepen).

Elke regel wordt zowel groen als rood getest. Een controle die alleen op zijn
goede geval is getest, kan stil niets doen — dat is hier eerder gebeurd met een
kwaliteitspoort die groen stond op de verkeerde vraag.
"""
import importlib.util
import json
import os
import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

ROOT = Path(__file__).parents[1]
spec = importlib.util.spec_from_file_location("route_controle", ROOT / ".github/scripts/route-controle.py")
if spec is None or spec.loader is None:
    raise RuntimeError("kan routecontrolescript niet laden")
route = importlib.util.module_from_spec(spec)
sys.modules[spec.name] = route
spec.loader.exec_module(route)


class RaaktGedrag(unittest.TestCase):
    def test_de_simulatiepagina_is_gedrag(self):
        self.assertTrue(route.raakt_gedrag("index.html"))

    def test_tests_werkschemas_en_scripts_zijn_gedrag(self):
        for pad in ("test/smoketest.js", "test/checks/kaart.js",
                    ".github/workflows/quality.yml", ".github/scripts/bepaal-versie.sh"):
            with self.subTest(pad=pad):
                self.assertTrue(route.raakt_gedrag(pad))

    def test_tekst_eromheen_is_geen_gedrag(self):
        for pad in ("AGENTS.md", "WERKWIJZE.md", "README.md",
                    ".github/PULL_REQUEST_TEMPLATE.md", ".github/REVIEW.md"):
            with self.subTest(pad=pad):
                self.assertFalse(route.raakt_gedrag(pad))

    def test_een_gelijknamig_bestand_elders_is_geen_gedrag(self):
        # index.html geldt alleen in de wortel; een toevallige naamgenoot in een
        # andere map mag de sneltrein niet blokkeren.
        self.assertFalse(route.raakt_gedrag("docs/index.html"))

    def test_een_maplijkende_naam_is_geen_gedrag(self):
        # "testplan.md" begint met "test" maar zit niet in de map test/.
        self.assertFalse(route.raakt_gedrag("testplan.md"))


class Koppeling(unittest.TestCase):
    def test_vindt_het_gesloten_issue(self):
        for tekst in ("Fixes #164", "fixes #164", "Closes #164", "resolved #164"):
            with self.subTest(tekst=tekst):
                self.assertEqual(route.gekoppeld_issue("", tekst), 164)

    def test_vindt_de_koppeling_ook_in_de_titel(self):
        self.assertEqual(route.gekoppeld_issue("fix: iets (Fixes #7)", ""), 7)

    def test_een_losse_verwijzing_is_geen_koppeling(self):
        # "zie #164" koppelt niet; het bord doet dat ook niet.
        self.assertIsNone(route.gekoppeld_issue("", "zie #164 voor context"))


class SoortLabelRegel(unittest.TestCase):
    def test_soort_op_de_pull_request_is_genoeg(self):
        self.assertEqual(route.controleer(["soort:github"], [], ["AGENTS.md"]), [])

    def test_soort_op_het_gekoppelde_issue_is_genoeg(self):
        # Het bord leest het soort van het issue; Coder krijgt zijn PR-label pas
        # ná de synchronisatie. Zou de controle dat niet accepteren, dan faalde
        # elke correcte Coder-PR bij het openen.
        self.assertEqual(route.controleer([], ["soort:routekaart"], ["index.html"]), [])

    def test_zonder_soort_faalt_het(self):
        problemen = route.controleer(["van:rob"], [], ["AGENTS.md"])
        self.assertEqual(len(problemen), 1)
        self.assertIn("Geen soort:-label", problemen[0])

    def test_twee_soorten_falen_ook(self):
        problemen = route.controleer(["soort:github", "soort:routekaart"], [], ["AGENTS.md"])
        self.assertEqual(len(problemen), 1)
        self.assertIn("Meer dan één soort:-label", problemen[0])

    def test_het_issue_wint_van_de_pull_request(self):
        # Dezelfde voorrang als het bord: staat het soort op het issue, dan is
        # een afwijkend label op de PR niet ineens een tweede soort.
        self.assertEqual(route.controleer(["soort:github"], ["soort:routekaart"], ["AGENTS.md"]), [])


class SneltreinRegel(unittest.TestCase):
    def test_sneltrein_met_alleen_tekst_mag(self):
        problemen = route.controleer(
            ["route:sneltrein", "soort:github"], [],
            ["AGENTS.md", ".github/PULL_REQUEST_TEMPLATE.md"],
        )
        self.assertEqual(problemen, [])

    def test_sneltrein_die_de_pagina_raakt_faalt(self):
        problemen = route.controleer(["route:sneltrein", "soort:routekaart"], [], ["index.html"])
        self.assertEqual(len(problemen), 1)
        self.assertIn("verandert gedrag", problemen[0])
        self.assertIn("index.html", problemen[0])

    def test_sneltrein_die_een_werkschema_raakt_faalt(self):
        problemen = route.controleer(
            ["route:sneltrein", "soort:github"], [],
            ["AGENTS.md", ".github/workflows/quality.yml"],
        )
        self.assertEqual(len(problemen), 1)
        self.assertIn(".github/workflows/quality.yml", problemen[0])

    def test_sneltrein_die_een_test_raakt_faalt(self):
        problemen = route.controleer(["route:sneltrein", "soort:github"], [], ["test/smoketest.js"])
        self.assertEqual(len(problemen), 1)

    def test_sneltrein_die_een_script_raakt_faalt(self):
        problemen = route.controleer(
            ["route:sneltrein", "soort:github"], [], [".github/scripts/route-controle.py"],
        )
        self.assertEqual(len(problemen), 1)

    def test_dezelfde_wijziging_mag_wel_via_de_bouwroute(self):
        # Zonder het sneltreinlabel is index.html volstrekt normaal werk.
        self.assertEqual(route.controleer(["soort:routekaart"], [], ["index.html"]), [])

    def test_beide_regels_kunnen_samen_falen(self):
        problemen = route.controleer(["route:sneltrein"], [], ["index.html"])
        self.assertEqual(len(problemen), 2)


class FakeGitHub:
    """Vervangt de echte GitHub-aanroepen; geeft terug wat de test wil zien."""

    def __init__(self, bestanden, issue_labels=None):
        self._bestanden = bestanden
        self._issue_labels = issue_labels or []

    def bestanden(self, nummer):
        return list(self._bestanden)

    def issue_labels(self, nummer):
        return list(self._issue_labels)


class Uitvoering(unittest.TestCase):
    """De hele stap zoals hij in het werkschema draait, zonder netwerk."""

    def _draai(self, payload, *, bestanden, issue_labels=None, token="x"):
        with tempfile.NamedTemporaryFile("w", suffix=".json", delete=False, encoding="utf-8") as bestand:
            json.dump(payload, bestand)
            pad = bestand.name
        omgeving = {"GITHUB_EVENT_PATH": pad}
        if token is not None:
            omgeving["GITHUB_TOKEN"] = token
        try:
            with patch.dict(os.environ, omgeving, clear=True), \
                 patch.object(route, "GitHub", lambda *a, **k: FakeGitHub(bestanden, issue_labels)):
                return route.main()
        finally:
            os.unlink(pad)

    @staticmethod
    def _payload(labels, *, nummer=1, titel="iets", tekst=""):
        return {
            "pull_request": {
                "number": nummer,
                "title": titel,
                "body": tekst,
                "labels": [{"name": naam} for naam in labels],
            },
            "repository": {"full_name": "lxdg-technologies/git-routekaart-demo"},
        }

    def test_een_kloppende_pull_request_slaagt(self):
        code = self._draai(self._payload(["soort:github"]), bestanden=["AGENTS.md"])
        self.assertEqual(code, 0)

    def test_een_sneltrein_die_gedrag_raakt_faalt(self):
        code = self._draai(
            self._payload(["route:sneltrein", "soort:github"]), bestanden=["index.html"],
        )
        self.assertEqual(code, 1)

    def test_geen_bestanden_is_geen_groen(self):
        # De belangrijkste test: als de controle zijn gegevens niet kan
        # vaststellen, mag hij niet slagen. Een pull request zonder gewijzigde
        # bestanden bestaat niet.
        code = self._draai(self._payload(["soort:github"]), bestanden=[])
        self.assertEqual(code, 1)

    def test_zonder_token_is_geen_groen(self):
        code = self._draai(self._payload(["soort:github"]), bestanden=["AGENTS.md"], token=None)
        self.assertEqual(code, 1)

    def test_zonder_gebeurtenis_is_geen_groen(self):
        with patch.dict(os.environ, {"GITHUB_TOKEN": "x"}, clear=True):
            self.assertEqual(route.main(), 1)

    def test_een_gebeurtenis_zonder_pull_request_is_geen_groen(self):
        code = self._draai({"repository": {"full_name": "a/b"}}, bestanden=["AGENTS.md"])
        self.assertEqual(code, 1)

    def test_het_soort_mag_van_het_gekoppelde_issue_komen(self):
        code = self._draai(
            self._payload([], tekst="Fixes #164"),
            bestanden=["index.html"], issue_labels=["soort:github"],
        )
        self.assertEqual(code, 0)


class Werkschema(unittest.TestCase):
    """De controle moet echt aanstaan, niet alleen bestaan."""

    def setUp(self):
        self.quality = (ROOT / ".github/workflows/quality.yml").read_text(encoding="utf-8")

    def test_de_tests_draaien_in_de_verplichte_poort(self):
        self.assertIn("python3 test/route-controle.py", self.quality)

    def test_de_controle_zelf_draait_in_de_verplichte_poort(self):
        self.assertIn("python3 .github/scripts/route-controle.py", self.quality)

    def test_de_controle_draait_alleen_bij_een_pull_request(self):
        # Op een push naar main is er geen pull request; zonder deze voorwaarde
        # zou de poort daar altijd rood staan.
        stap = self.quality.split("Routecontrole op deze pull request", 1)[1]
        stap = stap.split("- name:", 1)[0]
        self.assertIn("github.event_name == 'pull_request'", stap)
        self.assertIn("GITHUB_TOKEN", stap)

    def test_de_poort_draait_op_pull_requests_naar_main(self):
        self.assertIn("pull_request:", self.quality)
        self.assertIn("branches: [main]", self.quality)


if __name__ == "__main__":
    unittest.main(verbosity=2)
