# BFF_Email — Documentation technique

[Présentation du module](module.md) · [English](../en/technical.md) · [README](../../README.md)

Documentation du code versionné au 7 septembre 2026, basée sur `d1cc11d990f0`. Les commandes ci-dessous décrivent les vérifications à effectuer; elles ne certifient pas un déploiement distant.

## Architecture et traitement des requêtes

Serveur Express 5.2.1 écrit en TypeScript. Les schémas Zod et leur registre OpenAPI décrivent les objets échangés; les routeurs adaptent les services amont aux besoins des interfaces.

`src/routes/emails.ts` assemble le bootstrap et déclare les adaptateurs. `src/clients/upstream.ts` utilise `fetch`, transmet le Bearer, applique un délai de 10 secondes et conserve les statuts de l’API propriétaire. Les pièces jointes multipart sont reçues sous forme binaire avec une limite de 20 MiB.

## Données et persistance

Le bootstrap combine Email API `/api/v1/emails/messages/`, `/api/v1/emails/folders/` et Core `/api/v1/user/me/`. Les mutations sont transmises à Email API. Le BFF ne conserve ni boîte locale ni stockage de secours; les schémas Zod contrôlent le bootstrap et les compositions.

La disponibilité des routes cibles et leur persistance dépendent du déploiement Email API. Une route absente ou une réponse incompatible est remontée comme erreur. Le contrat ne garantit pas à lui seul la livraison SMTP, la réception de nouveaux messages ou la durabilité des pièces jointes.

## Installation et lancement local

Utiliser Node.js 22 pour reproduire le job de contrats et npm avec le fichier de verrouillage versionné. Les versions des autres jobs et de Docker sont précisées plus bas.

Les dépendances directes actuelles ne comprennent pas de client privé `@mairie360/*`. `.npmrc` conserve néanmoins la configuration du registre de cette organisation.

```bash
npm ci
```

Créer `.env` à la racine. Exemple de configuration HTTP locale à adapter aux services démarrés:

```dotenv
PORT=4004
CORE_API_URL=http://localhost:3000
EMAIL_API_URL=http://localhost:3004
```

```bash
npm run start
```

`PORT` est optionnel; le repli de `src/index.ts` est `4004`.

Vérifier le processus puis consulter la documentation interactive:

```bash
curl --fail --silent --show-error http://localhost:4004/health
```

Interface Swagger: `http://localhost:4004/docs`. Spécification JSON: `/openapi.json`, avec l’alias `/swagger.json`. `/health` vérifie le processus; `/check_apis` est un diagnostic distinct des dépendances.

## Configuration

Les valeurs ci-dessous sont des exemples locaux ou des comportements explicitement indiqués, pas des identifiants de production.

| Variable ou priorité | Exemple / repli indiqué | Rôle |
| --- | --- | --- |
| `PORT` | 4004 | Port de cet exemple local. |
| `CORE_API_URL` | http://localhost:3000 | Adresse de Core sans suffixe `/api/v1`. |
| `EMAIL_API_URL` | http://localhost:3004 | Adresse d’Email API sans suffixe `/api/v1`. |
| `CORE_API_PORT` / `EMAIL_API_PORT` | — | Ports optionnels si absents des URL. |

## Routes et contrat de données

Inventaire extrait de `contracts/openapi.json`. Les paramètres entre accolades sont remplacés par des identifiants réels. Les types détaillés, champs requis, réponses et exemples éventuels sont définis dans ce contrat; les statuts du tableau sont ceux déclarés, sans prétendre lister toutes les erreurs de transport ou de validation.

