# elsee-webflow

Tout le code personnalisé du site public `www.elsee.care` (Webflow) : les scripts à la racine
(annuaire Algolia, formulaires, fiches partenaires, script global…), chargés par balise jsDelivr
épinglée, et dans [`webflow/`](webflow/README.md) le contenu de chaque emplacement de code Webflow.
Règles de travail : [`CLAUDE.md`](CLAUDE.md). Décision de cadrage : `dev_ops` D33.

## Déploiement

1. **Ce qu'il déploie, et où** : rien, depuis GitHub. `scripts/kit-collage.mjs` produit, pour un
   commit mergé, le contenu de chaque emplacement Webflow (balises épinglées, avec `integrity`) ; ce
   contenu se colle à la main dans Webflow (`webflow/README.md`).
2. **Ce qui déclenche une mise en ligne** : la publication du site depuis Webflow, après collage ou
   changement du commit de la balise. **Merger ne déploie rien.**
3. **Retour arrière** : recoller le kit du commit précédent, et republier. Limite : Webflow ne garde pas
   l'historique du code personnalisé, git est la seule trace ; ne coller que ce qui est mergé.
4. **Secrets** : aucun. Le dépôt est public ; n'y entrent que des valeurs publiques par construction,
   chacune justifiée dans `.gitleaks.toml` : clé de **recherche** Algolia, configuration Firebase
   d'application web (page de réinitialisation du mot de passe), clé du pixel Shop My Influence,
   jetons d'URL des vidéos publiques. La clé Google Maps n'est pas dans le dépôt : elle reste dans
   les balises de chargement Google, dans Webflow (`CLE_GOOGLE_MAPS` dans `webflow/`). La CI n'utilise
   que `GITHUB_TOKEN`, en lecture.
5. **Ressources partagées touchées** : l'index Algolia `elsee_index`, **en lecture seule** (son format
   appartient à `elsee_functions_v2`) ; les Cloud Functions de prod d'`elsee_functions_v2` que les
   formulaires appellent (`leadWebflow`, `sendTherapistLeadToMake`, `bilanBienEtre`,
   `logPasswordResetError`, `sendPasswordResetEmailBrevo`) ; Firebase Auth du projet `appelsee-2k24`
   (réinitialisation du mot de passe). Aucune règle, aucun index Firestore.