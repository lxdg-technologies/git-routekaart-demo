#!/usr/bin/env bash
set -uo pipefail

# Bewijst dat meld-ontwikkeladres.sh één bericht plaatst en daarna bijwerkt.
root="$(cd "$(dirname "$0")/.." && pwd)"
helper="$root/.github/scripts/meld-ontwikkeladres.sh"
tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT

fake_bin="$tmp/bin"
mkdir -p "$fake_bin"
cat > "$fake_bin/gh" <<'FAKE_GH'
#!/usr/bin/env bash
set -uo pipefail
state="${FAKE_GH_STATE:?}"
log="${FAKE_GH_LOG:?}"
printf '%s\n' "$*" >> "$log"
if [ "${FAKE_GH_FAIL:-0}" = 1 ]; then
  printf 'gh: nagebootste fout\n' >&2
  exit 1
fi
if [ "$1" = api ] && [[ "$*" == *"--jq"* ]]; then
  if [ -s "$state" ] && grep -Fq '<!-- ontwikkeladres -->' "$state"; then
    printf '42\n'
  fi
  exit 0
fi
if [ "$1" = api ] && [ "${2:-}" = --method ] && [ "${3:-}" = PATCH ]; then
  body="${!#}"
  body="${body#body=}"
  printf '%b' "$body" > "$state"
  exit 0
fi
if [ "$1" = pr ] && [ "$2" = comment ]; then
  body="${!#}"
  body="${body#body=}"
  printf '%b' "$body" > "$state"
  exit 0
fi
printf 'gh: onverwachte aanroep: %s\n' "$*" >&2
exit 1
FAKE_GH
chmod +x "$fake_bin/gh"

export PATH="$fake_bin:$PATH"
export FAKE_GH_STATE="$tmp/comment"
export FAKE_GH_LOG="$tmp/gh.log"
export PR_NUMBER=214
export GITHUB_REPOSITORY=lxdg-technologies/git-routekaart-demo
export DEV_URL=https://lxdg-technologies.github.io/git-routekaart-demo/dev/pr-214/?v=

run_message() {
  COMMIT_SHA="$1" DEV_URL="${DEV_URL}${1}" bash "$helper"
}

# Geen bestaand bericht: plaats er precies één, met de versie in het adres.
run_message abcdef1234567890 > "$tmp/first.log"
grep -Fq 'abcdef1234567890' "$FAKE_GH_STATE"
grep -Fq '?v=abcdef1234567890' "$FAKE_GH_STATE"
test "$(grep -c '^pr comment' "$FAKE_GH_LOG")" -eq 1

test "$(grep -c '<!-- ontwikkeladres -->' "$FAKE_GH_STATE")" -eq 1
printf 'ok  : nieuw bericht geplaatst met versie in adres\n'

# Nieuwe publicatie: werk hetzelfde bericht bij en maak geen tweede bericht.
run_message fedcba9876543210 > "$tmp/second.log"
grep -Fq 'fedcba9876543210' "$FAKE_GH_STATE"
! grep -Fq 'abcdef1234567890' "$FAKE_GH_STATE"
test "$(grep -c '^pr comment' "$FAKE_GH_LOG")" -eq 1
test "$(grep -c -- '--method PATCH' "$FAKE_GH_LOG")" -eq 1
test "$(grep -c '<!-- ontwikkeladres -->' "$FAKE_GH_STATE")" -eq 1
printf 'ok  : bestaand bericht bijgewerkt zonder tweede bericht\n'

# Een fout bij GitHub maakt de al geslaagde publicatie niet alsnog rood.
COMMIT_SHA=abcdef1234567890 DEV_URL="${DEV_URL}abcdef1234567890" \
  FAKE_GH_FAIL=1 bash "$helper" > "$tmp/fail.log" 2>&1
status=$?
test "$status" -eq 0
grep -Fq 'bestaande berichten konden niet worden opgehaald' "$tmp/fail.log"
test "$(grep -c '^api' "$FAKE_GH_LOG")" -eq 3
printf 'ok  : fout bij plaatsen geeft waarschuwing en status 0\n'

# Ontbrekende invoer wordt afzonderlijk gecontroleerd.
unset COMMIT_SHA
bash "$helper" > "$tmp/missing.log" 2>&1
status=$?
test "$status" -eq 0
grep -Fq 'PR_NUMBER, GITHUB_REPOSITORY of COMMIT_SHA ontbreekt' "$tmp/missing.log"
printf 'ok  : ontbrekende invoer geeft waarschuwing en status 0\n'
printf '\nALLE ONTWIKKELADRES-CHECKS GESLAAGD\n'
