#!/usr/bin/env bash
# Controleert dat een uitgerolde omgeving weet welke versie hij is, vóórdat hij gepubliceerd wordt.
#
# Waarom: op 07-08-2026 stond live zonder version.json, omdat die omgeving ooit was uitgerold
# door een oudere workflow die dat bestand nog niet meeschreef. Gevolg: de pagina wist niet wat
# hij was en toonde de nieuwste GitHub-uitgave alsof dat de draaiende versie was — een gok die
# eruitzag als een feit.
#
# Beter een uitrol die stopt met een duidelijke melding dan een omgeving die stilzwijgend niet
# weet wat hij draait.
#
# Gebruik: controleer-versiebestand.sh <map> <verwachte-versie> <verwachte-sha>

set -euo pipefail

map="$1"
verwachte_versie="$2"
verwachte_sha="$3"

fout() {
  echo "::error::$1"
  exit 1
}

for bestand in version.json environment.json; do
  [ -f "$map/$bestand" ] || fout "De uitrol in $map heeft geen $bestand — de omgeving zou niet weten welke versie hij draait."
  [ -s "$map/$bestand" ] || fout "$map/$bestand is leeg."
done

python3 - "$map/version.json" "$map/environment.json" "$verwachte_versie" "$verwachte_sha" <<'PY'
import json
import sys
from pathlib import Path

version_pad, environment_pad, verwachte_versie, verwachte_sha = sys.argv[1:]


def fout(bericht):
    print(f"::error::{bericht}")
    sys.exit(1)


def lees(pad):
    try:
        return json.loads(Path(pad).read_text())
    except json.JSONDecodeError as exc:
        fout(f"{pad} is geen geldige JSON: {exc}")


version = lees(version_pad)
environment = lees(environment_pad)

for sleutel in ("version", "sha"):
    if not version.get(sleutel):
        fout(f"{version_pad} mist het veld {sleutel}.")
    if not environment.get(sleutel):
        fout(f"{environment_pad} mist het veld {sleutel}.")

if version["version"] != verwachte_versie:
    fout(f"{version_pad} noemt versie {version['version']} in plaats van {verwachte_versie}.")
if environment["version"] != verwachte_versie:
    fout(f"{environment_pad} noemt versie {environment['version']} in plaats van {verwachte_versie}.")
if version["sha"] != verwachte_sha:
    fout(f"{version_pad} noemt commit {version['sha']} in plaats van {verwachte_sha}.")
if environment["sha"] != verwachte_sha:
    fout(f"{environment_pad} noemt commit {environment['sha']} in plaats van {verwachte_sha}.")

print(f"Versiebestanden kloppen: {verwachte_versie} ({verwachte_sha[:7]})")
PY
