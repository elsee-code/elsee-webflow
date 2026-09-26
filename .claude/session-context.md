# Directives permanentes de session — plateforme Elsee

Injecté à chaque démarrage par `.claude/hooks/session-start.sh`. Source : `dev_ops/claude/common/session-context.md`.
Le contrat de dev (qui merge, qui promeut, modes, fins de session) est le skill `session-dev` : le lire en
première action, comme le demande le `CLAUDE.md`.

## stop-slop — permanent

Toute prose que tu écris — messages, documentation, descriptions de PR, commentaires, commits — suit
`.claude/skills/stop-slop/SKILL.md` : pas de filler, pas de passif, pas de tiret cadratin, pas de
« ce n'est pas X, c'est Y », pas de phrase-citation, spécifique plutôt que vague. Charge le skill au
premier texte de plus de trois lignes ; ses références s'ouvrent à la demande.

## task-observer — permanent

Avant le premier appel d'outil de toute session — et avant d'écrire ou de proposer un plan, pas
seulement avant de l'exécuter — invoque le skill `task-observer` ET exécute son Session Start
Protocol (vérification du stockage, scan des frontmatters, déclencheur de revue). Charger le fichier
sans exécuter le protocole n'active rien. Tout tour qui comportera un appel d'outil compte ; ne
classe pas la session « trop simple » d'après son premier message.

**Exception, mode bug et mode « incident »** (skill `session-dev` § 2 bis) : le protocole est reporté
à la fermeture de la session ; une observation, s'il y en a une, est notée dans le « Livré » ou le
« Fermé ». Rien au démarrage.

Le journal d'observations est **épinglé dans dev_ops** :
`[ABSOLUTE PATH]` = `/home/user/dev_ops/.claude`, donc le log est
`/home/user/dev_ops/.claude/skill-observations/observation-log/` (archives dans `archive/`).
Il est committé avec le dépôt ; `~/.claude/` ne survit pas à une session web, ne rien y écrire.
**Si dev_ops n'est pas rattaché à la session**, le log est inaccessible : n'en crée aucun ailleurs,
ne le mentionne pas dans les messages ; observe, et écris au prochain passage par dev_ops.
Aucun secret, token ni donnée personnelle dans une observation.

## mem — permanent

La mémoire de la plateforme vit dans `dev_ops/.claude/memory/` (`core.md` : résumés et pointeurs ;
`me.md` : qui est l'humain et comment il travaille ; `topics/<sujet>.md` : le détail). Commande
`/mem load | save <note> | recall <requête>` (`.claude/commands/mem.md`). Au démarrage d'une session
où dev_ops est rattaché : `/mem load`. À la fermeture (« Fermé » ou « Arrêté ») : `/mem save` d'une
ligne si quelque chose vaut d'être retenu. Sans dev_ops rattaché : rien, et on ne le signale pas.
Jamais de secret, token ni donnée personnelle dans la mémoire.

## code-simplifier — permanent

Dès que tu écris ou modifies du code (pas la doc, pas la config seule), dans le même tour et avant
tout commit : lance l'agent code-simplifier sur les fichiers modifiés, puis relance tests, lint et
typecheck du projet. Une seule passe par diff. Ne l'enchaîne pas avec la commande intégrée
/simplify. Si la simplification casse un test, annule-la plutôt que d'adapter le test.

**Exception, mode bug et mode « incident »** (skill `session-dev` § 2 bis) : la passe n'a lieu que si
le diff dépasse trente lignes modifiées ou ajoute une fonction. En dessous, elle est sautée et le
message de livraison le dit en un mot.

La simplification a lieu dans le même tour pour que la revue de fin de tour de security-guidance
porte sur le diff final.
