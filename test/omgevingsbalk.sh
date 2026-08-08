#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
script="$repo_root/.github/scripts/omgevingsbalk.sh"
test_dir="$(mktemp -d "${TMPDIR:-/tmp}/git-routekaart-banner-test.XXXXXX")"
trap 'rm -rf -- "$test_dir"' EXIT HUP INT TERM

for breedte in 320 1440; do
  pagina="$test_dir/pagina-$breedte.html"
  cat > "$pagina" <<'HTML'
<!doctype html>
<html><body>
<main><h1>Routekaart</h1><button>Bediening</button></main>
</body></html>
HTML

  bash "$script" "$pagina" test "main" "0123456789abcdef" "v1.2.3" >/dev/null

  python3 - "$pagina" "$breedte" <<'PY'
import html
import re
import sys
from pathlib import Path

pagina, breedte = sys.argv[1:]
bron = Path(pagina).read_text()
match = re.search(r'<div role="note" style="([^"]+)">', bron)
assert match, f"geen environment-banner voor schermbreedte {breedte}px"
style = html.unescape(match.group(1)).replace(" ", "")
for eigenschap in ("position:sticky", "top:0", "z-index:1000", "box-sizing:border-box", "max-width:100%"):
    assert eigenschap in style, f"{eigenschap} ontbreekt bij {breedte}px"
assert "position:fixed" not in style, "de banner mag routekaart-bediening niet bedekken"
assert bron.index('role="note"') < bron.index("<main>"), "de banner hoort vóór de routekaart in de documentstroom"
PY

done

printf 'Omgevingsbalk scrolltests geslaagd voor smal en breed scherm\n'
