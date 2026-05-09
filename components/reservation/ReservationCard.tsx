import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Reservation } from '@/types';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { formatDate, getNightsLabel } from '@/utils/dateHelpers';
import { APP_COLORS } from '@/constants/colors';

interface ReservationCardProps {
  reservation: Reservation;
  onPress?: () => void;
}

export function ReservationCard({ reservation, onPress }: ReservationCardProps) {
  const property = reservation.property;
  const totalGuests =
    reservation.nb_couples * 2 +
    reservation.nb_solo_adults +
    reservation.nb_children +
    reservation.nb_babies;

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
      <View style={styles.card}>
        {property && (
          <View style={[styles.colorStrip, { backgroundColor: property.color }]} />
        )}
        <View style={styles.content}>
          <View style={styles.row}>
            <Text style={styles.guestName} numberOfLines={1}>
              {reservation.guest_name}
            </Text>
            <StatusBadge status={reservation.status} />
          </View>
          {property && (
            <Text style={styles.propertyName} numberOfLines={1}>
              {property.name}
            </Text>
          )}
          <View style={styles.row}>
            <View style={styles.dateRow}>
              <MaterialCommunityIcons name="calendar-arrow-right" size={14} color={APP_COLORS.textSecondary} />
              <Text style={styles.dateText}>
                {formatDate(reservation.check_in)} → {formatDate(reservation.check_out)}
              </Text>
            </View>
            <Text style={styles.nights}>{getNightsLabel(reservation.nb_nights)}</Text>
          </View>
          <View style={styles.row}>
            <View style={styles.guestRow}>
              <MaterialCommunityIcons name="account-group" size={14} color={APP_COLORS.textSecondary} />
              <Text style={styles.guestCount}>{totalGuests} voyageur{totalGuests > 1 ? 's' : ''}</Text>
            </View>
          </View>
        </View>
        <MaterialCommunityIcons name="chevron-right" size={20} color={APP_COLORS.border} />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginHorizontal: 16,
    marginVertical: 4,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    overflow: 'hidden',
  },
  colorStrip: { width: 5, alignSelf: 'stretch' },
  content: { flex: 1, padding: 12, gap: 4 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  guestName: { fontSize: 15, fontWeight: '600', color: APP_COLORS.textPrimary, flex: 1, marginRight: 8 },
  propertyName: { fontSize: 13, color: APP_COLORS.textSecondary },
  dateRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  dateText: { fontSize: 13, color: APP_COLORS.textSecondary },
  nights: { fontSize: 12, color: APP_COLORS.primary, fontWeight: '600' },
  guestRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  guestCount: { fontSize: 13, color: APP_COLORS.textSecondary },
});
