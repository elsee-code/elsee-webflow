#!/usr/bin/env bash
# check-pinned-actions — chaque `uses:` des workflows pointe un SHA de 40 caractères.
#
# Pourquoi (dev_ops:standards/stabilite.md § 5, M5.1) : un tag se déplace, un SHA
# non. `actions/checkout@v4` exécute aujourd'hui autre chose qu'hier sans qu'aucune
# PR n'ait été relue ; `@<sha> # v4.3.1` exécute toujours la même chose, et
# Dependabot propose la mise à jour en PR quand une nouvelle version sort.
#
# Usage : scripts/ci/check-pinned-actions.sh [dossier des workflows]
#         (défaut : .github/workflows). Sortie 0 si tout est épinglé, 1 sinon.
#
# Modèle de référence : dev_ops. Copié tel quel dans chaque dépôt (scripts/ci/),
# appelé par sa CI. Pas de dépendance : bash + grep + sed.
set -euo pipefail

dir="${1:-.github/workflows}"
if [ ! -d "$dir" ]; then
  echo "✖ dossier introuvable : $dir"
  exit 1
fi

bad=0
total=0
while IFS= read -r hit; do
  [ -n "$hit" ] || continue
  file="${hit%%:*}"
  rest="${hit#*:}"
  lineno="${rest%%:*}"
  raw="${rest#*:}"
  # Valeur du `uses:` sans le commentaire ni les guillemets.
  ref="$(printf '%s' "$raw" | sed -E 's/^[[:space:]]*-?[[:space:]]*uses:[[:space:]]*//; s/[[:space:]]+#.*$//; s/["'"'"']//g; s/[[:space:]]+$//')"
  total=$((total + 1))
  case "$ref" in
    ./*)
      # Action locale au dépôt : versionnée avec lui, rien à épingler.
      continue ;;
    docker://*)
      if [[ "$ref" != *"@sha256:"* ]]; then
        echo "✖ $file:$lineno — image Docker sans digest : $ref"
        bad=$((bad + 1))
      fi
      continue ;;
  esac
  if [[ ! "$ref" =~ ^[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+(/[^@[:space:]]+)?@[0-9a-f]{40}$ ]]; then
    echo "✖ $file:$lineno — pas un SHA de 40 caractères : $ref"
    bad=$((bad + 1))
  fi
done < <(grep -nE '^[[:space:]]*-?[[:space:]]*uses:' "$dir"/*.yml "$dir"/*.yaml 2>/dev/null || true)

if [ "$bad" -gt 0 ]; then
  echo
  echo "$bad référence(s) non épinglée(s) sur $total. Remplacer le tag par le SHA du commit"
  echo "qu'il désigne, en gardant la version en commentaire :"
  echo "    uses: actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1 # v7.0.1"
  echo "(git ls-remote https://github.com/<owner>/<repo>.git refs/tags/<tag> donne le SHA)."
  exit 1
fi
echo "✓ $total référence(s) d'action, toutes épinglées par SHA."
