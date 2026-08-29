#!/usr/bin/env bash
set -euo pipefail

# Bewijst het publicatiegedrag zelf: een gelijktijdige botsing wordt hersteld en
# een andere publicatie blijft niet wachten op een trage publicatie.
root="$(cd "$(dirname "$0")/.." && pwd)"
helper="$root/.github/scripts/publiceer-omgeving.sh"
tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT

bare="$tmp/bare.git"
git init --bare -q "$bare"
seed="$tmp/seed"
git clone -q "$bare" "$seed"
git -C "$seed" checkout -q -b gh-pages
git -C "$seed" config user.name test
git -C "$seed" config user.email test@example.invalid
mkdir -p "$seed/test" "$seed/dev"
printf 'basis\n' > "$seed/test/index.html"
printf 'basis\n' > "$seed/dev/index.html"
git -C "$seed" add .
git -C "$seed" commit -qm basis
git -C "$seed" push -q -u origin gh-pages

clone() {
  local name="$1"
  git clone -q --branch gh-pages "$bare" "$tmp/$name"
  git -C "$tmp/$name" config user.name "$name"
  git -C "$tmp/$name" config user.email "$name@example.invalid"
  git -C "$tmp/$name" remote set-url origin "$bare"
}

clone test-run
clone dev-run
printf 'test-publicatie\n' > "$tmp/test-run/test/index.html"
printf 'ontwikkel-publicatie\n' > "$tmp/dev-run/dev/index.html"
git -C "$tmp/test-run" add test/index.html
git -C "$tmp/test-run" commit -qm 'publiceer test'
git -C "$tmp/dev-run" add dev/index.html
git -C "$tmp/dev-run" commit -qm 'publiceer ontwikkel'

# Laat de eerste push kort in de client hangen terwijl de andere publicatie
# werkelijk naar dezelfde branch schrijft. Daarna moet de eerste kunnen rebasen.
printf '#!/usr/bin/env bash\nsleep 1\n' > "$tmp/test-run/.git/hooks/pre-push"
chmod +x "$tmp/test-run/.git/hooks/pre-push"
(
  cd "$tmp/test-run"
  DEPLOY_PUSH_DELAY=0 DEPLOY_PUSH_ATTEMPTS=5 bash "$helper" > "$tmp/test.log"
) &
test_pid=$!
sleep 0.2
start="$(date +%s%N)"
(
  cd "$tmp/dev-run"
  DEPLOY_PUSH_DELAY=0 DEPLOY_PUSH_ATTEMPTS=5 bash "$helper" > "$tmp/dev.log"
)
elapsed_ms=$(( ($(date +%s%N) - start) / 1000000 ))
wait "$test_pid"

# De ontwikkelpublicatie was niet afhankelijk van de trage testpublicatie.
if [ "$elapsed_ms" -ge 900 ]; then
  printf 'FAIL: onafhankelijke publicatie wachtte %sms op een andere run\n' "$elapsed_ms" >&2
  exit 1
fi

git -C "$seed" fetch -q origin gh-pages
git -C "$seed" checkout -q gh-pages
git -C "$seed" reset --hard -q origin/gh-pages
test "$(<"$seed/test/index.html")" = 'test-publicatie'
test "$(<"$seed/dev/index.html")" = 'ontwikkel-publicatie'

grep -Fq 'Push afgewezen' "$tmp/test.log"
printf 'ok  : gelijktijdige publicaties behouden beide omgevingen na een botsing\n'
printf 'ok  : onafhankelijke publicatie blokkeert niet op een trage publicatie\n'
printf '\nALLE DEPLOYMENTRIJ-CHECKS GESLAAGD\n'

# Elke taak die het publiceerscript aanroept, moet de broncode ook echt hebben.
# Op 29-08-2026 miste die in de opruimtaak: het opruimen van een gesloten
# voorstel viel om met "No such file or directory", en de proefomgeving bleef
# staan. Zie #209.
for workflow in "$root/.github/workflows/deploy-dev.yml" "$root/.github/workflows/deploy-test.yml"; do
  ontbreekt="$(awk '
    /^  [a-z-]+:$/ { taak=$1; heeft[taak]=heeft[taak] }
    /path: source/ { bron[taak]=1 }
    /publiceer-omgeving\.sh/ { gebruikt[taak]=1 }
    END { for (t in gebruikt) if (!(t in bron)) print t }
  ' "$workflow")"
  if [ -n "$ontbreekt" ]; then
    printf 'FAIL: %s roept het publiceerscript aan zonder de broncode: %s\n' "${workflow##*/}" "$ontbreekt" >&2
    exit 1
  fi
  printf 'ok  : elke taak in %s die publiceert heeft de broncode\n' "${workflow##*/}"
done
