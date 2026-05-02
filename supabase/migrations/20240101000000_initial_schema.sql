-- ============================================================
-- EXTENSIONS
-- ============================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- ENUMS
-- ============================================================
CREATE TYPE property_type AS ENUM (
  'SCI',
  'COHOST_AIRBNB',
  'HOST_AIRBNB',
  'EXTERNAL_CLEANING',
  'EXTERNAL_CLEANING_CHECKIN'
);

CREATE TYPE reservation_category AS ENUM (
  'AIRBNB_SCI',
  'AIRBNB_COHOST',
  'AIRBNB_HOST_ACCOUNT',
  'EXTERNAL_CLEANING',
  'DIRECT_OWN',
  'DIRECT_FROM_AIRBNB'
);

CREATE TYPE reservation_status AS ENUM (
  'confirmed',
  'pending',
  'cancelled',
  'completed'
);

CREATE TYPE linen_type AS ENUM (
  'double_sheets',
  'single_sheets',
  'baby_sheets',
  'bath_towels',
  'hand_towels',
  'face_towels',
  'bath_mats',
  'kitchen_towels'
);

-- ============================================================
-- PROFILES (extends auth.users, one per user)
-- ============================================================
CREATE TABLE profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name   TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- PROPERTIES
-- ============================================================
CREATE TABLE properties (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id             UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name                TEXT NOT NULL,
  address             TEXT,
  notes               TEXT,
  property_type       property_type NOT NULL,
  nb_double_beds      INTEGER NOT NULL DEFAULT 0,
  nb_single_beds      INTEGER NOT NULL DEFAULT 0,
  nb_sofa_beds        INTEGER NOT NULL DEFAULT 0,
  nb_baby_cribs       INTEGER NOT NULL DEFAULT 0,
  max_guests          INTEGER NOT NULL DEFAULT 2,
  nb_bathrooms        INTEGER NOT NULL DEFAULT 1,
  is_active           BOOLEAN NOT NULL DEFAULT true,
  color               TEXT NOT NULL DEFAULT '#4ECDC4',
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- RESERVATIONS
-- ============================================================
CREATE TABLE reservations (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id             UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  property_id         UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  category            reservation_category NOT NULL,
  status              reservation_status NOT NULL DEFAULT 'confirmed',
  check_in            DATE NOT NULL,
  check_out           DATE NOT NULL,
  nb_nights           INTEGER GENERATED ALWAYS AS (check_out - check_in) STORED,
  guest_name          TEXT NOT NULL,
  guest_email         TEXT,
  guest_phone         TEXT,
  nb_couples          INTEGER NOT NULL DEFAULT 0,
  nb_solo_adults      INTEGER NOT NULL DEFAULT 0,
  nb_children         INTEGER NOT NULL DEFAULT 0,
  nb_babies           INTEGER NOT NULL DEFAULT 0,
  -- beds actually used (manually confirmed by user)
  beds_double_used    INTEGER NOT NULL DEFAULT 0,
  beds_single_used    INTEGER NOT NULL DEFAULT 0,
  beds_sofa_used      INTEGER NOT NULL DEFAULT 0,
  beds_crib_used      INTEGER NOT NULL DEFAULT 0,
  -- linen calculated from beds used
  linen_calculation   JSONB,
  notes               TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT valid_dates CHECK (check_out > check_in),
  CONSTRAINT at_least_one_guest CHECK (
    (nb_couples + nb_solo_adults + nb_children + nb_babies) > 0
  )
);

CREATE INDEX idx_reservations_user_dates
  ON reservations(user_id, check_in, check_out);
CREATE INDEX idx_reservations_property_dates
  ON reservations(property_id, check_in, check_out);

-- ============================================================
-- LINEN INVENTORY
-- ============================================================
CREATE TABLE linen_inventory (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id             UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  property_id         UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  linen_type          linen_type NOT NULL,
  qty_in_property     INTEGER NOT NULL DEFAULT 0,
  qty_dirty_washing   INTEGER NOT NULL DEFAULT 0,
  qty_clean_stock     INTEGER NOT NULL DEFAULT 0,
  target_rotation     INTEGER NOT NULL DEFAULT 3,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(property_id, linen_type),
  CONSTRAINT non_negative_qty CHECK (
    qty_in_property >= 0 AND qty_dirty_washing >= 0 AND qty_clean_stock >= 0
  )
);

-- ============================================================
-- EQUIPMENT INVENTORY
-- ============================================================
CREATE TABLE equipment_inventory (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id             UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  property_id         UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  item_name           TEXT NOT NULL,
  quantity            INTEGER NOT NULL DEFAULT 1,
  condition           TEXT CHECK (condition IN ('good', 'worn', 'broken')),
  notes               TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- CONSUMABLES
-- ============================================================
CREATE TABLE consumables (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id             UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  property_id         UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  item_name           TEXT NOT NULL,
  unit                TEXT NOT NULL DEFAULT 'unité',
  current_stock       NUMERIC(10,2) NOT NULL DEFAULT 0,
  min_threshold       NUMERIC(10,2) NOT NULL DEFAULT 1,
  notes               TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT non_negative_stock CHECK (current_stock >= 0)
);

-- ============================================================
-- TRIGGER: updated_at auto-update
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_properties_updated_at
  BEFORE UPDATE ON properties FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_reservations_updated_at
  BEFORE UPDATE ON reservations FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_linen_inventory_updated_at
  BEFORE UPDATE ON linen_inventory FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_equipment_inventory_updated_at
  BEFORE UPDATE ON equipment_inventory FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_consumables_updated_at
  BEFORE UPDATE ON consumables FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- TRIGGER: auto-create profile on user signup
-- ============================================================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, full_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
