#!/usr/bin/env bash
set -euo pipefail

# Publiceer één al voorbereide commit veilig naar de gedeelde gh-pages-tak.
# Een botsing betekent alleen dat de tak intussen verderging: haal die stand op,
# zet de eigen commit erbovenop en probeer opnieuw.
max_pogingen="${DEPLOY_PUSH_ATTEMPTS:-5}"
for poging in $(seq 1 "$max_pogingen"); do
  if git push origin gh-pages; then
    echo "Gepubliceerd"
    exit 0
  fi
  echo "Push afgewezen (poging $poging) — deploymentbranch is intussen bijgewerkt"
  git fetch origin gh-pages
  git rebase origin/gh-pages
  sleep "${DEPLOY_PUSH_DELAY:-3}"
done

echo "::error::Publiceren naar gh-pages bleef mislukken na $max_pogingen pogingen"
exit 1
