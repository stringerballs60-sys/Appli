import { PropertyType, ReservationCategory, ReservationSource } from '@/types';
import { PROPERTY_TYPE_DEFAULT_CATEGORY } from '@/constants/labels';

export const CHANNELS: ReservationSource[] = ['manual', 'airbnb', 'booking', 'abritel'];

export const CHANNEL_LABELS: Record<ReservationSource, string> = {
  manual: 'Direct',
  airbnb: 'Airbnb',
  booking: 'Booking',
  abritel: 'Abritel',
  presta: 'Presta',
};

export const CHANNEL_COLORS: Record<ReservationSource, string> = {
  manual: '#0F2240',
  airbnb: '#FF5A5F',
  booking: '#003580',
  abritel: '#E8731E',
  presta: '#5F7A5C',
};


/** « Presta » n'est plus une provenance (25/11/2026) : c'est le type du logement (voir constants/tariffs.ts). */
export const defaultChannelFor = (_type: PropertyType | undefined, current: ReservationSource): ReservationSource =>
  current === 'presta' ? 'airbnb' : current;

const isExternal = (type?: PropertyType) =>
  type === PropertyType.EXTERNAL_CLEANING || type === PropertyType.EXTERNAL_CLEANING_CHECKIN;

export function categoryForChannel(channel: ReservationSource, propertyType?: PropertyType): ReservationCategory {
  if (isExternal(propertyType)) return ReservationCategory.EXTERNAL_CLEANING;
  if (channel === 'airbnb') {
    return propertyType ? PROPERTY_TYPE_DEFAULT_CATEGORY[propertyType] : ReservationCategory.AIRBNB_COHOST;
  }
  return ReservationCategory.DIRECT_OWN;
}

export function channelOf(resa: { source?: ReservationSource | null; category?: ReservationCategory | string | null }): ReservationSource {
  if (resa.source && resa.source !== 'manual') return resa.source;
  if (typeof resa.category === 'string' && resa.category.startsWith('AIRBNB')) return 'airbnb';
  return 'manual';
}
