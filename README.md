# API Carnivore (NestJS)

API du restaurant Carnivore : commandes, paiement Mobile Money (simulé), réservations, catalogue, équipe, statistiques, temps réel (socket.io) et notifications push.

## Installation

```bash
npm install
cp .env.example .env   # puis remplir les clés Supabase
npm run start:dev      # développement
npm run build && npm run start:prod   # production
```

## Variables d'environnement

| Variable | Obligatoire | Description |
|---|---|---|
| `SUPABASE_URL` | oui | URL du projet Supabase |
| `SUPABASE_ANON_KEY` | oui | clé publique `anon` |
| `SUPABASE_SERVICE_ROLE_KEY` | oui | clé secrète : paiement simulé, GPS simulé, création des comptes du personnel |
| `CORS_ORIGINS` | non | URL du back-office (séparées par des virgules) |
| `FIREBASE_SERVICE_ACCOUNT` | non | JSON du compte de service Firebase pour les notifications push |
| `PORT` | non | 3000 par défaut |

## Authentification

Chaque requête protégée envoie l'en-tête `Authorization: Bearer <access_token Supabase>`.
L'API agit **au nom de l'utilisateur** : la sécurité RLS de Supabase et les contrôles de rôle des fonctions SQL s'appliquent toujours.

Rôles : `client`, `admin`, `gerant`, `cuisine`, `livreur`.

## Routes principales

| Méthode | Route | Accès | Rôle |
|---|---|---|---|
| GET | `/` | public | état du serveur |
| GET | `/restaurant` | public | infos, ouvert/fermé, horaires |
| GET | `/categories`, `/plats`, `/evenements`, `/zones-livraison` | public | catalogue |
| POST/PATCH/DELETE | `/categories`, `/plats`, `/evenements`, `/zones-livraison`, `/codes-promo`, `/tables` | admin, gérant | gestion du catalogue |
| PATCH | `/plats/:id/rupture` | cuisine+ | rupture de stock |
| POST | `/commandes` | client | passer une commande (montant recalculé côté serveur) |
| GET | `/commandes`, `/commandes/:id` | connecté | ses commandes (toutes pour le personnel) |
| PATCH | `/commandes/:id/statut` | personnel | faire avancer une commande |
| PATCH | `/commandes/:id/livreur` | admin, gérant, livreur | assigner un livreur |
| POST | `/commandes/:id/annuler` | client / gérant | annulation |
| POST | `/codes-promo/valider` | connecté | tester un code promo |
| POST | `/paiements/simuler` | client | paiement Yas / Moov **simulé** (code PIN `0000` = refus) |
| GET | `/reservations/disponibilite` | public | places disponibles |
| POST | `/reservations` | client | réserver |
| PATCH | `/reservations/:id` | admin, gérant | confirmer, attribuer une table… |
| GET | `/stats` | admin, gérant | tableau de bord |
| GET/POST/PATCH | `/equipe` | admin | comptes du personnel |
| GET | `/livreurs` · POST `/livreurs/position` | personnel / livreur | suivi des livreurs |
| GET/PATCH | `/parametres` · PUT `/horaires` | admin, gérant | réglages du restaurant |
| POST | `/notifications/diffuser` | admin, gérant | message à tous les clients |

## Simulations (à remplacer par les vraies API)

- **Paiement** : `src/paiements/paiements.controller.ts`. Le bloc `SIMULATION` est à remplacer par l'appel Yas / Moov, puis il faut appeler `enregistrer_paiement(..., p_simule => false)`.
- **GPS livreur** : `src/realtime/gps-simulation.service.ts`. La simulation est désactivée automatiquement dès qu'un livreur envoie sa vraie position, ou si `simulation_gps = false` dans les paramètres.

## Temps réel (socket.io)

- `emit('suivre_commande', id)` → reçoit `changement_statut`, `commande_maj`, `position_livreur` et `paiement`
- `emit('rejoindre_staff')` → reçoit `nouvelle_commande`, `commande_maj` et `paiement`
