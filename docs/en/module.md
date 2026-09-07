# BFF_Email — Module overview

[Technical documentation](technical.md) · [Français](../fr/module.md) · [README](../../README.md)

Provide a unified mailbox to the web service, including messages, folders, drafts and attachments. The BFF adapts Email API and uses Core to identify the user’s email address.

## Audience and value

Staff reading and processing work email and teams integrating the mailbox.

Business domain: Email.

## Available capabilities

- Load the mailbox, folders and the user’s email address.
- Read and send messages, replies and forwards, and save drafts.
- Change message state, delete messages and transfer attachments through BFF routes.

## Typical workflow

1. Load `/emails/bootstrap` to obtain messages and folders.
2. Compose email and upload attachments before sending or saving the draft.
3. Wait for the server response, then reload the mailbox.

## Role within Mairie360

Associated repositories: [Emails_Web_Service](https://github.com/mairie360/Emails_Web_Service).

This repository contains the BFF server and its contract. Associated web services own the screens; the BFF adapts data and server rules needed by those screens.

## Data and current state

Bootstrap combines Email API `/api/v1/emails/messages/`, `/api/v1/emails/folders/` and Core `/api/v1/user/me/`. Mutations are forwarded to Email API. The BFF keeps no local mailbox or fallback store; Zod schemas validate bootstrap and compose payloads.

## Scope and limitations

Target route availability and persistence depend on the Email API deployment. Missing routes or incompatible responses surface as errors. The contract alone does not guarantee SMTP delivery, incoming mail ingestion or durable attachment storage.

## Developing or operating this module

The [technical guide](technical.md) covers architecture, configuration, routes, session handling, persistence, tests and CI/CD. It describes sources of truth and contract synchronization with associated repositories.
