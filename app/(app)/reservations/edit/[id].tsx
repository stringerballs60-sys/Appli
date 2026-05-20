import { useState, useMemo, useEffect } from 'react';
import { ScrollView, View, StyleSheet, TouchableOpacity, Modal } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Text, TextInput, Button, Snackbar, ActivityIndicator } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Calendar } from 'react-native-calendars';
import { useReservations, useUpdateReservation } from '@/hooks/useReservations';
import { useActiveProperties } from '@/hooks/useProperties';
import { StepperInput } from '@/components/ui/StepperInput';
import { LinenPreviewCard } from '@/components/reservation/LinenPreviewCard';
import { ReservationFormData, ReservationStatus, ReservationCategory, Property } from '@/types';
import { PROPERTY_TYPE_DEFAULT_CATEGORY, RESERVATION_CATEGORY_LABELS, RESERVATION_STATUS_LABELS } from '@/constants/labels';
import { APP_COLORS } from '@/constants/colors';
import { SHADOWS, GRADIENTS, RADII } from '@/constants/theme';
import { FONTS } from '@/constants/typography';
import { suggestBedAllocation, calculateLinen } from '@/utils/linenCalculator';
import { toISODateString, calcNights } from '@/utils/dateHelpers';

export default function EditReservationScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation();
  const router = useRouter();
  const { mutateAsync: updateReservation, isPending } = useUpdateReservation();
  const { data: reservations, isLoading: loadingRes } = useReservations();
  const { data: properties } = useActiveProperties();

  const reservation = reservations?.find((r) => r.id === id);

  const [form, setForm] = useState<ReservationFormData | null>(null);
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [datePickerTarget, setDatePickerTarget] = useState<'check_in' | 'check_out' | null>(null);
  const [calendarInitialDate, setCalendarInitialDate] = useState<string | undefined>(undefined);
  const [error, setError] = useState('');

  const openDatePicker = (target: 'check_in' | 'check_out') => {
    setCalendarInitialDate(target === 'check_out' && form?.check_in ? form.check_in : undefined);
    setDatePickerTarget(target);
  };

  useEffect(() => {
    if (!reservation) return;
    setForm({
      property_id: reservation.property_id,
      category: reservation.category,
      status: reservation.status,
      guest_name: reservation.guest_name,
      guest_email: reservation.guest_email ?? '',
      guest_phone: reservation.guest_phone ?? '',
      check_in: reservation.check_in,
      check_out: reservation.check_out,
      check_in_time: reservation.check_in_time ?? '',
      check_in_time_confirmed: reservation.check_in_time_confirmed,
      nb_couples: reservation.nb_couples,
      nb_solo_adults: reservation.nb_solo_adults,
      nb_children: reservation.nb_children,
      nb_babies: reservation.nb_babies,
      beds_double_used: reservation.beds_double_used,
      beds_single_used: reservation.beds_single_used,
      beds_sofa_used: reservation.beds_sofa_used,
      beds_crib_used: reservation.beds_crib_used,
      notes: reservation.notes ?? '',
    });
    setSelectedProperty((reservation.property as any) ?? null);
  }, [reservation]);

  const set = (key: keyof ReservationFormData, value: any) =>
    setForm((prev) => prev ? { ...prev, [key]: value } : prev);

  const handlePropertySelect = (property: Property) => {
    setSelectedProperty(property);
    set('property_id', property.id);
  };

  const handleGuestChange = (key: keyof ReservationFormData, value: number) => {
    if (!form || !selectedProperty) { set(key, value); return; }
    const updated = { ...form, [key]: value };
    const suggestion = suggestBedAllocation(
      { nb_couples: updated.nb_couples, nb_solo_adults: updated.nb_solo_adults, nb_children: updated.nb_children, nb_babies: updated.nb_babies },
      selectedProperty
    );
    setForm({ ...updated, ...suggestion });
  };

  const linenPreview = useMemo(() => {
    if (!selectedProperty || !form) return null;
    const totalAdults = form.nb_couples * 2 + form.nb_solo_adults;
    if (totalAdults + form.nb_children + form.nb_babies === 0) return null;
    return calculateLinen(
      { nb_couples: form.nb_couples, nb_solo_adults: form.nb_solo_adults, nb_children: form.nb_children },
      { beds_double_used: form.beds_double_used, beds_single_used: form.beds_single_used, beds_sofa_used: form.beds_sofa_used, beds_crib_used: form.beds_crib_used },
      selectedProperty.nb_bathrooms
    );
  }, [form?.nb_couples, form?.nb_solo_adults, form?.nb_children, form?.nb_babies,
      form?.beds_double_used, form?.beds_single_used, form?.beds_sofa_used, form?.beds_crib_used,
      selectedProperty]);

  const handleSubmit = async () => {
    if (!form) return;
    if (!form.guest_name.trim()) { setError('Le nom du voyageur est obligatoire'); return; }
    if (!form.check_in || !form.check_out) { setError('Les dates sont obligatoires'); return; }
    if (form.check_out <= form.check_in) { setError(t('reservations.checkInBeforeCheckOut')); return; }
    try {
      await updateReservation({ id, form, property: selectedProperty ?? undefined });
      router.back();
    } catch (e: any) {
      setError(e.message ?? t('common.error'));
    }
  };

  const nights = form?.check_in && form?.check_out && form.check_out > form.check_in
    ? calcNights(form.check_in, form.check_out) : 0;

  if (loadingRes || !form) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <LinearGradient colors={GRADIENTS.navyHeader as [string, string, ...string[]]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
            <MaterialCommunityIcons name="arrow-left" size={22} color="rgba(248,245,239,0.8)" />
          </TouchableOpacity>
          <Text style={styles.title}>Modifier</Text>
        </LinearGradient>
        <ActivityIndicator style={{ marginTop: 40 }} color={APP_COLORS.primary} />
      </SafeAreaView>
    );
  }

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
        <Text style={styles.title}>Modifier la réservation</Text>
        <TouchableOpacity style={styles.saveBtn} onPress={handleSubmit} disabled={isPending} activeOpacity={0.8}>
          <MaterialCommunityIcons name="check" size={20} color="#FFFFFF" />
        </TouchableOpacity>
      </LinearGradient>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.sectionLabel}>
          <View style={styles.sectionAccent} />
          <Text style={styles.sectionLabelText}>{t('reservations.property').toUpperCase()}</Text>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
          {(properties ?? []).map((p) => (
            <TouchableOpacity key={p.id} style={[styles.propertyChip, { borderColor: p.color }, selectedProperty?.id === p.id && { backgroundColor: p.color }]} onPress={() => handlePropertySelect(p)}>
              <Text style={[styles.propertyChipText, { color: selectedProperty?.id === p.id ? '#FFFFFF' : p.color }]} numberOfLines={1}>{p.name}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <View style={styles.sectionLabel}>
          <View style={styles.sectionAccent} />
          <Text style={styles.sectionLabelText}>{t('reservations.category').toUpperCase()}</Text>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
          {Object.values(ReservationCategory).map((cat) => (
            <TouchableOpacity key={cat} style={[styles.chip, form.category === cat && styles.chipActive]} onPress={() => set('category', cat)}>
              <Text style={[styles.chipText, form.category === cat && styles.chipTextActive]}>{RESERVATION_CATEGORY_LABELS[cat]}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <View style={styles.sectionLabel}>
          <View style={styles.sectionAccent} />
          <Text style={styles.sectionLabelText}>VOYAGEUR</Text>
        </View>
        <View style={[styles.section, SHADOWS.sm]}>
          <TextInput label={t('reservations.guestName') + ' *'} value={form.guest_name} onChangeText={(v) => set('guest_name', v)} mode="outlined" style={styles.input} outlineColor={APP_COLORS.border} activeOutlineColor={APP_COLORS.primary} />
          <TextInput label={t('reservations.guestEmail')} value={form.guest_email} onChangeText={(v) => set('guest_email', v)} keyboardType="email-address" autoCapitalize="none" mode="outlined" style={styles.input} outlineColor={APP_COLORS.border} activeOutlineColor={APP_COLORS.primary} />
          <TextInput label={t('reservations.guestPhone')} value={form.guest_phone} onChangeText={(v) => set('guest_phone', v)} keyboardType="phone-pad" mode="outlined" style={styles.input} outlineColor={APP_COLORS.border} activeOutlineColor={APP_COLORS.primary} />
        </View>

        <View style={styles.sectionLabel}>
          <View style={styles.sectionAccent} />
          <Text style={styles.sectionLabelText}>DATES</Text>
        </View>
        <View style={[styles.section, SHADOWS.sm]}>
          <TouchableOpacity style={styles.datePicker} onPress={() => openDatePicker('check_in')}>
            <MaterialCommunityIcons name="calendar-arrow-right" size={16} color={APP_COLORS.success} />
            <Text style={styles.datePickerLabel}>{t('reservations.checkIn')}</Text>
            <Text style={styles.datePickerValue}>{form.check_in}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.datePicker} onPress={() => openDatePicker('check_out')}>
            <MaterialCommunityIcons name="calendar-arrow-left" size={16} color={APP_COLORS.warning} />
            <Text style={styles.datePickerLabel}>{t('reservations.checkOut')}</Text>
            <Text style={styles.datePickerValue}>{form.check_out}</Text>
          </TouchableOpacity>
          {nights > 0 && <Text style={styles.nightsText}>{nights} nuit{nights > 1 ? 's' : ''}</Text>}
          <View style={styles.timeInputRow}>
            <TextInput label="Heure d'arrivée (ex: 16:00)" value={form.check_in_time ?? ''} onChangeText={(v) => set('check_in_time', v)} keyboardType="numbers-and-punctuation" mode="outlined" style={[styles.input, { flex: 1 }]} outlineColor={APP_COLORS.border} activeOutlineColor={APP_COLORS.primary} />
            <TouchableOpacity style={[styles.confirmedToggle, form.check_in_time_confirmed && styles.confirmedToggleActive]} onPress={() => set('check_in_time_confirmed', !form.check_in_time_confirmed)}>
              <MaterialCommunityIcons name={form.check_in_time_confirmed ? 'check-circle' : 'clock-alert-outline'} size={18} color={form.check_in_time_confirmed ? APP_COLORS.success : APP_COLORS.textSecondary} />
              <Text style={{ fontSize: 11, color: form.check_in_time_confirmed ? APP_COLORS.success : APP_COLORS.textSecondary, fontWeight: '600' }}>
                {form.check_in_time_confirmed ? 'Confirmée' : 'À confirmer'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.sectionLabel}>
          <View style={styles.sectionAccent} />
          <Text style={styles.sectionLabelText}>{t('reservations.guests').toUpperCase()}</Text>
        </View>
        <View style={[styles.section, SHADOWS.sm]}>
          <StepperInput label={t('reservations.couples')} value={form.nb_couples} onChange={(v) => handleGuestChange('nb_couples', v)} />
          <StepperInput label={t('reservations.soloAdults')} value={form.nb_solo_adults} onChange={(v) => handleGuestChange('nb_solo_adults', v)} />
          <StepperInput label={t('reservations.children')} value={form.nb_children} onChange={(v) => handleGuestChange('nb_children', v)} />
          <StepperInput label={t('reservations.babies')} value={form.nb_babies} onChange={(v) => handleGuestChange('nb_babies', v)} />
        </View>

        {selectedProperty && (
          <>
            <View style={styles.sectionLabel}>
              <View style={styles.sectionAccent} />
              <Text style={styles.sectionLabelText}>{t('reservations.bedsUsed').toUpperCase()}</Text>
            </View>
            <View style={[styles.section, SHADOWS.sm]}>
              {selectedProperty.nb_double_beds > 0 && <StepperInput label={`${t('reservations.bedsDouble')} (max ${selectedProperty.nb_double_beds})`} value={form.beds_double_used} onChange={(v) => set('beds_double_used', v)} max={selectedProperty.nb_double_beds} />}
              {selectedProperty.nb_single_beds > 0 && <StepperInput label={`${t('reservations.bedsSingle')} (max ${selectedProperty.nb_single_beds})`} value={form.beds_single_used} onChange={(v) => set('beds_single_used', v)} max={selectedProperty.nb_single_beds} />}
              {selectedProperty.nb_sofa_beds > 0 && <StepperInput label={`${t('reservations.bedsSofa')} (max ${selectedProperty.nb_sofa_beds})`} value={form.beds_sofa_used} onChange={(v) => set('beds_sofa_used', v)} max={selectedProperty.nb_sofa_beds} />}
              {selectedProperty.nb_baby_cribs > 0 && <StepperInput label={`${t('reservations.bedsCrib')} (max ${selectedProperty.nb_baby_cribs})`} value={form.beds_crib_used} onChange={(v) => set('beds_crib_used', v)} max={selectedProperty.nb_baby_cribs} />}
            </View>
          </>
        )}

        {linenPreview && (
          <View style={{ marginHorizontal: 16, marginTop: 16 }}>
            <LinenPreviewCard linen={linenPreview} title={t('reservations.linenPreview')} />
          </View>
        )}

        <View style={styles.sectionLabel}>
          <View style={styles.sectionAccent} />
          <Text style={styles.sectionLabelText}>STATUT</Text>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
          {Object.values(ReservationStatus).map((status) => (
            <TouchableOpacity key={status} style={[styles.chip, form.status === status && styles.chipActive]} onPress={() => set('status', status)}>
              <Text style={[styles.chipText, form.status === status && styles.chipTextActive]}>{RESERVATION_STATUS_LABELS[status]}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <View style={styles.sectionLabel}>
          <View style={styles.sectionAccent} />
          <Text style={styles.sectionLabelText}>{t('common.notes').toUpperCase()}</Text>
        </View>
        <View style={[styles.section, SHADOWS.sm]}>
          <TextInput label={t('common.notes')} value={form.notes} onChangeText={(v) => set('notes', v)} mode="outlined" multiline numberOfLines={3} style={styles.input} outlineColor={APP_COLORS.border} activeOutlineColor={APP_COLORS.primary} />
        </View>

        <TouchableOpacity style={[styles.submitBtn, SHADOWS.navy, isPending && { opacity: 0.6 }]} onPress={handleSubmit} disabled={isPending} activeOpacity={0.85}>
          <Text style={styles.submitBtnText}>{t('common.save')}</Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>

      <Modal visible={!!datePickerTarget} transparent animationType="slide">
        <View style={styles.calendarOverlay}>
          <View style={[styles.calendarModal, SHADOWS.lg]}>
            <View style={styles.calendarHandle} />
            <Text style={styles.calendarTitle}>
              {datePickerTarget === 'check_in' ? t('reservations.checkIn') : t('reservations.checkOut')}
            </Text>
            <Calendar
              key={calendarInitialDate ?? 'checkin'}
              current={calendarInitialDate}
              minDate={datePickerTarget === 'check_out' && form.check_in ? form.check_in : toISODateString(new Date())}
              markedDates={{
                [form.check_in]: { selected: true, selectedColor: APP_COLORS.success },
                [form.check_out]: { selected: true, selectedColor: APP_COLORS.warning },
              }}
              onDayPress={(day) => { if (datePickerTarget) { set(datePickerTarget, day.dateString); setDatePickerTarget(null); } }}
              theme={{ selectedDayBackgroundColor: APP_COLORS.primary, todayTextColor: APP_COLORS.primary, arrowColor: APP_COLORS.primary }}
            />
            <TouchableOpacity style={styles.calendarCancel} onPress={() => setDatePickerTarget(null)}>
              <Text style={styles.calendarCancelText}>{t('common.cancel')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Snackbar visible={!!error} onDismiss={() => setError('')} duration={3000}>{error}</Snackbar>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: APP_COLORS.background },
  header: { paddingHorizontal: 20, paddingTop: 18, paddingBottom: 18, flexDirection: 'row', alignItems: 'center', gap: 14 },
  backBtn: { padding: 2 },
  title: { flex: 1, fontSize: 18, fontFamily: FONTS.titleBold, color: APP_COLORS.accent, letterSpacing: 0.6 },
  saveBtn: {
    width: 36,
    height: 36,
    borderRadius: RADII.sm,
    backgroundColor: 'rgba(248,245,239,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(248,245,239,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scroll: { flex: 1, backgroundColor: APP_COLORS.background },
  sectionLabel: { flexDirection: 'row', alignItems: 'center', gap: 8, marginHorizontal: 16, marginTop: 20, marginBottom: 8 },
  sectionAccent: { width: 3, height: 13, borderRadius: 2, backgroundColor: APP_COLORS.accent },
  sectionLabelText: { fontSize: 11, fontWeight: '700', color: APP_COLORS.textSecondary, letterSpacing: 0.8 },
  section: { backgroundColor: APP_COLORS.surfaceElevated, marginHorizontal: 16, borderRadius: RADII.md, padding: 16, gap: 10 },
  input: { backgroundColor: APP_COLORS.surfaceElevated },
  chipRow: { paddingHorizontal: 16, paddingVertical: 4, gap: 8 },
  propertyChip: { borderWidth: 2, borderRadius: RADII.full, paddingHorizontal: 14, paddingVertical: 7, maxWidth: 160 },
  propertyChipText: { fontSize: 13, fontWeight: '600' },
  chip: { borderWidth: 1, borderColor: APP_COLORS.border, borderRadius: RADII.full, paddingHorizontal: 14, paddingVertical: 7, backgroundColor: APP_COLORS.surfaceElevated },
  chipActive: { backgroundColor: APP_COLORS.primary, borderColor: APP_COLORS.primary },
  chipText: { fontSize: 13, color: APP_COLORS.textSecondary },
  chipTextActive: { color: '#FFFFFF', fontWeight: '600' },
  datePicker: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: APP_COLORS.background, borderRadius: RADII.sm, padding: 12, borderWidth: 1, borderColor: APP_COLORS.borderLight },
  datePickerLabel: { fontSize: 12, color: APP_COLORS.textSecondary, flex: 1 },
  datePickerValue: { fontSize: 14, fontWeight: '600', color: APP_COLORS.textPrimary },
  nightsText: { fontSize: 13, color: APP_COLORS.primary, fontWeight: '700', textAlign: 'center' },
  timeInputRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  confirmedToggle: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 10, borderRadius: RADII.sm, borderWidth: 1, borderColor: APP_COLORS.border, backgroundColor: APP_COLORS.surfaceElevated },
  confirmedToggleActive: { borderColor: APP_COLORS.success, backgroundColor: APP_COLORS.successLight },
  submitBtn: { marginHorizontal: 16, marginTop: 24, borderRadius: RADII.md, paddingVertical: 15, backgroundColor: APP_COLORS.primary, alignItems: 'center' },
  submitBtnText: { fontSize: 15, fontWeight: '700', color: '#FFFFFF' },
  calendarOverlay: { flex: 1, backgroundColor: 'rgba(5,14,26,0.62)', justifyContent: 'flex-end' },
  calendarModal: { backgroundColor: APP_COLORS.surfaceElevated, borderTopLeftRadius: RADII.xl, borderTopRightRadius: RADII.xl, paddingBottom: 36 },
  calendarHandle: { width: 36, height: 4, borderRadius: 2, backgroundColor: APP_COLORS.border, alignSelf: 'center', marginTop: 12, marginBottom: 8 },
  calendarTitle: { fontSize: 16, fontWeight: '700', textAlign: 'center', marginBottom: 12, color: APP_COLORS.textPrimary, fontFamily: FONTS.titleBold },
  calendarCancel: { marginHorizontal: 16, marginTop: 8, borderRadius: RADII.sm, paddingVertical: 12, borderWidth: 1, borderColor: APP_COLORS.border, alignItems: 'center' },
  calendarCancelText: { fontSize: 14, color: APP_COLORS.textSecondary, fontWeight: '500' },
});
