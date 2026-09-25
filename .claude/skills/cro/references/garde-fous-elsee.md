# Garde-fous Elsee des skills CRO (LOCAL ADDENDUM, D30)

Fichier propre à Elsee, absent de l'amont `coreyhaines31/marketingskills`. Il vaut pour les six skills
CRO : `cro`, `signup`, `onboarding`, `popups`, `paywalls`, `ab-testing`. Une mise à jour amont ne le
touche pas ; elle réécrit les blocs `LOCAL ADDENDUM` des `SKILL.md`, à réappliquer (`claude/README.md`).

## Contents

- Ce que ces skills sont chez Elsee
- La règle : on ne tranche pas à la place de l'humain
- Le format de l'arrêt
- Les conflits connus, avec la phrase exacte de nos règles
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
| suivi, enregistrement de session ou test sur un formulaire de santé, de facture ou de demande de prise en charge | « Est structurel ce qui touche l'auth ou les rôles, les règles, les index, un paiement, des données personnelles ou de santé, un secret, un compte de service, un workflow de déploiement » | `dev_ops:decisions/D19` § 2 |
| idem, sur staging ou preprod | « pas de testeur externe, accès nominatif, aucune capture d'écran qui sort de l'équipe. » | `dev_ops:standards/securite.md` § 4.1 |
| paywall, écran d'upgrade, prix, promo, essai (`paywalls`, `onboarding`, `popups`) | « Est structurel ce qui touche […] un paiement » ; « Un nouvel appel Stripe s'écrit dans `api_manager.js`, jamais dans `lib/` » | `dev_ops:decisions/D19` § 2 ; `dev_ops:decisions/D10` § 3 |
| compte à rebours, urgence, date limite (`popups`, `paywalls/references/experiments.md`, `onboarding`) | aucune règle écrite chez nous. Cadre légal : une fausse urgence est une pratique commerciale trompeuse (Code de la consommation, DGCCRF). Seule une échéance réelle se discute. | — |
| « minimiser la friction » de la bannière cookies (`cro/references/experiments.md`) | aucune règle écrite chez nous. Cadre légal : la CNIL exige que refuser soit aussi simple qu'accepter. | — |
| offre gratuite qui « accroche sans satisfaire » (`onboarding/references/activation-models.md`) | aucune règle écrite chez nous. C'est un choix produit sur un programme de remboursement santé : à l'humain. | — |
| demander le téléphone, ajouter des champs, pré-cocher (`cro/references/form.md`, `signup`) | « Est structurel ce qui touche […] des données personnelles ou de santé » | `dev_ops:decisions/D19` § 2 |

Une règle absente de ce tableau n'est pas une permission : face au doute, arrêter au même format.

## Quand un skill CRO se charge à tort

`ab-testing` se déclenche sur « experiment » ou « test this change », `signup` sur « account creation
flow ». Dans une session de dev qui parle de tests unitaires, de CI, de recette ou d'un parcours
d'inscription à coder, ces mots ne demandent pas de conseil marketing : ignorer le skill et reprendre la
tâche. Un skill CRO ne sert que si l'humain demande un audit, une optimisation de conversion ou un test
A/B.
