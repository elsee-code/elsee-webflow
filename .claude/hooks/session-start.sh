#!/usr/bin/env bash
# SessionStart — injecte .claude/session-context.md (directives permanentes) dans le contexte.
# Ne se tait jamais : un fichier absent ou un python3 manquant est signalé dans le contexte.
# Ce hook ne redéclare ni n'écrase ceux du plugin security-guidance, qui enregistre les siens.
# Source : dev_ops/claude/common/hooks/session-start.sh — ne pas modifier la copie sur place.
set -u
root="${CLAUDE_PROJECT_DIR:-$(pwd)}"
f="$root/.claude/session-context.md"
warn=""
[ -f "$f" ] || warn="[session-start] ABSENT : $f — les directives permanentes (stop-slop, task-observer, mem, code-simplifier) ne sont PAS chargées."
command -v python3 >/dev/null 2>&1 || warn="$warn [session-start] python3 introuvable : contexte injecté en texte brut, et le plugin security-guidance ne pourra pas tourner."

# Plusieurs dépôts rattachés = plusieurs hooks identiques : n'injecter le texte qu'une fois par processus.
stamp="${TMPDIR:-/tmp}/.elsee-session-context-${PPID:-0}"
if [ -f "$f" ] && [ -e "$stamp" ]; then
  echo "[session-start] $(basename "$root") : directives permanentes déjà injectées par un autre dépôt de la session."
  exit 0
fi
[ -f "$f" ] && : > "$stamp" 2>/dev/null

# Plugin security-guidance. En session web, le harnais charge ses hooks avant que la marketplace
# déclarée dans settings.json soit résolue, et le plugin reste non installé (constat du 2026-09-21,
# fiche D21). On l'installe ici, de façon idempotente, et on dit ce qui s'est passé : jamais en silence.
sg=""
if command -v claude >/dev/null 2>&1; then
  if claude plugin list 2>/dev/null | grep -q "security-guidance@claude-plugins-official"; then
    sg="[session-start] security-guidance : déjà installé."
  else
    claude plugin marketplace add anthropics/claude-plugins-official >/dev/null 2>&1 || true
    if out="$(timeout 150 claude plugin install security-guidance@claude-plugins-official 2>&1)"; then
      sg="[session-start] security-guidance : installé à l'instant (portée utilisateur du conteneur). Ses hooks ne sont actifs que s'ils apparaissent à la prochaine édition : ne pas le supposer actif sans preuve."
    else
      sg="[session-start] security-guidance : INSTALLATION ÉCHOUÉE ($(printf '%s' "$out" | tail -1)). La revue de sécurité automatique n'est PAS active dans cette session."
    fi
  fi
else
  sg="[session-start] CLI claude introuvable : security-guidance ne peut pas être installé, revue automatique NON active."
fi
warn="$warn $sg"

# Accès prod en lecture (D95). Des sessions répondaient « pas d'accès aux logs » sans avoir essayé :
# on constate la présence de la clé (jamais sa valeur) et des deux outils, et on le dit d'emblée.
base="$(dirname "$root")"
read_tool="$base/dev_ops/scripts/gcp-read.mjs"
debug_dir="$base/elsee_functions_V2/functions"
if [[ "${CONFIG:-}" == *GCP_SA_KEY_B64=* || -n "${GCP_SA_KEY_B64:+1}" ]]; then
  tools=""
  [ -f "$read_tool" ] && tools="node $read_tool whoami | logs '<filtre>' --depuis 24h | doc <chemin>"
  if [ -f "$debug_dir/tools/gcp-debug.js" ]; then
    deps="prêt"; [ -d "$debug_dir/node_modules/firebase-admin" ] || deps="lancer d'abord : cd $debug_dir && npm ci"
    tools="${tools:+$tools ; }node $debug_dir/tools/gcp-debug.js logs --fn=<nom> --since=6h ($deps)"
  fi
  prod="[session-start] accès prod en lecture : DISPONIBLE (clé claude-debug présente). ${tools:-Aucun outil sur disque : rattacher dev_ops (scripts/gcp-read.mjs) ou elsee_functions_V2 (functions/tools/gcp-debug.js)}. Ne jamais répondre « pas d'accès » sans avoir lancé l'un d'eux."
else
  prod="[session-start] accès prod en lecture : ABSENTE (la variable CONFIG de cet environnement ne porte pas la clé claude-debug). Le dire à l'humain tel quel, sans contournement."
fi
warn="$warn $prod"

if [ ! -f "$f" ]; then echo "$warn"; exit 0; fi
if command -v python3 >/dev/null 2>&1; then
  python3 - "$f" "$warn" <<'PY'
import json, sys
text = open(sys.argv[1], encoding="utf-8").read()
if sys.argv[2].strip():
    text = sys.argv[2].strip() + "\n\n" + text
print(json.dumps({"hookSpecificOutput": {"hookEventName": "SessionStart", "additionalContext": text}}))
PY
else
  echo "$warn"; echo; cat "$f"
fi
exit 0
