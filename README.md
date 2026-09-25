# elsee-webflow

Scripts de fonctionnalités sur mesure du site public `www.elsee.care` (Webflow) : moteur de
l'annuaire des partenaires (Algolia), recherche de la page d'accueil, script global, formulaire
multi-étapes. Règles de travail : [`CLAUDE.md`](CLAUDE.md). Décision de cadrage : `dev_ops` D32.

## Déploiement

1. **Ce qu'il déploie, et où** : rien, depuis GitHub. Chaque fichier est collé à la main dans le
   code personnalisé du site Webflow `www.elsee.care` (site ou page, voir `CLAUDE.md` § 1).
2. **Ce qui déclenche une mise en ligne** : la publication du site depuis Webflow, après collage.
   **Merger ne déploie rien.**
3. **Retour arrière** : recoller la version précédente du fichier (`git show <commit>~1:<fichier>`)
   et republier. Limite : Webflow ne garde pas l'historique du code personnalisé, git est la seule
   trace ; ne coller que ce qui est mergé.
4. **Secrets** : aucun. Le dépôt est public ; la clé Algolia présente est la clé de **recherche**,
   publique par construction. La CI n'utilise que `GITHUB_TOKEN`, en lecture.
5. **Ressources partagées touchées** : l'index Algolia `elsee_index`, **en lecture seule**. Son contenu
   et le format de ses enregistrements appartiennent à `elsee_functions_v2`. Aucune règle, aucun index
   Firestore, aucun projet Firebase.
