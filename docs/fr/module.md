# BFF_Email — Présentation du module

[Documentation technique](technical.md) · [English](../en/module.md) · [README](../../README.md)

Fournir une boîte de courrier électronique unifiée au web service, avec messages, dossiers, brouillons et pièces jointes. Le BFF adapte Email API et utilise Core pour identifier l’adresse de l’utilisateur.

## Public et utilité

Les agents qui consultent et traitent leur courrier professionnel et les équipes intégrant la messagerie électronique.

Domaine fonctionnel: Courrier électronique.

## Fonctions disponibles

- Chargement de la boîte, des dossiers et de l’adresse de l’utilisateur.
- Consultation et envoi de messages, réponses, transferts et enregistrement de brouillons.
- Changement d’état, suppression et transfert de pièces jointes via les routes du BFF.

## Parcours type

1. Charger `/emails/bootstrap` pour obtenir messages et dossiers.
2. Composer un courrier et transférer ses pièces jointes avant l’envoi ou la sauvegarde du brouillon.
3. Attendre la réponse du serveur puis recharger la boîte.

## Place dans Mairie360

Dépôts associés: [Emails_Web_Service](https://github.com/mairie360/Emails_Web_Service).

Ce dépôt contient le serveur BFF et son contrat. Les web services associés portent les écrans; le BFF adapte les données et les règles serveur nécessaires à ces écrans.

## Données et état actuel

Le bootstrap combine Email API `/api/v1/emails/messages/`, `/api/v1/emails/folders/` et Core `/api/v1/user/me/`. Les mutations sont transmises à Email API. Le BFF ne conserve ni boîte locale ni stockage de secours; les schémas Zod contrôlent le bootstrap et les compositions.

## Périmètre et limites

La disponibilité des routes cibles et leur persistance dépendent du déploiement Email API. Une route absente ou une réponse incompatible est remontée comme erreur. Le contrat ne garantit pas à lui seul la livraison SMTP, la réception de nouveaux messages ou la durabilité des pièces jointes.

## Pour développer ou exploiter ce module

Le [guide technique](technical.md) détaille architecture, configuration, routes, session, persistance, tests et CI/CD. Il décrit les sources de vérité et les étapes de synchronisation des contrats avec les dépôts associés.
