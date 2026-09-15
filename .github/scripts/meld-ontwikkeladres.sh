#!/usr/bin/env bash
set -uo pipefail

# Plaats of werk het ene begrijpelijke bericht over de ontwikkelomgeving bij.
# Een fout in dit bericht mag een geslaagde publicatie niet alsnog laten falen.
pr_number="${PR_NUMBER:-}"
repository="${GITHUB_REPOSITORY:-}"
commit_sha="${COMMIT_SHA:-}"
url="${DEV_URL:-https://lxdg-technologies.github.io/git-routekaart-demo/dev/pr-${pr_number}/?v=${commit_sha}}"
marker='<!-- ontwikkeladres -->'

if [ -z "$pr_number" ] || [ -z "$repository" ] || [ -z "$commit_sha" ]; then
  echo "::warning::Ontwikkeladres niet gemeld: PR_NUMBER, GITHUB_REPOSITORY of COMMIT_SHA ontbreekt"
  exit 0
fi

body="${marker}
🔧 Ontwikkelomgeving: ${url}
Gepubliceerd met commit ${commit_sha:0:7} op $(date -u '+%Y-%m-%d %H:%M UTC')."

comment_id="$(gh api --paginate \
  "/repos/${repository}/issues/${pr_number}/comments" \
  --jq '.[] | select(.body | contains("<!-- ontwikkeladres -->")) | .id' 2>/dev/null)"
api_status=$?
if [ "$api_status" -ne 0 ]; then
  echo "::warning::Ontwikkeladres niet gemeld: bestaande berichten konden niet worden opgehaald"
  exit 0
fi

if [ -n "$comment_id" ]; then
  if gh api --method PATCH "/repos/${repository}/issues/comments/${comment_id}" -f "body=${body}" >/dev/null 2>&1; then
    echo "Ontwikkeladres bijgewerkt in bericht ${comment_id}"
  else
    echo "::warning::Ontwikkeladres niet bijgewerkt: bericht ${comment_id} kon niet worden aangepast"
  fi
else
  if gh pr comment "$pr_number" --repo "$repository" --body "$body" >/dev/null 2>&1; then
    echo "Ontwikkeladres geplaatst"
  else
    echo "::warning::Ontwikkeladres niet geplaatst: nieuw bericht kon niet worden aangemaakt"
  fi
fi

exit 0
