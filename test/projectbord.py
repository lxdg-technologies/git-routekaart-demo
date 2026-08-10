#!/usr/bin/env python3
"""Gedragstests voor de ProjectV2-synchronisatie (geen GitHub-mutaties)."""
import importlib.util
import io
import sys
import unittest
from unittest.mock import patch
from urllib.error import HTTPError
from pathlib import Path

ROOT = Path(__file__).parents[1]
spec = importlib.util.spec_from_file_location("projectbord", ROOT / ".github/scripts/synchroniseer-projectbord.py")
if spec is None or spec.loader is None:
    raise RuntimeError("kan synchronisatiescript niet laden")
projectbord = importlib.util.module_from_spec(spec)
sys.modules[spec.name] = projectbord
spec.loader.exec_module(projectbord)


class FakeGitHub:
    def __init__(self, issue_states, current="Backlog"):
        self.issue_states = issue_states
        self.current = current
        self.environment = "Geen omgeving"
        self.mutations = []

    def project(self):
        return self.project_data()

    def project_data(self):
        values = [{"field": {"name": "Status"}, "name": self.current}]
        # Dit veld staat opzettelijk naast Status: synchronisatie mag het nooit raken.
        values.append({"field": {"name": "Omgeving"}, "name": self.environment})
        return {
            "id": "project-1",
            "statusField": {"id": "status-field", "name": "Status", "options": [
                {"id": "backlog", "name": "Backlog"}, {"id": "ready", "name": "Ready"},
                {"id": "progress", "name": "In progress"}, {"id": "review", "name": "In review"},
                {"id": "done", "name": "Done"},
            ]},
            "environmentField": {"id": "environment-field", "name": "Omgeving", "options": [
                {"id": "none", "name": "Geen omgeving"}, {"id": "dev", "name": "Ontwikkel"},
                {"id": "test", "name": "Test"}, {"id": "live", "name": "Live"},
            ]},
            "items": {"nodes": [{"id": "item-1", "isArchived": False,
                "content": {"number": 74, "repository": {"nameWithOwner": projectbord.REPOSITORY}},
                "fieldValues": {"nodes": values}}]},
        }

    def rest(self, path, **kwargs):
        if "/issues?" in path:
            return [{"number": 74, "state": "open"}]
        if "/pulls?" in path:
            return []
        if "/branches?" in path:
            return []
        raise AssertionError(f"onverwachte API-call: {path}")

    def mutate_status(self, project, item, field, option):
        self.mutations.append(("status", option))
        self.current = {"progress": "In progress", "review": "In review", "done": "Done"}[option]

    def mutate_environment(self, project, item, field, option):
        self.mutations.append(("environment", option))
        self.environment = {
            "none": "Geen omgeving", "dev": "Ontwikkel", "test": "Test", "live": "Live"
        }[option]

    def archive(self, project, item):
        self.mutations.append(("archive", item))

    def add_label(self, number, label):
        self.mutations.append(("add-label", number, label))

    def remove_label(self, number, label):
        self.mutations.append(("remove-label", number, label))


class FakePullRequestGitHub(FakeGitHub):
    def project_data(self):
        project = super().project_data()
        project["items"]["nodes"][0]["content"] = {
            "__typename": "PullRequest",
            "number": 83,
            "repository": {"nameWithOwner": projectbord.REPOSITORY},
        }
        return project

    def rest(self, path, **kwargs):
        if "/issues?" in path:
            return [{"number": 74, "state": "closed", "labels": [{"name": "soort:github"}]}]
        if "/pulls?" in path:
            return [{"number": 83, "state": "closed", "merged_at": "2026-08-10T10:00:00Z",
                     "title": "Werk", "body": "Fixes #74", "labels": []}]
        if "/branches?" in path:
            return []
        if "/pulls/" in path:
            return []
        raise AssertionError(f"onverwachte API-call: {path}")


