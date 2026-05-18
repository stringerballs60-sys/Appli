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

export enum LinenType {
  DOUBLE_SHEETS = 'double_sheets',
  SINGLE_SHEETS = 'single_sheets',
  BABY_SHEETS = 'baby_sheets',
  BATH_TOWELS = 'bath_towels',
  HAND_TOWELS = 'hand_towels',
  BATH_MATS = 'bath_mats',
  KITCHEN_TOWELS = 'kitchen_towels',
}

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

export interface Profile {
  id: string
  full_name: string | null
  created_at: string
  updated_at: string
}

export interface Property {
  id: string
  user_id: string
  name: string
  address: string | null
  notes: string | null
  property_type: PropertyType
  nb_double_beds: number
  nb_single_beds: number
  nb_sofa_beds: number
  nb_baby_cribs: number
  max_guests: number
  nb_bathrooms: number
  is_active: boolean
  color: string
  cleaning_status: 'ready' | 'to_do'
  cleaning_status_date: string | null
  created_at: string
  updated_at: string
}

export interface LinenCalculation {
  double_sheets: number
  single_sheets: number
  baby_sheets: number
  bath_towels: number
  hand_towels: number
  bath_mats: number
  kitchen_towels: number
}

export interface Reservation {
  id: string
  user_id: string
  property_id: string
  category: ReservationCategory
  status: ReservationStatus
  check_in: string
  check_out: string
  check_in_time: string | null
  check_in_time_confirmed: boolean
  nb_nights: number
  guest_name: string
  guest_email: string | null
  guest_phone: string | null
  nb_couples: number
  nb_solo_adults: number
  nb_children: number
  nb_babies: number
  beds_double_used: number
  beds_single_used: number
  beds_sofa_used: number
  beds_crib_used: number
  linen_calculation: LinenCalculation | null
  notes: string | null
  created_at: string
  updated_at: string
  property?: Property
}

export interface LinenInventory {
  id: string
  user_id: string
  property_id: string
  linen_type: LinenType
  qty_in_property: number
  qty_dirty_washing: number
  qty_clean_stock: number
  target_rotation: number
  created_at: string
  updated_at: string
}

export interface EquipmentInventory {
  id: string
  user_id: string
  property_id: string
  item_name: string
  quantity: number
  condition: 'good' | 'worn' | 'broken' | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface Consumable {
  id: string
  user_id: string
  property_id: string
  item_name: string
  unit: string
  current_stock: number
  min_threshold: number
  notes: string | null
  created_at: string
  updated_at: string
  is_low?: boolean
  property?: Pick<Property, 'id' | 'name' | 'color'>
}

export interface TaskChecklistItem {
  id: string
  task_id: string
  user_id: string
  label: string
  is_checked: boolean
  checked_at: string | null
  order_index: number
  created_at: string
}

export interface Task {
  id: string
  user_id: string
  property_id: string
  reservation_id: string | null
  type: TaskType
  title: string
  scheduled_date: string
  status: TaskStatus
  started_at: string | null
  completed_at: string | null
  notes: string | null
  created_at: string
  updated_at: string
  property?: Pick<Property, 'id' | 'name' | 'color'>
  checklist_items?: TaskChecklistItem[]
}

export const PROPERTY_TYPE_LABELS: Record<PropertyType, string> = {
  [PropertyType.SCI]: 'SCI',
  [PropertyType.COHOST_AIRBNB]: 'Cohost Airbnb',
  [PropertyType.HOST_AIRBNB]: 'Host Airbnb',
  [PropertyType.EXTERNAL_CLEANING]: 'Nettoyage externe',
  [PropertyType.EXTERNAL_CLEANING_CHECKIN]: 'Nettoyage + check-in',
}

export const RESERVATION_CATEGORY_LABELS: Record<ReservationCategory, string> = {
  [ReservationCategory.AIRBNB_SCI]: 'Airbnb SCI',
  [ReservationCategory.AIRBNB_COHOST]: 'Airbnb Cohost',
  [ReservationCategory.AIRBNB_HOST_ACCOUNT]: 'Airbnb compte hôte',
  [ReservationCategory.EXTERNAL_CLEANING]: 'Nettoyage externe',
  [ReservationCategory.DIRECT_OWN]: 'Direct (propre)',
  [ReservationCategory.DIRECT_FROM_AIRBNB]: 'Direct (via Airbnb)',
}

export const RESERVATION_STATUS_LABELS: Record<ReservationStatus, string> = {
  [ReservationStatus.CONFIRMED]: 'Confirmée',
  [ReservationStatus.PENDING]: 'En attente',
  [ReservationStatus.CANCELLED]: 'Annulée',
  [ReservationStatus.COMPLETED]: 'Terminée',
}

export const LINEN_TYPE_LABELS: Record<LinenType, string> = {
  [LinenType.DOUBLE_SHEETS]: 'Draps doubles',
  [LinenType.SINGLE_SHEETS]: 'Draps simples',
  [LinenType.BABY_SHEETS]: 'Draps bébé',
  [LinenType.BATH_TOWELS]: 'Serviettes de bain',
  [LinenType.HAND_TOWELS]: 'Serviettes main',
  [LinenType.BATH_MATS]: 'Tapis de bain',
  [LinenType.KITCHEN_TOWELS]: 'Torchons',
}

export const TASK_TYPE_LABELS: Record<TaskType, string> = {
  [TaskType.CLEANING]: 'Nettoyage',
  [TaskType.MAINTENANCE]: 'Maintenance',
  [TaskType.RESTOCK]: 'Réapprovisionnement',
}

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  [TaskStatus.PENDING]: 'À faire',
  [TaskStatus.IN_PROGRESS]: 'En cours',
  [TaskStatus.DONE]: 'Terminée',
}
