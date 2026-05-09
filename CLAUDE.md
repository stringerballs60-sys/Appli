# KAZA — Contexte projet pour Claude Code

## Présentation
Application mobile de gestion de conciergerie Airbnb, anciennement nommée ConciergePro, rebaptisée **KAZA**.
Utilisée par un gestionnaire indépendant pour suivre ses réservations, son linge et ses stocks.

## Stack technique
- React Native 0.81.5 + React 19 + TypeScript
- Expo 54 + Expo Router 55 (navigation par fichiers)
- Supabase (PostgreSQL + Auth + RLS)
- Zustand (état global), React Query (données serveur)
- React Native Paper (UI), i18next (traductions FR)
- date-fns, react-native-calendars

## Structure des dossiers
```
app/
  (auth)/login.tsx        ← Connexion email/password
  (app)/
    index.tsx             ← Dashboard (arrivées/départs du jour, stocks faibles)
    calendar/             ← Calendrier mensuel avec marqueurs par propriété
    reservations/         ← Liste, création, détail/édition
    properties/           ← Liste, création, détail/édition
    inventory/
      linen/              ← Inventaire linge (8 types)
      equipment/          ← Équipements par logement
      consumables/        ← Consommables + alertes stock bas
    settings/             ← Paramètres et déconnexion
components/
  ui/                     ← EmptyState, StepperInput, PropertyBadge, SectionHeader, StatusBadge
  calendar/               ← DayReservationSheet (modal jour)
  reservation/            ← ReservationCard, LinenPreviewCard
services/                 ← supabase.ts, properties.ts, reservations.ts, inventory.ts
stores/                   ← authStore.ts (session), appStore.ts (filtres UI)
hooks/                    ← useReservations, useProperties, useInventory
types/index.ts            ← Tous les types TypeScript et enums
constants/                ← colors.ts, labels.ts
utils/                    ← dateHelpers.ts, linenCalculator.ts
i18n/fr.json              ← Toutes les traductions françaises
supabase/migrations/      ← Schéma SQL + politiques RLS
```

## Fonctionnalités principales
- **Auth** : Supabase email/password, session persistante (AsyncStorage)
- **Dashboard** : check-ins/check-outs du jour, prochaines réservations, alertes stocks
- **Calendrier** : vue mensuelle, marqueurs colorés (vert=arrivée, orange=départ), filtre par logement
- **Réservations** : CRUD complet, détection chevauchements, calcul automatique du linge
- **Logements** : CRUD, types (SCI/Cohost/Host/Nettoyage), config lits, code couleur
- **Inventaire linge** : 8 types, qtés (en logement / au lavage / stock propre / objectif)
- **Équipements** : articles libres par logement, état (bon/usé/cassé)
- **Consommables** : stock + seuil d'alerte, alertes dashboard

## Base de données (Supabase)
Tables : `profiles`, `properties`, `reservations`, `linen_inventory`, `equipment_inventory`, `consumables`
RLS activé sur toutes les tables (chaque user ne voit que ses données).

## Calcul automatique du linge
Fichier : `utils/linenCalculator.ts`
- Draps doubles = lits doubles utilisés
- Draps simples = lits simples + canapés-lits utilisés
- Serviettes = (couples×2 + adultes seuls + enfants)
- Tapis de bain = nombre de salles de bain
- Torchons = 1 fixe

## Conventions
- Langue de l'app : **français** (fr.json)
- Couleurs primaires : primary `#1a56db`, success `#10B981`, warning `#F59E0B`, danger `#EF4444`
- Pas de commentaires inutiles dans le code
- Commits en français avec préfixe conventionnel (feat, fix, chore…)

## Déploiement
- Développement : **Expo Go** sur Android
- Production : App sur le **Play Store**
- IDs app : `com.kaza.app` (Android & iOS), scheme `kaza`

## GitHub
- Repo : `stringerballs60-sys/Appli`
- Branche principale : `main`
- Les branches Claude Code suivent le pattern `claude/...`

## Historique des sessions
- **Mai 2026** : Initialisation complète du MVP (auth, dashboard, calendrier, réservations, logements, inventaire 3 catégories, calcul linge, RLS Supabase)
- **Mai 2026** : Renommage ConciergePro → KAZA (app.json, package.json, i18n, dashboard)
