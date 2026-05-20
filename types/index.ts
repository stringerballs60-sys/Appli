// ── Enums ──────────────────────────────────────────────────────────────────────────────

export enum PropertyType {
  SCI = 'SCI',
  COHOST_AIRBNB = 'COHOST_AIRBNB',
  HOST_AIRBNB = 'HOST_AIRBNB',
  EXTERNAL_CLEANING = 'EXTERNAL_CLEANING',
  EXTERNAL_CLEANING_CHECKIN = 'EXTERNAL_CLEANING_CHECKIN',
}

export enum ReservationCategory {
  AIRBNB_SCI = 'AIRBNB_SCI',
  AIRBNB_COHOST = 'AIRBNB_COHOST',
  AIRBNB_HOST_ACCOUNT = 'AIRBNB_HOST_ACCOUNT',
  EXTERNAL_CLEANING = 'EXTERNAL_CLEANING',
  DIRECT_OWN = 'DIRECT_OWN',
  DIRECT_FROM_AIRBNB = 'DIRECT_FROM_AIRBNB',
}

export enum ReservationStatus {
  CONFIRMED = 'confirmed',
  PENDING = 'pending',
  CANCELLED = 'cancelled',
  COMPLETED = 'completed',
}

export type ReservationSource = 'airbnb' | 'booking' | 'abritel' | 'manual';

export enum LinenType {
  DOUBLE_SHEETS = 'double_sheets',
  SINGLE_SHEETS = 'single_sheets',
  BABY_SHEETS = 'baby_sheets',
  BATH_TOWELS = 'bath_towels',
  HAND_TOWELS = 'hand_towels',
  BATH_MATS = 'bath_mats',
  KITCHEN_TOWELS = 'kitchen_towels',
}

// ── Data Models ──────────────────────────────────────────────────────────────────

export interface Profile {
  id: string;
  full_name: string | null;
  created_at: string;
  updated_at: string;
}

export interface Property {
  id: string;
  user_id: string;
  name: string;
  address: string | null;
  notes: string | null;
  property_type: PropertyType;
  nb_double_beds: number;
  nb_single_beds: number;
  nb_sofa_beds: number;
  nb_baby_cribs: number;
  max_guests: number;
  nb_bathrooms: number;
  is_active: boolean;
  color: string;
  cleaning_status: 'ready' | 'to_do';
  cleaning_status_date: string | null;
  ical_url: string | null;
  group_name: string | null;
  created_at: string;
  updated_at: string;
}

export interface LinenCalculation {
  double_sheets: number;
  single_sheets: number;
  baby_sheets: number;
  bath_towels: number;
  hand_towels: number;
  bath_mats: number;
  kitchen_towels: number;
}

export interface Reservation {
  id: string;
  user_id: string;
  property_id: string;
  category: ReservationCategory;
  status: ReservationStatus;
  check_in: string;
  check_out: string;
  check_in_time: string | null;
  check_in_time_confirmed: boolean;
  nb_nights: number;
  guest_name: string;
  guest_email: string | null;
  guest_phone: string | null;
  nb_couples: number;
  nb_solo_adults: number;
  nb_children: number;
  nb_babies: number;
  beds_double_used: number;
  beds_single_used: number;
  beds_sofa_used: number;
  beds_crib_used: number;
  linen_calculation: LinenCalculation | null;
  notes: string | null;
  source: ReservationSource;
  ical_uid: string | null;
  created_at: string;
  updated_at: string;
  property?: Property;
}

export interface LinenInventory {
  id: string;
  user_id: string;
  property_id: string;
  linen_type: LinenType;
  qty_in_property: number;
  qty_dirty_washing: number;
  qty_clean_stock: number;
  target_rotation: number;
  created_at: string;
  updated_at: string;
}

export interface EquipmentInventory {
  id: string;
  user_id: string;
  property_id: string;
  item_name: string;
  quantity: number;
  condition: 'good' | 'worn' | 'broken' | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Consumable {
  id: string;
  user_id: string;
  property_id: string;
  item_name: string;
  unit: string;
  current_stock: number;
  min_threshold: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
  is_low?: boolean;
  property?: Pick<Property, 'id' | 'name' | 'color'>;
}

// ── Form / Input Types ────────────────────────────────────────────────────────────────────

export type PropertyFormData = {
  name: string;
  address: string;
  notes: string;
  property_type: PropertyType;
  nb_double_beds: number;
  nb_single_beds: number;
  nb_sofa_beds: number;
  nb_baby_cribs: number;
  max_guests: number;
  nb_bathrooms: number;
  is_active: boolean;
  color: string;
  ical_url: string;
  group_name: string;
};

export type ReservationFormData = {
  property_id: string;
  category: ReservationCategory;
  status: ReservationStatus;
  guest_name: string;
  guest_email: string;
  guest_phone: string;
  check_in: string;
  check_out: string;
  check_in_time?: string;
  check_in_time_confirmed?: boolean;
  nb_couples: number;
  nb_solo_adults: number;
  nb_children: number;
  nb_babies: number;
  beds_double_used: number;
  beds_single_used: number;
  beds_sofa_used: number;
  beds_crib_used: number;
  notes: string;
};

// ── Tasks ─────────────────────────────────────────────────────────────────────────────────────

export enum TaskType {
  CLEANING = 'cleaning',
  MAINTENANCE = 'maintenance',
  RESTOCK = 'restock',
}

export enum TaskStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  DONE = 'done',
}

export interface TaskChecklistItem {
  id: string;
  task_id: string;
  user_id: string;
  label: string;
  is_checked: boolean;
  checked_at: string | null;
  order_index: number;
  created_at: string;
}

export interface PropertyChecklistTemplate {
  id: string;
  user_id: string;
  property_id: string;
  label: string;
  order_index: number;
  created_at: string;
}

export interface Task {
  id: string;
  user_id: string;
  property_id: string;
  reservation_id: string | null;
  type: TaskType;
  title: string;
  scheduled_date: string;
  status: TaskStatus;
  started_at: string | null;
  completed_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  property?: Pick<Property, 'id' | 'name' | 'color'>;
  checklist_items?: TaskChecklistItem[];
}

export type TaskFormData = {
  property_id: string;
  reservation_id: string | null;
  type: TaskType;
  title: string;
  scheduled_date: string;
  notes: string;
};

// ── Roles ─────────────────────────────────────────────────────────────────────

export type UserRole = 'manager' | 'cleaner' | 'comptable';

export interface TeamMember {
  id: string;
  owner_id: string;
  member_id: string;
  member_name: string;
  member_email: string;
  role: 'cleaner' | 'comptable';
  created_at: string;
}

export interface Membership {
  ownerId: string;
  role: 'cleaner' | 'comptable';
}

export type MemoPriority = 'normal' | 'urgent' | 'info';
export type MemoStatus = 'pending' | 'done';

export interface Memo {
  id: string;
  user_id: string;
  text: string;
  status: MemoStatus;
  priority: MemoPriority;
  created_at: string;
  completed_at: string | null;
}
