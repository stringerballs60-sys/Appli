import { View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import { ReservationStatus } from '@/types';
import { RESERVATION_STATUS_COLORS } from '@/constants/colors';
import { RESERVATION_STATUS_LABELS } from '@/constants/labels';

interface StatusBadgeProps {
  status: ReservationStatus;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const color = RESERVATION_STATUS_COLORS[status] ?? '#95A5A6';
  const label = RESERVATION_STATUS_LABELS[status] ?? status;

  return (
    <View style={[styles.badge, { backgroundColor: color + '22', borderColor: color }]}>
      <Text style={[styles.text, { color }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    borderRadius: 6,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 3,
    alignSelf: 'flex-start',
  },
  text: {
    fontSize: 11,
    fontWeight: '600',
  },
});
