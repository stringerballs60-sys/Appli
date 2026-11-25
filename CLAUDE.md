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

- Provenance des réservations (24/11/2026, Presta ajoutée le 25/11/2026) : 5 choix, Direct / Airbnb / Booking / Abritel / **Presta** (logo balai, vert #5F7A5C : logements où Charles ne fait que le ménage, c.-à-d. `property_type` EXTERNAL_CLEANING ou EXTERNAL_CLEANING_CHECKIN : Bernard Lozari, Voûtes de Pascaline, FRANCHI Urtaca ; proposée automatiquement par `defaultChannelFor()` quand on choisit ces logements, et leurs séjours existants ont été passés en `source = 'presta'`), stockés dans la colonne `source` (`manual` = Direct). `constants/channels.ts` (libellés, couleurs, `channelOf()`, `categoryForChannel()`) et `components/ui/ChannelBadge.tsx` (petit logo rond). L'ancienne colonne `category` (enum Postgres) est gardée pour l'appli mobile et la synchro iCal : elle est déduite automatiquement de la provenance et du type de logement, elle n'est plus affichée. Les anciennes résas `AIRBNB_*` saisies à la main ont été passées en `source = 'airbnb'`.

- Logements web (24/11/2026, vue unique depuis le 25/11/2026) : `components/properties/web/` (`WebProperties.tsx`, `views.tsx`, `shared.tsx`), affiché à partir de 900 px. Charles a gardé la vue « Clés » (tableau à clés : clé accrochée = libre, clé chez le voyageur = occupé) ; les vues « Fiches » et « Plan » ont été supprimées. Sur chaque clé : **cadenas** quand le logement est bloqué aujourd'hui (tuile hachurée, motif + date de fin) et **étiquette du jour** (« Arrive aujourd'hui · 16h », « Part aujourd'hui », « Ménage entre deux séjours » en rouge). Recherche, filtres secteur / ménage à faire / inactifs, tri, panneau de détail à droite (double-clic = fiche) avec taux de remplissage, nuits bloquées, dates bloquées à venir et bouton « Bloquer des dates ». La liste mobile utilise `FlatList` sur le web (le glisser-déposer bloquait le défilement).

- Blocages de dates (25/11/2026) : colonne `reservations.kind` (`stay` | `block`, défaut `stay`) + `block_reason` (`personal` | `owner` | `works` | `other`). Migration `20261125100000_reservation_blocks.sql` : contraintes, trigger de ménage qui ignore les blocages, `compute_property_cleaning_status` qui ne compte que les séjours, `at_least_one_guest` ne s'applique qu'aux séjours. `constants/blocks.ts` : libellés des motifs, `isStay` / `isBlock`, `computeOccupancy()` (**taux = nuits louées ÷ (nuits de la période − nuits bloquées)**). Les fonctions de `services/reservations.ts` qui servent aux arrivées, départs, ménages et au tableau de bord filtrent `kind = 'stay'` ; `useReservations({ kind })` et `useReservationsForMonth(from, to, { staysOnly })` pour les écrans (compta, planning, ménages, tâches, calendrier mobile, liste mobile). Écran `app/(app)/reservations/block.tsx` : création (plusieurs logements d'un coup, tout un site) et modification / suppression (`?id=`), refus si chevauchement avec un séjour ou un autre blocage. Calendrier web : blocages en gris hachuré avec cadenas, panneau adapté. `/reservations/[id]` et `/reservations/edit/[id]` renvoient vers l'écran de blocage pour un blocage.
- Synchro iCal **en pause** depuis le 25/11/2026 (`constants/ical.ts`, `ICAL_PAUSED`) : la tâche planifiée `sync-ical-auto` est désactivée dans Supabase (`cron.alter_job(1, active := false)`), le bouton « Synchroniser » de la fiche logement est remplacé par « Synchronisation en pause ». Les liens iCal restent enregistrés (MOLLI Urtaca, MASSIANI). Bug à corriger avant toute réactivation : chaque « Not available » Airbnb dont le début se décale est réimporté comme un nouveau blocage (escaliers).
- Réservations web (25/11/2026) : `components/reservations/web/` (`WebReservations.tsx`, `model.ts`, `StubsView.tsx`, `SeasonView.tsx`), affiché à partir de 900 px dans l'onglet Réservations. Charles a testé trois directions et gardé **« Souches »** (carnet à souches : chaque séjour est un ticket avec talon daté en Instrument Serif, kraft #F3EDE2, bleu carbone #2F4A78, photo du logement collée en coin comme un timbre, tampons « BLOQUÉ » / « ANNULÉE », talon bleu carbone = arrivée du jour), regroupée par mois. Onglet **Passées** = vue **Saison** (`SeasonView`) : une ligne par logement, ruban de la saison (15 mars → 15 nov.) avec les séjours et les blocages hachurés, séjours / nuits / taux / provenances, pour comparer les logements. Onglets À venir · En cours · Passées · Blocages · Annulées, recherche, filtres site et provenance, panneau de droite (dates, voyageurs, provenance, linge), boutons « + Réservation » et « Blocage », clavier ↑ ↓ Entrée.
- Montant gagné par résa (25/11/2026) : colonne `reservations.price` (numeric, €, facultatif ; migrations `20261125130000_reservation_price.sql` et `20261125140000_source_presta.sql`). **Ce n'est pas le prix payé par le voyageur mais ce que Charles gagne** : « Commission » pour Airbnb / Direct / Booking / Abritel, « Presta ménage » pour Presta (`amountLabel()` dans `constants/channels.ts`). Champ dans les formulaires de création et de modification (`components/reservation/PriceInput.tsx`, affiche le prix par nuit), `utils/price.ts` (`parsePrice`, `formatPrice`). Affiché en **tampon rouge** (#B4453A) sous la photo-timbre des tickets « Souches », dans le panneau de droite (avec le prix par nuit) et en colonne « Gains » de la vue Saison (avec « x/y prix saisis » quand il en manque).
- Dates marquées du calendrier (25/11/2026) : table `calendar_marks` (titre, `start_date`, `end_date`, `color` parmi sable / lavande / olive / ciel / rose, `kind` event / holiday / bridge, `yearly` = revient chaque année ; RLS comme `properties`, migration `20261125120000_calendar_marks.sql`). `constants/calendarMarks.ts` (couleurs, `marksInRange()` qui reporte les dates « chaque année » sur la saison affichée), `services/calendarMarks.ts`, `hooks/useCalendarMarks.ts`, `components/calendar/web/MarksEditor.tsx` (fenêtre : liste + formulaire avec calendrier de période). Calendrier web : bouton « Dates marquées » dans la barre du haut, bande « Dates marquées » sous l'en-tête (clic = modifier), fond léger sur les colonnes concernées. Créée pour Charles : « Festival du film de Lama », 31 juillet → 6 août, chaque année. Prévu ensuite : jours fériés et ponts (`kind` holiday / bridge).
- Calendriers `react-native-calendars` en français (`utils/calendarLocale.ts`, importé dans `app/_layout.tsx`).

- Photos des logements (24/11/2026) : colonne `properties.photo_url` + espace de stockage Supabase `property-photos` (lecture publique par lien, écriture limitée au dossier `<user_id>/` du compte connecté, 3 Mo max). `services/propertyPhotos.ts` (choix via `expo-image-picker`, réduction à 900 px JPEG via `expo-image-manipulator`, envoi, suppression de l'ancienne), `hooks/usePropertyPhoto.ts`, `components/properties/PropertyPhotoEditor.tsx` (fiche logement + panneau de la page Logements web). Photo affichée dans les vues Clés / Fiches, le panneau et la colonne des noms du calendrier web.

Plan :
1. ✅ Corriger les 5 erreurs TypeScript, ajouter le support web, obtenir un build web (fait le 24/11/2026 ; connexion Supabase à confirmer sur le PC de Charles).
2. Adapter la mise en page ordinateur écran par écran (tableau de bord, calendrier ✅ et logements ✅ le 24/11/2026, blocages ✅ le 25/11/2026, réservations). Reste aussi à remplacer la barre d'onglets du bas par un menu latéral sur ordinateur.
3. Héberger le site chez un hébergeur européen.
4. Plus tard : table `recaps` (récaps mails produits par n8n) + écran dédié, notifications push via Expo à la place de WhatsApp.

## Historique des sessions
- **Mai 2026** : Initialisation complète du MVP (auth, dashboard, calendrier, réservations, logements, inventaire 3 catégories, calcul linge, RLS Supabase)
- **Mai 2026** : Renommage ConciergePro → KAZA (app.json, package.json, i18n, dashboard)
- **Mai 2026** : Nettoyage GitHub — branche unique `kaza`, CLAUDE.md pour mémoire inter-sessions, hook SessionStart
- **Novembre 2026** : Création de la branche `web` pour la version web, état des lieux et plan dans la section « Version web ».
- **Novembre 2026** : Étape 1 de la version web : support web, 5 erreurs TypeScript corrigées, confirmations et notifications adaptées au web, premier build web réussi.
- **Novembre 2026** : Saison 2027 réglable (15 mars → 15 nov.) et nouveau calendrier web « Fil de la journée » ; lien « Mot de passe oublié ».
- **25/11/2026** : blocages de dates séparés des réservations (taux de remplissage sans les nuits bloquées), écran « Bloquer des dates », vue Clés seule avec cadenas et étiquette du jour, synchro iCal en pause. Nouvelle page Réservations web : direction « Souches » choisie par Charles (parmi « Main courante » et « Quai »), réservations passées en vue Saison.
