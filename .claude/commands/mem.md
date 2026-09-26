---
description: Mémoire de la plateforme Elsee (dev_ops/.claude/memory) — /mem load | save <note> | recall <requête>
---

Commande `/mem` avec les arguments : `$ARGUMENTS`

La mémoire vit **uniquement** dans `dev_ops/.claude/memory/` :

- `core.md` — résumés courts et pointeurs (vers `docs/RUNBOOK.md`, `decisions/`, `journal/`, `topics/`).
  Jamais le détail : une entrée de `core.md` tient en une ligne et renvoie ailleurs.
- `me.md` — qui est l'humain, comment il travaille, ce qu'il veut et ne veut pas.
- `topics/<sujet>.md` — le détail d'un sujet, un fichier par sujet, daté.

Résous d'abord le dossier : `$CLAUDE_PROJECT_DIR/.claude/memory` si le projet est dev_ops, sinon
`/home/user/dev_ops/.claude/memory` ou `../dev_ops/.claude/memory` s'il existe. **S'il n'existe pas,
dev_ops n'est pas rattaché : réponds en une ligne que la mémoire est inaccessible et n'écris rien
ailleurs.**

## `load`
Lis `core.md` et `me.md` en entier. Ne lis un `topics/` que s'il est pointé par une ligne de `core.md`
qui concerne la tâche en cours. Résume en trois lignes au plus ce qui compte pour la session.

## `save <note>`
1. Écris ou complète `topics/<sujet>.md` (sujet en kebab-case, dérivé de la note), avec la date du jour.
2. Ajoute ou mets à jour **une** ligne dans `core.md` : résumé + pointeur vers le topic ou vers le
   document de dev_ops qui fait foi (`decisions/D<n>`, `docs/RUNBOOK.md § x`).
3. Ce qui est une décision d'architecture n'entre pas ici : c'est une fiche dans `decisions/`. Ce qui
   est un incident : un gotcha au RUNBOOK. La mémoire pointe, elle ne duplique pas.
4. Commit sur la branche courante de dev_ops : `docs(mem): <sujet>`.

## `recall <requête>`
Cherche la requête dans `core.md`, puis dans `topics/`, puis dans `me.md`. Réponds avec les lignes
trouvées et leurs pointeurs, rien de plus.

## Interdits
Aucun secret, token, clé, identifiant de compte de service, e-mail nominatif ni donnée personnelle,
en clair ou encodé. En cas de doute, pointe vers `standards/securite.md` au lieu d'écrire la valeur.
