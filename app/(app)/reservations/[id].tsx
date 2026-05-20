import { View, ScrollView, StyleSheet, Alert, TouchableOpacity } from 'react-native';
import { Text, ActivityIndicator } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useReservations, useUpdateReservationStatus, useDeleteReservation } from '@/hooks/useReservations';
import { LinenPreviewCard } from '@/components/reservation/LinenPreviewCard';
import { APP_COLORS, RESERVATION_STATUS_COLORS } from '@/constants/colors';
import { SHADOWS, GRADIENTS, RADII } from '@/constants/theme';
import { FONTS } from '@/constants/typography';
import { RESERVATION_CATEGORY_LABELS, RESERVATION_STATUS_LABELS } from '@/constants/labels';
import { formatDate, getNightsLabel } from '@/utils/dateHelpers';
import { ReservationStatus } from '@/types';
import { calculateLinen } from '@/utils/linenCalculator';

const STATUS_TRANSITIONS: ReservationStatus[] = [
  ReservationStatus.CONFIRMED,
  ReservationStatus.PENDING,
  ReservationStatus.COMPLETED,
  ReservationStatus.CANCELLED,
];

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
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <LinearGradient colors={GRADIENTS.navyHeader as [string, string, ...string[]]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
            <MaterialCommunityIcons name="arrow-left" size={22} color="rgba(248,245,239,0.8)" />
          </TouchableOpacity>
          <Text style={styles.title}>Réservation</Text>
        </LinearGradient>
        <ActivityIndicator style={{ marginTop: 40 }} color={APP_COLORS.primary} />
      </SafeAreaView>
    );
  }

  const property = reservation.property;

  const linenToShow = reservation.linen_calculation ?? (
    property && (reservation.nb_couples + reservation.nb_solo_adults + reservation.nb_children) > 0
      ? calculateLinen(
          { nb_couples: reservation.nb_couples, nb_solo_adults: reservation.nb_solo_adults, nb_children: reservation.nb_children },
          { beds_double_used: reservation.beds_double_used, beds_single_used: reservation.beds_single_used, beds_sofa_used: reservation.beds_sofa_used, beds_crib_used: reservation.beds_crib_used },
          property.nb_bathrooms
        )
      : null
  );

  const totalGuests = reservation.nb_couples * 2 + reservation.nb_solo_adults + reservation.nb_children + reservation.nb_babies;

  const statusColor = RESERVATION_STATUS_COLORS[reservation.status];

  const handleDelete = () => {
    Alert.alert('Supprimer la réservation', `Supprimer la réservation de ${reservation.guest_name} ?`, [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('common.delete'), style: 'destructive', onPress: async () => { await deleteReservation(id); router.back(); } },
    ]);
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <LinearGradient
        colors={GRADIENTS.navyHeader as [string, string, ...string[]]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
          <MaterialCommunityIcons name="arrow-left" size={22} color="rgba(248,245,239,0.8)" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.title} numberOfLines={1}>{reservation.guest_name}</Text>
          {property && <Text style={styles.subtitle}>{property.name}</Text>}
        </View>
        <TouchableOpacity style={styles.actionBtn} onPress={() => router.push(`/(app)/reservations/edit/${id}` as any)} activeOpacity={0.8}>
          <MaterialCommunityIcons name="pencil" size={18} color="#FFFFFF" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionBtn} onPress={handleDelete} activeOpacity={0.8}>
          <MaterialCommunityIcons name="delete-outline" size={18} color="rgba(248,245,239,0.7)" />
        </TouchableOpacity>
      </LinearGradient>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        {property && <View style={[styles.colorBanner, { backgroundColor: property.color }]} />}

        {/* Header card */}
        <View style={[styles.card, SHADOWS.sm]}>
          <View style={styles.statusRow}>
            <View style={[styles.statusPill, { backgroundColor: statusColor + '20' }]}>
              <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
              <Text style={[styles.statusText, { color: statusColor }]}>{RESERVATION_STATUS_LABELS[reservation.status]}</Text>
            </View>
            <Text style={styles.category}>{RESERVATION_CATEGORY_LABELS[reservation.category]}</Text>
            <Text style={styles.guestCount}>{totalGuests} pers.</Text>
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
            <View style={styles.arrowBlock}>
              <MaterialCommunityIcons name="arrow-right" size={18} color={APP_COLORS.textTertiary} />
              <Text style={styles.nightsText}>{getNightsLabel(reservation.nb_nights)}</Text>
            </View>
            <View style={styles.dateBlock}>
              <Text style={styles.dateLabel}>Départ</Text>
              <Text style={styles.dateValue}>{formatDate(reservation.check_out)}</Text>
            </View>
          </View>
        </View>

        {/* Guest info */}
        <View style={styles.sectionLabel}>
          <View style={styles.sectionAccent} />
          <Text style={styles.sectionLabelText}>VOYAGEUR</Text>
        </View>
        <View style={[styles.card, SHADOWS.sm]}>
          {[
            { icon: 'account', label: 'Nom', value: reservation.guest_name },
            { icon: 'email', label: 'Email', value: reservation.guest_email },
            { icon: 'phone', label: 'Téléphone', value: reservation.guest_phone },
          ].filter((i) => i.value).map(({ icon, label, value }, idx, arr) => (
            <View key={label} style={[styles.infoRow, idx < arr.length - 1 && styles.infoRowBorder]}>
              <MaterialCommunityIcons name={icon as any} size={15} color={APP_COLORS.textTertiary} />
              <View>
                <Text style={styles.infoLabel}>{label}</Text>
                <Text style={styles.infoValue}>{value}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Guests & beds */}
        <View style={styles.sectionLabel}>
          <View style={styles.sectionAccent} />
          <Text style={styles.sectionLabelText}>VOYAGEURS ET COUCHAGES</Text>
        </View>
        <View style={[styles.card, SHADOWS.sm, { padding: 16, gap: 12 }]}>
          <View style={styles.guestsRow}>
            {reservation.nb_couples > 0 && <View style={styles.guestItem}><Text style={styles.guestCount2}>{reservation.nb_couples}</Text><Text style={styles.guestLabel}>Couple{reservation.nb_couples > 1 ? 's' : ''}</Text></View>}
            {reservation.nb_solo_adults > 0 && <View style={styles.guestItem}><Text style={styles.guestCount2}>{reservation.nb_solo_adults}</Text><Text style={styles.guestLabel}>Adulte{reservation.nb_solo_adults > 1 ? 's' : ''}</Text></View>}
            {reservation.nb_children > 0 && <View style={styles.guestItem}><Text style={styles.guestCount2}>{reservation.nb_children}</Text><Text style={styles.guestLabel}>Enfant{reservation.nb_children > 1 ? 's' : ''}</Text></View>}
            {reservation.nb_babies > 0 && <View style={styles.guestItem}><Text style={styles.guestCount2}>{reservation.nb_babies}</Text><Text style={styles.guestLabel}>Bébé{reservation.nb_babies > 1 ? 's' : ''}</Text></View>}
          </View>
          <View style={styles.divider} />
          <Text style={styles.bedsTitle}>Lits utilisés</Text>
          <View style={styles.guestsRow}>
            {reservation.beds_double_used > 0 && <View style={styles.guestItem}><Text style={styles.guestCount2}>{reservation.beds_double_used}</Text><Text style={styles.guestLabel}>Double{reservation.beds_double_used > 1 ? 's' : ''}</Text></View>}
            {reservation.beds_single_used > 0 && <View style={styles.guestItem}><Text style={styles.guestCount2}>{reservation.beds_single_used}</Text><Text style={styles.guestLabel}>Simple{reservation.beds_single_used > 1 ? 's' : ''}</Text></View>}
            {reservation.beds_sofa_used > 0 && <View style={styles.guestItem}><Text style={styles.guestCount2}>{reservation.beds_sofa_used}</Text><Text style={styles.guestLabel}>Canapé{reservation.beds_sofa_used > 1 ? 's' : ''}</Text></View>}
            {reservation.beds_crib_used > 0 && <View style={styles.guestItem}><Text style={styles.guestCount2}>{reservation.beds_crib_used}</Text><Text style={styles.guestLabel}>Berceau{reservation.beds_crib_used > 1 ? 'x' : ''}</Text></View>}
          </View>
        </View>

        {/* Linen */}
        {linenToShow && (
          <View style={{ marginHorizontal: 16, marginTop: 16 }}>
            <LinenPreviewCard linen={linenToShow!} />
          </View>
        )}

        {/* Notes */}
        {reservation.notes && (
          <>
            <View style={styles.sectionLabel}>
              <View style={styles.sectionAccent} />
              <Text style={styles.sectionLabelText}>{t('common.notes').toUpperCase()}</Text>
            </View>
            <View style={[styles.card, SHADOWS.sm, { padding: 16 }]}>
              <Text style={styles.notesText}>{reservation.notes}</Text>
            </View>
          </>
        )}

        {/* Status change */}
        <View style={styles.sectionLabel}>
          <View style={styles.sectionAccent} />
          <Text style={styles.sectionLabelText}>CHANGER LE STATUT</Text>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.statusChipRow}>
          {STATUS_TRANSITIONS.map((status) => {
            const color = RESERVATION_STATUS_COLORS[status];
            const isSelected = reservation.status === status;
            return (
              <TouchableOpacity
                key={status}
                style={[styles.statusChip, isSelected && { backgroundColor: color, borderColor: color }]}
                onPress={() => updateStatus({ id, status })}
                disabled={updatingStatus || isSelected}
                activeOpacity={0.75}
              >
                <Text style={[styles.statusChipText, isSelected && { color: '#FFFFFF', fontWeight: '700' }]}>
                  {RESERVATION_STATUS_LABELS[status]}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: APP_COLORS.primaryDark },
  header: {
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  backBtn: { padding: 2 },
  title: { fontSize: 20, fontFamily: FONTS.titleBold, color: APP_COLORS.accent, letterSpacing: 0.8 },
  subtitle: { fontSize: 12, color: 'rgba(248,245,239,0.65)', marginTop: 2 },
  actionBtn: {
    width: 34,
    height: 34,
    borderRadius: RADII.sm,
    backgroundColor: 'rgba(248,245,239,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(248,245,239,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scroll: { flex: 1, backgroundColor: APP_COLORS.background },
  colorBanner: { height: 6 },
  sectionLabel: { flexDirection: 'row', alignItems: 'center', gap: 8, marginHorizontal: 16, marginTop: 18, marginBottom: 8 },
  sectionAccent: { width: 3, height: 13, borderRadius: 2, backgroundColor: APP_COLORS.accent },
  sectionLabelText: { fontSize: 11, fontWeight: '700', color: APP_COLORS.textSecondary, letterSpacing: 0.8 },
  card: { backgroundColor: APP_COLORS.surfaceElevated, marginHorizontal: 16, borderRadius: RADII.md, overflow: 'hidden', marginTop: 0 },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 14, borderBottomWidth: 1, borderBottomColor: APP_COLORS.borderLight },
  statusPill: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 8, paddingVertical: 4, borderRadius: RADII.full },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 11, fontWeight: '700' },
  category: { flex: 1, fontSize: 12, color: APP_COLORS.textSecondary },
  guestCount: { fontSize: 12, color: APP_COLORS.textTertiary, fontWeight: '500' },
  datesRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16 },
  dateBlock: { alignItems: 'center' },
  dateLabel: { fontSize: 11, color: APP_COLORS.textTertiary, marginBottom: 4 },
  dateValue: { fontSize: 15, fontWeight: '700', color: APP_COLORS.textPrimary },
  arrowBlock: { alignItems: 'center', gap: 2 },
  nightsText: { fontSize: 11, color: APP_COLORS.textTertiary },
  timeRow: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 4 },
  timeText: { fontSize: 12, fontWeight: '700' },
  timeUnknown: { fontSize: 11, color: APP_COLORS.textTertiary, fontStyle: 'italic', marginTop: 4 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 11 },
  infoRowBorder: { borderBottomWidth: 1, borderBottomColor: APP_COLORS.borderLight },
  infoLabel: { fontSize: 11, color: APP_COLORS.textTertiary },
  infoValue: { fontSize: 14, color: APP_COLORS.textPrimary, fontWeight: '500', marginTop: 1 },
  guestsRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  guestItem: { backgroundColor: APP_COLORS.background, borderRadius: RADII.sm, padding: 10, alignItems: 'center', minWidth: 60 },
  guestCount2: { fontSize: 18, fontWeight: '700', color: APP_COLORS.primary },
  guestLabel: { fontSize: 11, color: APP_COLORS.textSecondary },
  divider: { height: 1, backgroundColor: APP_COLORS.borderLight },
  bedsTitle: { fontSize: 12, color: APP_COLORS.textSecondary, fontWeight: '600' },
  notesText: { fontSize: 14, color: APP_COLORS.textPrimary, lineHeight: 20 },
  statusChipRow: { paddingHorizontal: 16, paddingVertical: 4, gap: 8 },
  statusChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: RADII.full,
    borderWidth: 1,
    borderColor: APP_COLORS.border,
    backgroundColor: APP_COLORS.surfaceElevated,
  },
  statusChipText: { fontSize: 13, color: APP_COLORS.textSecondary, fontWeight: '500' },
});
