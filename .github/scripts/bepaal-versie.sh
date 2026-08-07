#!/usr/bin/env bash
# Bepaal één onveranderlijke patchversie voor een commit op main.
#
# `.github/VERSION_BASE` bepaalt de bewuste major/minor-basis. De main-commit die
# dat bestand voor het laatst wijzigde krijgt exact die versie; iedere volgende
# first-parentcommit telt één bij de patch op. Daardoor krijgen parallelle runs
# verschillende, chronologisch oplopende versies zonder een versiebumpcommit per
# merge of een gedeeld mutable bestand buiten git.

set -euo pipefail

commit="${1:-HEAD}"
commit_sha="$(git rev-parse --verify "${commit}^{commit}")"

existing="$(git tag --points-at "$commit_sha" --list 'v*' \
  | grep -E '^v[0-9]+\.[0-9]+\.[0-9]+$' \
  | sort -V \
  | tail -n 1 || true)"
if [ -n "$existing" ]; then
  printf '%s\n' "$existing"
  exit 0
fi

base="$(git show "${commit_sha}:.github/VERSION_BASE" 2>/dev/null | tr -d '[:space:]' || true)"
if [[ ! "$base" =~ ^v([0-9]+)\.([0-9]+)\.([0-9]+)$ ]]; then
  echo "Geen geldige SemVer-basis in .github/VERSION_BASE op $commit_sha" >&2
  exit 1
fi

major="${BASH_REMATCH[1]}"
minor="${BASH_REMATCH[2]}"
patch="${BASH_REMATCH[3]}"
base_commit="$(git log --first-parent -n 1 --format=%H "$commit_sha" -- .github/VERSION_BASE)"
if [ -z "$base_commit" ]; then
  echo "Kon de commit van .github/VERSION_BASE niet bepalen" >&2
  exit 1
fi
distance="$(git rev-list --first-parent --count "${base_commit}..${commit_sha}")"

printf 'v%s.%s.%s\n' "$major" "$minor" "$((patch + distance))"
