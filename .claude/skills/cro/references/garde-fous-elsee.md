# Garde-fous Elsee des skills CRO et de `marketing-psychology` (LOCAL ADDENDUM, D30, D112)

Fichier propre à Elsee, absent de l'amont `coreyhaines31/marketingskills`. Il vaut pour les six skills
CRO : `cro`, `signup`, `onboarding`, `popups`, `paywalls`, `ab-testing`, et pour `marketing-psychology`
(D112, section « Psychologie d'achat »). Une mise à jour amont ne le
touche pas ; elle réécrit les blocs `LOCAL ADDENDUM` des `SKILL.md`, à réappliquer (`claude/README.md`).

## Contents

- Ce que ces skills sont chez Elsee
- La règle : on ne tranche pas à la place de l'humain
- Le format de l'arrêt
- Les conflits connus, avec la phrase exacte de nos règles
- Psychologie d'achat : ce qui sert, à quelle condition (D112)
- Quand un skill CRO se charge à tort

## Ce que ces skills sont chez Elsee

Un conseiller, pas un exécutant. Un skill CRO rend un avis : audit, hypothèses, idées de test, textes
alternatifs, priorités. Il ne modifie aucun fichier, ne lance aucune commande, n'ouvre ni ne pousse
rien, et ne change pas le mode de la session (D19). Si l'humain veut appliquer un conseil, c'est une
nouvelle demande, explicite, traitée hors du skill par `session-dev` (cadrage, maquette, GO) ; la
session ne la déduit pas d'un « d'accord » ou d'un « bonne idée ».

## La règle : on ne tranche pas à la place de l'humain

Avant de livrer une recommandation, la comparer à la liste ci-dessous. Si elle la contredit, ou si elle
touche un sujet de la liste sans qu'une règle écrite tranche, **ne pas l'appliquer ni la reformuler pour
qu'elle passe** : l'arrêter, la présenter au format ci-dessous, et attendre la décision. Les
recommandations qui ne heurtent rien sont livrées normalement.

## Le format de l'arrêt

Un bloc par conflit, rien d'autre sur ce point avant la réponse :

> **CRO conseille** : ce que dit le skill, avec le fichier source (ex. `popups/SKILL.md`, « Discount/Promotion Popup »).
>
> **Nos guidelines disent** : « la phrase exacte », avec sa source (fichier et section). S'il n'y a pas
> de règle écrite, le dire : « aucune règle écrite chez nous », puis le cadre légal en une ligne.
>
> **Décision ?** A) on suit le skill · B) on suit nos guidelines · C) autre chose. Si A contredit une
> règle écrite, préciser ce qu'il faudrait changer (une fiche dans `dev_ops:decisions/`, jamais un
> contournement).

La session attend la réponse. Elle ne choisit pas l'option « la plus raisonnable » à sa place.

## Les conflits connus, avec la phrase exacte de nos règles

