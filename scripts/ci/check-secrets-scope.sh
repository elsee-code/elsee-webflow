#!/usr/bin/env bash
# check-secrets-scope — un secret de déploiement n'est lu que par un job qui
# déclare un `environment:`.
#
# Pourquoi (dev_ops:standards/securite.md § 1, M1.1) : un secret d'environnement
# GitHub est protégé par les règles de l'environnement (branches autorisées,
# relecteurs) ; un secret de dépôt est lisible par n'importe quel workflow de
# n'importe quelle branche. Un job qui lit `secrets.GCP_*` ou
# `secrets.FIREBASE_SERVICE_ACCOUNT*` sans `environment:` lit donc soit un secret
# de dépôt (à déplacer), soit rien (workflow cassé en silence). Constaté le
# 2026-09-12 sur trois workflows de maintenance d'`elsee_functions_v2`.
#
# Usage : scripts/ci/check-secrets-scope.sh [dossier des workflows]
#         SECRET_PATTERN (regex ERE, optionnel) redéfinit les noms surveillés.
# Sortie 0 si chaque job concerné a un environnement, 1 sinon.
#
# Lecture du YAML par indentation, sans dépendance : les jobs sont les clés à
# deux espaces sous `jobs:`, `environment:` se cherche à quatre espaces dans le
# job. Un job qui appelle un workflow réutilisable (`uses:` au niveau du job)
# est laissé au workflow appelé.
set -euo pipefail

dir="${1:-.github/workflows}"
pattern="${SECRET_PATTERN:-secrets\.(GCP_[A-Za-z0-9_]*|FIREBASE_SERVICE_ACCOUNT[A-Za-z0-9_]*)}"
if [ ! -d "$dir" ]; then
  echo "✖ dossier introuvable : $dir"
  exit 1
fi

bad=0
checked=0
for f in "$dir"/*.yml "$dir"/*.yaml; do
  [ -f "$f" ] || continue
  out="$(awk -v pat="$pattern" -v file="$f" '
    function flush() {
      if (job == "") return
      if (secrets != "" && !env && !reusable) {
        printf("✖ %s — job `%s` lit %s sans environment:\n", file, job, secrets)
        bad++
      }
      if (secrets != "") checked++
      job = ""; env = 0; reusable = 0; secrets = ""
    }
    /^[^ \t#][^:]*:/ { flush(); injobs = ($0 ~ /^jobs:/); next }
    injobs && /^  [A-Za-z0-9_-]+:[ \t]*(#.*)?$/ {
      flush(); job = $1; sub(/:$/, "", job); next
    }
    injobs && job != "" && /^    environment:/ { env = 1 }
    injobs && job != "" && /^    uses:/ { reusable = 1 }
    injobs && job != "" && match($0, pat) {
      name = substr($0, RSTART, RLENGTH); sub(/^secrets\./, "", name)
      if (index(secrets, name) == 0) secrets = (secrets == "" ? name : secrets ", " name)
    }
    END { flush(); printf("__bad=%d __checked=%d\n", bad, checked) }
  ' "$f")"
  printf '%s\n' "$out" | grep -v '^__bad=' || true
  stats="$(printf '%s\n' "$out" | grep '^__bad=' || echo "__bad=0 __checked=0")"
  b="${stats#__bad=}"; b="${b%% *}"
  c="${stats##*__checked=}"
  bad=$((bad + b))
  checked=$((checked + c))
done

if [ "$bad" -gt 0 ]; then
  echo
  echo "$bad job(s) lisent un secret de déploiement hors de tout environnement GitHub."
  echo "Ajouter \`environment: <prod|staging>\` au job (et le secret à cet environnement),"
  echo "ou retirer la lecture. Un secret de dépôt n'a pas de règle de branche."
  exit 1
fi
echo "✓ $checked job(s) lisent un secret de déploiement, tous sous un environment:."
