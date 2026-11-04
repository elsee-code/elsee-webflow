#!/usr/bin/env bash
# UserPromptSubmit — un message qui commence par /design : rappelle, dans le contexte de ce tour,
# de poser 🫟 en tête du titre de la session (directive « /design » de session-context.md).
# Ne renomme rien lui-même : seul le modèle a les outils get_session / set_session_title.
# Source : dev_ops/claude/common/hooks/design-title.sh — ne pas modifier la copie sur place.
set -u
input="$(cat)"

if command -v python3 >/dev/null 2>&1; then
  prompt="$(printf '%s' "$input" | python3 -c 'import json,sys; print(json.load(sys.stdin).get("prompt","")[:40])' 2>/dev/null)"
else
  # Repli sans python3 : le champ "prompt" brut du JSON reçu.
  prompt="$(printf '%s' "$input" | sed -n 's/.*"prompt"[[:space:]]*:[[:space:]]*"\(\(\\[nrt]\|[[:space:]]\)*\/[^"[:space:]\\]*\).*/\1/p' | sed 's/\\[nrt]//g' | head -c 40)"
fi

shopt -s nocasematch
[[ "$prompt" =~ ^[[:space:]]*/design([[:space:]]|$) ]] || exit 0

# Plusieurs dépôts rattachés = plusieurs hooks identiques : un seul rappel par message.
key="$(printf '%s' "$input" | cksum | cut -d' ' -f1)"
lock="${TMPDIR:-/tmp}/.elsee-design-$key"
find "$lock" -maxdepth 0 -mmin +1 -exec rmdir {} \; 2>/dev/null
mkdir "$lock" 2>/dev/null || exit 0

echo "[/design] Ce message commence par /design. Avant tout autre outil : poser 🫟 en tête du titre de la session — get_session sans session_id, puis set_session_title « 🫟 <titre courant> » (titre qui commence déjà par 🫟 : ne rien faire ; outils différés : ToolSearch select:mcp__claude-code-remote__get_session,mcp__claude-code-remote__set_session_title ; sans ces outils : rien, sans le signaler)."
exit 0
