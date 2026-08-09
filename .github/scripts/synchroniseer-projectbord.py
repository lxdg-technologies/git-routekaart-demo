#!/usr/bin/env python3
"""Synchroniseer issue-kaarten met ProjectV2, zonder automatische velden te wijzigen."""
from __future__ import annotations

import json
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


@dataclass(frozen=True)
class IssueState:
    number: int
    state: str
    branch: bool
    open_pr: bool
    review: bool
    merged_pr: bool
    closed_unmerged_pr: bool


def target_status(issue: IssueState) -> str | None:
    """Return only an automatic transition; None means leave the card alone."""
    if issue.merged_pr:
        return "Done"
    if issue.closed_unmerged_pr and not issue.open_pr:
        return "ARCHIVE"
    if issue.open_pr and issue.review:
        return "In review"
    if issue.branch or issue.open_pr:
        return "In progress"
    return None


def _references_issue(pr: dict[str, Any], number: int) -> bool:
    text = f"{pr.get('title', '')}\n{pr.get('body', '')}"
    return bool(re.search(rf"(?<!\d)(?:#|issues/)({number})(?!\d)", text, re.I))


class GitHub:
    def __init__(self, token: str, repository: str = REPOSITORY):
        self.token = token
        self.repository = repository

    def rest(self, path: str, *, accept: str = "application/vnd.github+json") -> Any:
        request = Request(
            "https://api.github.com" + path,
            headers={"Authorization": f"Bearer {self.token}", "Accept": accept},
        )
        try:
            with urlopen(request) as response:
                return json.load(response)
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
        # Vraag bewust uitsluitend het statusveld op. Het automatische veld Omgeving
        # komt nergens in deze query voor en kan dus niet door deze workflow wijzigen.
        data = self.graphql(
            """
            query($org:String!, $number:Int!) {
              organization(login:$org) {
                projectV2(number:$number) {
                  id
                  statusField: field(name:"Status") {
                    ... on ProjectV2SingleSelectField { id name options { id name } }
                  }
                  items(first:100) { nodes {
                    id isArchived
                    content { ... on Issue { number repository { nameWithOwner } } }
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

    def archive(self, project_id: str, item_id: str) -> None:
        self.graphql(
            """
            mutation($project:ID!, $item:ID!) {
              archiveProjectV2Item(input:{projectId:$project,itemId:$item}) { item { id isArchived } }
            }
            """,
            {"project": project_id, "item": item_id},
        )


def _http_error_message(path: str, error: HTTPError) -> str:
    """Keep GitHub's complete explanation, without exposing request headers."""
    try:
        response_text = error.read().decode("utf-8", errors="replace")
    except Exception:
        response_text = "(antwoord kon niet worden gelezen)"
    response_text = response_text or "(leeg antwoord)"
    return f"GitHub-aanroep {path} mislukt: HTTP {error.code} {error.reason}; antwoord: {response_text}"


def _format_permissions(installation: dict[str, Any]) -> str:
    permissions = installation.get("permissions")
    if not isinstance(permissions, dict):
        return "(GitHub gaf geen permissions-veld terug)"
    return json.dumps(permissions, ensure_ascii=False, sort_keys=True)


def _issue_states(client: GitHub) -> dict[int, IssueState]:
    issues = [i for i in client.rest(f"/repos/{REPOSITORY}/issues?state=all&per_page=100") if "pull_request" not in i]
    prs = client.rest(f"/repos/{REPOSITORY}/pulls?state=all&per_page=100")
    branches = client.rest(f"/repos/{REPOSITORY}/branches?per_page=100")
    states: dict[int, IssueState] = {}
    for issue in issues:
        number = issue["number"]
        related = [pr for pr in prs if _references_issue(pr, number)]
        # A branch name containing the issue number is the only branch-to-issue
        # relation available before a PR exists; do not invent a relation otherwise.
        branch = any(re.search(rf"(?:^|[-_/])#?{number}(?:$|[-_/])", b["name"]) for b in branches if b["name"] != "main")
        open_prs = [pr for pr in related if pr["state"] == "open"]
        merged = any(pr.get("merged_at") for pr in related)
        closed_unmerged = any(pr["state"] == "closed" and not pr.get("merged_at") for pr in related)
        review = False
        for pr in open_prs:
            requested = client.rest(f"/repos/{REPOSITORY}/pulls/{pr['number']}/requested_reviewers")
            reviews = client.rest(f"/repos/{REPOSITORY}/pulls/{pr['number']}/reviews")
            if requested.get("users") or requested.get("teams") or reviews:
                review = True
                break
        states[number] = IssueState(number, issue["state"], branch, bool(open_prs), review, merged, closed_unmerged)
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

    states = _issue_states(client)
    actions: list[str] = []
    for item in project["items"]["nodes"]:
        content = item.get("content") or {}
        if content.get("repository", {}).get("nameWithOwner") != REPOSITORY or not content.get("number"):
            continue
        number = content["number"]
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
            continue
        current = next((v.get("name") for v in item.get("fieldValues", {}).get("nodes", [])
                        if v and v.get("field", {}).get("name") == STATUS_FIELD_NAME), None)
        if current == desired:
            continue
        client.mutate_status(project["id"], item["id"], status_field["id"], options[desired])
        actions.append(f"issue #{number}: {current or 'onbekend'} → {desired}")
    return actions


def main() -> int:
    token = os.environ.get("GITHUB_TOKEN", "")
    if not token:
        print("::error::Planner App-token ontbreekt; configureer PLANNER_APP_ID en PLANNER_PRIVATE_KEY als repository secrets.", file=sys.stderr)
        return 1
    try:
        client = GitHub(token)
        identity = client.rest("/user").get("login", "")
        if identity != "lxdg-dcs-planner[bot]":
            raise RuntimeError(f"Verkeerde GitHub-identiteit: {identity or 'onbekend'}; alleen lxdg-dcs-planner[bot] is toegestaan")
        try:
            installation = client.rest("/installation")
            print("Rechten van de gebruikte Planner-installatie volgens GitHub: " + _format_permissions(installation))
        except Exception as error:
            print(f"Rechten van de gebruikte Planner-installatie konden niet worden opgevraagd: {error}", file=sys.stderr)
        actions = sync(client)
        print("Geen projectmutaties nodig." if not actions else "\n".join(actions))
        return 0
    except Exception as error:  # duidelijke workflowfout, zonder geheimen te printen
        print(f"::error::{error}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
