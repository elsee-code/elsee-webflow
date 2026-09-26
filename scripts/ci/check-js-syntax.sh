#!/usr/bin/env bash
# check-js-syntax — chaque script se parse, avant d'être collé dans Webflow.
#
# Les fichiers sont des blocs de code personnalisé Webflow : ils peuvent contenir des
# lignes <script>, <script src=…></script> ou </script>, qui ne sont pas du JavaScript.
# On retire ces lignes seules, puis `node --check` parse le reste. Une erreur de syntaxe
# collée dans Webflow casse la page en silence ; ici elle casse la PR.
#
# Usage : scripts/ci/check-js-syntax.sh. Sortie 0 si tout parse, 1 sinon.
set -euo pipefail

tmp="$(mktemp -d)"; trap 'rm -rf "$tmp"' EXIT
status=0; n=0
while IFS= read -r f; do
  n=$((n + 1))
  out="$tmp/$(basename "$f")"
  sed -E '/^[[:space:]]*<\/?script[^>]*>([[:space:]]*<\/script>)?[[:space:]]*$/d' "$f" > "$out"
  if node --check "$out" 2>"$tmp/err"; then echo "✅ $f"; else echo "❌ $f"; sed "s#$out#$f#" "$tmp/err"; status=1; fi
done < <(git ls-files '*.js')
[ "$n" -gt 0 ] || { echo "✖ aucun fichier .js trouvé : le contrôle n'exerce rien"; exit 1; }
exit "$status"
