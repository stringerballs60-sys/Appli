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
import { Text, ActivityIndicator } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  useTask, useStartTask, useFinishTask, useToggleChecklistItem,
  useAddChecklistItem, useDeleteChecklistItem, useDeleteTask,
  usePropertyTemplates, useApplyTemplate, useAddTemplate, useDeleteTemplate,
} from '@/hooks/useTasks';
import { useReservations } from '@/hooks/useReservations';
import { LinenPreviewCard } from '@/components/reservation/LinenPreviewCard';
import { APP_COLORS } from '@/constants/colors';
import { SHADOWS, GRADIENTS, RADII } from '@/constants/theme';
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
      <SafeAreaView style={styles.safe} edges={['top']}>
        <LinearGradient colors={GRADIENTS.navyHeader as [string, string, ...string[]]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
            <MaterialCommunityIcons name="arrow-left" size={22} color="rgba(248,245,239,0.8)" />
          </TouchableOpacity>
          <Text style={styles.title}>Tâche</Text>
        </LinearGradient>
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

  const startLabel = task.type === TaskType.CLEANING ? 'Démarrer le ménage' : 'Démarrer la tâche';
  const finishLabel = task.type === TaskType.CLEANING ? 'Terminer le ménage' : 'Terminer la tâche';

  const completedDurationSec = task.started_at && task.completed_at
    ? Math.floor((new Date(task.completed_at).getTime() - new Date(task.started_at).getTime()) / 1000) : 0;

  const handleDelete = () => {
    Alert.alert('Supprimer la tâche', `Supprimer "${task.title}" ?`, [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Supprimer', style: 'destructive', onPress: async () => { await deleteTask(task.id); router.back(); } },
    ]);
  };

  const handleDeleteItem = (itemId: string, label: string) => {
    Alert.alert('Supprimer', `Supprimer "${label}" ?`, [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Supprimer', style: 'destructive', onPress: () => deleteItem(itemId) },
    ]);
  };

  const handleAddItem = async () => {
    const label = newItemLabel.trim();
    if (!label) return;
    await addItem({ taskId: task.id, label, orderIndex: items.length });
    setNewItemLabel('');
    setShowAddItem(false);
  };

  const handleApplyTemplate = async () => {
    if (!task.property_id) return;
    await applyTemplate({ taskId: task.id, propertyId: task.property_id });
    setShowTemplates(false);
  };

  const handleAddTemplate = async () => {
    const label = newTemplateLabel.trim();
    if (!label || !task.property_id) return;
    await addTemplate({ propertyId: task.property_id, label, orderIndex: templates?.length ?? 0 });
    setNewTemplateLabel('');
  };

  const handleRemoveTemplate = (tId: string) => {
    Alert.alert('Supprimer du modèle', 'Retirer cet élément du modèle ?', [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Supprimer', style: 'destructive', onPress: () => removeTemplate(tId) },
    ]);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
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
          <Text style={styles.title} numberOfLines={1}>{task.title}</Text>
          {task.property && <Text style={styles.subtitle}>{task.property.name}</Text>}
        </View>
        <TouchableOpacity style={styles.deleteBtn} onPress={handleDelete} activeOpacity={0.8}>
          <MaterialCommunityIcons name="delete-outline" size={19} color="rgba(248,245,239,0.7)" />
        </TouchableOpacity>
      </LinearGradient>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

          {/* Meta row */}
          <View style={styles.metaRow}>
            <View style={[styles.typeChip, { backgroundColor: typeConf.color + '18' }]}>
              <MaterialCommunityIcons name={typeConf.icon as any} size={13} color={typeConf.color} />
              <Text style={[styles.typeChipLabel, { color: typeConf.color }]}>{typeConf.label}</Text>
            </View>
            {task.property && (
              <View style={styles.propBadge}>
                <View style={[styles.propDot, { backgroundColor: task.property.color }]} />
                <Text style={styles.propName}>{task.property.name}</Text>
              </View>
            )}
            <Text style={styles.dateText}>{formatDateLong(task.scheduled_date)}</Text>
          </View>

          {/* TIMING */}
          <View style={[styles.section, SHADOWS.sm]}>
            <Text style={styles.sectionTitle}>CHRONOMÈTRE</Text>

            {task.status === TaskStatus.PENDING && (
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: typeConf.color }, starting && { opacity: 0.7 }]}
                onPress={() => startTask(task.id)}
                disabled={starting}
                activeOpacity={0.85}
              >
                <MaterialCommunityIcons name={typeConf.icon as any} size={18} color="#FFFFFF" />
                <Text style={styles.actionBtnLabel}>{startLabel}</Text>
              </TouchableOpacity>
            )}

            {task.status === TaskStatus.IN_PROGRESS && (
              <View style={{ gap: 12 }}>
                <View style={styles.chronoRunning}>
                  <View style={styles.chronoDot} />
                  <Text style={styles.chronoTime}>{formatDuration(elapsed)}</Text>
                  <Text style={styles.chronoSince}>en cours</Text>
                </View>
                <TouchableOpacity
                  style={[styles.actionBtn, { backgroundColor: allChecked ? APP_COLORS.success : APP_COLORS.border }, finishing && { opacity: 0.7 }]}
                  onPress={() => finishTask(task.id)}
                  disabled={!allChecked || finishing}
                  activeOpacity={0.85}
                >
                  <MaterialCommunityIcons name="check-circle" size={18} color="#FFFFFF" />
                  <Text style={styles.actionBtnLabel}>{finishLabel}</Text>
                </TouchableOpacity>
                {!allChecked && items.length > 0 && (
                  <Text style={styles.finishHint}>Cochez tous les éléments pour terminer ({checkedCount}/{items.length})</Text>
                )}
                {items.length === 0 && (
                  <Text style={styles.finishHint}>Ajoutez des éléments à la checklist ou terminez directement</Text>
                )}
              </View>
            )}

            {task.status === TaskStatus.DONE && (
              <View style={styles.doneBlock}>
                <MaterialCommunityIcons name="check-circle" size={28} color={APP_COLORS.success} />
                <View>
                  <Text style={styles.doneLabel}>Terminée</Text>
                  {completedDurationSec > 0 && <Text style={styles.doneDuration}>Durée : {formatDuration(completedDurationSec)}</Text>}
                </View>
              </View>
            )}
          </View>

          {/* CHECKLIST */}
          <View style={[styles.section, SHADOWS.sm]}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>
                CHECKLIST{items.length > 0 ? ` (${checkedCount}/${items.length})` : ''}
              </Text>
              {hasTemplates && itemsEmpty && (
                <TouchableOpacity style={styles.templateBtn} onPress={handleApplyTemplate} disabled={applyingTemplate}>
                  <MaterialCommunityIcons name="content-copy" size={13} color={typeConf.color} />
                  <Text style={[styles.templateBtnLabel, { color: typeConf.color }]}>
                    {applyingTemplate ? 'Chargement…' : 'Charger le modèle'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            {items.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={styles.checkItem}
                onPress={() => task.status !== TaskStatus.PENDING && toggleItem({ itemId: item.id, isChecked: !item.is_checked })}
                onLongPress={() => handleDeleteItem(item.id, item.label)}
                activeOpacity={0.7}
              >
                <MaterialCommunityIcons
                  name={item.is_checked ? 'checkbox-marked' : 'checkbox-blank-outline'}
                  size={22}
                  color={item.is_checked ? APP_COLORS.success : APP_COLORS.textSecondary}
                />
                <Text style={[styles.checkLabel, item.is_checked && styles.checkLabelDone]}>{item.label}</Text>
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
                  <MaterialCommunityIcons name="check" size={22} color={newItemLabel.trim() ? APP_COLORS.primary : APP_COLORS.border} />
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
          </View>

          {/* MODÈLE */}
          <View style={[styles.section, SHADOWS.sm]}>
            <TouchableOpacity style={styles.sectionHeader} onPress={() => setShowTemplates((v) => !v)}>
              <Text style={styles.sectionTitle}>
                MODÈLE DE CHECKLIST{hasTemplates ? ` (${templates!.length})` : ''}
              </Text>
              <MaterialCommunityIcons name={showTemplates ? 'chevron-up' : 'chevron-down'} size={20} color={APP_COLORS.textSecondary} />
            </TouchableOpacity>

            {showTemplates && (
              <View style={{ gap: 4 }}>
                <Text style={styles.templateHint}>
                  Ce modèle sera utilisé pour pré-remplir la checklist lors de la création d'une tâche pour ce logement.
                </Text>
                {(templates ?? []).map((t) => (
                  <View key={t.id} style={styles.templateItem}>
                    <MaterialCommunityIcons name="drag" size={16} color={APP_COLORS.border} />
                    <Text style={styles.templateItemLabel}>{t.label}</Text>
                    <TouchableOpacity onPress={() => handleRemoveTemplate(t.id)}>
                      <MaterialCommunityIcons name="close-circle-outline" size={18} color={APP_COLORS.textSecondary} />
                    </TouchableOpacity>
                  </View>
                ))}
                <View style={styles.addItemRow}>
                  <RNTextInput style={styles.addItemInput} placeholder="Ajouter au modèle…" value={newTemplateLabel} onChangeText={setNewTemplateLabel} onSubmitEditing={handleAddTemplate} returnKeyType="done" />
                  <TouchableOpacity onPress={handleAddTemplate}>
                    <MaterialCommunityIcons name="plus-circle" size={22} color={newTemplateLabel.trim() ? APP_COLORS.primary : APP_COLORS.border} />
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>

          {/* LINGE (si résa liée) */}
          {linkedReservation?.linen_calculation && (
            <View style={{ paddingHorizontal: 16, marginTop: 4 }}>
              <LinenPreviewCard linen={linkedReservation.linen_calculation} title="Linge pour cette réservation" />
            </View>
          )}

          {/* NOTES */}
          {task.notes ? (
            <View style={[styles.section, SHADOWS.sm]}>
              <Text style={styles.sectionTitle}>NOTES</Text>
              <Text style={styles.notesText}>{task.notes}</Text>
            </View>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: APP_COLORS.primaryDark },
  header: { paddingHorizontal: 20, paddingTop: 18, paddingBottom: 18, flexDirection: 'row', alignItems: 'center', gap: 12 },
  backBtn: { padding: 2 },
  title: { fontSize: 18, fontFamily: FONTS.titleBold, color: APP_COLORS.accent, letterSpacing: 0.6 },
  subtitle: { fontSize: 12, color: 'rgba(248,245,239,0.65)', marginTop: 2 },
  deleteBtn: {
    width: 34,
    height: 34,
    borderRadius: RADII.sm,
    backgroundColor: 'rgba(248,245,239,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(248,245,239,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scroll: { flex: 1, backgroundColor: APP_COLORS.background },
  scrollContent: { paddingBottom: 40 },

  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 12, flexWrap: 'wrap' },
  typeChip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: RADII.full },
  typeChipLabel: { fontSize: 12, fontWeight: '600' },
  propBadge: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  propDot: { width: 8, height: 8, borderRadius: 4 },
  propName: { fontSize: 12, color: APP_COLORS.textSecondary },
  dateText: { fontSize: 12, color: APP_COLORS.textSecondary },

  section: { marginHorizontal: 16, marginTop: 10, borderRadius: RADII.md, backgroundColor: APP_COLORS.surfaceElevated, padding: 16, gap: 12 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionTitle: { fontSize: 11, fontWeight: '700', color: APP_COLORS.textSecondary, letterSpacing: 0.8 },

  actionBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: RADII.sm, paddingVertical: 13 },
  actionBtnLabel: { fontSize: 15, fontWeight: '700', color: '#FFFFFF' },

  chronoRunning: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 4 },
  chronoDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: APP_COLORS.warning },
  chronoTime: { fontSize: 28, fontFamily: FONTS.titleBold, color: APP_COLORS.textPrimary, letterSpacing: 1 },
  chronoSince: { fontSize: 13, color: APP_COLORS.textSecondary },
  finishHint: { fontSize: 12, color: APP_COLORS.textSecondary, textAlign: 'center' },

  doneBlock: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 4 },
  doneLabel: { fontSize: 16, fontWeight: '700', color: APP_COLORS.success },
  doneDuration: { fontSize: 13, color: APP_COLORS.textSecondary, marginTop: 2 },

  checkItem: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: APP_COLORS.borderLight },
  checkLabel: { flex: 1, fontSize: 15, color: APP_COLORS.textPrimary },
  checkLabelDone: { textDecorationLine: 'line-through', color: APP_COLORS.textTertiary },
  emptyChecklist: { fontSize: 13, color: APP_COLORS.textTertiary, textAlign: 'center', paddingVertical: 8 },
  addItemRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4, paddingTop: 10, borderTopWidth: 1, borderTopColor: APP_COLORS.borderLight },
  addItemInput: { flex: 1, fontSize: 14, color: APP_COLORS.textPrimary, borderBottomWidth: 1, borderBottomColor: APP_COLORS.border, paddingVertical: 4 },
  addItemBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingTop: 8 },
  addItemBtnLabel: { fontSize: 14, color: APP_COLORS.primary, fontWeight: '600' },

  templateBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  templateBtnLabel: { fontSize: 12, fontWeight: '600' },
  templateHint: { fontSize: 12, color: APP_COLORS.textSecondary, marginBottom: 4, lineHeight: 16 },
  templateItem: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: APP_COLORS.borderLight },
  templateItemLabel: { flex: 1, fontSize: 14, color: APP_COLORS.textPrimary },

  notesText: { fontSize: 14, color: APP_COLORS.textPrimary, lineHeight: 20 },
});
