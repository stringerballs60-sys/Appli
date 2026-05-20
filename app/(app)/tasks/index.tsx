import { useState } from 'react';
import { FlatList, View, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Text, ActivityIndicator } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTasks } from '@/hooks/useTasks';
import { useActiveProperties } from '@/hooks/useProperties';
import { EmptyState } from '@/components/ui/EmptyState';
import { APP_COLORS } from '@/constants/colors';
import { SHADOWS, GRADIENTS, RADII } from '@/constants/theme';
import { FONTS } from '@/constants/typography';
import { Task, TaskStatus, TaskType } from '@/types';
import { formatDate } from '@/utils/dateHelpers';

type Tab = 'today' | 'upcoming' | 'done';

const TASK_TYPE_CONFIG: Record<TaskType, { icon: string; color: string; label: string }> = {
  [TaskType.CLEANING]:     { icon: 'broom',                    color: '#7C3AED', label: 'Ménage' },
  [TaskType.MAINTENANCE]:  { icon: 'wrench',                   color: '#EA580C', label: 'Maintenance' },
  [TaskType.RESTOCK]:      { icon: 'cart-plus',                color: '#0891B2', label: 'Réappro.' },
};

const STATUS_CONFIG: Record<TaskStatus, { color: string; label: string }> = {
  [TaskStatus.PENDING]:    { color: APP_COLORS.textTertiary, label: 'À faire' },
  [TaskStatus.IN_PROGRESS]:{ color: APP_COLORS.warning,      label: 'En cours' },
  [TaskStatus.PAUSED]:     { color: APP_COLORS.primary,      label: 'En pause' },
  [TaskStatus.DONE]:       { color: APP_COLORS.success,       label: 'Terminée' },
};