| Le skill conseille | Nos guidelines disent | Source |
|---|---|---|
| couleur de bouton, visuel, mise en page, nouvelle popup (`cro`, `popups`, `paywalls`) | « Les mockups fournis font autorité sur couleurs, typographie, espacements et layout : les reproduire fidèlement, ne rien modifier sans le demander. » | `webapp:CLAUDE.md` § 7 |
| idem | « Aucun skill ni plugin de conseil UI : les maquettes fournies sont la seule source de design » | `dev_ops:decisions/D21` § 6 ; exception bornée par D30 |
| nouvel élément d'interface dans le Studio (`cro`, `popups`, `onboarding`) | « Tout élément d'interface qui n'existe pas encore — nouveau champ, carte, panneau, état visuel inédit — se DEMANDE avant d'être construit : lister ce qui manque et attendre la maquette ou la spec » | `internal_tool:CLAUDE.md`, Conventions (« Aucune nouveauté UI sans maquette ») |
| couleur ou valeur visuelle dans le Studio | « Une valeur absente du nuancier s'AJOUTE aux jetons, elle ne s'approxime pas. » ; la maquette `docs/spec/Éditeur Blog.dc.html` fait foi | `internal_tool:CLAUDE.md`, Conventions (« Fidélité STRICTE aux couleurs de la maquette ») |
| outil de test A/B ou de suivi côté client (PostHog, Optimizely, VWO), suivi champ par champ (`ab-testing`, `cro/references/form.md`, `signup`) | « Une nouvelle balise se met **sous la garde**, jamais à côté. Preprod, staging et les canaux de preview n'envoient donc rien. » | `webapp:CLAUDE.md` § 4 (analytique en prod seule) |
| mener un test A/B : outil, tirage de la variante, durée, arrêt (`ab-testing`, `cro/references/experiments.md`) | « Un test A/B se fait avec PostHog Experiments, dans le projet PostHog déjà chargé par l'app, en production seulement. Aucun autre outil, aucune nouvelle balise. » ; « Pas d'arrêt avant la date sur un bon ou un mauvais chiffre. » | `dev_ops:decisions/D42`, points 1 et 11 |
| suivi, enregistrement de session ou test sur un formulaire de santé, de facture ou de demande de prise en charge | « Est structurel ce qui touche l'auth ou les rôles, les règles, les index, un paiement, des données personnelles ou de santé, un secret, un compte de service, un workflow de déploiement » | `dev_ops:decisions/D19` § 2 |
| idem, sur staging ou preprod | « pas de testeur externe, accès nominatif, aucune capture d'écran qui sort de l'équipe. » | `dev_ops:standards/securite.md` § 4.1 |
| paywall, écran d'upgrade, prix, promo, essai (`paywalls`, `onboarding`, `popups`) | « Est structurel ce qui touche […] un paiement » ; « Un nouvel appel Stripe s'écrit dans `api_manager.js`, jamais dans `lib/` » | `dev_ops:decisions/D19` § 2 ; `dev_ops:decisions/D10` § 3 |
| compte à rebours, urgence, date limite (`popups`, `paywalls/references/experiments.md`, `onboarding`, `marketing-psychology`) | une échéance réelle se conseille, une échéance fabriquée s'arrête : section « Psychologie d'achat » ci-dessous | `dev_ops:decisions/D112` § 3 |
| « minimiser la friction » de la bannière cookies (`cro/references/experiments.md`) | aucune règle écrite chez nous. Cadre légal : la CNIL exige que refuser soit aussi simple qu'accepter. | — |
| offre gratuite qui « accroche sans satisfaire » (`onboarding/references/activation-models.md`) | aucune règle écrite chez nous. C'est un choix produit sur un programme de remboursement santé : à l'humain. | — |
| demander le téléphone, ajouter des champs, pré-cocher (`cro/references/form.md`, `signup`) | « Est structurel ce qui touche […] des données personnelles ou de santé » | `dev_ops:decisions/D19` § 2 |
| champ e-mail, formulaire de lead sur une landing du Studio (`cro`, `cro/references/form.md`) | « Le champ e-mail […] porte la mention du formulaire « Obtenir mon offre » d'elsee.care et part à `leadWebflow` comme les formulaires du site » ; « En collecte, le serveur le pose comme avant. Ailleurs, il vient d'une demande » ; un seul champ, l'e-mail, dans le hero ou l'appel final, jamais d'autre formulaire | `dev_ops:decisions/D51` § 4, `D70` § 2 |

Une règle absente de ce tableau n'est pas une permission : face au doute, arrêter au même format.

## Psychologie d'achat : ce qui sert, à quelle condition (D112)

Vaut pour `marketing-psychology`, et pour un skill CRO quand il conseille un de ces leviers. L'humain a
tranché le 2026-11-13 : tout le catalogue du skill sert, urgence et preuve comprises. La condition est la
même partout : **le fait avancé est vrai, et on sait dire où il se vérifie.** Dans l'arrêt, « CRO
conseille » devient « Psychologie conseille ».

Le skill ne cite aucune étude. Un modèle se présente comme une **hypothèse** (« hypothèse : aversion à la
perte »), avec le test qui la vérifierait (D42), jamais comme un résultat de neuroscience.

