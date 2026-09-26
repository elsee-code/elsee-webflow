---
name: session-dev
description: Contrat d'une session de développement sur un dépôt applicatif Elsee (webapp, elsee_functions_v2, internal_tool) — nouvelle feature, mise à jour ou correction de bug. À charger dès qu'une spec, un correctif, un « direct en prod », une livraison, une recette ou un GO / NO GO est en jeu. Fixe le mode de la session, le cadrage, ce qui est livré et sous quelle forme, qui merge et qui promeut, et ce qui termine la session.
---

# session-dev — le contrat d'une session de développement

Forme opposable de la décision
[`dev_ops:decisions/D19-modes-de-livraison-et-acteurs.md`](https://github.com/elsee-code/dev_ops/blob/main/decisions/D19-modes-de-livraison-et-acteurs.md).
La source de ce fichier est `dev_ops:claude/common/skills/session-dev/SKILL.md` ; la copie dans
`.claude/skills/` d'un dépôt ne se modifie pas sur place, elle se resynchronise (`dev_ops:claude/sync-stack.sh`).

Ce skill ne s'applique pas aux tâches structurelles (§ 1) : celles-là se pilotent depuis `dev_ops`,
question d'ouverture (4).

## 0. Les rôles

| L'humain fait le produit | La session fait le dev |
|---|---|
| écrit la demande | lit le mode (§ 1), cadre (§ 2), code, teste |
| répond aux questions de cadrage | ouvre la PR, la merge, déploie sur staging, promeut |
| recette fonctionnellement, sur l'URL donnée | livre au format fixe (§ 4) |
| dit **GO** ou **NO GO** | exécute le GO et ferme (§ 5) |

**La session ne demande jamais à l'humain de merger une PR, de lancer un workflow, de promouvoir ni
de relire du code.** Tout ce dont elle a besoin de lui tient en deux formes : une réponse à une
question de cadrage, ou un GO. Une instruction donnée dans la demande vaut autorisation durable pour
toute la session : on ne la redemande pas.

## 1. Lire le mode dans la demande — avant toute autre chose

C'est l'humain qui qualifie le risque, jamais la session. Elle lit la demande et y cherche l'un de ces
trois mots. Le mode est fixé pour toute la durée de la session.

| L'humain a écrit | La session fait | Elle s'arrête |
|---|---|---|
| **« direct en prod »** | contrôles (CI, tests, lint, build) → merge ou push → promotion → un message « Fermé ». Aucune question, aucune recette. Une CI rouge se corrige, elle ne se signale pas. | nulle part |
| **rien de particulier** | le circuit complet : cadrage → dev → « Livré » avec l'URL de recette → attente du GO → exécution → « Fermé » | à « Livré », jusqu'au GO ou NO GO |
| **« incident »** | « direct en prod » **plus** le mode bug du § 2 bis : diagnostic en trois lignes, journal court sous « À surveiller », et le gotcha daté au RUNBOOK de `dev_ops` le jour même (une PR là-bas, ou une ligne dans le « Fermé » si dev_ops n'est pas rattaché) | nulle part |
| **« structurel »** — ou la session le constate | s'arrête en une ligne et renvoie vers `dev_ops`, question d'ouverture (4) : fiche de décision, une PR par dépôt, revue de sécurité | au cadrage |

**Est structurel**, quel que soit le mot employé : ce qui touche l'authentification ou les rôles, les
règles Firestore ou Storage, les index, un paiement, des données personnelles ou de santé, un secret,
un compte de service, un workflow de déploiement ; et toute tâche qui traverse **plus d'un dépôt**.
C'est la liste du § 5 de `dev_ops:standards/securite.md`.

**La réserve, même en « direct en prod »** : si le changement touche un fichier de cette liste, la
session s'arrête en une ligne — « ça touche `<fichier>`, qui est structurel, je continue ? » — et
attend la réponse. Une ligne, une réponse, elle repart. C'est la famille de changements qui détruit
en vert et sans log (règles Storage écrasées le 2026-08-22).

## 2. Cadrage : des questions, jamais une interprétation

- **La demande est claire** → pas de fiche. Une ligne : « Compris : `<périmètre en une phrase>`. Je
  fais. » Et le travail commence.
- **Quelque chose est flou** → une fiche de cadrage, et rien d'autre tant qu'elle n'est pas close :
  1. ce que j'ai compris, en une phrase ;
  2. le périmètre **en négatif** : ce que je ne toucherai pas ;
  3. les critères d'acceptation, en phrases testables ;
  4. les **questions bloquantes**, numérotées — pas de code avant que chacune ait sa réponse ;
  5. les **choix que je tranche moi** si l'humain ne dit rien — son silence vaut oui.

Est flou ce qui admet deux lectures menant à deux travaux différents. Un choix technique de routine
n'est pas flou : on le tranche et on le note dans la livraison. Un flou ne devient jamais une
hypothèse silencieuse.

### 2 bis. Mode bug : léger sur l'analyse, pas sur la preuve

Quand la question d'ouverture donne **(3) bug** — un comportement en prod qui contredit ce qui est
attendu — la session allège quatre choses et n'en allège aucune autre.

1. **Pas de fiche : un diagnostic en trois lignes**, avant la première modification.
   - *Symptôme* : où, comment, reproduit ou non.
   - *Cause* : le fichier et la ligne, ou « inconnue ».
   - *Preuve* : la ligne de log, l'identifiant du document, la capture, le test qui échoue. Sur le
     backend, `node tools/gcp-debug.js` lit la prod ; sur l'app, la console du navigateur et
     `version.json`.
   **Sans preuve, on cherche, on ne corrige pas à l'aveugle** : la session le dit en une ligne et
   continue à chercher. C'est là que la qualité se joue, pas dans le volume du cadrage.
2. **task-observer est reporté à la fermeture** : une observation notée dans le « Livré » ou le
   « Fermé » si quelque chose vaut d'être retenu, pas de protocole au démarrage.
3. **L'agent code-simplifier ne passe qu'au-dessus d'un seuil** : plus de trente lignes modifiées,
   ou une fonction nouvelle. En dessous, la passe est sautée et le « Livré » le dit en un mot
   (« simplification : sautée, 4 lignes »).
4. **Le journal de recette est court** (§ 4, « journal court »).

Ce qui ne bouge pas en mode bug : tests et contrôles du dépôt avant tout push, un test ajouté quand
c'est possible, security-guidance, la promotion en deux temps (D14, D24), la réserve structurelle du § 1,
et la règle « toujours une branche et une PR » — sur `webapp`, la branche d'un bug est `hotfix/<slug>`,
coupée du tag `prod/*` courant, jamais de `main` (D24).

## 3. Développement

**La question d'ouverture, avec son critère.** Un **bug** est un comportement en production qui
contredit ce qui est attendu ou spécifié. **Tout le reste** — configuration, balises, textes,
dépendances, refactorisation, nouvelle capacité — est une feature ou une mise à jour, et passe par
une branche et une PR. **Le push direct sur `main` n'existe sur aucun dépôt** (D24, 2026-09-22) : un bug
de `webapp` part par une branche `hotfix/<slug>` **coupée du tag `prod/*` courant**
(`git switch -c hotfix/<slug> prod/<horodatage>`), jamais de `main`, pour partir seul, sans les chantiers
en cours. Le mode « direct en prod » change ce qu'on saute (la recette), pas le véhicule.

| Dépôt | Branche et PR | Ce que le merge fait | Push direct sur `main` |
|---|---|---|---|
| `webapp` | feature ou update : `feat/<slug>`, `chore/<slug>` ou la branche `claude/<slug>` de la session + PR ; **bug : `hotfix/<slug>` depuis le tag `prod/*`** + PR (D24). Chaque CI verte de la PR publie un **canal de preview** propre à la branche (`deploy-preview.yml`, `hotfix/**` compris ; depuis D25, **PR ouverte requise** : l'ouvrir dès le premier push) : la recette se fait avant merge, sans partager staging. | déploie **staging seulement** ; preprod est promue depuis staging, la prod depuis preprod (D24, D14). Pour un hotfix, le merge vient **après** le build prod, en merge commit, jamais squash | jamais |
| `elsee_functions_v2` | toujours une branche + PR | **déploie la prod** (scope calculé sur le diff) | jamais |
| `internal_tool` | toujours une branche + PR | **déploie la prod** (Functions `studio` + Hosting) | jamais |

Ce que la session fait, dans tous les modes :

- lit le `CLAUDE.md` du dépôt et respecte ses invariants ; avant d'écrire ou de modifier un prédicat
  d'éligibilité, de publication ou de filtrage, ouvre la fiche de `dev_ops:decisions/` concernée et
  colle sa phrase exacte dans le commentaire ;
- joue les contrôles du dépôt, ceux que la CI joue (`webapp` : `flutter analyze`, `flutter test`,
  `flutter build web` ; `elsee_functions_v2` : `npm run lint`, `npm run typecheck`, `npm test`, sans
  committer `functions/lib/` ; `internal_tool` : `npm run build`, `npm run check:tokens`, ses tests) ;
- ajoute un test à tout bug corrigé quand c'est possible, et teste ce qu'elle touche ;
- pour tout écran, vérifie **visuellement** dans Chromium (Playwright, Firebase bouchonné) et garde
  les captures pour la livraison ;
- **ne touche pas** à ce qui n'est pas dans le périmètre, y compris un défaut évident à côté (§ 6) ;
- **économise les minutes GitHub** (D25) : chaque envoi sur une PR prête relance toute la vérification
  (~5 min sur `webapp`). Elle joue ses contrôles en local, ouvre la PR **en brouillon** si elle veut
  la voir tôt (aucune vérification en brouillon), et la passe en « prête » **une fois**, travail fini.
  Un NO GO se corrige en **un seul** envoi, pas une série.

## 4. Livraison : un format fixe, et rien d'autre

Le message « Livré » contient exactement ces cinq blocs :

1. **Ce qui change**, en deux ou trois lignes.
2. **Où recetter** : l'URL exacte (table ci-dessous). Une livraison sans URL n'est pas une livraison.
3. **Le journal de recette** (format ci-dessous), copié aussi dans la description de la PR.
4. **Ce que j'ai vérifié** : contrôles joués, date, captures.
5. **La question** : GO ou NO GO.

Ni prochaines étapes, ni suggestions, ni trouvailles à côté, ni question hors périmètre.

### Le journal de recette

Deux tableaux, rien d'autre. L'humain coche le premier ; un NO GO cite le numéro de la ligne qui a échoué.

**A. Ce qu'il faut vérifier** — une ligne par critère d'acceptation du cadrage, puis une ligne par
écran, fonction ou parcours **voisin** touché par le diff (la non-régression), puis une ligne par
environnement quand ils diffèrent (staging seul, ou staging puis preprod).

| # | Où (URL ou écran) | Action | Attendu | Coché |
|---|---|---|---|---|
| 1 | … | … | … | ☐ |

**B. Les scénarios de crash** — ce qui peut casser avec cette livraison, comment on le verrait, et
comment on revient en arrière. Au minimum, quand ils s'appliquent :

- le changement lui-même échoue (exception, écran blanc, appel en erreur) ;
- une dépendance n'est pas dans l'ordre : règle ou index pas déployé, proxy ou backend pas encore en
  prod, `callName` inconnu (D8, D10, D13) ;
- une donnée aux bords : champ absent, vide, ancien format, document sans le nouveau champ ;
- un effet de bord réel : déclencheur Webflow, Algolia, Brevo, Odoo, paiement, e-mail ;
- ce qui est promu **en plus** de la livraison : les autres commits du lot (D14).

| Scénario | Symptôme visible | Comment le détecter | Retour arrière |
|---|---|---|---|
| … | … | écran, log Cloud Logging, `version.json`, alerte Discord | voir ci-dessous |

**Journal court (mode bug, § 2 bis)** : tableau A à deux ou trois lignes — le symptôme corrigé, le voisin
immédiat, l'environnement — et tableau B à deux lignes — le correctif échoue, et le retour arrière.
Rien de plus, sauf si le diff touche une dépendance hors ordre ou un effet de bord réel : alors la ligne
correspondante s'ajoute.

Retour arrière par dépôt : `webapp` → Firebase Console, Hosting, *Restaurer* la release précédente, ou
*Deploy Production* en mode `build` sur le tag `prod/*` précédent (`dev_ops:docs/RUNBOOK.md` § 3.4) ;
`elsee_functions_v2` → redéployer le commit précédent (`functions.yml`, `functionList` = les fonctions
touchées) ; `internal_tool` → Firebase Console, Hosting `appelsee-studio`, *Rollback*, et redéployer le
commit précédent pour les Functions `studio` ; règles et index → `dev_ops:firebase/` seulement.

| Dépôt | La session, une fois la CI verte et sa propre recette faite | L'humain recette sur |
|---|---|---|
| `webapp` | pousse sa branche et passe la PR en « prête » : après la CI verte, le run *Deploy Preview* publie l'URL du canal (résumé du run, D25 ; aucune preview en brouillon) ; la PR reste ouverte jusqu'au GO. Un hotfix se recette au même endroit, son canal est celui de la branche `hotfix/*`. | l'URL du preview, `https://appelsee-staging--<canal>-<hash>.web.app`, backend staging (kill-switch, Stripe et Odoo de test), **sans envoi de fichier ni popup OAuth** (limites CORS et Auth : recette de ces gestes sur `https://appelsee-staging.web.app` après merge). `https://preprod-elsee.web.app` existe aussi, mais **écrit dans la prod** — le dire si on le propose. |
| `elsee_functions_v2` | déploie **la branche** sur staging : *Run workflow* de `functions.yml`, `project = appelsee-staging`, `functionList` = les fonctions touchées ; la PR reste ouverte | l'app sur `https://appelsee-staging.web.app`, qui parle au backend staging |
| `internal_tool` | ouvre la PR ; le workflow *Preview de PR* publie un canal Hosting | l'URL du preview, lue dans la PR — **sur la base de production** : le dire dans la livraison |

En mode « direct en prod », il n'y a pas de « Livré » : la session enchaîne le § 5 dès la CI verte, et
le message « Fermé » porte le tableau **B** seul, sous le titre « À surveiller ».

## 5. GO → la session exécute, puis « Fermé »

- **`webapp`, feature ou update** (D24) : merger la PR (merge commit) ; attendre *Deploy Staging* vert.
  Puis *Deploy Preprod* (`deploy-preprod.yml`, ref `main`) en mode `audit`, lire le lot ; **s'il contient
  d'autres commits que ceux de cette session**, s'arrêter en une ligne avec leur liste et attendre :
  promouvoir emporte tout ce que staging sert. Sinon relancer en `promote`, `confirm = DEPLOY-PREPROD`,
  `portee = <le nombre lu>` ; vérifier `https://preprod-elsee.web.app/version.json`. Puis *Deploy
  Production* (ref `main`) en mode `audit`, même lecture du lot (D14), puis `clone-from-preprod`,
  `confirm = DEPLOY-PROD`, `portee = <le nombre lu>`. Vérifier que `https://app.elsee.care/version.json`
  sert le bon commit. Le GO de l'humain vaut pour les deux promotions ; la recette preprod est un
  second regard sur données réelles, pas une seconde attente.
- **`webapp`, bug** (D24) : *Deploy Production* (**ref = la branche `hotfix/*`**) en mode `build`,
  `confirm = DEPLOY-PROD` ; vérifier `https://app.elsee.care/version.json` (`sha` = la tête de la branche,
  nouveau tag `prod/*`). **Puis merger la PR dans `main`** en merge commit, jamais squash ; résoudre ici
  un conflit éventuel, après le déploiement ; attendre *Deploy Staging* vert et vérifier que le correctif
  tient. Ne pas promouvoir preprod : elle recevra le correctif à la prochaine promotion normale.
- **`elsee_functions_v2`** et **`internal_tool`** : merger la PR (merge commit, comme les autres PR du
  dépôt). Le merge est le déploiement : attendre le run vert.

Puis le message **« Fermé »** : ce qui est en prod, le commit ou le tag, l'URL, et en « direct en prod »
le tableau « À surveiller » (§ 4 B). La session est finie.

Les trois seuls états qui terminent une session : **Livré** (attente du GO), **Fermé** (GO exécuté),
**Arrêté** (bloqué : ce qui bloque et ce qu'il faut pour reprendre). Un **NO GO** reste dans la même
session — correction, puis un nouveau « Livré ». Une **nouvelle demande**, même petite, même pendant une
recette, ouvre une nouvelle session : la session le dit en une ligne et ne la traite pas.

## 6. Pas de digression

Ce que la session remarque à côté du périmètre — un bug voisin, une dette, une incohérence — n'entre
**ni dans un message, ni dans une PR, ni dans un commit**. Il est **mis de côté en silence** : une issue
GitHub dans le dépôt concerné, titre préfixé `[à trier]`, trois lignes au plus (fichier, symptôme, date).
Les audits de l'humain la reprendront ; la session n'en parle pas.

Deux exceptions, et seulement deux :

- ce qui **empêche de livrer la demande elle-même** n'est pas une digression, c'est une question de
  cadrage (§ 2) ;
- une **donnée de production en danger immédiat** se dit en une ligne.

## 7. Ce que la session ne fait jamais

- demander à l'humain de merger, promouvoir, lancer un workflow ou relire ;
- redemander une autorisation déjà donnée dans la demande ;
- interpréter un flou au lieu de poser la question ;
- élargir le périmètre, même d'une ligne, même pour un fix évident ;
- pousser directement sur `main`, de quelque dépôt que ce soit ; couper un `hotfix/*` depuis `main`, ou
  squasher sa PR (D24) ;
- sauter les contrôles en mode « direct en prod » : « direct » saute la recette, pas la CI ;
- continuer sur un fichier structurel sans avoir posé la ligne de réserve du § 1 ;
- terminer dans un autre état que Livré, Fermé ou Arrêté ;
- corriger un bug sans preuve du symptôme et de la cause (§ 2 bis), même en mode « incident ».
