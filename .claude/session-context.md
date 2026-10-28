# Directives permanentes de session — plateforme Elsee

Injecté à chaque démarrage par `.claude/hooks/session-start.sh`. Source : `dev_ops/claude/common/session-context.md`.
Le contrat de dev (qui merge, qui promeut, modes, fins de session) est le skill `session-dev` : il
s'active seul dès qu'une demande de dev arrive (section suivante).

## Skills à activation autonome (D66)

Quatre skills se chargent **sans qu'on les appelle**, dès que leur déclencheur est vrai, et sans
demander l'accord de l'humain. Charger = appeler le skill par son nom ; si le harnais ne le liste pas
encore (il ne découvre les skills d'un dépôt qu'après un accès à un de ses fichiers), lire directement
`.claude/skills/<nom>/SKILL.md`. Le premier message qui suit le dit en une ligne : « skill X chargé :
<déclencheur> ». Un déclencheur faux, on ne charge rien.

| Skill | Se charge quand | Avant quoi |
|---|---|---|
| `session-dev` | la demande mène à écrire du code ou de la config dans `webapp`, `elsee_functions_v2`, `internal_tool` ou `elsee-webflow` : feature, mise à jour, bug, « direct en prod », « incident », recette, GO / NO GO | le cadrage |
| `unlazy` | la demande porte deux livrables indépendants ou plus, un audit ou un relevé exhaustif, un travail réparti entre sous-agents, plus de quelques fichiers, ou un travail déjà revenu à moitié fait. En mode bug ou « incident » : seulement si le correctif touche plusieurs fichiers | le plan |
| `webapp-testing` | un changement se voit à l'écran (`webapp` : `lib/`, `web/` ; `internal_tool` : `apps/studio/` ; `elsee-webflow` : un script du site), ou un bug d'affichage est à reproduire | la livraison : les captures vont dans le « Livré » |
| `find-skills` | un besoin revient et aucun skill de la stack ne le couvre, ou l'humain demande s'il existe un skill pour quelque chose (absent d'`elsee-webflow`, D33) | la proposition |

`find-skills` cherche et propose, en une ligne : le skill, sa source, sa licence. Il n'installe jamais
rien : un skill tiers entre dans la stack par une PR `dev_ops` (copie relue, addendum, fiche), comme
`unlazy` avec D63. La session peut préparer cette PR elle-même, puis attend le GO comme pour toute
livraison.

## Lire la prod — permanent (D95)

La session **a un accès en lecture** à la prod `appelsee-2k24` : Firestore, Cloud Logging, liste des
Functions, par le compte `claude-debug`, dont la clé est dans la variable `CONFIG` de l'environnement.
`gcloud` n'est pas installé : c'est normal, l'accès ne passe pas par lui. La ligne
`[session-start] accès prod en lecture` en tête de ce contexte dit si la clé et les outils sont là.

| Depuis | Commande | Ce qu'elle lit |
|---|---|---|
| tout dépôt, `dev_ops` rattaché | `node /home/user/dev_ops/scripts/gcp-read.mjs whoami` · `logs '<filtre>' --depuis 24h` · `doc <collection>/<id>` · `requete <collection> <champ> <valeur>` | logs et documents, champs sensibles masqués, plafonné (D32) ; aucune dépendance à installer |
| `elsee_functions_V2` | `cd functions && npm ci` une fois (6 s, sinon `Cannot find module`), puis `node tools/gcp-debug.js logs --fn=<nom> --since=6h --grep=<texte>` · `doc` · `query` · `sync-diag` | logs, documents, diagnostic de la synchro Odoo ; **rien n'est masqué** |

- **Ne jamais répondre « je n'ai pas accès aux logs » ou « à la prod » sans avoir lancé
  `gcp-read.mjs whoami`** (ou une commande de `gcp-debug.js`). Un échec se cite tel quel : le message
  du bac à sable ou de l'API, pas un résumé. `Cannot find module` veut dire `npm ci`, pas « pas d'accès ».
  Un refus du bac à sable sur `gcp-debug.js` : le citer, puis passer par `gcp-read.mjs`, autorisé.
- Ligne « ABSENTE » en tête : l'environnement de cette session ne porte pas la clé. Le dire en une
  ligne à l'humain ; ne chercher aucun contournement.
- La clé ne se lit, ne se décode, ne s'affiche ni ne se copie à la main : seuls ces deux scripts y
  touchent.
- Ce qui est lu ne sort pas de la session (D32 § 5) : ni commit, ni issue, ni mémoire, ni journal
  d'observations. Une conclusion cite un identifiant, pas une donnée. Pour le document d'une membre,
  préférer `gcp-read.mjs`, qui masque.
- Ces outils ne lisent que la prod et n'écrivent nulle part. Écrire sur staging : `gcp-staging.mjs` (D74).

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

## Sous-agents en parallèle — autorisé (D63)

Deux travaux indépendants ou plus (recherches, lectures sur plusieurs dépôts, vérifications, feuilles
d'un arbre `unlazy`) partent en sous-agents `Agent` d'arrière-plan, **tous dans le même message**, sans
attendre le premier pour lancer le suivant. `.claude/settings.json` les autorise sans demande
(`permissions.allow`), jusqu'à 10 en parallèle (`CLAUDE_CODE_MAX_TOOL_USE_CONCURRENCY`). Les règles :

- un brief complet par sous-agent : son périmètre, les fichiers qu'il peut écrire, ce qu'il rapporte
  (fichier et ligne à l'appui). Deux sous-agents n'écrivent jamais le même fichier ;
- aucun sous-agent ne commit, ne pousse, ne merge, ne déploie ni n'écrit sur un système partagé
  (Firestore, Webflow, Brevo, Algolia, Odoo). La session parente relit ce qu'ils rendent, rejoue les
  contrôles du dépôt, puis committe ;
- attendre la notification de fin de chacun avant un commit, un « Livré » ou un « Fermé » ; ne jamais
  annoncer le résultat d'un sous-agent encore en cours ;
- deux clones simultanés d'un même dépôt échouent tous les deux en 429 (le proxy git de la session
  plafonne les opérations concurrentes) : clones, fetch et push se font en série, par la session parente ;
- un chantier sur plusieurs dépôts reste une session enfant par dépôt (`dev_ops:CLAUDE.md` § 3.3), pas
  un sous-agent ; un *Dynamic Workflow* seulement si l'humain l'a demandé.
