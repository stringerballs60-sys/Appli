-- ============================================================
-- COMPTABLE ROLE – ajout du rôle comptable + restriction inventaire
-- ============================================================

-- 1. Étendre la contrainte de rôle pour inclure 'comptable'
ALTER TABLE team_members DROP CONSTRAINT IF EXISTS team_members_role_check;
ALTER TABLE team_members ADD CONSTRAINT team_members_role_check
  CHECK (role IN ('cleaner', 'comptable'));

-- 2. Fonction helper : vérifie si l'utilisateur a un rôle spécifique
CREATE OR REPLACE FUNCTION has_role(user_uuid UUID, role_name TEXT)
RETURNS BOOLEAN AS $$
  SELECT EXISTS(
    SELECT 1 FROM team_members
    WHERE member_id = user_uuid AND role = role_name
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ============================================================
-- LINEN / EQUIPMENT / CONSUMABLES : cleaner uniquement
-- (le comptable n'a pas accès à l'inventaire)
-- ============================================================
DROP POLICY IF EXISTS "linen_read" ON linen_inventory;
CREATE POLICY "linen_read"
  ON linen_inventory FOR SELECT
  USING (
    user_id = auth.uid()
    OR (user_id = get_owner_id(auth.uid()) AND has_role(auth.uid(), 'cleaner'))
  );

DROP POLICY IF EXISTS "equipment_read" ON equipment_inventory;
CREATE POLICY "equipment_read"
  ON equipment_inventory FOR SELECT
  USING (
    user_id = auth.uid()
    OR (user_id = get_owner_id(auth.uid()) AND has_role(auth.uid(), 'cleaner'))
  );

DROP POLICY IF EXISTS "consumables_read" ON consumables;
CREATE POLICY "consumables_read"
  ON consumables FOR SELECT
  USING (
    user_id = auth.uid()
    OR (user_id = get_owner_id(auth.uid()) AND has_role(auth.uid(), 'cleaner'))
  );

-- ============================================================
-- TASKS / CHECKLIST : cleaner uniquement
-- ============================================================
DROP POLICY IF EXISTS "tasks_read" ON tasks;
CREATE POLICY "tasks_read"
  ON tasks FOR SELECT
  USING (
    user_id = auth.uid()
    OR (user_id = get_owner_id(auth.uid()) AND has_role(auth.uid(), 'cleaner'))
  );

DROP POLICY IF EXISTS "tasks_update" ON tasks;
CREATE POLICY "tasks_update"
  ON tasks FOR UPDATE
  USING (
    user_id = auth.uid()
    OR (user_id = get_owner_id(auth.uid()) AND has_role(auth.uid(), 'cleaner'))
  );

DROP POLICY IF EXISTS "checklist_read" ON task_checklist_items;
CREATE POLICY "checklist_read"
  ON task_checklist_items FOR SELECT
  USING (
    user_id = auth.uid()
    OR (user_id = get_owner_id(auth.uid()) AND has_role(auth.uid(), 'cleaner'))
  );

DROP POLICY IF EXISTS "checklist_update" ON task_checklist_items;
CREATE POLICY "checklist_update"
  ON task_checklist_items FOR UPDATE
  USING (
    user_id = auth.uid()
    OR (user_id = get_owner_id(auth.uid()) AND has_role(auth.uid(), 'cleaner'))
  );

DROP POLICY IF EXISTS "templates_read" ON property_checklist_templates;
CREATE POLICY "templates_read"
  ON property_checklist_templates FOR SELECT
  USING (
    user_id = auth.uid()
    OR (user_id = get_owner_id(auth.uid()) AND has_role(auth.uid(), 'cleaner'))
  );

-- ============================================================
-- PROPERTIES / RESERVATIONS : cleaner + comptable (déjà ouvert)
-- Pas de changement nécessaire — get_owner_id() couvre les deux rôles
-- ============================================================
