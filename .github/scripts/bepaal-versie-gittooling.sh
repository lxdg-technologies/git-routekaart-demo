#!/usr/bin/env bash
# Bepaal een GitTooling-versie voor commits die gereedschap buiten de site raken.
# De sitebestanden tellen niet mee; first-parent commits die wel gereedschap raken
# verhogen de patchversie vanaf de gekozen basis.

set -euo pipefail

commit="${1:-HEAD}"
commit_sha="$(git rev-parse --verify "${commit}^{commit}")"

existing="$(git tag --points-at "$commit_sha" --list 'gittooling-v*' \
  | grep -E '^gittooling-v[0-9]+\.[0-9]+\.[0-9]+$' \
  | sort -V \
  | tail -n 1 || true)"
if [ -n "$existing" ]; then
  printf '%s\n' "$existing"
  exit 0
fi

base="$(git show "${commit_sha}:.github/GITTOOLING_VERSION_BASE" 2>/dev/null | tr -d '[:space:]' || true)"
if [[ ! "$base" =~ ^v([0-9]+)\.([0-9]+)\.([0-9]+)$ ]]; then
  echo "Geen geldige SemVer-basis in .github/GITTOOLING_VERSION_BASE op $commit_sha" >&2
  exit 1
fi

major="${BASH_REMATCH[1]}"
minor="${BASH_REMATCH[2]}"
patch="${BASH_REMATCH[3]}"
base_commit="$(git log --first-parent -n 1 --format=%H "$commit_sha" -- .github/GITTOOLING_VERSION_BASE)"
if [ -z "$base_commit" ]; then
  echo "Kon de commit van .github/GITTOOLING_VERSION_BASE niet bepalen" >&2
  exit 1
fi

distance="$(git rev-list --first-parent --count "${base_commit}..${commit_sha}" \
  -- . \
  ':(exclude)index.html' \
  ':(exclude)README.md' \
  ':(exclude)LICENSE')"

printf 'gittooling-v%s.%s.%s\n' "$major" "$minor" "$((patch + distance))"
