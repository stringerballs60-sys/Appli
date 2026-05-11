-- ============================================================
-- ROLES MODULE – team_members + RLS updates
-- ============================================================

CREATE TABLE team_members (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  member_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  member_name  TEXT NOT NULL,
  member_email TEXT NOT NULL,
  role         TEXT NOT NULL DEFAULT 'cleaner' CHECK (role IN ('cleaner')),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(owner_id, member_id)
);

CREATE INDEX idx_team_members_member ON team_members(member_id);
CREATE INDEX idx_team_members_owner  ON team_members(owner_id);

ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "team_members: owner can manage"
  ON team_members FOR ALL USING (auth.uid() = owner_id);

CREATE POLICY "team_members: member can read own"
  ON team_members FOR SELECT USING (auth.uid() = member_id);

-- SECURITY DEFINER so it bypasses RLS when called inside policies
CREATE OR REPLACE FUNCTION get_owner_id(user_uuid UUID)
RETURNS UUID AS $$
  SELECT owner_id FROM team_members WHERE member_id = user_uuid LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ============================================================
-- PROPERTIES: cleaner read-only
-- ============================================================
DROP POLICY IF EXISTS "properties_own" ON properties;
CREATE POLICY "properties_read"
  ON properties FOR SELECT
  USING (user_id = auth.uid() OR user_id = get_owner_id(auth.uid()));
CREATE POLICY "properties_insert"
  ON properties FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "properties_update"
  ON properties FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "properties_delete"
  ON properties FOR DELETE USING (user_id = auth.uid());

-- ============================================================
-- RESERVATIONS: cleaner read-only
-- ============================================================
DROP POLICY IF EXISTS "reservations_own" ON reservations;
CREATE POLICY "reservations_read"
  ON reservations FOR SELECT
  USING (user_id = auth.uid() OR user_id = get_owner_id(auth.uid()));
CREATE POLICY "reservations_insert"
  ON reservations FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "reservations_update"
  ON reservations FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "reservations_delete"
  ON reservations FOR DELETE USING (user_id = auth.uid());

-- ============================================================
-- LINEN / EQUIPMENT / CONSUMABLES: cleaner read-only
-- ============================================================
DROP POLICY IF EXISTS "linen_inventory_own" ON linen_inventory;
CREATE POLICY "linen_read"
  ON linen_inventory FOR SELECT
  USING (user_id = auth.uid() OR user_id = get_owner_id(auth.uid()));
CREATE POLICY "linen_insert"
  ON linen_inventory FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "linen_update"
  ON linen_inventory FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "linen_delete"
  ON linen_inventory FOR DELETE USING (user_id = auth.uid());

DROP POLICY IF EXISTS "equipment_inventory_own" ON equipment_inventory;
CREATE POLICY "equipment_read"
  ON equipment_inventory FOR SELECT
  USING (user_id = auth.uid() OR user_id = get_owner_id(auth.uid()));
CREATE POLICY "equipment_insert"
  ON equipment_inventory FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "equipment_update"
  ON equipment_inventory FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "equipment_delete"
  ON equipment_inventory FOR DELETE USING (user_id = auth.uid());

DROP POLICY IF EXISTS "consumables_own" ON consumables;
CREATE POLICY "consumables_read"
  ON consumables FOR SELECT
  USING (user_id = auth.uid() OR user_id = get_owner_id(auth.uid()));
CREATE POLICY "consumables_insert"
  ON consumables FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "consumables_update"
  ON consumables FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "consumables_delete"
  ON consumables FOR DELETE USING (user_id = auth.uid());

-- ============================================================
-- TASKS: cleaner can read + update (start/finish)
-- ============================================================
DROP POLICY IF EXISTS "tasks: user owns" ON tasks;
CREATE POLICY "tasks_read"
  ON tasks FOR SELECT
  USING (user_id = auth.uid() OR user_id = get_owner_id(auth.uid()));
CREATE POLICY "tasks_insert"
  ON tasks FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "tasks_update"
  ON tasks FOR UPDATE
  USING (user_id = auth.uid() OR user_id = get_owner_id(auth.uid()));
CREATE POLICY "tasks_delete"
  ON tasks FOR DELETE USING (user_id = auth.uid());

-- CHECKLIST ITEMS: cleaner can read + check/uncheck
DROP POLICY IF EXISTS "task_checklist_items: user owns" ON task_checklist_items;
CREATE POLICY "checklist_read"
  ON task_checklist_items FOR SELECT
  USING (user_id = auth.uid() OR user_id = get_owner_id(auth.uid()));
CREATE POLICY "checklist_insert"
  ON task_checklist_items FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "checklist_update"
  ON task_checklist_items FOR UPDATE
  USING (user_id = auth.uid() OR user_id = get_owner_id(auth.uid()));
CREATE POLICY "checklist_delete"
  ON task_checklist_items FOR DELETE USING (user_id = auth.uid());

-- TEMPLATES: cleaner read-only
DROP POLICY IF EXISTS "property_checklist_templates: user owns" ON property_checklist_templates;
CREATE POLICY "templates_read"
  ON property_checklist_templates FOR SELECT
  USING (user_id = auth.uid() OR user_id = get_owner_id(auth.uid()));
CREATE POLICY "templates_insert"
  ON property_checklist_templates FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "templates_update"
  ON property_checklist_templates FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "templates_delete"
  ON property_checklist_templates FOR DELETE USING (user_id = auth.uid());