class ProjectBoardTests(unittest.TestCase):
    def test_http_fout_benoemt_de_geweigerde_bron(self):
        error = HTTPError("https://api.github.com/repos/example", 403, "Forbidden", None, io.BytesIO(
            b'{"message":"geen toegang"}'
        ))
        with patch.object(projectbord, "urlopen", side_effect=error):
            with self.assertRaisesRegex(RuntimeError, r"repositorygegevens.*geen toegang"):
                projectbord.GitHub("geheim-token").rest("/repos/example/issues")

    def test_http_fout_toont_status_en_volledig_github_antwoord_zonder_token(self):
        error = HTTPError("https://api.github.com/graphql", 403, "Forbidden", None, io.BytesIO(
            b'{"message":"Resource not accessible by integration"}'
        ))
        with patch.object(projectbord, "urlopen", side_effect=error):
            with self.assertRaisesRegex(RuntimeError, r"HTTP 403 Forbidden.*Resource not accessible by integration") as caught:
                projectbord.GitHub("geheim-token").rest("/repos/lxdg-technologies/git-routekaart-demo/issues")
        self.assertNotIn("geheim-token", str(caught.exception))

    def test_graphql_foutmeldingen_worden_volledig_getoond(self):
        payload = {"errors": [{"message": "geen toegang"}, {"message": "project niet gevonden"}]}

        class Response:
            def __enter__(self):
                return self

            def __exit__(self, *args):
                return False

            def read(self):
                import json
                return json.dumps(payload).encode()

        with patch.object(projectbord, "urlopen", return_value=Response()):
            with self.assertRaisesRegex(RuntimeError, "geen toegang; project niet gevonden"):
                projectbord.GitHub("geheim-token").graphql("query { viewer { login } }")

    def test_statusregels_hebben_de_juiste_voorrang(self):
        cases = [
            (projectbord.IssueState(1, "open", False, False, False, False, False), None),
            (projectbord.IssueState(1, "open", False, False, False, False, False), None),
            (projectbord.IssueState(1, "open", True, False, False, False, False), "In progress"),
            (projectbord.IssueState(1, "open", False, True, True, False, False), "In review"),
            (projectbord.IssueState(1, "open", False, True, False, True, False), "Done"),
            (projectbord.IssueState(1, "closed", False, False, False, False, True), "ARCHIVE"),
            (projectbord.IssueState(1, "open", False, True, True, True, False), "Done"),
        ]
        for state, expected in cases:
            with self.subTest(state=state):
                self.assertEqual(projectbord.target_status(state), expected)

    def test_ready_blijft_staan_en_omgeving_wordt_nooit_gemuteerd(self):
        client = FakeGitHub(None, current="Ready")
        projectbord.sync(client, project=client.project_data())
        self.assertEqual(client.mutations, [])

    def test_github_werk_is_live_na_merge_en_routekaart_blijft_test(self):
        github = projectbord.IssueState(89, "closed", False, False, False, True, False, frozenset({"soort:github"}))
        routekaart = projectbord.IssueState(87, "closed", False, False, False, True, False, frozenset({"soort:routekaart"}))
        self.assertEqual(projectbord.target_environment(github), "Live")
        self.assertEqual(projectbord.target_environment(routekaart), "Test")

    def test_pull_request_routekaart_kan_live_zijn_op_basis_van_merge_commit(self):
        routekaart = projectbord.PullRequestState(88, False, False, True, False, frozenset(),
                                                  frozenset({"soort:routekaart"}), "merge-sha")
        self.assertEqual(projectbord.target_pr_environment(routekaart, live_commit_sha="live-sha", compare_status="identical"), "Live")
        self.assertEqual(projectbord.target_pr_environment(routekaart, live_commit_sha="live-sha", compare_status="behind"), "Test")

    def test_onbekende_liveversie_kan_nooit_live_worden(self):
        routekaart_issue = projectbord.IssueState(88, "closed", False, False, False, True, False,
                                                  frozenset({"soort:routekaart"}), "merge-sha")
        routekaart_pr = projectbord.PullRequestState(89, False, False, True, False, frozenset(),
                                                     frozenset({"soort:routekaart"}), "merge-sha")
        self.assertEqual(projectbord.target_environment(routekaart_issue, live_commit_sha=None, compare_status="identical"), "Test")
        self.assertEqual(projectbord.target_pr_environment(routekaart_pr, live_commit_sha="", compare_status="ahead"), "Test")

    def test_liveversiefout_laat_synchronisatie_doorgaan(self):
        client = FakeGitHub(None)
        with patch.object(projectbord, "_live_commit_sha", wraps=projectbord._live_commit_sha) as read_live:
            projectbord.sync(client, project=client.project_data())
        read_live.assert_called_once_with(client)
        self.assertEqual(client.mutations, [])

    def test_pull_request_volgt_soort_omgeving_en_status(self):
        github = projectbord.PullRequestState(83, False, False, True, False, frozenset(), frozenset({"soort:github"}))
        routekaart = projectbord.PullRequestState(88, False, False, True, False, frozenset(), frozenset({"soort:routekaart"}))
        self.assertEqual(projectbord.target_pr_status(github), "Done")
        self.assertEqual(projectbord.target_pr_environment(github), "Live")
        self.assertEqual(projectbord.target_pr_environment(routekaart), "Test")

    def test_pull_request_kan_bestaand_handmatig_soortlabel_gebruiken_voor_omgeving(self):
        github = projectbord.PullRequestState(29, False, False, True, False,
                                              frozenset({"soort:github"}), frozenset())
        routekaart = projectbord.PullRequestState(47, False, False, True, False,
                                                  frozenset({"soort:routekaart"}), frozenset())
        self.assertEqual(projectbord.target_pr_environment(github), "Live")
        self.assertEqual(projectbord.target_pr_environment(routekaart), "Test")

    def test_pull_request_met_andere_issue_labels_gebruikt_eigen_soortlabel_voor_live(self):
        pull_request = projectbord.PullRequestState(99, False, False, True, False,
                                                    frozenset({"soort:github"}),
                                                    frozenset({"documentatie"}))
        self.assertEqual(projectbord.target_pr_environment(pull_request), "Live")

    def test_reviewstatussen_bepalen_de_status_van_openstaand_werk(self):
        self.assertEqual(projectbord.target_status(projectbord.IssueState(1, "open", False, True, "CHANGES_REQUESTED", False, False)), "In progress")
        self.assertEqual(projectbord.target_status(projectbord.IssueState(1, "open", False, True, "APPROVED", False, False)), "In review")
        self.assertEqual(projectbord.target_status(projectbord.IssueState(1, "open", False, True, True, False, False)), "In review")
        self.assertEqual(projectbord.target_status(projectbord.IssueState(1, "open", False, True, False, False, False)), "In progress")

    def test_laatste_review_overschrijft_oudere_afkeuring(self):
        class ReviewsClient:
            def rest(self, path, **kwargs):
                return [
                    {"state": "CHANGES_REQUESTED", "submitted_at": "2026-08-10T10:00:00Z", "commit_id": "old"},
                    {"state": "APPROVED", "submitted_at": "2026-08-10T11:00:00Z", "commit_id": "new"},
                ]

        self.assertEqual(projectbord._latest_review_status(ReviewsClient(), 82, requested=False), "APPROVED")

    def test_pull_request_zonder_beoordeling_is_in_progress_en_met_beoordeling_in_review(self):
        self.assertEqual(projectbord.target_pr_status(projectbord.PullRequestState(1, True, False, False, False)), "In progress")
        self.assertEqual(projectbord.target_pr_status(projectbord.PullRequestState(1, True, True, False, False)), "In review")
        self.assertEqual(projectbord.target_pr_status(projectbord.PullRequestState(1, False, False, False, True)), "Done")

    def test_pull_request_krijgt_label_van_gekoppeld_issue_en_logt_omgeving(self):
        client = FakePullRequestGitHub(None)
        actions = projectbord.sync(client, project=client.project_data())
        self.assertIn(("environment", "live"), client.mutations)
        self.assertIn(("add-label", 83, "soort:github"), client.mutations)
        self.assertIn("pull request #83: Geen omgeving → Live", actions)
        self.assertIn("pull request #83: label soort:github toegevoegd", actions)

    def test_pull_request_zonder_bron_verwijdert_geen_bestaand_soortlabel(self):
        for body in ("Geen koppeling", "Fixes #74"):
            with self.subTest(body=body):
                client = FakePullRequestGitHub(None)
                client.rest = lambda path, body=body, **kwargs: (
                    [{"number": 74, "state": "open"}] if "/issues?" in path else
                    [{"number": 83, "state": "closed", "merged_at": "2026-08-10T10:00:00Z",
                      "title": "Werk", "body": body, "labels": [{"name": "soort:github"}]}]
                    if "/pulls?" in path else []
                )
                if body == "Fixes #74":
                    client.rest = lambda path, **kwargs: (
                        [{"number": 74, "state": "open", "labels": []}] if "/issues?" in path else
                        [{"number": 83, "state": "closed", "merged_at": "2026-08-10T10:00:00Z",
                          "title": "Werk", "body": body, "labels": [{"name": "soort:github"}]}]
                        if "/pulls?" in path else []
                    )
                actions = projectbord.sync(client, project=client.project_data())
                self.assertNotIn(("remove-label", 83, "soort:github"), client.mutations)
                self.assertFalse(any("label soort:github verwijderd" in action for action in actions))

    def test_koppeling_volgt_sluitwoord_in_pr_tekst(self):
        self.assertEqual(projectbord._linked_issue_number({"title": "Werk", "body": "Fixes #96"}), 96)
        self.assertIsNone(projectbord._linked_issue_number({"title": "Werk", "body": "Zie #96"}))
        self.assertTrue(projectbord._references_issue({"title": "Werk", "body": "Fixes #96"}, 96))
        self.assertFalse(projectbord._references_issue({"title": "Werk", "body": "Zie #96"}, 96))

    def test_ontbrekend_soortlabel_is_geen_fout(self):
        issue = projectbord.IssueState(1, "open", True, False, False, False, False)
        self.assertEqual(projectbord.target_environment(issue), "Ontwikkel")

    def test_bestaande_livepromotie_van_routekaart_blijft_staan(self):
        client = FakeGitHub(None)
        client.environment = "Live"
        projectbord.sync(client, project=client.project_data())
        self.assertEqual(client.mutations, [])

    def test_open_pr_met_review_gaat_idempotent_naar_in_review(self):
        client = FakeGitHub(None)
        client.issue_states = None
        client.rest = lambda path, **kwargs: (
            [{"number": 74, "state": "open"}] if "/issues?" in path else
            [{"number": 10, "state": "open", "merged_at": None, "title": "Werk", "body": "Fixes #74"}] if "/pulls?" in path else
            [] if "/branches?" in path else
            ({"users": [{"login": "reviewer"}], "teams": []} if "requested_reviewers" in path else [])
        )
        projectbord.sync(client, project=client.project_data())
        projectbord.sync(client, project=client.project_data())
        self.assertEqual(client.mutations, [("status", "review"), ("environment", "dev")])

    def test_gemerged_pr_is_done_en_gesloten_pr_wordt_gearchiveerd(self):
        self.assertEqual(projectbord.target_status(projectbord.IssueState(74, "closed", False, False, False, True, False)), "Done")
        self.assertEqual(projectbord.target_status(projectbord.IssueState(74, "closed", False, False, False, False, True)), "ARCHIVE")

    def test_ontbrekende_statusoptie_is_duidelijke_fout(self):
        client = FakeGitHub(None)
        project = client.project_data()
        project["statusField"]["options"] = [{"id": "backlog", "name": "Backlog"}]
        with self.assertRaisesRegex(RuntimeError, "statusoptie"):
            projectbord.sync(client, project=project)

    def test_workflow_heeft_geen_review_actor_of_pr_head_in_syncpad(self):
        workflow = (ROOT / ".github/workflows/synchroniseer-projectbord.yml").read_text()
        self.assertIn("pull_request_review:", workflow)
        self.assertIn("if: github.event_name == 'pull_request_review'", workflow)
        self.assertNotIn("github.event.review.user.login", workflow)
        self.assertNotIn("github.event.pull_request.head.sha", workflow)

    def test_workflow_start_synchronisatie_bij_alle_werkrelevante_events(self):
        workflow = (ROOT / ".github/workflows/synchroniseer-projectbord.yml").read_text()
        self.assertIn("types: [opened, synchronize, reopened, closed]", workflow)
        self.assertIn("types: [submitted, dismissed]", workflow)
        self.assertIn("types: [opened, edited, labeled, unlabeled, closed, reopened]", workflow)
        sync_job = workflow.split("  synchroniseer:\n", 1)[1]
        sync_job = sync_job.split("\n  ", 1)[0]
        for event in ("opened", "synchronize", "reopened", "closed", "pull_request_review", "issues"):
            with self.subTest(event=event):
                self.assertIn(event, sync_job)
        self.assertIn("github.event.action == 'closed'", sync_job)
        self.assertNotIn("github.event.pull_request.merged == true", sync_job)

    def test_muterende_job_draait_alleen_vertrouwde_main_bron(self):
        workflow = (ROOT / ".github/workflows/synchroniseer-projectbord.yml").read_text()
        sync_job = workflow.split("  synchroniseer:\n", 1)[1]
        self.assertNotIn("github.event.pull_request.head.sha", sync_job)
        self.assertNotIn("github.event.pull_request.head.ref", sync_job)
        self.assertIn("ref: main", sync_job)
        self.assertIn("sparse-checkout: .github/scripts/synchroniseer-projectbord.py", sync_job)
        self.assertEqual(sync_job.count("python3 .github/scripts/synchroniseer-projectbord.py"), 1)

    def test_workflow_voer_review_valideert_en_sync_alleen_veilige_events(self):
        workflow = (ROOT / ".github/workflows/synchroniseer-projectbord.yml").read_text()
        self.assertIn("pull_request_review:", workflow)
        self.assertIn("if: github.event_name == 'pull_request_review'", workflow)
        self.assertIn("if: github.event_name == 'workflow_dispatch' || github.event_name == 'schedule'", workflow)
        self.assertIn("github.event.action == 'closed'", workflow)
        self.assertNotIn("github.event.pull_request.merged == true", workflow)
        self.assertEqual(workflow.count("python3 .github/scripts/synchroniseer-projectbord.py"), 1)
        self.assertNotIn("github.event.review.user.login", workflow)
        self.assertNotIn("github.event.pull_request.head.sha", workflow)
        self.assertIn("ref: main", workflow)

    def test_workflowtoken_heeft_organisatieprojectbereik_en_minimale_rechten(self):
        workflow = (ROOT / ".github/workflows/synchroniseer-projectbord.yml").read_text()
        token_config = workflow.split("      - name: Maak token voor lxdg-dcs-planner", 1)[1]
        token_config = token_config.split("      - name: Checkout scripts van main", 1)[0]
        self.assertIn("owner: lxdg-technologies", token_config)
        self.assertNotIn("repositories:", token_config)
        self.assertIn("permission-metadata: read", token_config)
        self.assertIn("permission-issues: write", token_config)
        self.assertIn("permission-pull-requests: write", token_config)
        self.assertIn("permission-organization-projects: write", token_config)

    def test_workflow_vertaalt_niet_elke_fout_naar_bordrechten(self):
        workflow = (ROOT / ".github/workflows/synchroniseer-projectbord.yml").read_text()
        self.assertNotIn("De Planner-App-token heeft geen toegang tot organisatieproject 2", workflow)


if __name__ == "__main__":
    unittest.main(verbosity=2)
