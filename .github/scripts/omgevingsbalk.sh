#!/usr/bin/env bash
# Zet een balk bovenaan een gepubliceerde kopie van de simulatie, zodat meteen zichtbaar is
# wélke omgeving je bekijkt en wélke versie daarin staat.
#
# Waarom: tussen "de workflow is groen" en "de pagina toont de nieuwe versie" zit ongeveer
# een minuut publiceertijd. Wie te vroeg kijkt, beoordeelt zonder het te merken de vorige
# versie. Met het commitnummer in beeld is dat meteen te zien, zonder dat iemand een
# waarschuwing hoeft te onthouden. Bijkomend: een ontwikkel- of testversie kan niet meer
# per ongeluk voor de echte site worden aangezien.
#
# De balk wordt alleen aan de gepubliceerde kopie toegevoegd, nooit aan index.html in de
# repository. Productie krijgt hem bewust niet — daar hoort geen ruis.
#
# Gebruik: omgevingsbalk.sh <bestand> <omgeving> <label> <commit-sha> [versie]
#   omgeving : development | test
#   label    : vrije tekst, bijv. "pull request #49" of "main"
#   versie   : optionele SemVer-tag; zonder tag wordt de korte commit-SHA getoond

set -euo pipefail

bestand="$1"
omgeving="$2"
label="$3"
sha="$4"
kort="${sha:0:7}"
versie="${5:-}"
if [ -n "$versie" ]; then
  versie_label="${versie} · commit ${kort}"
else
  versie_label="${kort}"
fi

case "$omgeving" in
  development) titel="Ontwikkelversie"; kleur="var(--warn)"; tekstkleur="#10161d" ;;
  test)        titel="Testversie";      kleur="var(--accent)"; tekstkleur="#fff" ;;
  *) echo "Onbekende omgeving: $omgeving" >&2; exit 1 ;;
esac

balk=$(cat <<EOF
<div role="note" style="
  background:${kleur};
  color:${tekstkleur};
  font:600 14px/1.5 system-ui,-apple-system,'Segoe UI',sans-serif;
  padding:.55rem 1rem;
  position:sticky;
  top:0;
  z-index:1000;
  box-sizing:border-box;
  max-width:100%;
  text-align:center;
  letter-spacing:.01em;">
  ${titel} — ${label} · versie <code style="font:inherit;font-weight:700;">${versie_label}</code>
  <span style="display:block;font-weight:400;">
    Dit is niet de echte site. Klopt dit versienummer niet met wat je verwacht, dan is het
    publiceren nog bezig — wacht een minuut en ververs de pagina.
  </span>
</div>
EOF
)

if [ "$omgeving" = "development" ]; then
  balk="${balk}
<div style=\"display:flex;flex-wrap:wrap;gap:.45rem;margin-top:.45rem;justify-content:center;\">
  <button type=\"button\" id=\"btn-review-approve\" style=\"border:1px solid #fff;border-radius:999px;padding:.3rem .7rem;background:#fff;color:#10161d;font:700 13px inherit;cursor:pointer;\">Goedkeuren</button>
  <button type=\"button\" id=\"btn-review-reject\" style=\"border:1px solid #fff;border-radius:999px;padding:.3rem .7rem;background:transparent;color:#fff;font:700 13px inherit;cursor:pointer;\">Afkeuren</button>
</div>"
fi

# Direct na <body> invoegen. Eén keer, en alleen als hij er nog niet staat.
if grep -q 'role="note"' "$bestand"; then
  echo "Balk staat er al, niets gedaan"
  exit 0
fi

tijdelijk="$(mktemp)"
awk -v balk="$balk" '
  { print }
  !gedaan && /<body>/ { print balk; gedaan = 1 }
' "$bestand" > "$tijdelijk"

if ! grep -q 'role="note"' "$tijdelijk"; then
  echo "::error::Kon de omgevingsbalk niet plaatsen — <body> niet gevonden in $bestand" >&2
  exit 1
fi

mv "$tijdelijk" "$bestand"
echo "Omgevingsbalk geplaatst: ${titel} (${versie_label})"
