import { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet, TouchableOpacity, Modal } from 'react-native';
import { Text, TextInput } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Calendar } from 'react-native-calendars';
import { useCreateTask, useApplyTemplate, usePropertyTemplates } from '@/hooks/useTasks';
import { useActiveProperties } from '@/hooks/useProperties';
import { useReservations } from '@/hooks/useReservations';
import { APP_COLORS } from '@/constants/colors';
import { SHADOWS, GRADIENTS, RADII } from '@/constants/theme';
import { FONTS } from '@/constants/typography';
import { TaskType, TaskFormData, ReservationStatus } from '@/types';
import { toISODateString, formatDate } from '@/utils/dateHelpers';

const TYPE_OPTIONS: { type: TaskType; icon: string; color: string; label: string; desc: string }[] = [
  { type: TaskType.CLEANING, icon: 'broom', color: '#7C3AED', label: 'Ménage', desc: 'Nettoyage après départ' },
  { type: TaskType.MAINTENANCE, icon: 'wrench', color: '#EA580C', label: 'Maintenance', desc: 'Réparation, vérification' },
  { type: TaskType.RESTOCK, icon: 'cart-plus', color: '#0891B2', label: 'Réappro.', desc: 'Consommables, courses' },
];

export default function NewTaskScreen() {
  const router = useRouter();
  const { mutateAsync: createTask, isPending } = useCreateTask();
  const { mutateAsync: applyTemplate } = useApplyTemplate();

  const { data: properties } = useActiveProperties();
  const { data: allReservations } = useReservations();

  const [type, setType] = useState<TaskType>(TaskType.CLEANING);
  const [propertyId, setPropertyId] = useState('');
  const [reservationId, setReservationId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [date, setDate] = useState(toISODateString(new Date()));
  const [notes, setNotes] = useState('');
  const [showCalendar, setShowCalendar] = useState(false);
  const [loadTemplate, setLoadTemplate] = useState(false);
  const [error, setError] = useState('');

  const { data: templates } = usePropertyTemplates(propertyId || null);
  const hasTemplates = (templates?.length ?? 0) > 0;

  const selectedProperty = properties?.find((p) => p.id === propertyId);

  const checkouts = (allReservations ?? []).filter(
    (r) => r.property_id === propertyId && r.status !== ReservationStatus.CANCELLED && r.check_out >= toISODateString(new Date())
  );

  useEffect(() => {
    if (selectedProperty && type === TaskType.CLEANING) setTitle(`Ménage – ${selectedProperty.name}`);
    else if (selectedProperty && type === TaskType.MAINTENANCE) setTitle(`Maintenance – ${selectedProperty.name}`);
    else if (selectedProperty && type === TaskType.RESTOCK) setTitle(`Réapprovisionnement – ${selectedProperty.name}`);
  }, [type, propertyId, selectedProperty]);

  const handleSubmit = async () => {
    if (!propertyId) { setError('Sélectionnez un logement'); return; }
    if (!title.trim()) { setError('Le titre est obligatoire'); return; }
    if (!date) { setError('La date est obligatoire'); return; }
    setError('');
    const form: TaskFormData = { property_id: propertyId, reservation_id: reservationId, type, title: title.trim(), scheduled_date: date, notes };
    const task = await createTask(form);
    if (loadTemplate && hasTemplates && task?.id) await applyTemplate({ taskId: task.id, propertyId });
    router.replace(`/(app)/tasks/${task.id}` as any);
  };

  const activeType = TYPE_OPTIONS.find((o) => o.type === type)!;

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
        <Text style={styles.title}>Nouvelle tâche</Text>
        <TouchableOpacity style={[styles.saveBtn, isPending && { opacity: 0.6 }]} onPress={handleSubmit} disabled={isPending} activeOpacity={0.8}>
          <MaterialCommunityIcons name="check" size={20} color="#FFFFFF" />
        </TouchableOpacity>
      </LinearGradient>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

        {/* TYPE */}
        <View style={styles.sectionLabel}>
          <View style={styles.sectionAccent} />
          <Text style={styles.sectionLabelText}>TYPE DE TÂCHE</Text>
        </View>
        <View style={styles.typeRow}>
          {TYPE_OPTIONS.map((opt) => (
            <TouchableOpacity
              key={opt.type}
              style={[styles.typeCard, SHADOWS.xs, type === opt.type && { borderColor: opt.color, borderWidth: 2 }]}
              onPress={() => setType(opt.type)}
              activeOpacity={0.7}
            >
              <View style={[styles.typeIcon, { backgroundColor: opt.color + '18' }]}>
                <MaterialCommunityIcons name={opt.icon as any} size={22} color={opt.color} />
              </View>
              <Text style={[styles.typeLabel, type === opt.type && { color: opt.color }]}>{opt.label}</Text>
              <Text style={styles.typeDesc} numberOfLines={2}>{opt.desc}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* LOGEMENT */}
        <View style={styles.sectionLabel}>
          <View style={styles.sectionAccent} />
          <Text style={styles.sectionLabelText}>LOGEMENT</Text>
        </View>
        <View style={styles.propertyGrid}>
          {(properties ?? []).map((p) => (
            <TouchableOpacity
              key={p.id}
              style={[styles.propertyChip, propertyId === p.id && { backgroundColor: p.color + '22', borderColor: p.color }]}
              onPress={() => { setPropertyId(p.id); setReservationId(null); }}
            >
              <View style={[styles.propertyDot, { backgroundColor: p.color }]} />
              <Text style={[styles.propertyChipLabel, propertyId === p.id && { color: APP_COLORS.textPrimary, fontWeight: '700' }]}>{p.name}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* RÉSERVATION LIÉE */}
        {type === TaskType.CLEANING && propertyId && checkouts.length > 0 && (
          <>
            <View style={styles.sectionLabel}>
              <View style={styles.sectionAccent} />
              <Text style={styles.sectionLabelText}>RÉSERVATION LIÉE (OPTIONNEL)</Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.resaRow}>
              <TouchableOpacity style={[styles.resaChip, !reservationId && styles.resaChipSelected]} onPress={() => setReservationId(null)}>
                <Text style={styles.resaChipLabel}>Aucune</Text>
              </TouchableOpacity>
              {checkouts.map((r) => (
                <TouchableOpacity key={r.id} style={[styles.resaChip, reservationId === r.id && styles.resaChipSelected]} onPress={() => { setReservationId(r.id); setDate(r.check_out); }}>
                  <Text style={styles.resaChipLabel} numberOfLines={1}>{r.guest_name}</Text>
                  <Text style={styles.resaChipDate}>Départ {formatDate(r.check_out)}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </>
        )}

        {/* TITRE */}
        <View style={styles.sectionLabel}>
          <View style={styles.sectionAccent} />
          <Text style={styles.sectionLabelText}>TITRE</Text>
        </View>
        <TextInput
          mode="outlined"
          value={title}
          onChangeText={setTitle}
          placeholder="Nom de la tâche"
          style={[styles.input, { marginHorizontal: 16 }]}
          outlineColor={APP_COLORS.border}
          activeOutlineColor={APP_COLORS.primary}
        />

        {/* DATE */}
        <View style={styles.sectionLabel}>
          <View style={styles.sectionAccent} />
          <Text style={styles.sectionLabelText}>DATE</Text>
        </View>
        <TouchableOpacity style={[styles.datePicker, SHADOWS.xs]} onPress={() => setShowCalendar(true)}>
          <MaterialCommunityIcons name="calendar" size={18} color={APP_COLORS.primary} />
          <Text style={styles.datePickerText}>{formatDate(date)}</Text>
          <MaterialCommunityIcons name="chevron-right" size={18} color={APP_COLORS.textTertiary} />
        </TouchableOpacity>

        {/* MODÈLE */}
        {hasTemplates && (
          <TouchableOpacity style={styles.templateToggle} onPress={() => setLoadTemplate((v) => !v)}>
            <View style={[styles.templateCheckbox, loadTemplate && { backgroundColor: APP_COLORS.primary, borderColor: APP_COLORS.primary }]}>
              {loadTemplate && <MaterialCommunityIcons name="check" size={14} color="#FFFFFF" />}
            </View>
            <Text style={styles.templateToggleLabel}>
              Pré-remplir la checklist depuis le modèle ({templates!.length} élément{templates!.length > 1 ? 's' : ''})
            </Text>
          </TouchableOpacity>
        )}

        {/* NOTES */}
        <View style={styles.sectionLabel}>
          <View style={styles.sectionAccent} />
          <Text style={styles.sectionLabelText}>NOTES (OPTIONNEL)</Text>
        </View>
        <TextInput
          mode="outlined"
          value={notes}
          onChangeText={setNotes}
          placeholder="Observations, instructions…"
          multiline
          numberOfLines={3}
          style={[styles.input, { marginHorizontal: 16 }]}
          outlineColor={APP_COLORS.border}
          activeOutlineColor={APP_COLORS.primary}
        />

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <TouchableOpacity
          style={[styles.submitBtn, { backgroundColor: activeType.color }, SHADOWS.sm, isPending && { opacity: 0.6 }]}
          onPress={handleSubmit}
          disabled={isPending}
          activeOpacity={0.85}
        >
          <MaterialCommunityIcons name={activeType.icon as any} size={18} color="#FFFFFF" />
          <Text style={styles.submitBtnText}>Créer la tâche</Text>
        </TouchableOpacity>
      </ScrollView>

      <Modal visible={showCalendar} transparent animationType="slide">
        <View style={styles.calendarOverlay}>
          <View style={[styles.calendarModal, SHADOWS.lg]}>
            <View style={styles.calendarHandle} />
            <View style={styles.calendarHeader}>
              <Text style={styles.calendarTitle}>Choisir une date</Text>
              <TouchableOpacity onPress={() => setShowCalendar(false)}>
                <MaterialCommunityIcons name="close" size={22} color={APP_COLORS.textPrimary} />
              </TouchableOpacity>
            </View>
            <Calendar
              current={date}
              onDayPress={(day: { dateString: string }) => { setDate(day.dateString); setShowCalendar(false); }}
              markedDates={{ [date]: { selected: true, selectedColor: APP_COLORS.primary } }}
              theme={{ selectedDayBackgroundColor: APP_COLORS.primary, todayTextColor: APP_COLORS.primary, arrowColor: APP_COLORS.primary }}
            />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: APP_COLORS.primaryDark },
  header: { paddingHorizontal: 20, paddingTop: 18, paddingBottom: 18, flexDirection: 'row', alignItems: 'center', gap: 14 },
  backBtn: { padding: 2 },
  title: { flex: 1, fontSize: 20, fontFamily: FONTS.titleBold, color: APP_COLORS.accent, letterSpacing: 0.8 },
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
  scrollContent: { paddingBottom: 40 },
  sectionLabel: { flexDirection: 'row', alignItems: 'center', gap: 8, marginHorizontal: 16, marginTop: 20, marginBottom: 10 },
  sectionAccent: { width: 3, height: 13, borderRadius: 2, backgroundColor: APP_COLORS.accent },
  sectionLabelText: { fontSize: 11, fontWeight: '700', color: APP_COLORS.textSecondary, letterSpacing: 0.8 },
  typeRow: { flexDirection: 'row', gap: 10, paddingHorizontal: 16 },
  typeCard: {
    flex: 1,
    backgroundColor: APP_COLORS.surfaceElevated,
    borderRadius: RADII.md,
    padding: 12,
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: APP_COLORS.borderLight,
  },
  typeIcon: { width: 44, height: 44, borderRadius: RADII.sm, alignItems: 'center', justifyContent: 'center' },
  typeLabel: { fontSize: 13, fontWeight: '700', color: APP_COLORS.textPrimary, textAlign: 'center' },
  typeDesc: { fontSize: 10, color: APP_COLORS.textSecondary, textAlign: 'center', lineHeight: 13 },
  propertyGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 16 },
  propertyChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: APP_COLORS.surfaceElevated, borderRadius: RADII.full, borderWidth: 1, borderColor: APP_COLORS.border },
  propertyDot: { width: 8, height: 8, borderRadius: 4 },
  propertyChipLabel: { fontSize: 13, color: APP_COLORS.textSecondary },
  resaRow: { paddingHorizontal: 16, gap: 8, paddingBottom: 4 },
  resaChip: { paddingHorizontal: 14, paddingVertical: 8, backgroundColor: APP_COLORS.surfaceElevated, borderRadius: RADII.sm, borderWidth: 1, borderColor: APP_COLORS.border, minWidth: 100 },
  resaChipSelected: { borderColor: APP_COLORS.primary, backgroundColor: APP_COLORS.primaryPale },
  resaChipLabel: { fontSize: 13, fontWeight: '600', color: APP_COLORS.textPrimary },
  resaChipDate: { fontSize: 11, color: APP_COLORS.textSecondary, marginTop: 2 },
  input: { backgroundColor: APP_COLORS.surfaceElevated },
  datePicker: { flexDirection: 'row', alignItems: 'center', gap: 10, marginHorizontal: 16, paddingHorizontal: 14, paddingVertical: 14, backgroundColor: APP_COLORS.surfaceElevated, borderRadius: RADII.md, borderWidth: 1, borderColor: APP_COLORS.borderLight },
  datePickerText: { flex: 1, fontSize: 14, color: APP_COLORS.textPrimary, fontWeight: '500' },
  templateToggle: { flexDirection: 'row', alignItems: 'center', gap: 10, marginHorizontal: 16, marginVertical: 12 },
  templateCheckbox: { width: 20, height: 20, borderRadius: 5, borderWidth: 2, borderColor: APP_COLORS.border, alignItems: 'center', justifyContent: 'center' },
  templateToggleLabel: { flex: 1, fontSize: 14, color: APP_COLORS.textPrimary },
  error: { color: APP_COLORS.danger, fontSize: 13, marginHorizontal: 16, marginTop: 8, textAlign: 'center' },
  submitBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, margin: 16, borderRadius: RADII.md, paddingVertical: 15 },
  submitBtnText: { fontSize: 15, fontWeight: '700', color: '#FFFFFF' },
  calendarOverlay: { flex: 1, backgroundColor: 'rgba(5,14,26,0.62)', justifyContent: 'flex-end' },
  calendarModal: { backgroundColor: APP_COLORS.surfaceElevated, borderTopLeftRadius: RADII.xl, borderTopRightRadius: RADII.xl, paddingBottom: 36 },
  calendarHandle: { width: 36, height: 4, borderRadius: 2, backgroundColor: APP_COLORS.border, alignSelf: 'center', marginTop: 12, marginBottom: 4 },
  calendarHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: APP_COLORS.borderLight },
  calendarTitle: { fontSize: 16, fontWeight: '700', color: APP_COLORS.textPrimary, fontFamily: FONTS.titleBold },
});
