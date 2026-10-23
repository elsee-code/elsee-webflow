# `webflow/` — le code personnalisé du site, emplacement par emplacement

Tout le code collé dans Webflow pour `www.elsee.care` est ici, rangé comme dans Webflow. Le dépôt est
la source : un changement s'écrit ici, passe par une PR, puis se colle dans Webflow. Un code modifié
directement dans Webflow sans passer par ici sera écrasé au prochain collage.

| Dossier | Emplacement Webflow |
|---|---|
| `site/head.html`, `site/footer.html` | *Site settings → Custom code* : *Head code*, *Footer code* |
| `pages/<page>/head.html`, `footer.html` | réglages de la page → *Custom code* : *Inside `<head>` tag*, *Before `</body>` tag* |
| `modeles/<collection>/head.html`, `footer.html` | réglages du modèle CMS de la collection, mêmes champs |
| `embeds/<nom>.html` | un bloc **Embed** posé dans le Designer ; le commentaire en tête du fichier dit lequel |

Relevé du 2026-10-23 : API Webflow (code du site et des 73 pages) et 4 653 pages publiées. Une page
ou un modèle sans fichier n'a pas de code personnalisé.

## Les marqueurs

Les fichiers du dépôt s'appellent par des marqueurs, jamais avec un commit en dur. Le cas général,
une balise jsDelivr :

```html
<script src="{{jsdelivr:utils.js}}" integrity="{{sri:utils.js}}" crossorigin="anonymous" defer></script>
```

Les formulaires (obtenir-mon-offre, landings, devenir thérapeute, reset-password) sont **collés en
ligne** (choix de l'humain, 2026-10-23), pour que le funnel et l'authentification ne dépendent pas de
jsDelivr. Le dépôt reste la source, le kit y met le contenu du fichier :

```html
<script data-form-name="lp">{{inline:formulaire-lp.js}}</script>
```

`scripts/kit-collage.mjs` remplace les marqueurs par l'URL jsDelivr épinglée sur un commit,
l'empreinte du fichier à ce commit, ou son contenu. Une balise jsDelivr est toujours en `defer` : les
scripts supposent qu'ils s'exécutent avant `DOMContentLoaded`. `scripts/ci/check-webflow.mjs` (CI)
refuse un marqueur sans fichier, un `src` sans `integrity`, une balise du dépôt sans `defer`, un
fichier en ligne qui contient `</script` ou `<!--`, et un script qui ne se parse pas.

Restent collés en ligne, à dessein : les balises des fournisseurs (GTM, Enzuzo, Claydar, pixels Meta,
Shop My Influence, conversion Google Ads), les feuilles de style, et le petit script `noindex` de
l'annuaire, qui doit s'exécuter dans `<head>`.

La clé Google Maps n'est pas dans le dépôt : `CLE_GOOGLE_MAPS` désigne celle qui est déjà dans Webflow.

## Coller une version

1. La PR est mergée. Sur `main` :
   ```bash
   node scripts/kit-collage.mjs <commit-mergé> /tmp/kit --verifier-jsdelivr
   ```
   Le script écrit dans `/tmp/kit` le contenu final de chaque emplacement et vérifie que jsDelivr
   sert bien les mêmes fichiers.
2. Pour chaque emplacement qui a changé, **remplacer tout le contenu du champ** par celui du kit.
   Ne jamais ajouter une balise à côté de l'ancien bloc : les deux tourneraient (deux onglets ouverts
   par un clic sur `.funnelentry`, deux envois de formulaire).
3. Publier le site depuis Webflow.
4. Retour arrière : recoller la version du kit du commit précédent, et publier.

## Ce qui reste dans Webflow sans passer par ici

- Les blocs Embed sans code Elsee : bibliothèques Algolia et bloc « Nouveaux partenaires »
  (`new-members.js`, déjà en balise épinglée), fond de l'en-tête des pages partenaires (champ CMS),
  styles du champ de recherche de l'annuaire, chargeur Finsweet des landings, page de mot de passe
  de Webflow.
- Les landings `/lp/*` : leur HTML, leur CSS et leurs scripts sont produits par le Studio
  (`internal_tool`, décisions D31 et D34) et écrits dans le CMS.
- Les balises de Google Tag Manager (`GTM-5CNWQFC7`) : GA4, Hotjar, Google Ads, Meta, TikTok,
  Affilae, Brevo, Trustpilot, et le suivi des étapes de `/obtenir-mon-offre` (`#formSlider`,
  `.slide.active`, id `slide-<n>` : ne pas les renommer).
