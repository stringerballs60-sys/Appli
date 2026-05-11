import { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet, TouchableOpacity, Modal } from 'react-native';
import { Text, TextInput, Button, Appbar } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Calendar } from 'react-native-calendars';
import { useCreateTask, useApplyTemplate, usePropertyTemplates } from '@/hooks/useTasks';
import { useActiveProperties } from '@/hooks/useProperties';
import { useReservations } from '@/hooks/useReservations';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { APP_COLORS } from '@/constants/colors';
import { FONTS } from '@/constants/typography';
import { TaskType, TaskFormData, ReservationStatus } from '@/types';
import { toISODateString, formatDate } from '@/utils/dateHelpers';

const TYPE_OPTIONS: { type: TaskType; icon: string; color: string; label: string; desc: string }[] =
  [
    {
      type: TaskType.CLEANING,
      icon: 'broom',
      color: '#7C3AED',
      label: 'Ménage',
      desc: 'Nettoyage après départ',
    },
    {
      type: TaskType.MAINTENANCE,
      icon: 'wrench',
      color: '#EA580C',
      label: 'Maintenance',
      desc: 'Réparation, vérification',
    },
    {
      type: TaskType.RESTOCK,
      icon: 'cart-plus',
      color: '#0891B2',
      label: 'Réappro.',
      desc: 'Consommables, courses',
    },
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
    (r) =>
      r.property_id === propertyId &&
      r.status !== ReservationStatus.CANCELLED &&
      r.check_out >= toISODateString(new Date())
  );

  useEffect(() => {
    if (selectedProperty && type === TaskType.CLEANING) {
      setTitle(`Ménage – ${selectedProperty.name}`);
    } else if (selectedProperty && type === TaskType.MAINTENANCE) {
      setTitle(`Maintenance – ${selectedProperty.name}`);
    } else if (selectedProperty && type === TaskType.RESTOCK) {
      setTitle(`Réapprovisionnement – ${selectedProperty.name}`);
    }
  }, [type, propertyId, selectedProperty]);

  const handleSubmit = async () => {
    if (!propertyId) { setError('Sélectionnez un logement'); return; }
    if (!title.trim()) { setError('Le titre est obligatoire'); return; }
    if (!date) { setError('La date est obligatoire'); return; }
    setError('');

    const form: TaskFormData = {
      property_id: propertyId,
      reservation_id: reservationId,
      type,
      title: title.trim(),
      scheduled_date: date,
      notes,
    };

    const task = await createTask(form);

    if (loadTemplate && hasTemplates && task?.id) {
      await applyTemplate({ taskId: task.id, propertyId });
    }

    router.replace(`/(app)/tasks/${task.id}` as any);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <Appbar.Header style={styles.appbar}>
        <Appbar.BackAction onPress={() => router.back()} iconColor="#FFFFFF" />
        <Appbar.Content title="Nouvelle tâche" titleStyle={styles.appbarTitle} />
      </Appbar.Header>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* TYPE */}
        <SectionHeader title="Type de tâche" />
        <View style={styles.typeRow}>
          {TYPE_OPTIONS.map((opt) => (
            <TouchableOpacity
              key={opt.type}
              style={[
                styles.typeCard,
                type === opt.type && { borderColor: opt.color, borderWidth: 2 },
              ]}
              onPress={() => setType(opt.type)}
              activeOpacity={0.7}
            >
              <View style={[styles.typeIcon, { backgroundColor: opt.color + '18' }]}>
                <MaterialCommunityIcons name={opt.icon as any} size={22} color={opt.color} />
              </View>
              <Text style={[styles.typeLabel, type === opt.type && { color: opt.color }]}>
                {opt.label}
              </Text>
              <Text style={styles.typeDesc} numberOfLines={2}>
                {opt.desc}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* LOGEMENT */}
        <SectionHeader title="Logement" />
        <View style={styles.propertyGrid}>
          {(properties ?? []).map((p) => (
            <TouchableOpacity
              key={p.id}
              style={[
                styles.propertyChip,
                propertyId === p.id && { backgroundColor: p.color + '22', borderColor: p.color },
              ]}
              onPress={() => {
                setPropertyId(p.id);
                setReservationId(null);
              }}
            >
              <View style={[styles.propertyDot, { backgroundColor: p.color }]} />
              <Text
                style={[
                  styles.propertyChipLabel,
                  propertyId === p.id && { color: APP_COLORS.textPrimary, fontWeight: '700' },
                ]}
              >
                {p.name}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* RÉSERVATION LIÉE (ménage seulement) */}
        {type === TaskType.CLEANING && propertyId && checkouts.length > 0 && (
          <>
            <SectionHeader title="Réservation liée (optionnel)" />
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.resaRow}
            >
              <TouchableOpacity
                style={[
                  styles.resaChip,
                  !reservationId && styles.resaChipSelected,
                ]}
                onPress={() => setReservationId(null)}
              >
                <Text style={styles.resaChipLabel}>Aucune</Text>
              </TouchableOpacity>
              {checkouts.map((r) => (
                <TouchableOpacity
                  key={r.id}
                  style={[
                    styles.resaChip,
                    reservationId === r.id && styles.resaChipSelected,
                  ]}
                  onPress={() => {
                    setReservationId(r.id);
                    setDate(r.check_out);
                  }}
                >
                  <Text style={styles.resaChipLabel} numberOfLines={1}>
                    {r.guest_name}
                  </Text>
                  <Text style={styles.resaChipDate}>Départ {formatDate(r.check_out)}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </>
        )}

        {/* TITRE */}
        <SectionHeader title="Titre" />
        <TextInput
          mode="outlined"
          value={title}
          onChangeText={setTitle}
          placeholder="Nom de la tâche"
          style={styles.input}
          outlineColor={APP_COLORS.border}
          activeOutlineColor={APP_COLORS.primary}
        />

        {/* DATE */}
        <SectionHeader title="Date" />
        <TouchableOpacity
          style={styles.datePicker}
          onPress={() => setShowCalendar(true)}
        >
          <MaterialCommunityIcons name="calendar" size={18} color={APP_COLORS.primary} />
          <Text style={styles.datePickerText}>{formatDate(date)}</Text>
          <MaterialCommunityIcons name="chevron-right" size={18} color={APP_COLORS.textSecondary} />
        </TouchableOpacity>

        {/* MODÈLE */}
        {hasTemplates && (
          <TouchableOpacity
            style={styles.templateToggle}
            onPress={() => setLoadTemplate((v) => !v)}
          >
            <MaterialCommunityIcons
              name={loadTemplate ? 'checkbox-marked' : 'checkbox-blank-outline'}
              size={20}
              color={APP_COLORS.primary}
            />
            <Text style={styles.templateToggleLabel}>
              Pré-remplir la checklist depuis le modèle ({templates!.length} éléments)
            </Text>
          </TouchableOpacity>
        )}

        {/* NOTES */}
        <SectionHeader title="Notes (optionnel)" />
        <TextInput
          mode="outlined"
          value={notes}
          onChangeText={setNotes}
          placeholder="Observations, instructions…"
          multiline
          numberOfLines={3}
          style={styles.input}
          outlineColor={APP_COLORS.border}
          activeOutlineColor={APP_COLORS.primary}
        />

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Button
          mode="contained"
          onPress={handleSubmit}
          loading={isPending}
          style={styles.submitBtn}
          contentStyle={styles.submitBtnContent}
          labelStyle={styles.submitBtnLabel}
          buttonColor={APP_COLORS.primary}
        >
          Créer la tâche
        </Button>
      </ScrollView>

      {/* CALENDAR MODAL */}
      <Modal visible={showCalendar} transparent animationType="slide">
        <View style={styles.calendarOverlay}>
          <View style={styles.calendarModal}>
            <View style={styles.calendarHeader}>
              <Text style={styles.calendarTitle}>Choisir une date</Text>
              <TouchableOpacity onPress={() => setShowCalendar(false)}>
                <MaterialCommunityIcons name="close" size={22} color={APP_COLORS.textPrimary} />
              </TouchableOpacity>
            </View>
            <Calendar
              current={date}
              onDayPress={(day: { dateString: string }) => {
                setDate(day.dateString);
                setShowCalendar(false);
              }}
              markedDates={{ [date]: { selected: true, selectedColor: APP_COLORS.primary } }}
              theme={{
                selectedDayBackgroundColor: APP_COLORS.primary,
                todayTextColor: APP_COLORS.primary,
                arrowColor: APP_COLORS.primary,
              }}
            />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: APP_COLORS.background },
  appbar: { backgroundColor: APP_COLORS.primary },
  appbarTitle: { color: '#FFFFFF', fontSize: 17, fontFamily: FONTS.titleBold },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 40 },

  typeRow: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 16,
    marginBottom: 4,
  },
  typeCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: APP_COLORS.border,
  },
  typeIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  typeLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: APP_COLORS.textPrimary,
    textAlign: 'center',
  },
  typeDesc: {
    fontSize: 10,
    color: APP_COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 13,
  },

  propertyGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingHorizontal: 16,
    marginBottom: 4,
  },
  propertyChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: APP_COLORS.border,
  },
  propertyDot: { width: 8, height: 8, borderRadius: 4 },
  propertyChipLabel: { fontSize: 13, color: APP_COLORS.textSecondary },

  resaRow: {
    paddingHorizontal: 16,
    gap: 8,
    paddingBottom: 4,
  },
  resaChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: APP_COLORS.border,
    minWidth: 100,
  },
  resaChipSelected: {
    borderColor: APP_COLORS.primary,
    backgroundColor: APP_COLORS.primary + '10',
  },
  resaChipLabel: { fontSize: 13, fontWeight: '600', color: APP_COLORS.textPrimary },
  resaChipDate: { fontSize: 11, color: APP_COLORS.textSecondary, marginTop: 2 },

  input: { marginHorizontal: 16, marginBottom: 4, backgroundColor: '#FFFFFF' },

  datePicker: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginHorizontal: 16,
    paddingHorizontal: 14,
    paddingVertical: 14,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: APP_COLORS.border,
    marginBottom: 4,
  },
  datePickerText: { flex: 1, fontSize: 14, color: APP_COLORS.textPrimary },

  templateToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 16,
    marginVertical: 10,
  },
  templateToggleLabel: { flex: 1, fontSize: 14, color: APP_COLORS.textPrimary },

  error: {
    color: APP_COLORS.danger,
    fontSize: 13,
    marginHorizontal: 16,
    marginTop: 8,
    textAlign: 'center',
  },
  submitBtn: { margin: 16, borderRadius: 10 },
  submitBtnContent: { paddingVertical: 4 },
  submitBtnLabel: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },

  calendarOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  calendarModal: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 32,
  },
  calendarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: APP_COLORS.border,
  },
  calendarTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: APP_COLORS.textPrimary,
    fontFamily: FONTS.titleBold,
  },
});
