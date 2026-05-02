import { View, StyleSheet, Modal, TouchableOpacity, ScrollView } from 'react-native';
import { Text, Surface } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Reservation } from '@/types';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { formatDate, getNightsLabel } from '@/utils/dateHelpers';
import { APP_COLORS } from '@/constants/colors';

interface DayReservationSheetProps {
  date: string;
  reservations: Reservation[];
  visible: boolean;
  onClose: () => void;
}

export function DayReservationSheet({ date, reservations, visible, onClose }: DayReservationSheetProps) {
  const router = useRouter();

  const checkIns = reservations.filter((r) => r.check_in === date);
  const checkOuts = reservations.filter((r) => r.check_out === date);
  const ongoing = reservations.filter((r) => r.check_in < date && r.check_out > date);

  const navigateTo = (id: string) => {
    onClose();
    router.push(`/(app)/reservations/${id}`);
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose} />
      <View style={styles.sheet}>
        <View style={styles.handle} />
        <Text style={styles.dateTitle}>{date}</Text>

        {reservations.length === 0 && (
          <Text style={styles.emptyText}>Aucune réservation ce jour</Text>
        )}

        <ScrollView showsVerticalScrollIndicator={false}>
          {checkIns.length > 0 && (
            <Section label="Arrivées" icon="login" color={APP_COLORS.success}>
              {checkIns.map((r) => <ResaRow key={r.id} reservation={r} onPress={() => navigateTo(r.id)} />)}
            </Section>
          )}
          {checkOuts.length > 0 && (
            <Section label="Départs" icon="logout" color={APP_COLORS.warning}>
              {checkOuts.map((r) => <ResaRow key={r.id} reservation={r} onPress={() => navigateTo(r.id)} />)}
            </Section>
          )}
          {ongoing.length > 0 && (
            <Section label="En cours" icon="home" color={APP_COLORS.primary}>
              {ongoing.map((r) => <ResaRow key={r.id} reservation={r} onPress={() => navigateTo(r.id)} />)}
            </Section>
          )}
          <View style={{ height: 24 }} />
        </ScrollView>
      </View>
    </Modal>
  );
}

function Section({ label, icon, color, children }: { label: string; icon: string; color: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <MaterialCommunityIcons name={icon as any} size={16} color={color} />
        <Text style={[styles.sectionTitle, { color }]}>{label}</Text>
      </View>
      {children}
    </View>
  );
}

function ResaRow({ reservation, onPress }: { reservation: Reservation; onPress: () => void }) {
  const property = reservation.property;
  return (
    <TouchableOpacity style={styles.resaRow} onPress={onPress}>
      {property && <View style={[styles.dot, { backgroundColor: property.color }]} />}
      <View style={{ flex: 1 }}>
        <Text style={styles.resaGuest}>{reservation.guest_name}</Text>
        {property && <Text style={styles.resaProperty}>{property.name}</Text>}
        <Text style={styles.resaDates}>
          {formatDate(reservation.check_in)} → {formatDate(reservation.check_out)} · {getNightsLabel(reservation.nb_nights)}
        </Text>
      </View>
      <StatusBadge status={reservation.status} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 12,
    maxHeight: '70%',
  },
  handle: { width: 40, height: 4, backgroundColor: APP_COLORS.border, borderRadius: 2, alignSelf: 'center', marginBottom: 12 },
  dateTitle: { fontSize: 17, fontWeight: '700', color: APP_COLORS.textPrimary, marginBottom: 12 },
  emptyText: { fontSize: 14, color: APP_COLORS.textSecondary, fontStyle: 'italic', paddingBottom: 20 },
  section: { marginBottom: 12 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  sectionTitle: { fontSize: 13, fontWeight: '700', textTransform: 'uppercase' },
  resaRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: APP_COLORS.border },
  dot: { width: 10, height: 10, borderRadius: 5 },
  resaGuest: { fontSize: 14, fontWeight: '600', color: APP_COLORS.textPrimary },
  resaProperty: { fontSize: 12, color: APP_COLORS.textSecondary },
  resaDates: { fontSize: 12, color: APP_COLORS.textSecondary },
});
