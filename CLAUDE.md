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
- **La carte Notion suit la session** (décision D48, 2026-10-09). Une demande qui cite une carte
  (lien Notion ou `PRODUCT-<n>`) : la session la passe en `On going` avant sa première ligne de code,
  puis en `Released` à « Fermé ». Une demande sans carte : à « Fermé », la session en crée une dans le
  board (Tasks DB), titre explicite et résumé dans le corps, en `Fixed` pour un bug, en `Released` pour
  le reste. Ici, merger ne met rien en ligne (D33) : la carte passe en `Released` au merge, et son
  corps dit que le collage dans Webflow reste à faire. Détail : skill `session-dev` § 1 bis.
- **Une PR qui touche l'auth, les règles, un paiement ou des données personnelles passe par une
  revue de sécurité** (skill `security-review`), dont le résultat est collé dans la PR.

**Où aller** : `dev_ops:docs/RUNBOOK.md` (où on en est, comment on déploie, comment on revient
en arrière) · `dev_ops:docs/WORKFLOW.md` (branches et promotion) · `dev_ops:standards/`
(sécurité, stabilité, scalabilité) · `dev_ops:decisions/` (pourquoi, et D33 pour ce dépôt).

---

## 1. Ce que ce dépôt est — un dépôt léger (décision D33)

Quelques scripts de fonctionnalités sur mesure pour le site public `www.elsee.care`, construit dans
Webflow. **Rien ne se déploie depuis GitHub** : chaque fichier est un bloc de code personnalisé,
**collé à la main** dans Webflow (réglages du site ou de la page, *Custom code*), ou chargé par une
balise `<script src="https://cdn.jsdelivr.net/gh/elsee-code/elsee-webflow@<commit>/<fichier>">`
**épinglée sur un commit**, puis le site est publié depuis Webflow. Merger ne met rien en ligne ; ne
pas coller (ou ne pas changer le commit de la balise) ne met rien en ligne non plus.

D'où une stack réduite (D33) : pas d'environnement GitHub, pas de compte de service, pas de workflow
de déploiement. Une CI d'hygiène, la stack Claude Code commune, et ce fichier.

Depuis le 2026-10-23, **tout le code personnalisé du site est dans ce dépôt** : les scripts à la racine,
chargés par balise jsDelivr, et dans `webflow/` le contenu de chaque emplacement Webflow (site, pages,
modèles CMS, blocs Embed), balises comprises. `webflow/README.md` dit comment produire le kit de collage
d'un commit (`scripts/kit-collage.mjs`). Un code changé directement dans Webflow sans passer par ici
sera écrasé au prochain collage.

| Fichier | Ce qu'il fait | Où il est chargé (`webflow/…`) |
|---|---|---|
| `consentement.js` | bannière de consentement maison (spec PRODUCT-1270), quatre finalités, choix gardé six mois dans le cookie `elsee_consentement` : tient le Consent Mode de Google par finalité, charge GTM, Claydar et les pixels des pages (`<script type="text/plain" data-elsee-consentement="pixels">`) selon l'accord, et dit à PostHog d'accepter ou de refuser ; lien « Gérer mes cookies » posé dans chaque pied de page, vers `#gerer-mes-cookies`, pour rouvrir les préférences (dev_ops D92) ; en mode app (`data-contexte="app"`, D93), chargé par `webapp:web/index.html`, il ne pilote aucun traceur et annonce le choix (`window.elseeConsentement`, événement `elsee:consentement`) | `site/head.html`, toutes les pages ; `app.elsee.care` |
| `posthog-site.js` | mesure PostHog du site (pages vues, clics, cartes de chaleur, erreurs JavaScript, replays), dans le projet de l'app pour suivre une personne jusqu'à `app.elsee.care` ; sans cookie tant que la visiteuse n'a pas accepté, et sans cookie pour compter les refus ; prod seulement ; jamais d'`identify` (dev_ops D91, D92) | `site/head.html`, toutes les pages |
| `utils.js` | script global : provenance des visites (`first_source`, `session_source`, `last_touch_url`, lus par le formulaire principal), boutons `.funnelentry`, dates `.cms-date`, accordéon FAQ, URL de page, virgules des listes CMS | `site/footer.html`, toutes les pages |
| `algolia-search.js`, `maps-autocomplete.js` | moteur de l'annuaire (recherche, facettes, options, géolocalisation, cartes) et champ « lieu » (Google Places) ; même commit pour les deux | `pages/lannuaire-des-partenaires-elsee/footer.html` (`@1a7b95e`, lu en ligne le 2026-10-23) |
| `network-search.js` | recherche simplifiée de `/reseau-elsee`, qui renvoie vers l'annuaire | `pages/reseau-elsee/footer.html` |
| `new-members.js` | bloc « Nouveaux partenaires » (`network_new:true`) | bloc Embed de l'accueil et de `/reseau-elsee` (`@4cda725`, lu en ligne le 2026-10-23) |
| `simulateur-remboursement.js` | « Demander un remboursement » : calcul au taux et au plafond de la fiche, puis `signin_freemium` | `embeds/simulateur-remboursement.html`, modèles praticiens, salles de sport, marques, programmes, groupes sport |
| `fiche-carte.js` | carte Google Maps d'une fiche, adresse lue dans `data-adresse` (et `data-lieu` pour les salles) | `embeds/fiche-carte-praticien.html`, `embeds/fiche-carte-salle.html` |
| `modele-salle-de-sport.js`, `modele-marque.js`, `modele-programme.js`, `modele-mag.js`, `modele-ressource.js` | logique propre à chaque modèle CMS (listes du groupe, blocs vides masqués, virgules, sommaire, dates en français) | `modeles/<collection>/footer.html` |
| `avis.js` | étoiles et note moyenne des avis ; sur `/avis`, grille Masonry et données structurées | `pages/avis/footer.html`, `modeles/partenaires/footer.html` |
| `obtenir-mon-offre.js` | formulaire principal en étapes (`mainForm`) et devis (`quoteForm`), postés à `leadWebflow` | `pages/obtenir-mon-offre/footer.html` |
| `formulaire-lp.js` | formulaire e-mail des landings, posté à `leadWebflow` (`data-form-name`, `data-meta` sur la balise) | `pages/offres-remboursement-elsee/footer.html`, `pages/remboursement-complements-alimentaires/footer.html` |
| `devenir-therapeute.js` | menu des métiers et envoi du formulaire praticien à `sendTherapistLeadToMake` | `pages/devenir-therapeute-elsee/head.html` |
| `carte-cadeau.js` | défilement des logos, onglets, liens vers le panier de l'app (plans en dur) | `pages/carte-cadeau/footer.html` |
| `reinitialisation-mot-de-passe.js` | réinitialisation du mot de passe par Firebase Auth (**auth : structurel**) | `embeds/reset-password.html` |
| `longform.js` | le longform des landings (première question du formulaire de l'app, « Simuler mes économies ») sur n'importe quelle page : réponse et URL de la page (`source`) postées à `landingLongForm`, puis l'app à la question suivante (dev_ops D83) | `embeds/longform.html`, posé où on veut |
| `video-presentation.js` | vidéo flottante de présentation (réglages sur la balise) | `embeds/video-presentation-accueil.html`, `embeds/video-presentation-avantages.html` |
| `accueil.js`, `accordeon-remboursements.js`, `slider-hero.js`, `bienvenue.js`, `le-reseau-elsee.js`, `mon-bilan.js`, `defilement-logos.js` | logique d'une seule page (l'en-tête de chaque fichier dit laquelle) | `pages/<page>/…` ou `embeds/…` |

