-- ============================================================
-- ICAL SYNC – ical_url sur properties + ical_uid sur reservations
-- ============================================================

-- URL iCal par logement (Airbnb, Booking, Abritel…)
ALTER TABLE properties
  ADD COLUMN IF NOT EXISTS ical_url TEXT;

-- Identifiant unique de l'événement dans le flux iCal
-- Permet de dédoublonner les imports sans créer de duplicatas
ALTER TABLE reservations
  ADD COLUMN IF NOT EXISTS ical_uid TEXT;

-- Index unique partiel : (property_id, ical_uid) uniquement si ical_uid est renseigné
CREATE UNIQUE INDEX IF NOT EXISTS idx_reservations_ical_uid
  ON reservations(property_id, ical_uid)
  WHERE ical_uid IS NOT NULL;
