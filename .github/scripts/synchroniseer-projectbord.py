#!/usr/bin/env python3
"""Synchroniseer issue-kaarten met ProjectV2, zonder automatische velden te wijzigen."""
from __future__ import annotations

import json
import base64
import os
import re
import sys
from dataclasses import dataclass
from typing import Any
from urllib.error import HTTPError
from urllib.request import Request, urlopen

REPOSITORY = "lxdg-technologies/git-routekaart-demo"
ORGANIZATION = "lxdg-technologies"
PROJECT_NUMBER = 2
STATUS_FIELD_NAME = "Status"
STATUSES = {"In progress", "In review", "Done"}
ENVIRONMENT_FIELD_NAME = "Omgeving"
ENVIRONMENTS = {"Geen omgeving", "Ontwikkel", "Test", "Live"}


@dataclass(frozen=True)
class IssueState:
    number: int
    state: str
    branch: bool
    open_pr: bool
    review: str | bool
    merged_pr: bool
    closed_unmerged_pr: bool
    labels: frozenset[str] = frozenset()
    merge_commit_sha: str | None = None


@dataclass(frozen=True)
class PullRequestState:
    number: int
    open_pr: bool
    review: str | bool
    merged_pr: bool
    closed_unmerged_pr: bool
    labels: frozenset[str] = frozenset()
    linked_issue_labels: frozenset[str] = frozenset()
    merge_commit_sha: str | None = None


def target_status(issue: IssueState) -> str | None:
    """Return only an automatic transition; None means leave the card alone."""
    if issue.merged_pr:
        return "Done"
    if issue.closed_unmerged_pr and not issue.open_pr:
        return "ARCHIVE"
    if issue.open_pr:
        if issue.review == "CHANGES_REQUESTED":
            return "In progress"
        if issue.review:
            return "In review"
    if issue.branch or issue.open_pr:
        return "In progress"
    return None


def target_environment(issue: IssueState, *, live_commit_sha: str | None = None,
                       compare_status: str | None = None) -> str:
    """Return the environment for the issue's kind of work."""
    if "soort:gittooling" in issue.labels:
        return "Live" if issue.merged_pr else "Geen omgeving"
    if issue.merged_pr:
        return "Live" if live_commit_sha and compare_status in {"ahead", "identical"} else "Test"
    if issue.branch or issue.open_pr:
        return "Ontwikkel"
    return "Geen omgeving"


def target_pr_status(pr: PullRequestState) -> str:
    if pr.merged_pr or pr.closed_unmerged_pr:
        return "Done"
    if pr.review == "CHANGES_REQUESTED":
        return "In progress"
    if pr.review:
        return "In review"
    return "In progress"


def _soort_labels(labels: frozenset[str]) -> frozenset[str]:
    return frozenset(label for label in labels if label in ("soort:routekaart", "soort:gittooling"))


def target_pr_environment(pr: PullRequestState, *, live_commit_sha: str | None = None,
                          compare_status: str | None = None) -> str:
    # A manually assigned PR label is a valid source for the environment when
    # there is no usable kind label on the linked issue.  The linked issue
    # remains the only source for changing PR kind labels below.
    labels = _soort_labels(pr.linked_issue_labels) or _soort_labels(pr.labels)
    if "soort:gittooling" in labels:
        return "Live" if pr.merged_pr else "Geen omgeving"
    if pr.merged_pr:
        return "Live" if live_commit_sha and compare_status in {"ahead", "identical"} else "Test"
    return "Geen omgeving" if pr.closed_unmerged_pr else ("Ontwikkel" if pr.open_pr else "Geen omgeving")


def _references_issue(pr: dict[str, Any], number: int) -> bool:
    text = f"{pr.get('title', '')}\n{pr.get('body', '')}"
    return bool(re.search(rf"(?<!\d)(?:#|issues/)({number})(?!\d)", text, re.I))