| Levier (modèles du skill) | Se conseille quand | S'arrête au format quand |
|---|---|---|
| **Urgence, rareté** (« Scarcity / Urgency », « Zeigarnik Effect », « Hyperbolic Discounting ») | l'échéance ou la limite existe déjà : fin d'une offre datée, code promo qui expire, places réellement comptées | l'échéance serait créée pour l'occasion, se réarme à chaque visite, ou n'a pas de date de fin réelle |
| **Aversion à la perte, regret** (« Loss Aversion », « Regret Aversion », « Endowment Effect ») | la perte décrite est réelle et chiffrée à sa source : remboursement non demandé, budget qui expire, avantage qui s'arrête à une date | la perte est exagérée, ou porte sur la santé de la personne (« vous risquez… ») |
| **Preuve sociale** (« Bandwagon Effect », « Mimetic Desire », « Availability Heuristic », « Unity ») | le chiffre est lu à sa source au moment de l'écrire, l'avis vient d'une vraie membre et d'une source publique (Trustpilot), la tendance est mesurée | le chiffre est arrondi vers le haut ou écrit en dur sans source, l'avis est réécrit, trié pour cacher les mauvais, ou attribué à personne |
| **Autorité** (« Authority Bias », « Liking / Similarity ») | l'expert ou le praticien est nommé, réel, et a donné son accord ; le label ou la mention presse existe | une caution de santé laisse entendre un bénéfice médical, ou un logo « vu dans » sans parution |
| **Réciprocité, engagement** (« Reciprocity », « Commitment & Consistency », « Foot-in-the-Door », « IKEA Effect », « Goal-Gradient ») | le contenu offert a une valeur seul ; la progression affichée est la vraie | la barre de progression ment, ou l'étape « gratuite » cache un engagement payant |
| **Ancrage, cadrage, contraste** (« Anchoring », « Framing », « Contrast », « Mental Accounting », « Rule of 100 », « Charm Pricing », « Price Relativity ») | le prix de comparaison a réellement été pratiqué, l'équivalent par jour ou par mois est donné à côté du prix payé | prix barré jamais pratiqué, prix total masqué ; et **tout changement de prix ou de formule est structurel** |
| **Simplicité du choix** (« Hick's Law », « Paradox of Choice », « Activation Energy », « BJ Fogg », « EAST », « COM-B », « Nudge ») | toujours, comme hypothèse sur un parcours ou un texte | le conseil devient du design (ordre, bouton, mise en page) : les maquettes font autorité, lignes 1 à 4 du tableau précédent |
| **Rétention** (« Status-Quo Bias », « Switching Costs », « Sunk Cost », « Peak-End Rule ») | on augmente la valeur de rester : historique utile, fin de parcours soignée, rappel de ce qui est acquis | on rend le départ plus difficile : étapes ajoutées à la résiliation, donnée retenue, culpabilisation |

Quatre conseils du skill s'arrêtent toujours, vrais ou non :

| Le skill conseille | Nos guidelines disent | Source |
|---|---|---|
| pré-sélectionner une formule ou une option payante, « Opt-out beats opt-in for subscriptions » (« Default Effect ») | « Est structurel ce qui touche […] un paiement, des données personnelles ou de santé » ; pour un consentement : « Rien n'est coché par défaut ; sans choix, tout reste refusé. » | `dev_ops:decisions/D19` § 2 ; `dev_ops:decisions/D92` |
| formule leurre, prix d'entreprise montré d'abord pour faire paraître le reste bon marché (« Decoy Effect », « Door-in-the-Face ») | aucune règle écrite chez nous ; une formule ou un prix est structurel (D19 § 2). Choix produit : à l'humain. | — |
| mesurer l'effet d'un levier par un autre outil ou l'arrêter sur un bon chiffre | « Un test A/B se fait avec PostHog Experiments, dans le projet PostHog déjà chargé par l'app, en production seulement. Aucun autre outil, aucune nouvelle balise. » | `dev_ops:decisions/D42`, point 1 |
| tout levier appliqué à une donnée de santé de la membre (motif de consultation, pathologie, facture) | « Est structurel ce qui touche […] des données personnelles ou de santé » | `dev_ops:decisions/D19` § 2 |

Le cadre légal (pratiques commerciales trompeuses, annonces de réduction de prix, avis en ligne,
résiliation d'un abonnement) n'est pas résumé ici : un conseil qui s'en approche le dit en une ligne et
renvoie à une vérification humaine, la session ne rend pas d'avis juridique.

## Quand un skill CRO se charge à tort

`ab-testing` se déclenche sur « experiment » ou « test this change », `signup` sur « account creation
flow ». Dans une session de dev qui parle de tests unitaires, de CI, de recette ou d'un parcours
d'inscription à coder, ces mots ne demandent pas de conseil marketing : ignorer le skill et reprendre la
tâche. Un skill CRO ne sert que si l'humain demande un audit, une optimisation de conversion ou un test
A/B.
