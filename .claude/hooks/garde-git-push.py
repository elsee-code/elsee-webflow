#!/usr/bin/env python3
"""Hook PreToolUse (Bash) : refuse un `git push` vers une branche protégée (D109).

Les règles `deny` de settings.json comparent du texte : `git push origin 'main'` ou une variable y
échappent. Ce hook lit les arguments comme le shell les découpe et refuse, sans demander :
- une destination `main`, `prod`, `flutterflow`, `release/*` ou `prod/*` (branche ou tag) ;
- un push sans destination quand la branche courante, ou sa destination de push, est l'une d'elles ;
- toute option de `push` hors d'une liste fermée (git accepte `--forc` pour `--force`) : `--force`, `-f`,
  `+refspec`, `--all`, `--mirror`, `--tags`, `--delete`, `:branche` sont donc refusés ;
- un alias git qui pousse, un `-c` ou un `git config` qui touche aux alias, au push ou aux URL ;
- une variable `GIT_*` posée dans la commande (configuration injectée), une option globale de git hors
  d'une liste fermée (`--git-dir`, `--config-env`…) ;
- un `git push` imbriqué (`$(…)`, `xargs`, `eval`), une commande illisible ou une destination calculée.
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
# Liste fermée : git accepte les abréviations (`--forc` = `--force`), donc tout le reste est refusé.
OPTIONS_PUSH_PERMISES = {"--set-upstream", "--dry-run", "--no-verify", "--verbose", "--quiet", "--porcelain",
                         "--progress", "--no-progress", "--force-with-lease", "--atomic"}
COURTES_PUSH_PERMISES = set("unvq")
OPTIONS_GLOBALES_PERMISES = {"--no-pager", "-P", "-p", "--paginate", "--no-optional-locks", "--literal-pathspecs",
                             "--version", "--help"}
# Sous-commandes qu'un alias ne peut pas masquer (git ignore un alias qui porte le nom d'une commande).
INTEGREES = {"status", "diff", "log", "add", "commit", "fetch", "rebase", "switch", "checkout", "branch", "show",
             "rev-parse", "restore", "stash", "merge", "pull", "remote", "ls-remote", "tag", "reset", "init",
             "clone", "cherry-pick", "grep", "blame", "ls-files", "symbolic-ref", "worktree", "rm", "mv",
             "describe", "shortlog", "reflog", "cat-file", "rev-list", "merge-base", "help", "version"}
CONFIG_SENSIBLE = re.compile(r"^(alias\.|push\.|url\.|remote\..*\.(push|pushurl)$)", re.IGNORECASE)
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


def git_lire(dossier, *args):
    try:
        return subprocess.run(["git", "-C", dossier, *args], capture_output=True, text=True, timeout=5).stdout.strip()
    except Exception:
        return ""


def branche_courante(dossier):
    return git_lire(dossier, "symbolic-ref", "--short", "HEAD")


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


def verifier_git(mots, dossier):
    # mots : ce qui suit `git` ; options globales (-C, -c, --git-dir...) avant la sous-commande.
    # Liste fermée d'options globales : `--git-dir`, `--work-tree`, `--config-env`… changeraient le
    # dépôt ou la configuration que le hook lit, sans qu'il le voie.
    i = 0
    while i < len(mots) and mots[i].startswith("-"):
        if mots[i] in ("-C", "-c") and i + 1 < len(mots):
            if mots[i] == "-C":
                dossier = mots[i + 1]
            if mots[i] == "-c" and CONFIG_SENSIBLE.match(mots[i + 1].split("=")[0]):
                refuser(f"réglage `-c {mots[i + 1]}` qui peut changer ce que pousse git")
            i += 2
        elif mots[i] in OPTIONS_GLOBALES_PERMISES:
            i += 1
        else:
            refuser(f"option globale de git `{mots[i]}` hors de la liste permise")
    if i >= len(mots):
        return
    sous_commande, args = mots[i], mots[i + 1:]
    if sous_commande == "config":
        lecture = any(a in ("--get", "--get-all", "--get-regexp", "--list", "-l") for a in args)
        if not lecture and any(CONFIG_SENSIBLE.match(a) for a in args):
            refuser("écriture d'un alias ou d'un réglage de push dans la configuration git")
    elif sous_commande == "push":
        verifier_push(args, dossier)
    elif sous_commande not in INTEGREES and "push" in git_lire(dossier, "config", "--get", f"alias.{sous_commande}"):
        refuser(f"alias git `{sous_commande}` qui pousse")


def verifier_push(args, dossier):
    positionnels = []
    for arg in args:
        if arg.startswith("--"):
            if arg.split("=")[0] not in OPTIONS_PUSH_PERMISES:
                refuser(f"option `{arg}` hors de la liste permise")
        elif arg.startswith("-") and len(arg) > 1:
            if not set(arg[1:]) <= COURTES_PUSH_PERMISES:
                refuser(f"option `{arg}` hors de la liste permise")
        else:
            positionnels.append(arg)
    refspecs = positionnels[1:]
    if not refspecs:
        courante = branche_courante(dossier)
        # La destination réelle d'un push sans refspec : la branche amont de push, sans le nom du distant.
        amont = git_lire(dossier, "rev-parse", "--abbrev-ref", "@{push}").partition("/")[2]
        if not courante or protegee(courante) or (amont and protegee(amont)):
            refuser(f"push sans destination depuis `{courante or '?'}` vers `{amont or courante or '?'}`")
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
        if "push" in commande:
            refuser("commande illisible autour d'un `git push`")
        return
    # Une variable GIT_* (GIT_CONFIG_COUNT, GIT_CONFIG_KEY_0, GIT_DIR…) injecte un alias, un réglage de
    # push ou un autre dépôt sans passer par la ligne de commande : refusée, qu'elle soit posée devant la
    # commande, après `env` ou par `export`.
    for mots in morceaux:
        affectation = next((m for m in mots if re.fullmatch(r"GIT_[A-Za-z0-9_]*=.*", m)), None)
        if affectation:
            refuser(f"variable `{affectation.split('=')[0]}` posée dans une commande git")
    for mots in morceaux:
        while mots and (re.fullmatch(r"[A-Za-z_][A-Za-z0-9_]*=.*", mots[0])
                        or mots[0] in ("command", "builtin", "nohup", "time", "env", "timeout", "exec",
                                       "if", "then", "else", "elif", "do", "while", "until", "{", "!")):
            mots = mots[1:]  # VAR=valeur git push ..., env git push ..., then git push ...
        if not mots:
            continue
        programme = mots[0].rsplit("/", 1)[-1]
        drapeau_c = next((k for k, m in enumerate(mots[1:-1], 1) if re.fullmatch(r"-[A-Za-z]*c[A-Za-z]*", m)), None)
        if programme == "git":
            verifier_git(mots[1:], dossier)
        elif programme in ("sh", "bash", "zsh", "dash") and drapeau_c:
            examiner(mots[drapeau_c + 1], dossier)
        elif programme in ("cd", "pushd") and len(mots) > 1:
            dossier = mots[1]
        elif any(re.search(r"(^|[^\w.-])git$", m) and "push" in mots[k + 1:] for k, m in enumerate(mots[1:], 1)):
            # `echo $(git push …)`, `xargs git push`, `eval git push` : un git imbriqué qu'on ne lit pas.
            refuser(f"`git push` imbriqué dans `{programme}`")


def main():
    try:
        entree = json.load(sys.stdin)
    except Exception:
        return
    commande = (entree.get("tool_input") or {}).get("command") or ""
    if "git" in commande:  # pas seulement « push » : un alias git peut pousser sans le mot
        examiner(commande, entree.get("cwd") or ".")


if __name__ == "__main__":
    main()
