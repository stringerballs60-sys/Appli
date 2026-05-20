-- ============================================================
-- CLEANING V2 — Agents, pause, statuts propriété, auto-création
-- ============================================================

-- ── 1. Étendre tasks ─────────────────────────────────────────────────────────

ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS paused_at   TIMESTAMPTZ;

ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_status_check;
ALTER TABLE tasks ADD CONSTRAINT tasks_status_check
  CHECK (status IN ('pending', 'in_progress', 'paused', 'done'));

-- ── 2. Étendre properties.cleaning_status ───────────────────────────────────

ALTER TABLE properties DROP CONSTRAINT IF EXISTS properties_cleaning_status_check;
ALTER TABLE properties ADD CONSTRAINT properties_cleaning_status_check
  CHECK (cleaning_status IN ('ready', 'to_do', 'in_progress', 'occupied'));

-- ── 3. Fonction : calcul du statut ménage d'un logement ─────────────────────

CREATE OR REPLACE FUNCTION compute_property_cleaning_status(prop_id UUID)
RETURNS TEXT AS $$
DECLARE
  today            DATE := CURRENT_DATE;
  has_active_resa  BOOLEAN;
  pending_status   TEXT;
BEGIN
  -- Occupé : réservation en cours aujourd'hui
  SELECT EXISTS(
    SELECT 1 FROM reservations
    WHERE property_id = prop_id
      AND status NOT IN ('cancelled')
      AND check_in  <= today
      AND check_out  > today
  ) INTO has_active_resa;

  IF has_active_resa THEN RETURN 'occupied'; END IF;

  -- Cherche la dernière tâche ménage non terminée
  SELECT status INTO pending_status
  FROM tasks
  WHERE property_id = prop_id
    AND type   = 'cleaning'
    AND status != 'done'
  ORDER BY scheduled_date DESC, created_at DESC
  LIMIT 1;

  IF pending_status IN ('in_progress', 'paused') THEN RETURN 'in_progress'; END IF;
  IF pending_status = 'pending'                  THEN RETURN 'to_do';       END IF;
  RETURN 'ready';
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- ── 4. Trigger : mise à jour du statut propriété ────────────────────────────

CREATE OR REPLACE FUNCTION trg_update_property_cleaning_status()
RETURNS TRIGGER AS $$
DECLARE
  target_prop UUID;
BEGIN
  target_prop := COALESCE(NEW.property_id, OLD.property_id);
  UPDATE properties
     SET cleaning_status      = compute_property_cleaning_status(target_prop),
         cleaning_status_date = now()
   WHERE id = target_prop;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tasks_sync_property_status ON tasks;
CREATE TRIGGER tasks_sync_property_status
  AFTER INSERT OR UPDATE OF status ON tasks
  FOR EACH ROW
  WHEN (NEW.type = 'cleaning')
  EXECUTE FUNCTION trg_update_property_cleaning_status();

DROP TRIGGER IF EXISTS reservations_sync_property_status ON reservations;
CREATE TRIGGER reservations_sync_property_status
  AFTER INSERT OR UPDATE OF check_in, check_out, status ON reservations
  FOR EACH ROW
  EXECUTE FUNCTION trg_update_property_cleaning_status();

-- ── 5. Trigger : création automatique de tâche ménage ───────────────────────

CREATE OR REPLACE FUNCTION trg_auto_create_cleaning_task()
RETURNS TRIGGER AS $$
DECLARE
  prop_name   TEXT;
  new_task_id UUID;
BEGIN
  -- Ignorer les annulations
  IF NEW.status = 'cancelled' THEN RETURN NEW; END IF;
  -- Sur UPDATE, n'agir que si la résa vient d'être dé-annulée ou nouvellement créée
  IF TG_OP = 'UPDATE' AND OLD.status != 'cancelled' THEN RETURN NEW; END IF;

  -- Déjà une tâche ménage liée ?
  IF EXISTS (
    SELECT 1 FROM tasks WHERE reservation_id = NEW.id AND type = 'cleaning'
  ) THEN RETURN NEW; END IF;

  SELECT name INTO prop_name FROM properties WHERE id = NEW.property_id;

  INSERT INTO tasks (user_id, property_id, reservation_id, type, title, scheduled_date, status)
  VALUES (
    NEW.user_id, NEW.property_id, NEW.id, 'cleaning',
    'Ménage – ' || COALESCE(prop_name, 'Logement'),
    NEW.check_out, 'pending'
  )
  RETURNING id INTO new_task_id;

  -- Copier les items du modèle de checklist du logement
  INSERT INTO task_checklist_items (task_id, user_id, label, order_index)
  SELECT new_task_id, NEW.user_id, label, order_index
  FROM   property_checklist_templates
  WHERE  property_id = NEW.property_id
    AND  user_id     = NEW.user_id
  ORDER  BY order_index;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS reservations_auto_cleaning ON reservations;
CREATE TRIGGER reservations_auto_cleaning
  AFTER INSERT OR UPDATE OF status ON reservations
  FOR EACH ROW
  EXECUTE FUNCTION trg_auto_create_cleaning_task();

-- ── 6. Index pour les requêtes sur assigned_to ──────────────────────────────

CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to ON tasks(assigned_to);
