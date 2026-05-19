ALTER TABLE reservations
  ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'manual';

ALTER TABLE reservations
  DROP CONSTRAINT IF EXISTS reservations_source_check;

ALTER TABLE reservations
  ADD CONSTRAINT reservations_source_check
  CHECK (source IN ('airbnb', 'booking', 'abritel', 'manual'));