| Méthode | Chemin | Corps déclaré | Statuts déclarés |
| --- | --- | --- | --- |
| GET | `/health` | — | 200 |
| GET | `/check_apis` | — | 200, 502 |
| GET | `/emails/bootstrap` | — | 200, 401, 502 |
| GET | `/emails/messages` | — | 200, 201, 204, 401, 502 |
| POST | `/emails/messages` | application/json | 200, 201, 204, 401, 502 |
| GET | `/emails/messages/{messageId}` | — | 200, 201, 204, 401, 502 |
| DELETE | `/emails/messages/{messageId}` | — | 200, 201, 204, 401, 502 |
| POST | `/emails/drafts` | application/json | 200, 201, 204, 401, 502 |
| PATCH | `/emails/drafts/{messageId}` | application/json | 200, 201, 204, 401, 502 |
| POST | `/emails/attachments` | multipart/form-data | 200, 201, 204, 401, 502 |
| GET | `/emails/attachments/{attachmentId}` | — | 200, 201, 204, 401, 502 |
| PATCH | `/emails/messages/{messageId}/state` | application/json | 200, 201, 204, 401, 502 |

## Session, permissions et erreurs

Toutes les routes `/emails` exigent un Bearer. L’absence de configuration de service produit 503, une panne réseau ou un bootstrap incompatible produit 502, et les refus HTTP de l’API sont propagés. Les réponses métier portent `Cache-Control: no-store`.

## Synchronisation et vérifications

```bash
npm run contracts:generate
npm run contracts:check
npm test -- --runInBand
npm run lint
npm run build
```

`contracts:generate` exporte le registre runtime dans `contracts/openapi.json` et régénère `contracts/bff.d.ts`. `contracts:check` échoue si le contrat ou les types sont périmés. Exécuter ensuite `npm run contracts:sync` dans chaque web service associé et livrer les modifications de contrat ensemble.

Le générateur de types est fixé à `openapi-typescript@7.10.1` dans `scripts/contracts.mjs` et s’exécute via npm. Pour une modification uniquement documentaire, vérifier les liens, l’exactitude des deux langues et `git diff --check`; ne pas régénérer les contrats sans modification de leur source.

## CI/CD et exécution Docker

Le job `contracts.yml` utilise Node.js 22, `actions/checkout@v7` et `actions/setup-node@v7`. Il s’exécute sur push, pull request et lancement manuel; il installe avec `npm ci`, contrôle les contrats et lance les tests dédiés.

`cicd.yml` appelle `mairie360/CICD/.github/workflows/BFFs-cicd.yml@v1.13.2`, avec `cicd_version: v1.13.2` et `node_version: "22"`. Les étapes réutilisables et les environnements GitHub déterminent les contrôles, publications et déploiements effectifs.

Le Dockerfile utilise encore `node:20-alpine` pour la construction et l’exécution; la commande de l’image est `["node", "dist/index.js"]`. Cette version est distincte du job de contrats Node.js 22.

Avant un lancement Docker, vérifier les variables de service, les secrets de build et les réseaux dans les fichiers du dépôt. Une CI verte valide ses jobs; elle ne prouve pas la disponibilité des services métier dans un environnement distant.

## Diagnostic

Pour un bootstrap en erreur, vérifier séparément les trois routes amont et leurs enveloppes `messages`, `folders`, `email`. Pour un upload refusé, vérifier la limite multipart et le type de contenu. Un HTTP 404 peut signaler une route propriétaire non déployée.

## Repères dans le dépôt

- [src/app.ts](../../src/app.ts)
- [src/routes/emails.ts](../../src/routes/emails.ts)
- [src/clients/upstream.ts](../../src/clients/upstream.ts)
- [contracts/openapi.json](../../contracts/openapi.json)
- [contracts/bff.d.ts](../../contracts/bff.d.ts)
- [scripts/contracts.mjs](../../scripts/contracts.mjs)
- [package.json](../../package.json)
- [.github/workflows/contracts.yml](../../.github/workflows/contracts.yml)
- [.github/workflows/cicd.yml](../../.github/workflows/cicd.yml)
- [Dockerfile](../../Dockerfile)
- [docker-compose.yml](../../docker-compose.yml)

Compléments historiques: [CONTRACT.md](../../CONTRACT.md). Les besoins proposés doivent rester distincts du comportement effectivement implémenté.
