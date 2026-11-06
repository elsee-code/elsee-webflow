#!/usr/bin/env python3
"""Hook PreToolUse (Bash) : refuse un `git push` vers une branche protégée (D109).

Les règles `deny` de settings.json comparent du texte : `git push origin 'main'` ou une variable y
échappent. Ce hook lit les arguments comme le shell les découpe et refuse, sans demander :
- une destination `main`, `prod`, `flutterflow`, `release/*` ou `prod/*` (branche ou tag) ;
- un push sans destination nommée, ou vers un distant configuré en miroir ;
- toute option de `push` hors d'une liste fermée (git accepte `--forc` pour `--force`) : `--force`, `-f`,
  `+refspec`, `--all`, `--mirror`, `--tags`, `--delete`, `:branche` sont donc refusés ;
- `send-pack`, `http-push`, `subtree` (ils poussent sans `push`) ; toute sous-commande qui n'est pas une
  commande de git (un alias, d'où qu'il vienne) ; `git remote` autre que `show` et `get-url` ;
- un `-c` ou un `git config` en écriture hors d'une liste fermée de clés, `git config --edit` ;
- un nom `GIT_*` dans la commande (configuration injectée par l'environnement), `source`, `.`, `eval`,
  une option globale de git hors d'une liste fermée (`--git-dir`, `--config-env`…) ;
- un `git push` imbriqué (`$(…)`, `xargs`), une commande illisible ou une destination calculée.
`--force-with-lease` sur une branche de travail reste permis : c'est la suite d'un rebase.
Tout le reste passe au circuit normal des autorisations (le hook ne donne jamais d'accord).

Limite assumée : le hook arrête l'erreur d'une session, pas une session décidée à pousser. Une commande
qui exécute un programme arbitraire (un script écrit puis lancé, `rebase --exec`, `bisect run`…) lui
échappe par construction. La frontière est la protection de branche côté GitHub.
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
# Liste fermée des sous-commandes permises. Un alias n'y figure jamais (refusé, d'où qu'il vienne), ni
# rien qui parle au distant hors `fetch`, `pull`, `ls-remote` et `push` (send-pack, receive-pack, remote-*…).
INTEGREES = {"status", "diff", "log", "add", "commit", "fetch", "rebase", "switch", "checkout", "branch", "show",
             "rev-parse", "restore", "stash", "merge", "pull", "remote", "ls-remote", "tag", "reset", "init",
             "clone", "cherry-pick", "grep", "blame", "ls-files", "symbolic-ref", "worktree", "rm", "mv",
             "describe", "shortlog", "reflog", "cat-file", "rev-list", "merge-base", "help", "version", "push",
             "config", "am", "apply", "revert", "clean", "ls-tree", "show-ref", "for-each-ref",
             "name-rev", "range-diff", "diff-tree", "diff-files", "diff-index", "check-ignore", "check-attr",
             "hash-object", "update-index", "format-patch", "notes", "sparse-checkout", "gc", "whatchanged",
             "cherry", "var", "archive", "maintenance"}  # ni `submodule` (foreach), ni `bisect` (run)
# `git config` : options permises ; toute autre (dont celles qui prennent une valeur, `--file`, `--type`,
# `--comment`…, et fausseraient la lecture de la clé) est refusée.
OPTIONS_CONFIG_PERMISES = {"--global", "--local", "--get", "--get-all", "--get-regexp", "--list", "-l",
                           "--unset", "--unset-all", "--add", "--replace-all", "--show-origin", "--show-scope",
                           "--name-only", "--bool", "--int", "--null", "-z"}
# `-c` : liste fermée de clés sans effet sur ce qui est poussé ni sur le programme lancé.
CLE_C_PERMISE = re.compile(r"^(user\.[a-z]+|color\..*|advice\..*|core\.quotepath|safe\.directory|"
                           r"init\.defaultbranch)$", re.IGNORECASE)
# `git config` en écriture : même liste fermée, plus `pull.rebase`. Une clé y est un mot qui contient un
# point et ne commence pas par `-` (les valeurs n'en contiennent pas toujours, d'où la lecture par clé).
CLE_CONFIG_PERMISE = re.compile(CLE_C_PERMISE.pattern[:-2] + r"|pull\.rebase)$", re.IGNORECASE)
# Sous-commandes qui poussent sans s'appeler `push` : hors de INTEGREES, nommées pour un message clair.
POUSSENT = {"send-pack", "http-push", "subtree"}
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
            if mots[i] == "-c" and not CLE_C_PERMISE.match(mots[i + 1].split("=")[0]):
                refuser(f"réglage `-c {mots[i + 1]}` hors de la liste permise")
            i += 2
        elif mots[i] in OPTIONS_GLOBALES_PERMISES:
            i += 1
        else:
            refuser(f"option globale de git `{mots[i]}` hors de la liste permise")
    if i >= len(mots):
        return
    sous_commande, args = mots[i], mots[i + 1:]
    positionnels = [a for a in args if not a.startswith("-")]
    if sous_commande == "config":
        verifier_config(args, positionnels)
    elif sous_commande == "remote":
        if positionnels and positionnels[0] not in ("show", "get-url"):
            refuser(f"`git remote {positionnels[0]}` : les distants ne se modifient pas depuis une session")
    elif sous_commande == "push":
        verifier_push(args, dossier)
    elif sous_commande in POUSSENT:
        refuser(f"`git {sous_commande}` pousse sans passer par `git push`")
    elif sous_commande not in INTEGREES:
        refuser(f"sous-commande git `{sous_commande}` hors de la liste permise (un alias peut pousser)")


def verifier_config(args, positionnels):
    # Ancienne forme `git config [--global] <clé> [<valeur>]`, nouvelle `git config set|unset <clé> …`.
    if positionnels[:1] == ["edit"]:
        refuser("`git config edit` : écriture libre dans la configuration git")
    option = next((a for a in args if a.startswith("-") and a not in OPTIONS_CONFIG_PERMISES), None)
    if option:
        refuser(f"option `{option}` de `git config` hors de la liste permise")
    if not positionnels or positionnels[0] in ("get", "list"):
        return
    nouvelle = positionnels[0] in ("set", "unset", "rename-section", "remove-section")
    cle = positionnels[1] if nouvelle and len(positionnels) > 1 else positionnels[0]
    ecriture = nouvelle or len(positionnels) > 1 or any(
        a.split("=")[0] in ("--unset", "--unset-all", "--add", "--replace-all", "--rename-section",
                            "--remove-section") for a in args)
    lecture = any(a in ("--get", "--get-all", "--get-regexp", "--list", "-l") for a in args)
    if ecriture and not lecture and not CLE_CONFIG_PERMISE.match(cle):
        refuser(f"écriture de `{cle}` dans la configuration git, hors de la liste permise")


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
        # Sans destination, ce qui part dépend de la configuration et de l'environnement, que le hook ne
        # voit pas en entier : le contrat demande `git push -u origin <branche>`, rien d'autre.
        refuser("push sans destination nommée")
    if git_lire(dossier, "config", "--get", f"remote.{positionnels[0]}.mirror").lower() == "true":
        refuser(f"distant `{positionnels[0]}` configuré en miroir")
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
    # Le nom suffit (`read GIT_X`, `printf -v GIT_X`, `export GIT_X`, `${GIT_X}`) ; `source` aussi, qui
    # peut tout poser sans que le nom paraisse.
    for mots in morceaux:
        nom = next((t.group(0) for m in mots for t in [re.search(r"GIT_[A-Za-z0-9_]+", m)] if t), None)
        if nom:
            refuser(f"variable `{nom}` nommée dans une commande git")
    for mots in morceaux:
        while mots and (re.fullmatch(r"[A-Za-z_][A-Za-z0-9_]*\+?=.*", mots[0])
                        or mots[0] in ("command", "builtin", "nohup", "time", "env", "timeout", "exec",
                                       "if", "then", "else", "elif", "do", "while", "until", "{", "!")):
            mots = mots[1:]  # VAR=valeur git push ..., env git push ..., then git push ...
        if not mots:
            continue
        programme = mots[0].rsplit("/", 1)[-1]
        if programme in ("source", ".", "eval"):
            refuser(f"`{programme}` dans une commande git")
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
