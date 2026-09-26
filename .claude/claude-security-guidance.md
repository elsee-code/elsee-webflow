# Règles de sécurité propres à elsee-webflow (scripts du site Webflow)

Tirées du `CLAUDE.md` de ce dépôt et de la fiche D33.

- **Le dépôt est public, et tout ce qu'il contient finit collé dans une page publique.** Signaler toute
  valeur qui n'est pas publique par construction : clé d'administration ou d'écriture Algolia, jeton
  Webflow, Brevo, Odoo, Make, clé de compte de service, identifiant Firebase autre que la config web.
  Seules la clé de **recherche** Algolia, l'identifiant d'application et les noms d'index y ont leur place.
- **Aucune écriture depuis le navigateur vers un service tiers avec une clé** : un besoin d'écriture
  passe par une Cloud Function de `elsee_functions_v2`. Signaler tout `fetch` nouveau qui porte une clé
  ou un jeton.
- **Données personnelles** : le formulaire multi-étapes (`utils.js`) envoie nom, prénom et e-mail à un
  webhook Make et dans l'URL de `app.elsee.care/mon-offre`. Signaler tout champ personnel nouveau
  envoyé, tout nouveau destinataire, et tout `console.log` de ces valeurs.
- **HTML injecté** : les cartes du moteur sont construites en chaînes HTML à partir des enregistrements
  Algolia. Signaler toute valeur d'enregistrement insérée dans du HTML sans échappement (nom, description,
  URL), et tout `innerHTML` nouveau alimenté par l'URL de la page.
- **Bibliothèques par CDN** : chargées depuis jsDelivr avec une version épinglée. Signaler une version
  non épinglée (`@latest`, sans version) ou un nouveau domaine de script.
- Ce dépôt ne déploie rien : aucun workflow ne doit lire un secret ni déclarer un `environment:` de
  déploiement sans une fiche qui l'autorise.

## Commun à la plateforme (D21)

- **Aucun secret, token, clé, identifiant de compte de service ni donnée personnelle** dans
  `.claude/memory/` ni `.claude/skill-observations/`, en clair ou encodé. Signaler toute valeur qui y
  ressemble.
- Un secret se **documente** (où il vit, qui le lit) et ne se manipule pas : jamais créé, lu, copié ni
  affiché dans un fichier versionné, un log, un commit ou un message (`dev_ops:CLAUDE.md` § 3.4,
  `dev_ops:standards/securite.md`).
- Le projet Firebase `appelsee-2k24` est partagé par l'app, le Studio et le backend : règles Firestore,
  règles Storage et index ne vivent que dans `dev_ops:firebase/`. Signaler toute création ou modification
  de `firestore.rules`, `storage.rules`, `firestore.indexes.json` ou tout `firebase deploy` de ces cibles
  depuis un autre dépôt.
- Toute modification sous `.github/workflows/` est structurelle : revue de sécurité du § 5 de
  `dev_ops:standards/securite.md`, actions épinglées par SHA, secrets lus sous un `environment:`.
