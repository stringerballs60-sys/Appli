import { useState, useEffect, useRef } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
  TextInput as RNTextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Text, ActivityIndicator, Appbar, Surface, Button } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  useTask,
  useStartTask,
  useFinishTask,
  useToggleChecklistItem,
  useAddChecklistItem,
  useDeleteChecklistItem,
  useDeleteTask,
  usePropertyTemplates,
  useApplyTemplate,
  useAddTemplate,
  useDeleteTemplate,
} from '@/hooks/useTasks';
import { useReservations } from '@/hooks/useReservations';
import { LinenPreviewCard } from '@/components/reservation/LinenPreviewCard';
import { APP_COLORS } from '@/constants/colors';
import { FONTS } from '@/constants/typography';
import { TaskStatus, TaskType } from '@/types';
import { formatDateLong } from '@/utils/dateHelpers';

const TYPE_CONFIG: Record<TaskType, { icon: string; color: string; label: string }> = {
  [TaskType.CLEANING]: { icon: 'broom', color: '#7C3AED', label: 'Ménage' },
  [TaskType.MAINTENANCE]: { icon: 'wrench', color: '#EA580C', label: 'Maintenance' },
  [TaskType.RESTOCK]: { icon: 'cart-plus', color: '#0891B2', label: 'Réappro.' },
};

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}h ${String(m).padStart(2, '0')}min`;
  if (m > 0) return `${m}min ${String(s).padStart(2, '0')}s`;
  return `${s}s`;
}

export default function TaskDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const { data: task, isLoading } = useTask(id);
  const { mutateAsync: startTask, isPending: starting } = useStartTask();
  const { mutateAsync: finishTask, isPending: finishing } = useFinishTask();
  const { mutateAsync: toggleItem } = useToggleChecklistItem();
  const { mutateAsync: addItem, isPending: addingItem } = useAddChecklistItem();
  const { mutateAsync: deleteItem } = useDeleteChecklistItem();
  const { mutateAsync: deleteTask } = useDeleteTask();
  const { mutateAsync: applyTemplate, isPending: applyingTemplate } = useApplyTemplate();

  const { data: templates } = usePropertyTemplates(task?.property_id ?? null);
  const { mutateAsync: addTemplate } = useAddTemplate();
  const { mutateAsync: removeTemplate } = useDeleteTemplate();

  const { data: allReservations } = useReservations();
  const linkedReservation = task?.reservation_id
    ? allReservations?.find((r) => r.id === task.reservation_id)
    : null;

  const [elapsed, setElapsed] = useState(0);
  const [newItemLabel, setNewItemLabel] = useState('');
  const [showAddItem, setShowAddItem] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [newTemplateLabel, setNewTemplateLabel] = useState('');
  const addInputRef = useRef<RNTextInput>(null);

  useEffect(() => {
    if (task?.status !== TaskStatus.IN_PROGRESS || !task?.started_at) return;
    const start = new Date(task.started_at).getTime();
    const update = () => setElapsed(Math.floor((Date.now() - start) / 1000));
    update();
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, [task?.status, task?.started_at]);

  if (isLoading || !task) {
    return (
      <SafeAreaView style={styles.safe}>
        <Appbar.Header style={styles.appbar}>
          <Appbar.BackAction onPress={() => router.back()} iconColor="#FFFFFF" />
          <Appbar.Content title="Tâche" titleStyle={styles.appbarTitle} />
        </Appbar.Header>
        <ActivityIndicator style={{ marginTop: 40 }} color={APP_COLORS.primary} />
      </SafeAreaView>
    );
  }

  const typeConf = TYPE_CONFIG[task.type];
  const items = task.checklist_items ?? [];
  const checkedCount = items.filter((i) => i.is_checked).length;
  const allChecked = items.length > 0 && checkedCount === items.length;
  const hasTemplates = (templates?.length ?? 0) > 0;
  const itemsEmpty = items.length === 0;

  const startLabel =
    task.type === TaskType.CLEANING ? 'Démarrer le ménage' : 'Démarrer la tâche';
  const finishLabel =
    task.type === TaskType.CLEANING ? 'Terminer le ménage' : 'Terminer la tâche';

  const completedDurationSec =
    task.started_at && task.completed_at
      ? Math.floor(
          (new Date(task.completed_at).getTime() - new Date(task.started_at).getTime()) / 1000
        )
      : 0;

  const handleStart = async () => {
    await startTask(task.id);
  };

  const handleFinish = async () => {
    await finishTask(task.id);
  };

  const handleToggle = async (itemId: string, current: boolean) => {
    await toggleItem({ itemId, isChecked: !current });
  };

  const handleAddItem = async () => {
    const label = newItemLabel.trim();
    if (!label) return;
    await addItem({ taskId: task.id, label, orderIndex: items.length });
    setNewItemLabel('');
    setShowAddItem(false);
  };

  const handleDeleteItem = (itemId: string, label: string) => {
    Alert.alert('Supprimer', `Supprimer "${label}" ?`, [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Supprimer', style: 'destructive', onPress: () => deleteItem(itemId) },
    ]);
  };

  const handleDelete = () => {
    Alert.alert('Supprimer la tâche', `Supprimer "${task.title}" ?`, [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Supprimer',
        style: 'destructive',
        onPress: async () => {
          await deleteTask(task.id);
          router.back();
        },
      },
    ]);
  };

  const handleApplyTemplate = async () => {
    if (!task.property_id) return;
    await applyTemplate({ taskId: task.id, propertyId: task.property_id });
    setShowTemplates(false);
  };

  const handleAddTemplate = async () => {
    const label = newTemplateLabel.trim();
    if (!label || !task.property_id) return;
    await addTemplate({
      propertyId: task.property_id,
      label,
      orderIndex: templates?.length ?? 0,
    });
    setNewTemplateLabel('');
  };

  const handleRemoveTemplate = (tId: string) => {
    Alert.alert('Supprimer du modèle', 'Retirer cet élément du modèle ?', [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Supprimer', style: 'destructive', onPress: () => removeTemplate(tId) },
    ]);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <Appbar.Header style={styles.appbar}>
        <Appbar.BackAction onPress={() => router.back()} iconColor="#FFFFFF" />
        <Appbar.Content
          title={task.title}
          titleStyle={styles.appbarTitle}
          subtitle={task.property?.name}
          subtitleStyle={styles.appbarSubtitle}
        />
        <Appbar.Action icon="delete-outline" iconColor="#FFFFFF" onPress={handleDelete} />
      </Appbar.Header>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Info row */}
          <View style={styles.infoRow}>
            <View style={[styles.typeChip, { backgroundColor: typeConf.color + '18' }]}>
              <MaterialCommunityIcons name={typeConf.icon as any} size={14} color={typeConf.color} />
              <Text style={[styles.typeChipLabel, { color: typeConf.color }]}>{typeConf.label}</Text>
            </View>
            {task.property && (
              <View style={styles.propertyBadge}>
                <View style={[styles.propertyDot, { backgroundColor: task.property.color }]} />
                <Text style={styles.propertyName}>{task.property.name}</Text>
              </View>
            )}
            <Text style={styles.dateText}>{formatDateLong(task.scheduled_date)}</Text>
          </View>

          {/* ── TIMING ── */}
          <Surface style={styles.section} elevation={1}>
            <Text style={styles.sectionTitle}>Chronomètre</Text>

            {task.status === TaskStatus.PENDING && (
              <Button
                mode="contained"
                onPress={handleStart}
                loading={starting}
                icon={typeConf.icon as any}
                style={[styles.actionBtn, { backgroundColor: typeConf.color }]}
                contentStyle={styles.actionBtnContent}
                labelStyle={styles.actionBtnLabel}
              >
                {startLabel}
              </Button>
            )}

            {task.status === TaskStatus.IN_PROGRESS && (
              <View style={styles.chronoBlock}>
                <View style={styles.chronoRunning}>
                  <View style={styles.chronoDot} />
                  <Text style={styles.chronoTime}>{formatDuration(elapsed)}</Text>
                  <Text style={styles.chronoSince}>en cours</Text>
                </View>
                <Button
                  mode="contained"
                  onPress={handleFinish}
                  loading={finishing}
                  disabled={!allChecked}
                  icon="check-circle"
                  style={[
                    styles.actionBtn,
                    { backgroundColor: allChecked ? APP_COLORS.success : APP_COLORS.border },
                  ]}
                  contentStyle={styles.actionBtnContent}
                  labelStyle={styles.actionBtnLabel}
                >
                  {finishLabel}
                </Button>
                {!allChecked && items.length > 0 && (
                  <Text style={styles.finishHint}>
                    Cochez tous les éléments pour terminer ({checkedCount}/{items.length})
                  </Text>
                )}
                {items.length === 0 && (
                  <Text style={styles.finishHint}>
                    Ajoutez des éléments à la checklist ou terminez directement
                  </Text>
                )}
              </View>
            )}

            {task.status === TaskStatus.DONE && (
              <View style={styles.doneBlock}>
                <MaterialCommunityIcons
                  name="check-circle"
                  size={28}
                  color={APP_COLORS.success}
                />
                <View>
                  <Text style={styles.doneLabel}>Terminée</Text>
                  {completedDurationSec > 0 && (
                    <Text style={styles.doneDuration}>
                      Durée : {formatDuration(completedDurationSec)}
                    </Text>
                  )}
                </View>
              </View>
            )}
          </Surface>

          {/* ── CHECKLIST ── */}
          <Surface style={styles.section} elevation={1}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>
                Checklist{items.length > 0 ? ` (${checkedCount}/${items.length})` : ''}
              </Text>
              <View style={styles.sectionActions}>
                {hasTemplates && itemsEmpty && (
                  <TouchableOpacity
                    style={styles.templateBtn}
                    onPress={handleApplyTemplate}
                    disabled={applyingTemplate}
                  >
                    <MaterialCommunityIcons name="content-copy" size={14} color={typeConf.color} />
                    <Text style={[styles.templateBtnLabel, { color: typeConf.color }]}>
                      {applyingTemplate ? 'Chargement…' : 'Charger le modèle'}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {items.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={styles.checkItem}
                onPress={() =>
                  task.status !== TaskStatus.PENDING && handleToggle(item.id, item.is_checked)
                }
                onLongPress={() => handleDeleteItem(item.id, item.label)}
                activeOpacity={0.7}
              >
                <MaterialCommunityIcons
                  name={item.is_checked ? 'checkbox-marked' : 'checkbox-blank-outline'}
                  size={22}
                  color={item.is_checked ? APP_COLORS.success : APP_COLORS.textSecondary}
                />
                <Text
                  style={[
                    styles.checkLabel,
                    item.is_checked && styles.checkLabelDone,
                  ]}
                >
                  {item.label}
                </Text>
              </TouchableOpacity>
            ))}

            {items.length === 0 && !showAddItem && (
              <Text style={styles.emptyChecklist}>Aucun élément — appuyez sur + pour ajouter</Text>
            )}

            {showAddItem ? (
              <View style={styles.addItemRow}>
                <RNTextInput
                  ref={addInputRef}
                  style={styles.addItemInput}
                  placeholder="Nom de la tâche…"
                  value={newItemLabel}
                  onChangeText={setNewItemLabel}
                  onSubmitEditing={handleAddItem}
                  returnKeyType="done"
                  autoFocus
                />
                <TouchableOpacity onPress={handleAddItem} disabled={addingItem}>
                  <MaterialCommunityIcons
                    name="check"
                    size={22}
                    color={newItemLabel.trim() ? APP_COLORS.primary : APP_COLORS.border}
                  />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => { setShowAddItem(false); setNewItemLabel(''); }}>
                  <MaterialCommunityIcons name="close" size={22} color={APP_COLORS.textSecondary} />
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity style={styles.addItemBtn} onPress={() => setShowAddItem(true)}>
                <MaterialCommunityIcons name="plus" size={18} color={APP_COLORS.primary} />
                <Text style={styles.addItemBtnLabel}>Ajouter un élément</Text>
              </TouchableOpacity>
            )}
          </Surface>

          {/* ── MODÈLE ── */}
          <Surface style={styles.section} elevation={1}>
            <TouchableOpacity
              style={styles.sectionHeader}
              onPress={() => setShowTemplates((v) => !v)}
            >
              <Text style={styles.sectionTitle}>
                Modèle de checklist{hasTemplates ? ` (${templates!.length})` : ''}
              </Text>
              <MaterialCommunityIcons
                name={showTemplates ? 'chevron-up' : 'chevron-down'}
                size={20}
                color={APP_COLORS.textSecondary}
              />
            </TouchableOpacity>

            {showTemplates && (
              <View style={styles.templateBody}>
                <Text style={styles.templateHint}>
                  Ce modèle sera utilisé pour pré-remplir la checklist lors de la création d'une
                  tâche pour ce logement.
                </Text>

                {(templates ?? []).map((t) => (
                  <View key={t.id} style={styles.templateItem}>
                    <MaterialCommunityIcons name="drag" size={16} color={APP_COLORS.border} />
                    <Text style={styles.templateItemLabel}>{t.label}</Text>
                    <TouchableOpacity onPress={() => handleRemoveTemplate(t.id)}>
                      <MaterialCommunityIcons
                        name="close-circle-outline"
                        size={18}
                        color={APP_COLORS.textSecondary}
                      />
                    </TouchableOpacity>
                  </View>
                ))}

                <View style={styles.addItemRow}>
                  <RNTextInput
                    style={styles.addItemInput}
                    placeholder="Ajouter au modèle…"
                    value={newTemplateLabel}
                    onChangeText={setNewTemplateLabel}
                    onSubmitEditing={handleAddTemplate}
                    returnKeyType="done"
                  />
                  <TouchableOpacity onPress={handleAddTemplate}>
                    <MaterialCommunityIcons
                      name="plus-circle"
                      size={22}
                      color={
                        newTemplateLabel.trim() ? APP_COLORS.primary : APP_COLORS.border
                      }
                    />
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </Surface>

          {/* ── LINGE (si résa liée) ── */}
          {linkedReservation?.linen_calculation && (
            <View style={{ paddingHorizontal: 16 }}>
              <LinenPreviewCard
                linen={linkedReservation.linen_calculation}
                title="Linge pour cette réservation"
              />
            </View>
          )}

          {/* ── NOTES ── */}
          {task.notes ? (
            <Surface style={styles.section} elevation={1}>
              <Text style={styles.sectionTitle}>Notes</Text>
              <Text style={styles.notesText}>{task.notes}</Text>
            </Surface>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: APP_COLORS.background },
  appbar: { backgroundColor: APP_COLORS.primary },
  appbarTitle: {
    color: '#FFFFFF',
    fontSize: 17,
    fontFamily: FONTS.titleBold,
  },
  appbarSubtitle: { color: 'rgba(255,255,255,0.75)', fontSize: 12 },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 40 },

  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexWrap: 'wrap',
  },
  typeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 20,
  },
  typeChipLabel: { fontSize: 12, fontWeight: '600' },
  propertyBadge: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  propertyDot: { width: 8, height: 8, borderRadius: 4 },
  propertyName: { fontSize: 12, color: APP_COLORS.textSecondary },
  dateText: { fontSize: 12, color: APP_COLORS.textSecondary },

  section: {
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    padding: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: APP_COLORS.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sectionActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },

  actionBtn: { borderRadius: 10, marginTop: 4 },
  actionBtnContent: { paddingVertical: 4 },
  actionBtnLabel: { fontSize: 15, fontWeight: '700', color: '#FFFFFF' },

  chronoBlock: { gap: 12 },
  chronoRunning: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
  },
  chronoDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: APP_COLORS.warning,
  },
  chronoTime: {
    fontSize: 28,
    fontFamily: FONTS.titleBold,
    color: APP_COLORS.textPrimary,
    letterSpacing: 1,
  },
  chronoSince: { fontSize: 13, color: APP_COLORS.textSecondary },
  finishHint: {
    fontSize: 12,
    color: APP_COLORS.textSecondary,
    textAlign: 'center',
    marginTop: 4,
  },

  doneBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 4,
  },
  doneLabel: { fontSize: 16, fontWeight: '700', color: APP_COLORS.success },
  doneDuration: { fontSize: 13, color: APP_COLORS.textSecondary, marginTop: 2 },

  checkItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: APP_COLORS.background,
  },
  checkLabel: { flex: 1, fontSize: 15, color: APP_COLORS.textPrimary },
  checkLabelDone: { textDecorationLine: 'line-through', color: APP_COLORS.textSecondary },
  emptyChecklist: {
    fontSize: 13,
    color: APP_COLORS.textSecondary,
    textAlign: 'center',
    paddingVertical: 12,
  },
  addItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: APP_COLORS.border,
  },
  addItemInput: {
    flex: 1,
    fontSize: 14,
    color: APP_COLORS.textPrimary,
    borderBottomWidth: 1,
    borderBottomColor: APP_COLORS.border,
    paddingVertical: 4,
  },
  addItemBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingTop: 12,
    marginTop: 4,
  },
  addItemBtnLabel: { fontSize: 14, color: APP_COLORS.primary, fontWeight: '600' },

  templateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  templateBtnLabel: { fontSize: 12, fontWeight: '600' },
  templateBody: { gap: 4 },
  templateHint: {
    fontSize: 12,
    color: APP_COLORS.textSecondary,
    marginBottom: 8,
    lineHeight: 16,
  },
  templateItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: APP_COLORS.background,
  },
  templateItemLabel: { flex: 1, fontSize: 14, color: APP_COLORS.textPrimary },

  notesText: { fontSize: 14, color: APP_COLORS.textPrimary, lineHeight: 20 },
});