Les emplacements se vérifient dans Webflow ; `webflow/` se corrige dès qu'un écart est constaté.

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
   `odoo_id`, `name_search`, `network_new`. Renommer, retirer ou changer le type d'un de ces champs côté backend casse
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
   et chaque script en ligne de `webflow/` (`scripts/ci/check-js-syntax.sh`, `check-webflow.mjs`) ;
   ne coller que ce qui est mergé et vert.
6. **Une balise du dépôt est épinglée sur un commit, avec `integrity`, en `defer`.** Les scripts
   écoutent `DOMContentLoaded` : chargés en `async`, ils pourraient ne jamais démarrer. Les
   formulaires (`obtenir-mon-offre.js`, `formulaire-lp.js`, `devenir-therapeute.js`,
   `reinitialisation-mot-de-passe.js`) sont collés **en ligne** par le kit (`{{inline:…}}`) : le funnel
   et l'authentification ne dépendent pas de jsDelivr (choix de l'humain, 2026-10-23). Chaque fichier se
   protège contre un double chargement, pas contre l'ancien bloc collé resté à côté : un emplacement
   se remplace en entier.

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
verte → merge → `node scripts/kit-collage.mjs <commit> <dossier> --verifier-jsdelivr` → **remplacer
tout le contenu** de chaque emplacement Webflow qui change par celui du kit → publier le site depuis
Webflow. Le retour arrière est le même geste, avec le kit du commit précédent. Une session Claude
prépare et merge ; le collage et la publication Webflow restent une action humaine, et le « Livré »
le dit en une ligne avec les emplacements à remplacer.

Préfixes de commit : `feat:` `fix:` `chore:` `docs:` `ci:`. Documentation en français.

## 4. La stack Claude Code du dépôt — décision D21

Source unique : `dev_ops:claude/` ; copie dans `.claude/` par `dev_ops:claude/sync-stack.sh`
(`--check` refuse une copie qui diverge). **Ne rien modifier dans `.claude/` sur place.** Stack allégée (D33) : `onboarding`, `paywalls`, `skill-creator` et `find-skills` ne sont pas copiés
(`dev_ops:claude/per-repo/elsee-webflow/.sync-exclude`) ; les skills CRO du site public restent, sous les
garde-fous de D30 ; `unlazy` (D63) est posé comme ailleurs. Directives
permanentes (stop-slop, task-observer, mem, code-simplifier, sous-agents en parallèle de D63, activation autonome de `session-dev`, `unlazy` et `webapp-testing` sur déclencheur, D66) injectées par le hook `SessionStart` ;
revue de sécurité automatique par le plugin `security-guidance`, avec les règles de ce dépôt dans
`.claude/claude-security-guidance.md`. Détail : `dev_ops:claude/README.md`.