def _linked_issue_number(pr: dict[str, Any]) -> int | None:
    text = f"{pr.get('title', '')}\n{pr.get('body', '')}"
    match = re.search(r"\b(?:close[sd]?|fix(?:e[sd])?|resolve[sd]?)\s+#(\d+)\b", text, re.I)
    return int(match.group(1)) if match else None


def _latest_review_status(client: Any, number: int, *, requested: bool) -> str | bool:
    """Return the effective review state, with a request as the fallback.

    GitHub returns reviews in review history order.  Use the submitted timestamp
    when present and keep the response order as the tie-breaker, so an older
    review cannot overwrite a newer review.
    """
    reviews = client.rest(f"/repos/{REPOSITORY}/pulls/{number}/reviews")
    submitted = [
        (index, review)
        for index, review in enumerate(reviews or [])
        if review.get("state") and review.get("state") != "PENDING"
    ]
    if not submitted:
        return True if requested else False
    _, latest = max(
        submitted,
        key=lambda pair: (pair[1].get("submitted_at") or "", pair[0]),
    )
    return latest["state"]


class GitHub:
    def __init__(self, token: str, repository: str = REPOSITORY):
        self.token = token
        self.repository = repository

    def rest(
        self,
        path: str,
        *,
        accept: str = "application/vnd.github+json",
        method: str = "GET",
        data: dict[str, Any] | None = None,
    ) -> Any:
        request = Request(
            "https://api.github.com" + path,
            data=json.dumps(data).encode() if data is not None else None,
            method=method,
            headers={
                "Authorization": f"Bearer {self.token}",
                "Accept": accept,
                "Content-Type": "application/json",
            },
        )
        try:
            with urlopen(request) as response:
                body = response.read()
                return json.loads(body) if body else None
        except HTTPError as error:
            raise RuntimeError(_http_error_message(path, error)) from error

    def graphql(self, query: str, variables: dict[str, Any] | None = None) -> dict[str, Any]:
        body = json.dumps({"query": query, "variables": variables or {}}).encode()
        request = Request(
            "https://api.github.com/graphql",
            data=body,
            method="POST",
            headers={
                "Authorization": f"Bearer {self.token}",
                "Accept": "application/vnd.github+json",
                "Content-Type": "application/json",
            },
        )
        try:
            with urlopen(request) as response:
                payload = json.load(response)
        except HTTPError as error:
            raise RuntimeError(_http_error_message("/graphql", error)) from error
        if payload.get("errors"):
            messages = "; ".join(e.get("message", "onbekend") for e in payload["errors"])
            raise RuntimeError(f"GitHub GraphQL-foutmeldingen: {messages}")
        return payload["data"]

    def project(self) -> dict[str, Any]:
        data = self.graphql(
            """
            query($org:String!, $number:Int!) {
              organization(login:$org) {
                projectV2(number:$number) {
                  id
                  statusField: field(name:"Status") {
                    ... on ProjectV2SingleSelectField { id name options { id name } }
                  }
                  environmentField: field(name:"Omgeving") {
                    ... on ProjectV2SingleSelectField { id name options { id name } }
                  }
                  items(first:100) { nodes {
                    id isArchived
                    content {
                      ... on Issue { __typename number repository { nameWithOwner } }
                      ... on PullRequest { __typename number repository { nameWithOwner } }
                    }
                    fieldValues(first:100) { nodes {
                      ... on ProjectV2ItemFieldSingleSelectValue {
                        field { ... on ProjectV2SingleSelectField { name } }
                        name optionId
                      }
                    }}
                  }}
                }
              }
            }
            """,
            {"org": ORGANIZATION, "number": PROJECT_NUMBER},
        )
        project = data.get("organization", {}).get("projectV2")
        if not project:
            raise RuntimeError(f"Organisatieproject {PROJECT_NUMBER} bestaat niet of is niet toegankelijk")
        return project

    def linked_branches(self, number: int) -> set[str]:
        data = self.graphql(
            """
            query($owner:String!, $name:String!, $number:Int!) {
              repository(owner:$owner, name:$name) {
                issue(number:$number) {
                  linkedBranches(first:100) { nodes { ref { name } } }
                }
              }
            }
            """,
            {"owner": ORGANIZATION, "name": REPOSITORY.split("/", 1)[1], "number": number},
        )
        issue = data.get("repository", {}).get("issue") or {}
        return {
            node["ref"]["name"]
            for node in issue.get("linkedBranches", {}).get("nodes", [])
            if node.get("ref", {}).get("name")
        }

    def mutate_status(self, project_id: str, item_id: str, field_id: str, option_id: str) -> None:
        self.graphql(
            """
            mutation($project:ID!, $item:ID!, $field:ID!, $option:String!) {
              updateProjectV2ItemFieldValue(input:{projectId:$project,itemId:$item,fieldId:$field,value:{singleSelectOptionId:$option}}) {
                projectV2Item { id }
              }
            }
            """,
            {"project": project_id, "item": item_id, "field": field_id, "option": option_id},
        )

    def mutate_environment(self, project_id: str, item_id: str, field_id: str, option_id: str) -> None:
        self.mutate_status(project_id, item_id, field_id, option_id)

    def archive(self, project_id: str, item_id: str) -> None:
        self.graphql(
            """
            mutation($project:ID!, $item:ID!) {
              archiveProjectV2Item(input:{projectId:$project,itemId:$item}) { item { id isArchived } }
            }
            """,
            {"project": project_id, "item": item_id},
        )

    def add_label(self, number: int, label: str) -> None:
        self.rest(
            f"/repos/{self.repository}/issues/{number}/labels",
            method="POST",
            data={"labels": [label]},
        )

    def remove_label(self, number: int, label: str) -> None:
        self.rest(
            f"/repos/{self.repository}/issues/{number}/labels/{label}",
            method="DELETE",
        )


