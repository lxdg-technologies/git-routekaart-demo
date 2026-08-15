#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
script="$repo_root/.github/scripts/omgevingsbalk.sh"
test_dir="$(mktemp -d "${TMPDIR:-/tmp}/git-routekaart-banner-test.XXXXXX")"
trap 'rm -rf -- "$test_dir"' EXIT HUP INT TERM

for omgeving in development test; do
for breedte in 320 1440; do
  pagina="$test_dir/pagina-$breedte.html"
  cat > "$pagina" <<'HTML'
<!doctype html>
<html><body>
<main><h1>Routekaart</h1><button>Bediening</button></main>
</body></html>
HTML

  bash "$script" "$pagina" "$omgeving" "main" "0123456789abcdef" "v1.2.3" >/dev/null

  python3 - "$pagina" "$breedte" "$omgeving" <<'PY'
import html
import re
import sys
from pathlib import Path

pagina, breedte, omgeving = sys.argv[1:]
bron = Path(pagina).read_text()
match = re.search(r'<div role="note" style="([^"]+)">', bron)
assert match, f"geen environment-banner voor schermbreedte {breedte}px"
style = html.unescape(match.group(1)).replace(" ", "")
expected = {
    "development": ("#c47f17", "#10161d", "background:var(--warn)", "color:#10161d"),
    "test": ("#1e5aa8", "#fff", "background:var(--accent)", "color:#fff"),
}[omgeving]
background, foreground, *properties = expected

def luminance(hex_color):
    value = hex_color.lstrip("#")
    if len(value) == 3:
        value = "".join(char * 2 for char in value)
    channels = [int(value[index:index + 2], 16) / 255 for index in (0, 2, 4)]
    linear = [channel / 12.92 if channel <= .03928 else ((channel + .055) / 1.055) ** 2.4 for channel in channels]
    return .2126 * linear[0] + .7152 * linear[1] + .0722 * linear[2]

ratio = (max(luminance(background), luminance(foreground)) + .05) / (min(luminance(background), luminance(foreground)) + .05)
assert ratio >= 4.5, f"{omgeving} haalt geen WCAG AA-contrast: {ratio:.2f}:1"
for eigenschap in properties:
    assert eigenschap in style, f"{eigenschap} ontbreekt bij {omgeving}"
assert "v1.2.3" in bron and "Dit is niet de echte site." in bron, f"versie en volledige statusmelding ontbreken bij {omgeving}"
assert "opacity:.9" not in style, f"statusmelding gebruikt nog transparante tekst bij {omgeving}"
code_match = re.search(r'<code style="([^"]+)">v1\.2\.3\s*·\s*commit\s*0123456</code>', bron)
assert code_match, f"versietekst heeft geen eigen opmaak bij {omgeving}"
code_style = html.unescape(code_match.group(1)).replace(" ", "")
background_property, foreground_property = properties
assert background_property in code_style and foreground_property in code_style, f"versietekst gebruikt niet de kleuren van de balk bij {omgeving}"
if omgeving == "test":
    assert bron.count('id="btn-live-overlay"') == 1, "de testbalk bevat precies één liveknop"
    assert bron.index('id="btn-live-overlay"') < bron.index("<main>"), "de liveknop hoort in de testbalk en niet in de paginakop"
else:
    assert 'id="btn-live-overlay"' not in bron, "de ontwikkelbalk mag geen liveknop bevatten"
    assert 'id="btn-review-approve"' in bron and 'id="btn-review-reject"' in bron, "de ontwikkelbalk bevat beide reviewknoppen"
for eigenschap in ("position:sticky", "top:0", "z-index:1000", "box-sizing:border-box", "max-width:100%"):
    assert eigenschap in style, f"{eigenschap} ontbreekt bij {breedte}px"
assert "position:fixed" not in style, "de banner mag routekaart-bediening niet bedekken"
assert bron.index('role="note"') < bron.index("<main>"), "de banner hoort vóór de routekaart in de documentstroom"
PY

done
done

printf 'Omgevingsbalk scrolltests geslaagd voor smal en breed scherm\n'
