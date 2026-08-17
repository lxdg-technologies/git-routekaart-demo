#!/usr/bin/env python3
"""Bepaal de versie voor een productiepromotie zonder een versielijst te onderhouden."""
from __future__ import annotations

import json
import re
import subprocess
import sys
from pathlib import Path
from typing import NoReturn

VERSION_RE = re.compile(r"^v[0-9]+\.[0-9]+\.[0-9]+$")


def fail(message: str) -> NoReturn:
    print(f"FOUT: {message}", file=sys.stderr)
    raise SystemExit(1)


def read_version(path: Path, description: str) -> str:
    try:
        data = json.loads(path.read_text())
    except (OSError, json.JSONDecodeError) as exc:
        fail(f"{description} is niet leesbaar: {exc}")
    if not isinstance(data, dict):
        fail(f"{description} is geen JSON-object")
    version = data.get("version", "")
    if not isinstance(version, str) or not VERSION_RE.fullmatch(version):
        fail(f"{description} noemt geen geldige versie")
    return version


def archived_version(repo: Path, commit: str) -> str:
    try:
        raw = subprocess.check_output(
            ["git", "-C", str(repo), "show", f"{commit}:environment.json"],
            text=True,
            stderr=subprocess.STDOUT,
        )
        data = json.loads(raw)
    except (subprocess.CalledProcessError, json.JSONDecodeError) as exc:
        fail(f"de vorige Live-versie heeft geen leesbare metadata: {exc}")
    if not isinstance(data, dict):
        fail("de vorige Live-versie heeft geen JSON-object als metadata")
    if data.get("environment") != "production":
        fail("de vorige Live-versie is niet als productie gemarkeerd")
    version = data.get("version", "")
    if not isinstance(version, str) or not VERSION_RE.fullmatch(version):
        fail("de vorige Live-versie noemt geen geldige versie")
    return version


def previous_live_version(repo: Path) -> str:
    current = read_version(repo / "environment.json", "de actuele Live-metadata")
    try:
        commits = subprocess.check_output(
            [
                "git",
                "-C",
                str(repo),
                "log",
                "--first-parent",
                "--format=%H",
                "--",
                "environment.json",
            ],
            text=True,
            stderr=subprocess.STDOUT,
        ).splitlines()
    except subprocess.CalledProcessError as exc:
        fail(f"de Live-historie is niet leesbaar: {exc}")
    if len(commits) < 2:
        fail("er is geen eenduidige vorige Live-versie in de deploymenthistorie")
    previous = archived_version(repo, commits[1])
    if previous == current:
        fail("de deploymenthistorie bevat geen andere vorige Live-versie")
    return previous


def main() -> None:
    if len(sys.argv) != 5:
        fail("gebruik: bepaal-promotieversie.py MODE HANDMATIGE_VERSIE TEST_ENV GH_PAGES")
    mode, manual, test_env, gh_pages = sys.argv[1:]
    if manual:
        print(f"VERSION={manual}")
        print("REASON=handmatig opgegeven")
        return
    if mode == "Versie van Test naar Live":
        version = read_version(Path(test_env), "de Test-metadata")
        print(f"VERSION={version}")
        print("REASON=overgenomen van Test")
        return
    if mode == "Vorige Live-versie terugzetten":
        version = previous_live_version(Path(gh_pages))
        print(f"VERSION={version}")
        print("REASON=de vorige Live-versie")
        return
    fail(f"onbekende keuze: {mode}")


if __name__ == "__main__":
    main()