def _live_commit_sha(client: Any) -> str | None:
    """Read the live commit once; malformed or unavailable metadata is safe."""
    try:
        payload = client.rest(f"/repos/{REPOSITORY}/contents/version.json?ref=gh-pages")
        content = base64.b64decode(payload["content"].replace("\n", "")).decode("utf-8")
        sha = json.loads(content).get("sha")
        return sha if isinstance(sha, str) and sha else None
    except Exception:
        return None


def _compare_status(client: Any, merge_commit_sha: str | None, live_commit_sha: str | None) -> str | None:
    if not merge_commit_sha or not live_commit_sha:
        return None
    try:
        return client.rest(f"/repos/{REPOSITORY}/compare/{merge_commit_sha}...{live_commit_sha}").get("status")
    except Exception:
        return None


def _http_error_message(path: str, error: HTTPError) -> str:
    """Keep GitHub's complete explanation, without exposing request headers."""
    try:
        response_text = error.read().decode("utf-8", errors="replace")
    except Exception:
        response_text = "(antwoord kon niet worden gelezen)"
    response_text = response_text or "(leeg antwoord)"
    if path == "/graphql":
        resource = "het organisatieproject en de bordmutaties"
    elif path.startswith("/repos/"):
        resource = "de repositorygegevens"
    else:
        resource = f"de GitHub-bron {path}"
    return (
        f"GitHub-aanroep {path} voor {resource} mislukt: "
        f"HTTP {error.code} {error.reason}; antwoord: {response_text}"
    )


