# KAZA — Contexte projet pour Claude Code

## Présentation
Application mobile de gestion de conciergerie Airbnb, anciennement nommée ConciergePro, rebaptisée **KAZA**.
Utilisée par un gestionnaire indépendant pour suivre ses réservations, son linge et ses stocks.

## Stack technique
- React Native 0.81.5 + React 19 + TypeScript
- Expo 54 + Expo Router 6 (navigation par fichiers)
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
- Branche `kaza` : version mobile (Expo Go / Play Store). Les corrections de l'appli mobile se font directement sur `kaza`.
- Branche `web` : version web de KAZA (créée en novembre 2026). Tout le travail web se fait sur `web`, jamais sur `kaza`, pour ne pas casser la version Play Store. On fusionnera `web` dans `kaza` seulement quand la version web sera stable et testée sur mobile.
- Ne pas créer d'autres branches sans l'accord de Charles.

## Version web (branche `web`, en cours)
Objectif : une version web de KAZA, utilisable sur ordinateur, qui deviendra à terme le PMS maison de Charles (gratuit, sans abonnement à un PMS payant).

État des lieux (24/11/2026) :
- `npx expo export --platform web` échoue : il manque `react-native-web` (`npx expo install react-native-web`) et `@expo/metro-runtime`. `react-dom` (19.2.6) ne correspond pas à `react` (19.1.0) : l'aligner sur 19.1.0.
- `npx tsc --noEmit` : 5 erreurs dans l'appli (les 5 de `supabase/functions` sont normales, code Deno) :
  - `app/(app)/inventory/linen/[propertyId].tsx` : `LinenType.FACE_TOWELS` n'existe plus
  - `app/(app)/properties/[id].tsx` : la synchro iCal renvoie `upserted`/`cancelled`, plus `inserted`/`updated`
  - `app/(app)/properties/new.tsx` : champ `group_name` manquant dans le formulaire
  - `services/notifications.ts` : `NotificationBehavior` d'Expo 54 exige `shouldShowBanner` et `shouldShowList`
- Code mobile uniquement à adapter pour le web : notifications (`services/notifications.ts`, `notificationPrefs.ts`), `Platform.OS` dans les écrans de saisie (réservations, tâches, mémos, connexion).
- Mise en page pensée pour téléphone : prévoir une disposition ordinateur (menu latéral, tableaux larges).

Plan :
1. Corriger les 5 erreurs TypeScript, ajouter le support web, obtenir un build web qui se connecte à Supabase (variables `EXPO_PUBLIC_SUPABASE_URL` / `EXPO_PUBLIC_SUPABASE_ANON_KEY`).
2. Adapter la mise en page ordinateur écran par écran (tableau de bord, calendrier, réservations, logements en priorité).
3. Héberger le site chez un hébergeur européen.
4. Plus tard : table `recaps` (récaps mails produits par n8n) + écran dédié, notifications push via Expo à la place de WhatsApp.

## Historique des sessions
- **Mai 2026** : Initialisation complète du MVP (auth, dashboard, calendrier, réservations, logements, inventaire 3 catégories, calcul linge, RLS Supabase)
- **Mai 2026** : Renommage ConciergePro → KAZA (app.json, package.json, i18n, dashboard)
- **Mai 2026** : Nettoyage GitHub — branche unique `kaza`, CLAUDE.md pour mémoire inter-sessions, hook SessionStart
- **Novembre 2026** : Création de la branche `web` pour la version web, état des lieux et plan dans la section « Version web ».
