#!/usr/bin/env bash
set -euo pipefail

head_sha="actuele-head"
allowed_logins='["lxdg-dcs-reviewer[bot]","DCS-Rob","vdbergkevin"]'
reviews='[
  {"id": 1, "user": {"login": "lxdg-dcs-reviewer[bot]"}, "state": "APPROVED", "submitted_at": "2026-08-07T10:00:00Z", "commit_id": "oude-head"},
  {"id": 2, "user": {"login": "lxdg-dcs-reviewer[bot]"}, "state": "APPROVED", "submitted_at": "2026-08-07T11:00:00Z", "commit_id": "actuele-head"}
]'

latest_reviews="$(jq '
  [
    .[]
    | select(.state == "APPROVED" or .state == "CHANGES_REQUESTED" or .state == "DISMISSED")
    | {login: .user.login, state: .state, id: (.id // 0), submitted_at: (.submitted_at // ""), commit_id: (.commit_id // "")}
  ]
  | group_by(.login)
  | map(sort_by([.submitted_at, .id]) | last)
' <<< "$reviews")"

approvals_for_head() {
  jq --argjson allowed "$allowed_logins" --arg head_sha "$head_sha" '
    [
      .[]
      | select(.state == "APPROVED" and .commit_id == $head_sha)
      | select(.login as $login | $allowed | index($login) != null)
    ]
    | length
  ' <<< "$1"
}

# Een review op een oude head verdwijnt zodra de actuele head wordt gebruikt.
test "$(approvals_for_head "$(jq 'map(if .commit_id == "actuele-head" then .commit_id = "oude-head" else . end)' <<< "$latest_reviews")")" -eq 0
# Een approval op de actuele head telt wel mee.
test "$(approvals_for_head "$latest_reviews")" -eq 1

printf 'Review-guard head-versietest geslaagd: oude goedkeuring telt niet, actuele goedkeuring wel\n'
