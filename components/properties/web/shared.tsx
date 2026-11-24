import { View, Text, Image } from 'react-native';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Property, Reservation } from '@/types';
import { CAL } from '@/components/calendar/web/tokens';

export const dayMonth = (iso: string) => format(parseISO(iso), 'd MMM', { locale: fr }).replace('.', '');

export const CLEANING: Record<Property['cleaning_status'], { label: string; color: string; strong?: boolean }> = {
  to_do: { label: 'Ménage à faire', color: CAL.changement, strong: true },
  in_progress: { label: 'Ménage en cours', color: CAL.or },
  ready: { label: 'Prêt', color: '#2F7D5B' },
  occupied: { label: 'Occupé', color: CAL.nuit },
};

export interface Row {
  property: Property;
  current: Reservation | null;
  next: Reservation | null;
  upcoming: Reservation[];
  bookedNights: number;
  occupancy: number;
}

export function groupKey(p: Property) {
  return p.group_name?.trim() || 'Autres logements';
}

export function initials(name: string) {
  const words = name.replace(/[^\p{L}\p{N} ]/gu, ' ').split(' ').filter(Boolean);
  return (words.length > 1 ? words[0][0] + words[1][0] : name.slice(0, 2)).toUpperCase();
}

export function Thumb({ property, size }: { property: Property; size: number }) {
  const photo = (property as Property & { photo_url?: string | null }).photo_url;
  if (photo) {
    return <Image source={{ uri: photo }} style={{ width: size, height: size, borderRadius: 6, backgroundColor: CAL.brumeClair }} />;
  }
  return (
    <View style={{ width: size, height: size, borderRadius: 6, backgroundColor: `${property.color}40`, borderWidth: 1, borderColor: `${property.color}90`, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ fontFamily: CAL.fontBold, fontSize: size * 0.32, color: CAL.texte }}>{initials(property.name)}</Text>
    </View>
  );
}
