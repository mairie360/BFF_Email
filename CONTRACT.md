# Contrat BFF / web service

Web services associés : **Emails_Web_Service**. Le document [OpenAPI](contracts/openapi.json), les [types TypeScript](contracts/bff.d.ts), `/openapi.json` et `/swagger.json` proviennent tous de `src/openapi.ts`, qui importe les routes montées par l’application.

## Routes implémentées

Les chemins sont relatifs au BFF. Les proxies web conservent méthode, paramètres, contenu binaire, statuts et cookies. Les chemins `/api/auth/*` restent des adaptateurs de session vers BFF User ; les pages Next.js sont distinctes des routes de données.

| Méthode | Route | Réponse / schéma |
| --- | --- | --- |
| GET | `/health` | 200 OK |
| GET | `/check_apis` | 200 Services disponibles |
| GET | `/emails/bootstrap` | 200 EmailBootstrap |
| GET | `/emails/messages` | 200 Réponse de l’API propriétaire ; 201 Création confirmée ; 204 Opération confirmée |
| POST | `/emails/messages` | 200 Réponse de l’API propriétaire ; 201 Création confirmée ; 204 Opération confirmée |
| GET | `/emails/messages/{messageId}` | 200 Réponse de l’API propriétaire ; 201 Création confirmée ; 204 Opération confirmée |
| DELETE | `/emails/messages/{messageId}` | 200 Réponse de l’API propriétaire ; 201 Création confirmée ; 204 Opération confirmée |
| POST | `/emails/drafts` | 200 Réponse de l’API propriétaire ; 201 Création confirmée ; 204 Opération confirmée |
| PATCH | `/emails/drafts/{messageId}` | 200 Réponse de l’API propriétaire ; 201 Création confirmée ; 204 Opération confirmée |
| POST | `/emails/attachments` | 200 Réponse de l’API propriétaire ; 201 Création confirmée ; 204 Opération confirmée |
| GET | `/emails/attachments/{attachmentId}` | 200 Réponse de l’API propriétaire ; 201 Création confirmée ; 204 Opération confirmée |
| PATCH | `/emails/messages/{messageId}/state` | 200 Réponse de l’API propriétaire ; 201 Création confirmée ; 204 Opération confirmée |

## Mise à jour et validation

Après une modification des routes ou schémas, exécuter `npm run contracts:generate`, puis synchroniser chaque web service associé avec `npm run contracts:sync`. `npm run contracts:check` échoue si le contrat exporté ou les types générés sont périmés. Soumettre les branches associées dans la même livraison.

Le générateur de types est fixé à `openapi-typescript@7.10.1`. Il est exécuté via npm ; aucun jeton privé ne figure dans les contrats.

## Disponibilité des API propriétaires

Le bootstrap et les mutations sont branchés sur les routes cibles documentées des API propriétaires, configurées par `CORE_API_URL` et `EMAIL_API_URL`. Les réponses bootstrap doivent respecter les schémas de ce contrat. Les dépôts API ne sont pas modifiés : ces routes cibles et la persistance restent à valider dans leur déploiement. Une route absente ou une erreur est remontée au client ; aucune donnée de démonstration ni sauvegarde locale ne remplace la réponse du serveur.
