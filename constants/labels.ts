import { PropertyType, ReservationCategory, ReservationStatus, LinenType } from '@/types';

export const PROPERTY_TYPE_LABELS: Record<PropertyType, string> = {
  [PropertyType.SCI]: 'SCI (propre)',
  [PropertyType.COHOST_AIRBNB]: 'Co-hôte Airbnb',
  [PropertyType.HOST_AIRBNB]: 'Hôte Airbnb (compte propre)',
  [PropertyType.EXTERNAL_CLEANING]: 'Ménage externe',
  [PropertyType.EXTERNAL_CLEANING_CHECKIN]: 'Ménage + accueil externe',
};

export const PROPERTY_TYPE_SHORT_LABELS: Record<PropertyType, string> = {
  [PropertyType.SCI]: 'SCI',
  [PropertyType.COHOST_AIRBNB]: 'Co-hôte',
  [PropertyType.HOST_AIRBNB]: 'Hôte',
  [PropertyType.EXTERNAL_CLEANING]: 'Ménage',
  [PropertyType.EXTERNAL_CLEANING_CHECKIN]: 'Ménage+Accueil',
};

export const RESERVATION_CATEGORY_LABELS: Record<ReservationCategory, string> = {
  [ReservationCategory.AIRBNB_SCI]: 'Airbnb – SCI',
  [ReservationCategory.AIRBNB_COHOST]: 'Airbnb – Co-hôte',
  [ReservationCategory.AIRBNB_HOST_ACCOUNT]: 'Airbnb – Compte hôte',
  [ReservationCategory.EXTERNAL_CLEANING]: 'Ménage externe',
  [ReservationCategory.DIRECT_OWN]: 'Réservation directe',
  [ReservationCategory.DIRECT_FROM_AIRBNB]: 'Direct (via Airbnb)',
};

export const RESERVATION_STATUS_LABELS: Record<ReservationStatus, string> = {
  [ReservationStatus.CONFIRMED]: 'Confirmée',
  [ReservationStatus.PENDING]: 'En attente',
  [ReservationStatus.CANCELLED]: 'Annulée',
  [ReservationStatus.COMPLETED]: 'Terminée',
};

export const LINEN_TYPE_LABELS: Record<LinenType, string> = {
  [LinenType.DOUBLE_SHEETS]: 'Drap housse 140×190 + drap 200×220',
  [LinenType.SINGLE_SHEETS]: 'Drap housse 90×190 + taie + drap',
  [LinenType.BABY_SHEETS]: 'Draps bébé',
  [LinenType.BATH_TOWELS]: 'Serviettes bain',
  [LinenType.HAND_TOWELS]: 'Serviettes mains',
  [LinenType.FACE_TOWELS]: 'Gants de toilette',
  [LinenType.BATH_MATS]: 'Tapis de bain',
  [LinenType.KITCHEN_TOWELS]: 'Torchons',
};

export const PROPERTY_TYPE_DEFAULT_CATEGORY: Record<PropertyType, ReservationCategory> = {
  [PropertyType.SCI]: ReservationCategory.AIRBNB_SCI,
  [PropertyType.COHOST_AIRBNB]: ReservationCategory.AIRBNB_COHOST,
  [PropertyType.HOST_AIRBNB]: ReservationCategory.AIRBNB_HOST_ACCOUNT,
  [PropertyType.EXTERNAL_CLEANING]: ReservationCategory.EXTERNAL_CLEANING,
  [PropertyType.EXTERNAL_CLEANING_CHECKIN]: ReservationCategory.EXTERNAL_CLEANING,
};
