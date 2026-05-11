import { useState, useMemo, useEffect } from 'react';
import { ScrollView, View, StyleSheet, TouchableOpacity, Modal } from 'react-native';
import { Text, TextInput, Button, Snackbar, Appbar, ActivityIndicator } from 'react-native-paper';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Calendar } from 'react-native-calendars';
import { useReservations, useUpdateReservation } from '@/hooks/useReservations';
import { useActiveProperties } from '@/hooks/useProperties';
import { StepperInput } from '@/components/ui/StepperInput';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { LinenPreviewCard } from '@/components/reservation/LinenPreviewCard';
import { ReservationFormData, ReservationStatus, ReservationCategory, Property } from '@/types';
import { PROPERTY_TYPE_DEFAULT_CATEGORY, RESERVATION_CATEGORY_LABELS, RESERVATION_STATUS_LABELS } from '@/constants/labels';
import { APP_COLORS } from '@/constants/colors';
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
      {
        nb_couples: updated.nb_couples,
        nb_solo_adults: updated.nb_solo_adults,
        nb_children: updated.nb_children,
        nb_babies: updated.nb_babies,
      },
      selectedProperty
    );
    setForm({
      ...updated,
      beds_double_used: suggestion.beds_double_used,
      beds_single_used: suggestion.beds_single_used,
      beds_sofa_used: suggestion.beds_sofa_used,
      beds_crib_used: suggestion.beds_crib_used,
    });
  };

  const linenPreview = useMemo(() => {
    if (!selectedProperty || !form) return null;
    const totalAdults = form.nb_couples * 2 + form.nb_solo_adults;
    if (totalAdults + form.nb_children + form.nb_babies === 0) return null;
    return calculateLinen(
      { nb_couples: form.nb_couples, nb_solo_adults: form.nb_solo_adults, nb_children: form.nb_children },
      {
        beds_double_used: form.beds_double_used,
        beds_single_used: form.beds_single_used,
        beds_sofa_used: form.beds_sofa_used,
        beds_crib_used: form.beds_crib_used,
      },
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
    ? calcNights(form.check_in, form.check_out)
    : 0;

  if (loadingRes || !form) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <Appbar.Header style={styles.appbar}>
          <Appbar.BackAction onPress={() => router.back()} iconColor="#FFFFFF" />
          <Appbar.Content title="Modifier" titleStyle={styles.appbarTitle} />
        </Appbar.Header>
        <ActivityIndicator style={{ marginTop: 40 }} color={APP_COLORS.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <Appbar.Header style={styles.appbar}>
        <Appbar.BackAction onPress={() => router.back()} iconColor="#FFFFFF" />
        <Appbar.Content title="Modifier la réservation" titleStyle={styles.appbarTitle} />
        <Appbar.Action icon="check" iconColor="#FFFFFF" onPress={handleSubmit} disabled={isPending} />
      </Appbar.Header>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>

        <SectionHeader title={t('reservations.property')} />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.propertyRow}>
          {(properties ?? []).map((p) => (
            <TouchableOpacity
              key={p.id}
              style={[
                styles.propertyChip,
                { borderColor: p.color },
                selectedProperty?.id === p.id && { backgroundColor: p.color },
              ]}
              onPress={() => handlePropertySelect(p)}
            >
              <Text
                style={[
                  styles.propertyChipText,
                  { color: selectedProperty?.id === p.id ? '#FFFFFF' : p.color },
                ]}
                numberOfLines={1}
              >
                {p.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <SectionHeader title={t('reservations.category')} />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
          {Object.values(ReservationCategory).map((cat) => (
            <TouchableOpacity
              key={cat}
              style={[styles.catChip, form.category === cat && styles.catChipSelected]}
              onPress={() => set('category', cat)}
            >
              <Text style={[styles.catChipText, form.category === cat && styles.catChipTextSelected]}>
                {RESERVATION_CATEGORY_LABELS[cat]}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <SectionHeader title="Voyageur" />
        <View style={styles.section}>
          <TextInput
            label={t('reservations.guestName') + ' *'}
            value={form.guest_name}
            onChangeText={(v) => set('guest_name', v)}
            mode="outlined"
            style={styles.input}
          />
          <TextInput
            label={t('reservations.guestEmail')}
            value={form.guest_email}
            onChangeText={(v) => set('guest_email', v)}
            keyboardType="email-address"
            autoCapitalize="none"
            mode="outlined"
            style={styles.input}
          />
          <TextInput
            label={t('reservations.guestPhone')}
            value={form.guest_phone}
            onChangeText={(v) => set('guest_phone', v)}
            keyboardType="phone-pad"
            mode="outlined"
            style={styles.input}
          />
        </View>

        <SectionHeader title="Dates" />
        <View style={styles.section}>
          <TouchableOpacity
            style={styles.datePicker}
            onPress={() => openDatePicker('check_in')}
          >
            <Text style={styles.datePickerLabel}>{t('reservations.checkIn')}</Text>
            <Text style={styles.datePickerValue}>{form.check_in}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.datePicker}
            onPress={() => openDatePicker('check_out')}
          >
            <Text style={styles.datePickerLabel}>{t('reservations.checkOut')}</Text>
            <Text style={styles.datePickerValue}>{form.check_out}</Text>
          </TouchableOpacity>
          {nights > 0 && (
            <Text style={styles.nightsText}>{nights} nuit{nights > 1 ? 's' : ''}</Text>
          )}
        </View>

        <SectionHeader title={t('reservations.guests')} />
        <View style={styles.section}>
          <StepperInput label={t('reservations.couples')} value={form.nb_couples} onChange={(v) => handleGuestChange('nb_couples', v)} />
          <StepperInput label={t('reservations.soloAdults')} value={form.nb_solo_adults} onChange={(v) => handleGuestChange('nb_solo_adults', v)} />
          <StepperInput label={t('reservations.children')} value={form.nb_children} onChange={(v) => handleGuestChange('nb_children', v)} />
          <StepperInput label={t('reservations.babies')} value={form.nb_babies} onChange={(v) => handleGuestChange('nb_babies', v)} />
        </View>

        {selectedProperty && (
          <>
            <SectionHeader title={t('reservations.bedsUsed')} />
            <View style={styles.section}>
              {selectedProperty.nb_double_beds > 0 && (
                <StepperInput
                  label={`${t('reservations.bedsDouble')} (max ${selectedProperty.nb_double_beds})`}
                  value={form.beds_double_used}
                  onChange={(v) => set('beds_double_used', v)}
                  max={selectedProperty.nb_double_beds}
                />
              )}
              {selectedProperty.nb_single_beds > 0 && (
                <StepperInput
                  label={`${t('reservations.bedsSingle')} (max ${selectedProperty.nb_single_beds})`}
                  value={form.beds_single_used}
                  onChange={(v) => set('beds_single_used', v)}
                  max={selectedProperty.nb_single_beds}
                />
              )}
              {selectedProperty.nb_sofa_beds > 0 && (
                <StepperInput
                  label={`${t('reservations.bedsSofa')} (max ${selectedProperty.nb_sofa_beds})`}
                  value={form.beds_sofa_used}
                  onChange={(v) => set('beds_sofa_used', v)}
                  max={selectedProperty.nb_sofa_beds}
                />
              )}
              {selectedProperty.nb_baby_cribs > 0 && (
                <StepperInput
                  label={`${t('reservations.bedsCrib')} (max ${selectedProperty.nb_baby_cribs})`}
                  value={form.beds_crib_used}
                  onChange={(v) => set('beds_crib_used', v)}
                  max={selectedProperty.nb_baby_cribs}
                />
              )}
            </View>
          </>
        )}

        {linenPreview && (
          <View style={styles.linenPreviewContainer}>
            <LinenPreviewCard linen={linenPreview} title={t('reservations.linenPreview')} />
          </View>
        )}

        <SectionHeader title="Statut" />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
          {Object.values(ReservationStatus).map((status) => (
            <TouchableOpacity
              key={status}
              style={[styles.catChip, form.status === status && styles.catChipSelected]}
              onPress={() => set('status', status)}
            >
              <Text style={[styles.catChipText, form.status === status && styles.catChipTextSelected]}>
                {RESERVATION_STATUS_LABELS[status]}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <SectionHeader title={t('common.notes')} />
        <View style={styles.section}>
          <TextInput
            label={t('common.notes')}
            value={form.notes}
            onChangeText={(v) => set('notes', v)}
            mode="outlined"
            multiline
            numberOfLines={3}
            style={styles.input}
          />
        </View>

        <Button
          mode="contained"
          onPress={handleSubmit}
          loading={isPending}
          disabled={isPending}
          style={styles.submitButton}
          contentStyle={styles.submitButtonContent}
        >
          {t('common.save')}
        </Button>
        <View style={{ height: 40 }} />
      </ScrollView>

      <Modal visible={!!datePickerTarget} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {datePickerTarget === 'check_in' ? t('reservations.checkIn') : t('reservations.checkOut')}
            </Text>
            <Calendar
              key={calendarInitialDate ?? 'checkin'}
              current={calendarInitialDate}
              minDate={datePickerTarget === 'check_out' && form.check_in
                ? form.check_in
                : toISODateString(new Date())}
              markedDates={{
                [form.check_in]: { selected: true, selectedColor: APP_COLORS.success },
                [form.check_out]: { selected: true, selectedColor: APP_COLORS.warning },
              }}
              onDayPress={(day) => {
                if (datePickerTarget) {
                  set(datePickerTarget, day.dateString);
                  setDatePickerTarget(null);
                }
              }}
              theme={{
                selectedDayBackgroundColor: APP_COLORS.primary,
                todayTextColor: APP_COLORS.primary,
                arrowColor: APP_COLORS.primary,
              }}
            />
            <Button
              mode="outlined"
              onPress={() => setDatePickerTarget(null)}
              style={styles.cancelButton}
            >
              {t('common.cancel')}
            </Button>
          </View>
        </View>
      </Modal>

      <Snackbar visible={!!error} onDismiss={() => setError('')} duration={3000}>
        {error}
      </Snackbar>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: APP_COLORS.background },
  appbar: { backgroundColor: APP_COLORS.primary },
  appbarTitle: { color: '#FFFFFF', fontSize: 18, fontWeight: '600' },
  scroll: { flex: 1 },
  section: { backgroundColor: '#FFFFFF', marginHorizontal: 16, marginBottom: 8, borderRadius: 12, padding: 16, gap: 10 },
  input: { backgroundColor: '#FFFFFF' },
  propertyRow: { paddingHorizontal: 16, paddingVertical: 10, gap: 8 },
  propertyChip: { borderWidth: 2, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 7, maxWidth: 160 },
  propertyChipText: { fontSize: 13, fontWeight: '600' },
  filterRow: { paddingHorizontal: 16, paddingVertical: 8, gap: 8 },
  catChip: { borderWidth: 1, borderColor: APP_COLORS.border, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 7, backgroundColor: '#FFFFFF' },
  catChipSelected: { backgroundColor: APP_COLORS.primary, borderColor: APP_COLORS.primary },
  catChipText: { fontSize: 13, color: APP_COLORS.textSecondary },
  catChipTextSelected: { color: '#FFFFFF', fontWeight: '600' },
  datePicker: { backgroundColor: '#F9FAFB', borderRadius: 8, padding: 12, borderWidth: 1, borderColor: APP_COLORS.border },
  datePickerLabel: { fontSize: 12, color: APP_COLORS.textSecondary, marginBottom: 4 },
  datePickerValue: { fontSize: 16, fontWeight: '600', color: APP_COLORS.textPrimary },
  nightsText: { fontSize: 13, color: APP_COLORS.primary, fontWeight: '600', textAlign: 'center' },
  linenPreviewContainer: { marginHorizontal: 16, marginBottom: 8 },
  submitButton: { marginHorizontal: 16, marginTop: 8, borderRadius: 8, backgroundColor: APP_COLORS.primary },
  submitButtonContent: { paddingVertical: 6 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 16, paddingBottom: 48 },
  modalTitle: { fontSize: 16, fontWeight: '600', textAlign: 'center', marginBottom: 12, color: APP_COLORS.textPrimary },
  cancelButton: { marginTop: 12, borderColor: APP_COLORS.border },
});
