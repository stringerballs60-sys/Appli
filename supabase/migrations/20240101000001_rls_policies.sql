-- ============================================================
-- ENABLE RLS ON ALL TABLES
-- ============================================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE linen_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipment_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE consumables ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- PROFILES
-- ============================================================
CREATE POLICY "profiles_own"
  ON profiles FOR ALL
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- ============================================================
-- PROPERTIES
-- ============================================================
CREATE POLICY "properties_own"
  ON properties FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ============================================================
-- RESERVATIONS
-- ============================================================
CREATE POLICY "reservations_own"
  ON reservations FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ============================================================
-- LINEN INVENTORY
-- ============================================================
CREATE POLICY "linen_inventory_own"
  ON linen_inventory FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ============================================================
-- EQUIPMENT INVENTORY
-- ============================================================
CREATE POLICY "equipment_inventory_own"
  ON equipment_inventory FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ============================================================
-- CONSUMABLES
-- ============================================================
CREATE POLICY "consumables_own"
  ON consumables FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