def _issue_states(client: GitHub) -> dict[int, IssueState]:
    issues = [i for i in client.rest(f"/repos/{REPOSITORY}/issues?state=all&per_page=100") if "pull_request" not in i]
    prs = client.rest(f"/repos/{REPOSITORY}/pulls?state=all&per_page=100")
    branches = client.rest(f"/repos/{REPOSITORY}/branches?per_page=100")
    states: dict[int, IssueState] = {}
    for issue in issues:
        number = issue["number"]
        # Een losse verwijzing mag lopend werk zichtbaar maken, maar alleen een
        # expliciet afsluitwoord mag een samengevoegde PR aan dit issue koppelen
        # voor de status Done.
        related = [pr for pr in prs if _references_issue(pr, number)]
        merged_related = [pr for pr in related if _linked_issue_number(pr) == number]
        # Only GitHub's explicit Development relation proves that a branch belongs
        # to this issue.  A matching number in an unrelated branch name is not a
        # relation and must never move the issue card.
        linked_branches = client.linked_branches(number)
        branch = any(b["name"] in linked_branches for b in branches if b["name"] != "main")
        open_prs = [pr for pr in related if pr["state"] == "open"]
        merged_pr = next((pr for pr in merged_related if pr.get("merged_at")), None)
        merged = merged_pr is not None
        closed_unmerged = any(pr["state"] == "closed" and not pr.get("merged_at") for pr in merged_related)
        review = False
        for pr in open_prs:
            requested = client.rest(f"/repos/{REPOSITORY}/pulls/{pr['number']}/requested_reviewers")
            review = _latest_review_status(
                client,
                pr["number"],
                requested=bool(requested.get("users") or requested.get("teams")),
            )
            if review:
                break
        labels = frozenset(label.get("name") for label in issue.get("labels", []) if label.get("name"))
        states[number] = IssueState(number, issue["state"], branch, bool(open_prs), review, merged, closed_unmerged,
                                     labels, merged_pr.get("merge_commit_sha") if merged_pr else None)
    return states


def _pull_request_states(client: GitHub, issue_states: dict[int, IssueState]) -> dict[int, PullRequestState]:
    prs = client.rest(f"/repos/{REPOSITORY}/pulls?state=all&per_page=100")
    states: dict[int, PullRequestState] = {}
    for pr in prs:
        open_pr = pr["state"] == "open"
        merged = bool(pr.get("merged_at"))
        linked_issue = _linked_issue_number(pr)
        linked_issue_state = issue_states.get(linked_issue) if linked_issue is not None else None
        linked_labels = linked_issue_state.labels if linked_issue_state else frozenset()
        review = False
        if open_pr:
            requested = client.rest(f"/repos/{REPOSITORY}/pulls/{pr['number']}/requested_reviewers")
            review = _latest_review_status(
                client,
                pr["number"],
                requested=bool(requested.get("users") or requested.get("teams")),
            )
        labels = frozenset(label.get("name") for label in pr.get("labels", []) if label.get("name"))
        states[pr["number"]] = PullRequestState(
            pr["number"], open_pr, review, merged,
            pr["state"] == "closed" and not merged,
            labels, linked_labels, pr.get("merge_commit_sha"),
        )
    return states


