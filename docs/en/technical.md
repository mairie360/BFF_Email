# BFF_Email — Technical documentation

[Module overview](module.md) · [Français](../fr/technical.md) · [README](../../README.md)

## Architecture and request handling

Express 5.2.1 server written in TypeScript. Zod schemas and their OpenAPI registry describe exchanged objects; routers adapt upstream services to interface needs.

`src/routes/emails.ts` assembles bootstrap and declares adapters. `src/clients/upstream.ts` uses `fetch`, forwards the Bearer token, applies a 10-second timeout and preserves owning-API statuses. Multipart attachments are received as binary data with a 20 MiB limit.

## Data and persistence

Bootstrap combines Email API `/api/v1/emails/messages/`, `/api/v1/emails/folders/` and Core `/api/v1/user/me/`. Mutations are forwarded to Email API. The BFF keeps no local mailbox or fallback store; Zod schemas validate bootstrap and compose payloads.

Target route availability and persistence depend on the Email API deployment. Missing routes or incompatible responses surface as errors. The contract alone does not guarantee SMTP delivery, incoming mail ingestion or durable attachment storage.

## Installation and local startup

Use Node.js 22 to reproduce the contract job and npm with the committed lockfile. Other job and Docker versions are detailed below.

Current direct dependencies include no private `@mairie360/*` client. `.npmrc` still retains the organization’s registry configuration.

```bash
npm ci
```

Create `.env` in the repository root. Local HTTP configuration example to adapt to the running services:

```dotenv
PORT=4004
CORE_API_URL=http://localhost:3000
EMAIL_API_URL=http://localhost:3004
```

```bash
npm run start
```

`PORT` is optional; the `src/index.ts` fallback is `4004`.

Check the process, then open the interactive documentation:

```bash
curl --fail --silent --show-error http://localhost:4004/health
```

Swagger UI: `http://localhost:4004/docs`. JSON specification: `/openapi.json`, with `/swagger.json` as an alias. `/health` checks the process; `/check_apis` is a separate dependency diagnostic.

## Configuration

Values below are local examples or explicitly described behavior, not production credentials.

| Variable or precedence | Example / stated fallback | Purpose |
| --- | --- | --- |
| `PORT` | 4004 | Port used by this local example. |
| `CORE_API_URL` | http://localhost:3000 | Core base address without an `/api/v1` suffix. |
| `EMAIL_API_URL` | http://localhost:3004 | Email API base address without an `/api/v1` suffix. |
| `CORE_API_PORT` / `EMAIL_API_PORT` | — | Optional ports when absent from the URLs. |

## Routes and data contract

Inventory extracted from `contracts/openapi.json`. Replace brace parameters with real identifiers. Detailed types, required fields, responses and any examples are defined in that contract; table statuses are the declared statuses, not an exhaustive list of transport or validation errors.

| Method | Path | Declared body | Declared statuses |
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

## Session, permissions and errors

All `/emails` routes require a Bearer token. Missing service configuration produces 503, network failure or incompatible bootstrap produces 502, and API HTTP rejections are propagated. Business responses carry `Cache-Control: no-store`.

## Synchronization and verification

```bash
npm run contracts:generate
npm run contracts:check
npm test -- --runInBand
npm run lint
npm run build
```

`contracts:generate` exports the runtime registry to `contracts/openapi.json` and regenerates `contracts/bff.d.ts`. `contracts:check` fails when the contract or types are stale. Then run `npm run contracts:sync` in each associated web service and deliver contract changes together.

The type generator is pinned to `openapi-typescript@7.10.1` in `scripts/contracts.mjs` and runs through npm. For documentation-only changes, check links, accuracy in both languages and `git diff --check`; do not regenerate contracts without changing their source.

## CI/CD and Docker execution

The `contracts.yml` job uses Node.js 22, `actions/checkout@v7` and `actions/setup-node@v7`. It runs on pushes, pull requests and manual dispatch; it installs with `npm ci`, checks contracts and runs the associated tests.

`cicd.yml` calls `mairie360/CICD/.github/workflows/BFFs-cicd.yml@v1.13.2`, with `cicd_version: v1.13.2` and `node_version: "22"`. Reusable steps and GitHub environments determine actual checks, publications and deployments.

The Dockerfile currently uses `node:20-alpine` for build and runtime; the image command is `["node", "dist/index.js"]`. That version is separate from the Node.js 22 contract job.

Before running Docker, check service variables, build secrets and networks in the repository files. Green CI validates its jobs; it does not prove business-service availability in a remote environment.

## Troubleshooting

For a bootstrap error, check the three upstream routes and their `messages`, `folders`, `email` envelopes separately. For a rejected upload, check the multipart limit and content type. HTTP 404 can indicate an owning-API route that has not been deployed.

## Repository reference

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

Historical supplements: [CONTRACT.md](../../CONTRACT.md). Proposed requirements must remain distinct from implemented behavior.
