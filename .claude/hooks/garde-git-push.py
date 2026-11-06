#!/usr/bin/env python3
"""Hook PreToolUse (Bash) : refuse un `git push` vers une branche protégée (D109).

Les règles `deny` de settings.json comparent du texte : `git push origin 'main'` ou une variable y
échappent. Ce hook lit les arguments comme le shell les découpe et refuse, sans demander :
- une destination `main`, `prod`, `flutterflow`, `release/*` ou `prod/*` (branche ou tag) ;
- un push sans destination quand la branche courante est l'une d'elles ;
- un push forcé (`--force`, `-f`, `+refspec`), `--all`, `--mirror`, `--tags`, `--delete`, `:branche` ;
- une commande illisible ou une destination calculée (`$VAR`, `` ` ``) dans un `git push`.
`--force-with-lease` sur une branche de travail reste permis : c'est la suite d'un rebase.
Tout le reste passe au circuit normal des autorisations (le hook ne donne jamais d'accord).
"""
import json
import re
import shlex
import subprocess
import sys

PROTEGEES = {"main", "prod", "flutterflow"}
PREFIXES = ("release/", "prod/")
OPTIONS_INTERDITES = {"--force", "--all", "--mirror", "--tags", "--delete", "--prune", "--force-if-includes"}
OPERATEURS = {"&&", "||", ";", "|", "|&", "&", "(", ")", "\n"}
PONCTUATION = ";&|()"


def refuser(raison):
    print(json.dumps({"hookSpecificOutput": {
        "hookEventName": "PreToolUse",
        "permissionDecision": "deny",
        "permissionDecisionReason": f"garde-git-push (D109) : {raison}. Pousser seulement sa branche de travail, "
                                    "par `git push -u origin <branche>`.",
    }}, ensure_ascii=False))
    sys.exit(0)


def protegee(nom):
    for p in ("refs/heads/", "refs/tags/", "heads/", "tags/"):
        if nom.startswith(p):
            nom = nom[len(p):]
    return nom in PROTEGEES or nom.startswith(PREFIXES)


def branche_courante(dossier):
    try:
        return subprocess.run(["git", "-C", dossier, "symbolic-ref", "--short", "HEAD"],
                              capture_output=True, text=True, timeout=5).stdout.strip()
    except Exception:
        return ""


def segments(commande):
    # Un retour à la ligne sépare deux commandes comme `;` (shlex le prend pour un blanc) ; une ligne
    # continuée par `\` n'en est pas un. Dans des guillemets ou un heredoc, le `;` ajouté ne fait que
    # couper un texte qu'on ne lance pas : au pire un refus de trop, jamais un push qui passe.
    commande = commande.replace("\\\n", " ").replace("\n", " ; ")
    lex = shlex.shlex(commande, posix=True, punctuation_chars=PONCTUATION)
    lex.whitespace_split = True
    lex.commenters = ""
    courant = []
    for mot in lex:
        if mot in OPERATEURS or (mot and set(mot) <= set(PONCTUATION)):
            if courant:
                yield courant
            courant = []
        else:
            courant.append(mot)
    if courant:
        yield courant


def verifier_push(mots, dossier):
    # mots : ce qui suit `git` ; options globales (-C, -c, --git-dir...) avant le sous-commande.
    i = 0
    while i < len(mots) and mots[i].startswith("-"):
        if mots[i] in ("-C", "-c", "--git-dir", "--work-tree", "--namespace") and i + 1 < len(mots):
            if mots[i] == "-C":
                dossier = mots[i + 1]
            i += 2
        else:
            i += 1
    if i >= len(mots) or mots[i] != "push":
        return
    positionnels = []
    for arg in mots[i + 1:]:
        if arg.startswith("--"):
            if arg.split("=")[0] in OPTIONS_INTERDITES:
                refuser(f"option interdite `{arg}`")
        elif arg.startswith("-") and len(arg) > 1:
            if set(arg[1:]) & set("fd"):
                refuser(f"option interdite `{arg}` (force ou suppression)")
        else:
            positionnels.append(arg)
    refspecs = positionnels[1:]
    if not refspecs:
        courante = branche_courante(dossier)
        if not courante or protegee(courante):
            refuser(f"push sans destination depuis la branche `{courante or '?'}`")
        return
    for spec in refspecs:
        if any(c in spec for c in "$`"):
            refuser(f"destination calculée `{spec}`")
        if spec.startswith("+"):
            refuser(f"push forcé `{spec}`")
        source, deux_points, destination = spec.partition(":")
        if deux_points and not source:
            refuser(f"suppression de branche `{spec}`")
        cible = destination if deux_points else source
        if cible == "HEAD" or cible.startswith("@"):
            cible = branche_courante(dossier)
        if not cible or protegee(cible):
            refuser(f"destination protégée `{cible or spec}`")


def examiner(commande, dossier):
    try:
        morceaux = list(segments(commande))
    except ValueError:
        refuser("commande illisible autour d'un `git push`")
    for mots in morceaux:
        while mots and (re.fullmatch(r"[A-Za-z_][A-Za-z0-9_]*=.*", mots[0])
                        or mots[0] in ("command", "builtin", "nohup", "time", "env", "timeout")):
            mots = mots[1:]  # VAR=valeur git push ..., env git push ...
        if not mots:
            continue
        programme = mots[0].rsplit("/", 1)[-1]
        if programme == "git":
            verifier_push(mots[1:], dossier)
        elif programme in ("sh", "bash", "zsh") and "-c" in mots[1:-1]:
            examiner(mots[mots.index("-c") + 1], dossier)
        elif programme in ("eval", "xargs") and "push" in " ".join(mots):
            refuser(f"`git push` passé par `{programme}`")
        elif programme == "cd" and len(mots) > 1:
            dossier = mots[1]


def main():
    try:
        entree = json.load(sys.stdin)
    except Exception:
        return
    commande = (entree.get("tool_input") or {}).get("command") or ""
    if "push" in commande and "git" in commande:
        examiner(commande, entree.get("cwd") or ".")


if __name__ == "__main__":
    main()
