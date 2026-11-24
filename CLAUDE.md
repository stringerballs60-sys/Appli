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

État (24/11/2026, après l'étape 1) :
- Support web ajouté : `react-native-web`, `@expo/metro-runtime`, `react-dom` 19.1.0 (aligné sur `react`). Les anciens `react-dom` 19.2.6 et `scheduler` 0.27.0 des devDependencies ont été retirés.
- `npx tsc --noEmit` : 0 erreur dans l'appli (seules restent celles de `supabase/functions`, code Deno, normales).
- `npx expo export --platform web` réussit (dossier `dist/`) ; l'écran de connexion s'affiche dans Chrome.
- Synchro iCal : la fonction `sync-ical` renvoie `inserted`/`updated`/`cancelled` ; c'est le type dans `hooks/useProperties.ts` qui a été corrigé.
- Web : `utils/alert.ts` remplace `Alert` de React Native (qui ne fait rien sur le web) par `window.confirm`/`window.alert` ; toujours importer `Alert` depuis `@/utils/alert`.
- Web : notifications désactivées (`setNotificationHandler` ignoré, section Notifications masquée dans Paramètres) ; `KeyboardAvoidingView` sans comportement sur le web.
- Variables d'environnement : copier `.env.example` en `.env` et y mettre la clé anon (Supabase → Project Settings → API).
- Lancer en local : `npx expo start --web` (ou `npx expo export --platform web` puis servir `dist/`).

- Saison : `constants/season.ts` (15 mars → 15 novembre, `SEASON_YEARS` = 2026, 2027). `getCurrentSeason()` renvoie la saison en cours ou la suivante ; le calendrier, le planning ménage et les changements de locataires s'arrêtent à la fin de saison (plus de date figée au 30/10/2026). Pour une nouvelle année, ajouter l'année dans `SEASON_YEARS`.
- Calendrier web (direction « Fil de la journée », choisie par Charles le 24/11/2026) : `components/calendar/web/` (`WebCalendar.tsx`, `DayPanel.tsx`, `dayModel.ts`, `tokens.ts`). Affiché sur le web à partir de 900 px de large ; en dessous, le calendrier mobile. Grille logements × jours groupée par site (`group_name`), barres en demi-journée (arrivée l'après-midi, départ le matin), trait rouge = ménage entre deux séjours (seule couleur forte), colonne du jour choisi en or. Panneau de droite : ménages entre deux séjours, départs, arrivées (heure, voyageurs), linge à préparer, logements en séjour ; clic sur une réservation = sa fiche dans le panneau ; clic sur une case vide = « + Nouvelle réservation » pré-remplie (`/reservations/new?propertyId=…&checkIn=…`). Clavier : ← → jour précédent/suivant, T aujourd'hui, Échap. Police Atkinson Hyperlegible (`FONTS.readable`).

- Provenance des réservations (24/11/2026) : 4 choix seulement, Direct / Airbnb / Booking / Abritel, stockés dans la colonne `source` (`manual` = Direct). `constants/channels.ts` (libellés, couleurs, `channelOf()`, `categoryForChannel()`) et `components/ui/ChannelBadge.tsx` (petit logo rond). L'ancienne colonne `category` (enum Postgres) est gardée pour l'appli mobile et la synchro iCal : elle est déduite automatiquement de la provenance et du type de logement, elle n'est plus affichée. Les anciennes résas `AIRBNB_*` saisies à la main ont été passées en `source = 'airbnb'`.

- Logements web (24/11/2026) : `components/properties/web/WebProperties.tsx`, affiché à partir de 900 px (même direction que le calendrier). Tableau groupé par site : miniature (initiales sur la couleur du logement tant qu'il n'y a pas de `photo_url`), état du ménage (rouge = à faire), occupant actuel, prochaine arrivée avec logo de provenance, remplissage de la saison, capacité. Recherche, filtres site / ménage à faire / inactifs, tri, ↑ ↓ Entrée au clavier, panneau de droite (notes, couchages, prochains séjours, actions). La liste mobile utilise `FlatList` sur le web (le glisser-déposer bloquait le défilement).

Plan :
1. ✅ Corriger les 5 erreurs TypeScript, ajouter le support web, obtenir un build web (fait le 24/11/2026 ; connexion Supabase à confirmer sur le PC de Charles).
2. Adapter la mise en page ordinateur écran par écran (tableau de bord, calendrier ✅ et logements ✅ le 24/11/2026, réservations). Reste aussi à remplacer la barre d'onglets du bas par un menu latéral sur ordinateur.
3. Héberger le site chez un hébergeur européen.
4. Plus tard : table `recaps` (récaps mails produits par n8n) + écran dédié, notifications push via Expo à la place de WhatsApp.

## Historique des sessions
- **Mai 2026** : Initialisation complète du MVP (auth, dashboard, calendrier, réservations, logements, inventaire 3 catégories, calcul linge, RLS Supabase)
- **Mai 2026** : Renommage ConciergePro → KAZA (app.json, package.json, i18n, dashboard)
- **Mai 2026** : Nettoyage GitHub — branche unique `kaza`, CLAUDE.md pour mémoire inter-sessions, hook SessionStart
- **Novembre 2026** : Création de la branche `web` pour la version web, état des lieux et plan dans la section « Version web ».
- **Novembre 2026** : Étape 1 de la version web : support web, 5 erreurs TypeScript corrigées, confirmations et notifications adaptées au web, premier build web réussi.
- **Novembre 2026** : Saison 2027 réglable (15 mars → 15 nov.) et nouveau calendrier web « Fil de la journée » ; lien « Mot de passe oublié ».
