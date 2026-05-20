import { View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import { ReservationStatus } from '@/types';
import { RESERVATION_STATUS_COLORS } from '@/constants/colors';
import { RESERVATION_STATUS_LABELS } from '@/constants/labels';

interface StatusBadgeProps {
  status: ReservationStatus;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const color = RESERVATION_STATUS_COLORS[status] ?? '#7A8A9A';
  const label = RESERVATION_STATUS_LABELS[status] ?? status;

  return (
    <View style={[styles.badge, { backgroundColor: color + '18', borderColor: color + '50' }]}>
      <View style={[styles.dot, { backgroundColor: color }]} />
      <Text style={[styles.text, { color }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 9,
    paddingVertical: 4,
    alignSelf: 'flex-start',
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 3,
  },
  text: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
});
