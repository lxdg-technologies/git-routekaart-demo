#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
version_script="$repo_root/.github/scripts/bepaal-versie.sh"
gittooling_version_script="$repo_root/.github/scripts/bepaal-versie-gittooling.sh"
test_repo="$(mktemp -d "${TMPDIR:-/tmp}/git-routekaart-version-test.XXXXXX")"
trap 'rm -rf -- "$test_repo"' EXIT HUP INT TERM

git -C "$test_repo" init -b main >/dev/null
git -C "$test_repo" config user.name "Version test"
git -C "$test_repo" config user.email "version-test@example.invalid"

commit_file="$test_repo/routekaart.txt"
site_file="$test_repo/index.html"
printf 'basis\n' > "$commit_file"
printf 'sitebasis\n' > "$site_file"
git -C "$test_repo" add routekaart.txt index.html
git -C "$test_repo" commit -m "Basis" >/dev/null
git -C "$test_repo" tag -a v1.1.0 -m "v1.1.0"

git -C "$test_repo" switch -c versioning >/dev/null
mkdir -p "$test_repo/.github"
printf 'v1.2.0\n' > "$test_repo/.github/VERSION_BASE"
git -C "$test_repo" add .github/VERSION_BASE
git -C "$test_repo" commit -m "Start automatische versies" >/dev/null
git -C "$test_repo" switch main >/dev/null
git -C "$test_repo" merge --no-ff versioning -m "Merge automatische versies" >/dev/null
first="$(cd "$test_repo" && bash "$version_script" HEAD)"
test "$first" = "v1.2.0"
git -C "$test_repo" tag -a v1.2.0 -m "v1.2.0"

printf 'eerste volgende merge\n' >> "$commit_file"
git -C "$test_repo" commit -am "Eerste volgende merge" >/dev/null
second="$(cd "$test_repo" && bash "$version_script" HEAD)"
test "$second" = "v1.2.1"

printf 'tweede volgende merge\n' >> "$commit_file"
git -C "$test_repo" commit -am "Tweede volgende merge" >/dev/null
third="$(cd "$test_repo" && bash "$version_script" HEAD)"
test "$third" = "v1.2.2"

git -C "$test_repo" switch -c major-versie >/dev/null
printf 'v2.0.0\n' > "$test_repo/.github/VERSION_BASE"
git -C "$test_repo" commit -am "Bewuste majorversie" >/dev/null
git -C "$test_repo" switch main >/dev/null
git -C "$test_repo" merge --no-ff major-versie -m "Merge bewuste majorversie" >/dev/null
new_base="$(cd "$test_repo" && bash "$version_script" HEAD)"
test "$new_base" = "v2.0.0"

printf 'merge na major\n' >> "$commit_file"
git -C "$test_repo" commit -am "Merge na major" >/dev/null
after_minor="$(cd "$test_repo" && bash "$version_script" HEAD)"
test "$after_minor" = "v2.0.1"

git -C "$test_repo" switch -c gittooling-start >/dev/null
mkdir -p "$test_repo/.github"
printf 'v0.1.0\n' > "$test_repo/.github/GITTOOLING_VERSION_BASE"
git -C "$test_repo" add .github/GITTOOLING_VERSION_BASE
git -C "$test_repo" commit -m "Start GitTooling-versies" >/dev/null
git -C "$test_repo" switch main >/dev/null
git -C "$test_repo" merge --no-ff gittooling-start -m "Merge GitTooling-versies" >/dev/null
gittooling_first="$(cd "$test_repo" && bash "$gittooling_version_script" HEAD)"
test "$gittooling_first" = "gittooling-v0.1.0"
git -C "$test_repo" tag -a gittooling-v0.1.0 -m "gittooling-v0.1.0"

printf 'alleen site\n' >> "$site_file"
git -C "$test_repo" commit -am "Alleen site gewijzigd" >/dev/null
site_only="$(cd "$test_repo" && bash "$gittooling_version_script" HEAD)"
test "$site_only" = "gittooling-v0.1.0"

printf 'alleen gereedschap\n' > "$test_repo/.github/tooling.txt"
git -C "$test_repo" add .github/tooling.txt
git -C "$test_repo" commit -m "Alleen GitTooling gewijzigd" >/dev/null
gittooling_next="$(cd "$test_repo" && bash "$gittooling_version_script" HEAD)"
test "$gittooling_next" = "gittooling-v0.1.1"

printf 'Versiebepaling geslaagd: %s, %s, %s, %s, %s; GitTooling: %s, site-only: %s, next: %s\n' \
  "$first" "$second" "$third" "$new_base" "$after_minor" \
  "$gittooling_first" "$site_only" "$gittooling_next"
