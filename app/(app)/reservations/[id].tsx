import { View, ScrollView, StyleSheet, Alert } from 'react-native';
import { Text, ActivityIndicator, Appbar, Surface, Button, Chip } from 'react-native-paper';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useReservations, useUpdateReservationStatus, useDeleteReservation } from '@/hooks/useReservations';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { LinenPreviewCard } from '@/components/reservation/LinenPreviewCard';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { APP_COLORS, RESERVATION_STATUS_COLORS } from '@/constants/colors';
import { RESERVATION_CATEGORY_LABELS, RESERVATION_STATUS_LABELS } from '@/constants/labels';
import { formatDate, getNightsLabel } from '@/utils/dateHelpers';
import { ReservationStatus } from '@/types';

export default function ReservationDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation();
  const router = useRouter();
  const { data: reservations, isLoading } = useReservations();
  const { mutateAsync: updateStatus, isPending: updatingStatus } = useUpdateReservationStatus();
  const { mutateAsync: deleteReservation, isPending: deleting } = useDeleteReservation();

  const reservation = reservations?.find((r) => r.id === id);

  if (isLoading || !reservation) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <Appbar.Header style={styles.appbar}>
          <Appbar.BackAction onPress={() => router.back()} iconColor="#FFFFFF" />
          <Appbar.Content title="Réservation" titleStyle={styles.appbarTitle} />
        </Appbar.Header>
        <ActivityIndicator style={{ marginTop: 40 }} color={APP_COLORS.primary} />
      </SafeAreaView>
    );
  }

  const property = reservation.property;
  const totalGuests =
    reservation.nb_couples * 2 +
    reservation.nb_solo_adults +
    reservation.nb_children +
    reservation.nb_babies;

  const handleDelete = () => {
    Alert.alert(
      'Supprimer la réservation',
      `Supprimer la réservation de ${reservation.guest_name} ?`,
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: async () => {
            await deleteReservation(id);
            router.back();
          },
        },
      ]
    );
  };

  const STATUS_TRANSITIONS: ReservationStatus[] = [
    ReservationStatus.CONFIRMED,
    ReservationStatus.PENDING,
    ReservationStatus.COMPLETED,
    ReservationStatus.CANCELLED,
  ];

  return (
    <SafeAreaView style={styles.safeArea}>
      <Appbar.Header style={styles.appbar}>
        <Appbar.BackAction onPress={() => router.back()} iconColor="#FFFFFF" />
        <Appbar.Content
          title={reservation.guest_name}
          titleStyle={styles.appbarTitle}
          subtitle={property?.name}
          subtitleStyle={styles.appbarSubtitle}
        />
        <Appbar.Action icon="pencil" iconColor="#FFFFFF" onPress={() => router.push(`/(app)/reservations/edit/${id}` as any)} />
        <Appbar.Action icon="delete" iconColor="#FFFFFF" onPress={handleDelete} />
      </Appbar.Header>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Color banner */}
        {property && <View style={[styles.colorBanner, { backgroundColor: property.color }]} />}

        {/* Header info */}
        <View style={styles.headerCard}>
          <View style={styles.row}>
            <StatusBadge status={reservation.status} />
            <Text style={styles.category}>{RESERVATION_CATEGORY_LABELS[reservation.category]}</Text>
          </View>
          <View style={styles.datesRow}>
            <View style={styles.dateBlock}>
              <Text style={styles.dateLabel}>Arrivée</Text>
              <Text style={styles.dateValue}>{formatDate(reservation.check_in)}</Text>
              {reservation.check_in_time ? (
                <View style={styles.timeRow}>
                  <MaterialCommunityIcons
                    name={reservation.check_in_time_confirmed ? 'clock-check' : 'clock-alert'}
                    size={13}
                    color={reservation.check_in_time_confirmed ? APP_COLORS.success : APP_COLORS.warning}
                  />
                  <Text style={[styles.timeText, { color: reservation.check_in_time_confirmed ? APP_COLORS.success : APP_COLORS.warning }]}>
                    {reservation.check_in_time.slice(0, 5)}
                  </Text>
                </View>
              ) : (
                <Text style={styles.timeUnknown}>heure ?</Text>
              )}
            </View>
            <View style={styles.arrowContainer}>
              <MaterialCommunityIcons name="arrow-right" size={20} color={APP_COLORS.textSecondary} />
              <Text style={styles.nightsText}>{getNightsLabel(reservation.nb_nights)}</Text>
            </View>
            <View style={styles.dateBlock}>
              <Text style={styles.dateLabel}>Départ</Text>
              <Text style={styles.dateValue}>{formatDate(reservation.check_out)}</Text>
            </View>
          </View>
        </View>

        {/* Guest details */}
        <SectionHeader title="Voyageur" />
        <View style={styles.infoCard}>
          {[
            { icon: 'account', label: 'Nom', value: reservation.guest_name },
            { icon: 'email', label: 'Email', value: reservation.guest_email },
            { icon: 'phone', label: 'Téléphone', value: reservation.guest_phone },
          ].filter((i) => i.value).map(({ icon, label, value }) => (
            <View key={label} style={styles.infoRow}>
              <MaterialCommunityIcons name={icon as any} size={16} color={APP_COLORS.textSecondary} />
              <View>
                <Text style={styles.infoLabel}>{label}</Text>
                <Text style={styles.infoValue}>{value}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Guests & beds */}
        <SectionHeader title="Voyageurs et couchages" />
        <View style={styles.infoCard}>
          <View style={styles.guestsRow}>
            {reservation.nb_couples > 0 && (
              <View style={styles.guestItem}>
                <Text style={styles.guestCount}>{reservation.nb_couples}</Text>
                <Text style={styles.guestLabel}>Couple{reservation.nb_couples > 1 ? 's' : ''}</Text>
              </View>
            )}
            {reservation.nb_solo_adults > 0 && (
              <View style={styles.guestItem}>
                <Text style={styles.guestCount}>{reservation.nb_solo_adults}</Text>
                <Text style={styles.guestLabel}>Adulte{reservation.nb_solo_adults > 1 ? 's' : ''}</Text>
              </View>
            )}
            {reservation.nb_children > 0 && (
              <View style={styles.guestItem}>
                <Text style={styles.guestCount}>{reservation.nb_children}</Text>
                <Text style={styles.guestLabel}>Enfant{reservation.nb_children > 1 ? 's' : ''}</Text>
              </View>
            )}
            {reservation.nb_babies > 0 && (
              <View style={styles.guestItem}>
                <Text style={styles.guestCount}>{reservation.nb_babies}</Text>
                <Text style={styles.guestLabel}>Bébé{reservation.nb_babies > 1 ? 's' : ''}</Text>
              </View>
            )}
          </View>
          <View style={styles.divider} />
          <Text style={styles.bedsTitle}>Lits utilisés</Text>
          <View style={styles.guestsRow}>
            {reservation.beds_double_used > 0 && (
              <View style={styles.guestItem}>
                <Text style={styles.guestCount}>{reservation.beds_double_used}</Text>
                <Text style={styles.guestLabel}>Double{reservation.beds_double_used > 1 ? 's' : ''}</Text>
              </View>
            )}
            {reservation.beds_single_used > 0 && (
              <View style={styles.guestItem}>
                <Text style={styles.guestCount}>{reservation.beds_single_used}</Text>
                <Text style={styles.guestLabel}>Simple{reservation.beds_single_used > 1 ? 's' : ''}</Text>
              </View>
            )}
            {reservation.beds_sofa_used > 0 && (
              <View style={styles.guestItem}>
                <Text style={styles.guestCount}>{reservation.beds_sofa_used}</Text>
                <Text style={styles.guestLabel}>Canapé{reservation.beds_sofa_used > 1 ? 's' : ''}</Text>
              </View>
            )}
            {reservation.beds_crib_used > 0 && (
              <View style={styles.guestItem}>
                <Text style={styles.guestCount}>{reservation.beds_crib_used}</Text>
                <Text style={styles.guestLabel}>Berceau{reservation.beds_crib_used > 1 ? 'x' : ''}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Linen */}
        {reservation.linen_calculation && (
          <View style={styles.linenContainer}>
            <LinenPreviewCard linen={reservation.linen_calculation} />
          </View>
        )}

        {/* Notes */}
        {reservation.notes && (
          <>
            <SectionHeader title={t('common.notes')} />
            <View style={styles.infoCard}>
              <Text style={styles.notesText}>{reservation.notes}</Text>
            </View>
          </>
        )}

        {/* Status change */}
        <SectionHeader title="Changer le statut" />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.statusRow}>
          {STATUS_TRANSITIONS.map((status) => (
            <Chip
              key={status}
              selected={reservation.status === status}
              onPress={() => updateStatus({ id, status })}
              disabled={updatingStatus || reservation.status === status}
              style={[
                styles.statusChip,
                reservation.status === status && {
                  backgroundColor: RESERVATION_STATUS_COLORS[status] + '33',
                },
              ]}
            >
              {RESERVATION_STATUS_LABELS[status]}
            </Chip>
          ))}
        </ScrollView>

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: APP_COLORS.background },
  appbar: { backgroundColor: APP_COLORS.primary },
  appbarTitle: { color: '#FFFFFF', fontSize: 18, fontWeight: '600' },
  appbarSubtitle: { color: 'rgba(255,255,255,0.7)', fontSize: 12 },
  scroll: { flex: 1 },
  colorBanner: { height: 6 },
  headerCard: { backgroundColor: '#FFFFFF', padding: 16, marginBottom: 8, gap: 12 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  category: { fontSize: 13, color: APP_COLORS.textSecondary },
  datesRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  dateBlock: { alignItems: 'center' },
  dateLabel: { fontSize: 11, color: APP_COLORS.textSecondary, marginBottom: 4 },
  dateValue: { fontSize: 15, fontWeight: '600', color: APP_COLORS.textPrimary },
  arrowContainer: { alignItems: 'center', gap: 2 },
  nightsText: { fontSize: 11, color: APP_COLORS.textSecondary },
  timeRow: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 4 },
  timeText: { fontSize: 12, fontWeight: '700' },
  timeUnknown: { fontSize: 11, color: APP_COLORS.textSecondary, fontStyle: 'italic', marginTop: 4 },
  infoCard: { backgroundColor: '#FFFFFF', marginHorizontal: 16, borderRadius: 12, padding: 16, marginBottom: 8, gap: 12 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  infoLabel: { fontSize: 11, color: APP_COLORS.textSecondary },
  infoValue: { fontSize: 14, color: APP_COLORS.textPrimary, fontWeight: '500' },
  guestsRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  guestItem: { backgroundColor: APP_COLORS.background, borderRadius: 8, padding: 10, alignItems: 'center', minWidth: 60 },
  guestCount: { fontSize: 20, fontWeight: '700', color: APP_COLORS.primary },
  guestLabel: { fontSize: 11, color: APP_COLORS.textSecondary },
  divider: { height: 1, backgroundColor: APP_COLORS.border, marginVertical: 4 },
  bedsTitle: { fontSize: 12, color: APP_COLORS.textSecondary, fontWeight: '600' },
  linenContainer: { marginHorizontal: 16, marginBottom: 8 },
  notesText: { fontSize: 14, color: APP_COLORS.textPrimary, lineHeight: 20 },
  statusRow: { paddingHorizontal: 16, paddingVertical: 8, gap: 8 },
  statusChip: { borderRadius: 20 },
});
