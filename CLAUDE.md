# Règles de travail sur ce repo (lues au démarrage de chaque session)

## Ce dépôt fait partie de la plateforme Elsee, orchestrée par `elsee-code/dev_ops`

Avant d'écrire quoi que ce soit, poser la question d'ouverture :
**feature, update, bug, ou tâche transverse (plusieurs dépôts) ?**

Si la tâche touche **plus d'un dépôt**, elle ne se traite pas ici : elle se pilote depuis
`elsee-code/dev_ops`, qui porte la carte des dépôts, l'ordre de merge et le journal. Rattacher
`dev_ops` et y ouvrir le chantier.

**Ce qui vaut ici, et qui vient de `dev_ops`** :

- **Une tâche transverse = une PR par dépôt concerné.** Jamais de push direct sur `main` d'un
  autre dépôt, y compris pour un fix d'une ligne, y compris en urgence.
- **Les ressources partagées ne s'improvisent pas.** Le projet Firebase `appelsee-2k24` est
  commun à l'app, au Studio et au backend : il n'a qu'un ruleset Firestore, qu'un ruleset
  Storage et qu'une liste d'index. **Un déploiement remplace, il ne fusionne pas.**
  `dev_ops:firebase/` en est le seul propriétaire et le seul déployeur, pour tous les projets
  (décision D8, 2026-09-13). Aucun dépôt applicatif ne déploie de règles ni d'index.
- **Une décision d'architecture = une fiche dans `dev_ops:decisions/`**, format ADR court.
  Aucune autre forme n'est acceptée.
- **Une règle métier qui a une fiche se lit dans la fiche, pas dans le code voisin.** Avant d'écrire
  ou de modifier un prédicat de filtrage ou de visibilité (qui apparaît dans le moteur, avec quel
  lien), ouvrir `dev_ops:decisions/` (D17, D18) et coller la phrase exacte de la fiche dans le
  commentaire du code.
- **Un incident = un gotcha daté** dans `dev_ops:docs/RUNBOOK.md` § 5, le jour même.
- **Une case ne se coche qu'une fois vérifiée, avec la date.**
- **Une PR qui touche l'auth, les règles, un paiement ou des données personnelles passe par une
  revue de sécurité** (skill `security-review`), dont le résultat est collé dans la PR.

**Où aller** : `dev_ops:docs/RUNBOOK.md` (où on en est, comment on déploie, comment on revient
en arrière) · `dev_ops:docs/WORKFLOW.md` (branches et promotion) · `dev_ops:standards/`
(sécurité, stabilité, scalabilité) · `dev_ops:decisions/` (pourquoi, et D33 pour ce dépôt).

---

## 1. Ce que ce dépôt est — un dépôt léger (décision D33)

Quelques scripts de fonctionnalités sur mesure pour le site public `www.elsee.care`, construit dans
Webflow. **Rien ne se déploie depuis GitHub** : chaque fichier est un bloc de code personnalisé,
**collé à la main** dans Webflow (réglages du site ou de la page, *Custom code*), puis le site est
publié depuis Webflow. Merger ne met rien en ligne ; ne pas coller ne met rien en ligne non plus.

D'où une stack réduite (D33) : pas d'environnement GitHub, pas de compte de service, pas de workflow
de déploiement. Une CI d'hygiène, la stack Claude Code commune, et ce fichier.

| Fichier | Ce qu'il fait | Où il est collé |
|---|---|---|
| `algolia-search.js` | moteur de l'annuaire des partenaires : recherche, facettes (métiers, remboursement), géolocalisation, cartes | page `lannuaire-des-partenaires-elsee` |
| `network-search.js` | recherche simplifiée de la page d'accueil, qui renvoie vers l'annuaire ; charge `algoliasearch-lite` 4.10.5 et `instantsearch.js` 4.27.0 depuis jsDelivr | page d'accueil |
| `elsee.js` | script global : accordéon FAQ, virgules des listes CMS, boutons `.funnelentry` | réglages du site |
| `utils.js` | utilitaires de page : URL affichée, dates localisées, FAQ, formulaire multi-étapes (redirige vers `app.elsee.care/mon-offre` et poste le lead à un scénario Make) | page(s) du formulaire |

Les emplacements exacts se lisent dans Webflow ; ce tableau se corrige dès qu'on les vérifie.

## 2. Invariants

