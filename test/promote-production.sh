#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
script="$repo_root/.github/scripts/bepaal-promotieversie.py"
test_repo="$(mktemp -d "${TMPDIR:-/tmp}/git-routekaart-promotion-test.XXXXXX")"
trap 'rm -rf -- "$test_repo"' EXIT HUP INT TERM

git -C "$test_repo" init -b main >/dev/null
git -C "$test_repo" config user.name "Promotion test"
git -C "$test_repo" config user.email "promotion-test@example.invalid"
printf '{"environment":"production","version":"v1.2.2"}\n' > "$test_repo/environment.json"
git -C "$test_repo" add environment.json
git -C "$test_repo" commit -m "Promote v1.2.2" >/dev/null
printf '{"environment":"production","version":"v1.2.3"}\n' > "$test_repo/environment.json"
git -C "$test_repo" commit -am "Promote v1.2.3" >/dev/null
printf 'test\n' > "$test_repo/test-version.txt"
git -C "$test_repo" add test-version.txt
git -C "$test_repo" commit -m "Unrelated deployment metadata" >/dev/null
printf '{"environment":"test","version":"v1.2.4"}\n' > "$test_repo/test-environment.json"

result="$(python3 "$script" "Versie van Test naar Live" "" "$test_repo/test-environment.json" "$test_repo")"
test "$result" = $'VERSION=v1.2.4\nREASON=overgenomen van Test'

result="$(python3 "$script" "Vorige Live-versie terugzetten" "" "$test_repo/test-environment.json" "$test_repo")"
test "$result" = $'VERSION=v1.2.2\nREASON=de vorige Live-versie'

result="$(python3 "$script" "Versie van Test naar Live" "v1.2.1" "$test_repo/ontbreekt.json" "$test_repo")"
test "$result" = $'VERSION=v1.2.1\nREASON=handmatig opgegeven'

ambiguous="$(mktemp -d "${TMPDIR:-/tmp}/git-routekaart-promotion-ambiguous.XXXXXX")"
trap 'rm -rf -- "$test_repo" "$ambiguous"' EXIT HUP INT TERM
git -C "$ambiguous" init -b main >/dev/null
git -C "$ambiguous" config user.name "Promotion test"
git -C "$ambiguous" config user.email "promotion-test@example.invalid"
printf '{"environment":"production","version":"v1.2.3"}\n' > "$ambiguous/environment.json"
git -C "$ambiguous" add environment.json
git -C "$ambiguous" commit -m "Only promotion" >/dev/null
if python3 "$script" "Vorige Live-versie terugzetten" "" "$test_repo/test-environment.json" "$ambiguous" >/dev/null 2>&1; then
  echo "vorige Live-versie zonder voorganger werd onterecht geaccepteerd" >&2
  exit 1
fi

printf 'Promotieversiekeuze geslaagd: Test, vorige Live, handmatig en fail-closed gecontroleerd\n'
