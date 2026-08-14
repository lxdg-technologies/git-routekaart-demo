#!/usr/bin/env bash
set -euo pipefail

root="$(cd "$(dirname "$0")/.." && pwd)"
test_workflow="$root/.github/workflows/deploy-test.yml"
dev_workflow="$root/.github/workflows/deploy-dev.yml"

assert_contains() {
  local file="$1" pattern="$2" message="$3"
  if ! grep -Fq -- "$pattern" "$file"; then
    printf 'FAIL: %s\n' "$message" >&2
    exit 1
  fi
  printf 'ok  : %s\n' "$message"
}

assert_not_contains() {
  local file="$1" pattern="$2" message="$3"
  if grep -Fq -- "$pattern" "$file"; then
    printf 'FAIL: %s\n' "$message" >&2
    exit 1
  fi
  printf 'ok  : %s\n' "$message"
}

assert_contains "$test_workflow" 'group: gh-pages-test' 'test gebruikt een eigen concurrency-groep'
assert_contains "$test_workflow" 'cancel-in-progress: false' 'test annuleert geen eerdere publicatie'
assert_contains "$test_workflow" 'for poging in 1 2 3 4 5' 'test probeert een botsende schrijfactie opnieuw'
assert_contains "$test_workflow" 'git rebase origin/gh-pages' 'test rebased voor een nieuwe schrijfpoging'
assert_contains "$dev_workflow" 'group: gh-pages-development-pr-${{ github.event.number }}' 'ontwikkel gebruikt per pull request een eigen concurrency-groep'
assert_contains "$dev_workflow" 'cancel-in-progress: true' 'een nieuwere ontwikkelrun vervangt een oudere ontwikkelrun'
assert_contains "$dev_workflow" 'status != "completed"' 'de workflow herkent wachtende en lopende runs'
assert_contains "$dev_workflow" 'test heeft voorrang' 'de workflow legt de reden van voorrang uit'
assert_contains "$dev_workflow" 'Ontwikkelrun ${run_id} (${old_sha}) geannuleerd' 'de uitvoer noemt de geannuleerde ontwikkelrun en reden'
assert_contains "$dev_workflow" 'for poging in 1 2 3 4 5' 'ontwikkel probeert een botsende schrijfactie opnieuw'
assert_contains "$dev_workflow" 'git rebase origin/gh-pages' 'ontwikkel rebased voor een nieuwe schrijfpoging'
assert_not_contains "$test_workflow" 'group: gh-pages-environments' 'oude gedeelde concurrency-groep is verwijderd uit test'
assert_not_contains "$dev_workflow" 'group: gh-pages-environments' 'oude gedeelde concurrency-groep is verwijderd uit ontwikkel'

printf '\nALLE DEPLOYMENTRIJ-CHECKS GESLAAGD\n'