def sync(client: Any, *, project: dict[str, Any] | None = None) -> list[str]:
    project = project or client.project()
    status_field: dict[str, Any] | None = project.get("statusField")
    if status_field is None:
        fields = [f for f in project.get("fields", {}).get("nodes", []) if f and f.get("name") == STATUS_FIELD_NAME]
        status_field = fields[0] if len(fields) == 1 else None
    if not isinstance(status_field, dict):
        raise RuntimeError("ProjectV2 heeft niet precies één veld Status")
    options = {o["name"]: o["id"] for o in status_field.get("options", [])}
    missing = STATUSES - options.keys()
    if missing:
        raise RuntimeError("ProjectV2 mist statusoptie(s): " + ", ".join(sorted(missing)))

    environment_field: dict[str, Any] | None = project.get("environmentField")
    if environment_field is None:
        fields = [f for f in project.get("fields", {}).get("nodes", []) if f and f.get("name") == ENVIRONMENT_FIELD_NAME]
        environment_field = fields[0] if len(fields) == 1 else None
    if not isinstance(environment_field, dict):
        raise RuntimeError("ProjectV2 heeft niet precies één veld Omgeving")
    environment_options = {o["name"]: o["id"] for o in environment_field.get("options", [])}
    missing = ENVIRONMENTS - environment_options.keys()
    if missing:
        raise RuntimeError("ProjectV2 mist omgevingsoptie(s): " + ", ".join(sorted(missing)))

    states = _issue_states(client)
    pull_request_states = _pull_request_states(client, states)
    live_commit_sha = _live_commit_sha(client)
    actions: list[str] = []
    for item in project["items"]["nodes"]:
        content = item.get("content") or {}
        if content.get("repository", {}).get("nameWithOwner") != REPOSITORY or not content.get("number"):
            continue
        number = content["number"]
        if content.get("__typename") == "PullRequest":
            pr = pull_request_states.get(number)
            if not pr:
                continue
            desired = target_pr_status(pr)
            current = next((v.get("name") for v in item.get("fieldValues", {}).get("nodes", [])
                            if v and v.get("field", {}).get("name") == STATUS_FIELD_NAME), None)
            if current != desired:
                client.mutate_status(project["id"], item["id"], status_field["id"], options[desired])
                actions.append(f"pull request #{number}: {current or 'onbekend'} → {desired}")

            environment = target_pr_environment(
                pr,
                live_commit_sha=live_commit_sha,
                compare_status=_compare_status(client, pr.merge_commit_sha, live_commit_sha),
            )
            current_environment = next((v.get("name") for v in item.get("fieldValues", {}).get("nodes", [])
                                        if v and v.get("field", {}).get("name") == ENVIRONMENT_FIELD_NAME), None)
            if current_environment != environment:
                client.mutate_environment(project["id"], item["id"], environment_field["id"], environment_options[environment])
                actions.append(f"pull request #{number}: {current_environment or 'onbekend'} → {environment}")

            desired_label = next((label for label in ("soort:routekaart", "soort:gittooling")
                                  if label in pr.linked_issue_labels), None)
            if desired_label:
                for label in sorted(label for label in pr.labels if label.startswith("soort:") and label != desired_label):
                    client.remove_label(number, label)
                    actions.append(f"pull request #{number}: label {label} verwijderd")
                if desired_label not in pr.labels:
                    client.add_label(number, desired_label)
                    actions.append(f"pull request #{number}: label {desired_label} toegevoegd")
            continue
        state = states.get(number)
        if not state:
            continue
        desired = target_status(state)
        if desired == "ARCHIVE":
            if not item.get("isArchived"):
                client.archive(project["id"], item["id"])
                actions.append(f"issue #{number}: kaart gearchiveerd")
            continue
        if desired is None:
            status_action = None
        else:
            current = next((v.get("name") for v in item.get("fieldValues", {}).get("nodes", [])
                            if v and v.get("field", {}).get("name") == STATUS_FIELD_NAME), None)
            status_action = None
            if current != desired:
                client.mutate_status(project["id"], item["id"], status_field["id"], options[desired])
                status_action = f"issue #{number}: {current or 'onbekend'} → {desired}"

        environment = target_environment(
            state,
            live_commit_sha=live_commit_sha,
            compare_status=_compare_status(client, state.merge_commit_sha, live_commit_sha),
        )
        current_environment = next((v.get("name") for v in item.get("fieldValues", {}).get("nodes", [])
                                    if v and v.get("field", {}).get("name") == ENVIRONMENT_FIELD_NAME), None)
        preserve_manual_live = (
            environment != "Live"
            and current_environment == "Live"
            and "soort:gittooling" not in state.labels
        )
        if current_environment != environment and not preserve_manual_live:
            client.mutate_environment(project["id"], item["id"], environment_field["id"], environment_options[environment])
            actions.append(f"issue #{number}: {current_environment or 'onbekend'} → {environment}")
        if status_action:
            actions.append(status_action)
    return actions


def main() -> int:
    token = os.environ.get("GITHUB_TOKEN", "")
    if not token:
        print("::error::Planner App-token ontbreekt; configureer PLANNER_APP_ID en PLANNER_PRIVATE_KEY als repository secrets.", file=sys.stderr)
        return 1
    try:
        client = GitHub(token)
        actions = sync(client)
        print("Geen projectmutaties nodig." if not actions else "\n".join(actions))
        return 0
    except Exception as error:  # duidelijke workflowfout, zonder geheimen te printen
        print(f"::error::{error}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