function TaskCard({ task, onPress }: { task: Task; onPress: () => void }) {
  const typeConf = TASK_TYPE_CONFIG[task.type];
  const statusConf = STATUS_CONFIG[task.status];
  const items = task.checklist_items ?? [];
  const checkedCount = items.filter((i) => i.is_checked).length;

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.75}>
      <View style={[styles.card, SHADOWS.sm]}>
        <View style={[styles.cardAccent, { backgroundColor: typeConf.color }]} />
        <View style={styles.cardBody}>
          <View style={styles.cardTop}>
            <View style={[styles.typeIcon, { backgroundColor: typeConf.color + '15' }]}>
              <MaterialCommunityIcons name={typeConf.icon as any} size={17} color={typeConf.color} />
            </View>
            <View style={styles.cardInfo}>
              <Text style={styles.cardTitle} numberOfLines={1}>{task.title}</Text>
              <View style={styles.cardMeta}>
                {task.property && (
                  <View style={styles.propBadge}>
                    <View style={[styles.propDot, { backgroundColor: task.property.color }]} />
                    <Text style={styles.propName}>{task.property.name}</Text>
                  </View>
                )}
                <Text style={styles.cardDate}>{formatDate(task.scheduled_date)}</Text>
              </View>
            </View>
            <View style={[styles.statusPill, { backgroundColor: statusConf.color + '15' }]}>
              <Text style={[styles.statusText, { color: statusConf.color }]}>{statusConf.label}</Text>
            </View>
          </View>

          {items.length > 0 && (
            <View style={styles.progressRow}>
              <View style={styles.progressTrack}>
                <View
                  style={[styles.progressFill, {
                    width: `${(checkedCount / items.length) * 100}%` as any,
                    backgroundColor: checkedCount === items.length ? APP_COLORS.success : typeConf.color,
                  }]}
                />
              </View>
              <Text style={styles.progressLabel}>{checkedCount}/{items.length}</Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

export default function TasksScreen() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('today');
  const [propertyId, setPropertyId] = useState<string | null>(null);

  const { data: properties } = useActiveProperties();
  const { data: tasks, isLoading } = useTasks({ tab, propertyId: propertyId ?? undefined });

  const tabLabel: Record<Tab, string> = { today: "Aujourd'hui", upcoming: 'À venir', done: 'Terminées' };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <LinearGradient
        colors={GRADIENTS.navyHeader as [string, string, ...string[]]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.title}>Tâches</Text>
            <Text style={styles.subtitle}>{tasks?.length ?? 0} tâche{(tasks?.length ?? 0) !== 1 ? 's' : ''}</Text>
          </View>
          <TouchableOpacity style={styles.addBtn} onPress={() => router.push('/(app)/tasks/new' as any)} activeOpacity={0.8}>
            <MaterialCommunityIcons name="plus" size={21} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        <View style={styles.tabs}>
          {(['today', 'upcoming', 'done'] as Tab[]).map((t) => (
            <TouchableOpacity key={t} style={[styles.tab, tab === t && styles.tabActive]} onPress={() => setTab(t)}>
              <Text style={[styles.tabLabel, tab === t && styles.tabLabelActive]}>{tabLabel[t]}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </LinearGradient>

      {properties && properties.length > 1 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterBar} contentContainerStyle={styles.filterContent}>
          <TouchableOpacity style={[styles.chip, !propertyId && styles.chipActive]} onPress={() => setPropertyId(null)}>
            <Text style={[styles.chipText, !propertyId && styles.chipTextActive]}>Tous</Text>
          </TouchableOpacity>
          {properties.map((p) => (
            <TouchableOpacity
              key={p.id}
              style={[styles.chip, propertyId === p.id && { backgroundColor: p.color, borderColor: p.color }]}
              onPress={() => setPropertyId(propertyId === p.id ? null : p.id)}
            >
              <View style={[styles.chipDot, { backgroundColor: propertyId === p.id ? '#FFF' : p.color }]} />
              <Text style={[styles.chipText, propertyId === p.id && styles.chipTextActive]} numberOfLines={1}>{p.name}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {isLoading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={APP_COLORS.primary} />
      ) : (
        <FlatList
          data={tasks ?? []}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TaskCard task={item} onPress={() => router.push(`/(app)/tasks/${item.id}` as any)} />
          )}
          ListEmptyComponent={
            <EmptyState
              icon="checkbox-marked-circle-outline"
              title="Aucune tâche"
              subtitle={tab === 'today' ? "Pas de tâche aujourd'hui" : tab === 'upcoming' ? 'Aucune tâche à venir' : 'Aucune tâche terminée'}
            />
          }
          contentContainerStyle={(tasks?.length ?? 0) === 0 ? { flex: 1 } : { paddingTop: 8, paddingBottom: 32 }}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: APP_COLORS.primaryDark },
  header: { paddingHorizontal: 20, paddingTop: 18, paddingBottom: 0 },
  headerTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  title: { fontSize: 24, fontFamily: FONTS.titleBold, color: APP_COLORS.accent, letterSpacing: 1 },
  subtitle: { fontSize: 12, color: 'rgba(248,245,239,0.65)', marginTop: 2 },
  addBtn: {
    width: 38,
    height: 38,
    borderRadius: RADII.sm,
    backgroundColor: 'rgba(248,245,239,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(248,245,239,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabs: { flexDirection: 'row' },
  tab: { flex: 1, paddingVertical: 11, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabActive: { borderBottomColor: APP_COLORS.accent },
  tabLabel: { fontSize: 13, color: 'rgba(248,245,239,0.55)', fontWeight: '500' },
  tabLabelActive: { color: APP_COLORS.accent, fontWeight: '700' },

  filterBar: { flexShrink: 0, flexGrow: 0, backgroundColor: APP_COLORS.surfaceElevated, borderBottomWidth: 1, borderBottomColor: APP_COLORS.borderLight },
  filterContent: { paddingHorizontal: 12, paddingVertical: 9, gap: 7, alignItems: 'center' },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: RADII.full,
    borderWidth: 1,
    borderColor: APP_COLORS.border,
    backgroundColor: APP_COLORS.background,
  },
  chipActive: { backgroundColor: APP_COLORS.primary, borderColor: APP_COLORS.primary },
  chipDot: { width: 6, height: 6, borderRadius: 3 },
  chipText: { fontSize: 12, fontWeight: '500', color: APP_COLORS.textSecondary },
  chipTextActive: { color: '#FFFFFF', fontWeight: '700' },

  card: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginTop: 10,
    borderRadius: RADII.md,
    backgroundColor: APP_COLORS.surfaceElevated,
    overflow: 'hidden',
  },
  cardAccent: { width: 4, flexShrink: 0 },
  cardBody: { flex: 1, padding: 13 },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  typeIcon: { width: 36, height: 36, borderRadius: RADII.xs, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  cardInfo: { flex: 1 },
  cardTitle: { fontSize: 14, fontWeight: '700', color: APP_COLORS.textPrimary, marginBottom: 4 },
  cardMeta: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  propBadge: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  propDot: { width: 7, height: 7, borderRadius: 4 },
  propName: { fontSize: 11, color: APP_COLORS.textSecondary },
  cardDate: { fontSize: 11, color: APP_COLORS.textTertiary },
  statusPill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: RADII.full, flexShrink: 0 },
  statusText: { fontSize: 10, fontWeight: '700' },
  progressRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 9 },
  progressTrack: { flex: 1, height: 3, backgroundColor: APP_COLORS.borderLight, borderRadius: 2, overflow: 'hidden' },
  progressFill: { height: 3, borderRadius: 2 },
  progressLabel: { fontSize: 10, color: APP_COLORS.textTertiary, minWidth: 26 },
});