1. **Ce dépôt est public, et ce qu'on colle dans Webflow l'est aussi.** Seules des valeurs publiques
   par construction y entrent : identifiant d'application Algolia, **clé de recherche** (lecture
   seule), noms d'index. Jamais une clé d'administration ou d'écriture Algolia, un jeton Webflow, Brevo,
   Odoo, une clé de compte de service. Un besoin d'écriture passe par une Cloud Function de
   `elsee_functions_v2`, jamais par le navigateur. gitleaks le vérifie en CI (`.gitleaks.toml`).
2. **Le format des enregistrements Algolia appartient à `elsee_functions_v2`** (`functions/src/indexing/`,
   synchro maison `algolia_sync`). Ces scripts **lisent** l'index `elsee_index` et ses champs :
   `name`, `url`, `photo_url`, `short_desc`, `mainjob`, `jobs`, `specialities`, `prestations`,
   `city`, `department_number`, `_geoloc`, `is_remote`, `is_at_home`, `is_elsee_network`,
   `reimbursment_percentage`, `percentage_invoice_reimbursed`, `show_search`, `show_home`, `type`,
   `odoo_id`, `name_search`. Renommer, retirer ou changer le type d'un de ces champs côté backend casse
   le moteur du site **sans erreur visible**. Un changement de champ est donc une **tâche transverse** :
   une PR backend (qui écrit l'ancien et le nouveau champ) mergée d'abord, puis la PR ici, collée
   dans Webflow, puis le retrait de l'ancien champ.
3. **Qui est visible, et avec quel lien, se décide côté backend** (D17, D18). Le filtre de ces scripts
   (`show_search`, `show_home`, facettes) n'invente pas de règle de publication : il applique ce que
   l'index dit. Une règle nouvelle se décide en fiche, pas dans ce code.
4. **Staging n'existe pas pour le site.** Le site Webflow ne lit que l'index de production
   `elsee_index` ; l'index `_staging` (D7) sert à l'app sur staging. Un test se fait sur un brouillon
   de page Webflow non publié, ou en local (§ 3).
5. **Une syntaxe cassée collée dans Webflow casse la page sans alerte.** La CI parse chaque fichier
   (`scripts/ci/check-js-syntax.sh`) ; ne coller que ce qui est mergé et vert.

## 3. Travailler

```bash
bash scripts/ci/check-js-syntax.sh          # chaque script se parse (lignes <script> retirées)
bash scripts/ci/check-pinned-actions.sh     # actions épinglées par SHA
bash scripts/ci/check-secrets-scope.sh      # secrets de déploiement sous un environment:
gitleaks dir . --config .gitleaks.toml --redact   # aucun secret
```

Pour voir un changement tourner : une page HTML locale qui charge les mêmes bibliothèques et le script,
servie par `python3 -m http.server`, et le skill `webapp-testing` pour la capture. Les requêtes Algolia
partent vers la production en lecture seule : sans effet de bord.

**Le circuit d'une modification** : branche `feat/<slug>`, `fix/<slug>` ou `claude/<slug>` → PR, CI
verte → merge → **copier le fichier mergé** dans le bloc Webflow correspondant → publier le site
depuis Webflow. Le retour arrière est le même geste, avec la version précédente du fichier
(`git show <commit>~1:<fichier>`). Une session Claude prépare et merge ; le collage et la publication
Webflow restent une action humaine, et le « Livré » le dit en une ligne avec le fichier à coller.

Préfixes de commit : `feat:` `fix:` `chore:` `docs:` `ci:`. Documentation en français.

## 4. La stack Claude Code du dépôt — décision D21

Source unique : `dev_ops:claude/` ; copie dans `.claude/` par `dev_ops:claude/sync-stack.sh`
(`--check` refuse une copie qui diverge). **Ne rien modifier dans `.claude/` sur place.** Stack allégée (D33) : `onboarding`, `paywalls`, `skill-creator` et `find-skills` ne sont pas copiés
(`dev_ops:claude/per-repo/elsee-webflow/.sync-exclude`) ; les skills CRO du site public restent, sous les
garde-fous de D30. Directives
permanentes (stop-slop, task-observer, mem, code-simplifier) injectées par le hook `SessionStart` ;
revue de sécurité automatique par le plugin `security-guidance`, avec les règles de ce dépôt dans
`.claude/claude-security-guidance.md`. Détail : `dev_ops:claude/README.md`.
