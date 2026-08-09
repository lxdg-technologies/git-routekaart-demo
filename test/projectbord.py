#!/usr/bin/env python3
"""Gedragstests voor de ProjectV2-synchronisatie (geen GitHub-mutaties)."""
import importlib.util
import sys
import unittest
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
        self.mutations = []

    def project(self):
        return self.project_data()

    def project_data(self):
        values = [{"field": {"name": "Status"}, "name": self.current}]
        # Dit veld staat opzettelijk naast Status: synchronisatie mag het nooit raken.
        values.append({"field": {"name": "Omgeving"}, "name": "test"})
        return {
            "id": "project-1",
            "fields": {"nodes": [{"id": "status-field", "name": "Status", "options": [
                {"id": "backlog", "name": "Backlog"}, {"id": "ready", "name": "Ready"},
                {"id": "progress", "name": "In progress"}, {"id": "review", "name": "In review"},
                {"id": "done", "name": "Done"},
            ]}]},
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

    def archive(self, project, item):
        self.mutations.append(("archive", item))


class ProjectBoardTests(unittest.TestCase):
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

    def test_open_pr_met_review_gaat_idempotent_naar_in_review(self):
        client = FakeGitHub(None)
        client.issue_states = None
        client.rest = lambda path, **kwargs: (
            [{"number": 74, "state": "open"}] if "/issues?" in path else
            [{"number": 10, "state": "open", "merged_at": None, "title": "Werk #74", "body": ""}] if "/pulls?" in path else
            [] if "/branches?" in path else
            ({"users": [{"login": "reviewer"}], "teams": []} if "requested_reviewers" in path else [])
        )
        projectbord.sync(client, project=client.project_data())
        projectbord.sync(client, project=client.project_data())
        self.assertEqual(client.mutations, [("status", "review")])

    def test_gemerged_pr_is_done_en_gesloten_pr_wordt_gearchiveerd(self):
        self.assertEqual(projectbord.target_status(projectbord.IssueState(74, "closed", False, False, False, True, False)), "Done")
        self.assertEqual(projectbord.target_status(projectbord.IssueState(74, "closed", False, False, False, False, True)), "ARCHIVE")

    def test_ontbrekende_statusoptie_is_duidelijke_fout(self):
        client = FakeGitHub(None)
        project = client.project_data()
        project["fields"]["nodes"][0]["options"] = [{"id": "backlog", "name": "Backlog"}]
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
        sync_job = workflow.split("  synchroniseer:\n", 1)[1]
        sync_job = sync_job.split("\n  ", 1)[0]
        for event in ("opened", "synchronize", "reopened", "closed", "pull_request_review"):
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
        self.assertIn("permission-organization-projects: write", token_config)
        self.assertIn("Laat een organisatiebeheerder", workflow)


if __name__ == "__main__":
    unittest.main(verbosity=2)
