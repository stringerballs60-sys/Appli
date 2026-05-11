import { useState } from 'react';
import { FlatList, View, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Text, ActivityIndicator, Chip, Surface } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTasks } from '@/hooks/useTasks';
import { useActiveProperties } from '@/hooks/useProperties';
import { EmptyState } from '@/components/ui/EmptyState';
import { APP_COLORS } from '@/constants/colors';
import { FONTS } from '@/constants/typography';
import { Task, TaskStatus, TaskType } from '@/types';
import { formatDate } from '@/utils/dateHelpers';

type Tab = 'today' | 'upcoming' | 'done';

const TASK_TYPE_CONFIG: Record<TaskType, { icon: string; color: string; label: string }> = {
  [TaskType.CLEANING]: { icon: 'broom', color: '#7C3AED', label: 'Ménage' },
  [TaskType.MAINTENANCE]: { icon: 'wrench', color: '#EA580C', label: 'Maintenance' },
  [TaskType.RESTOCK]: { icon: 'cart-plus', color: '#0891B2', label: 'Réappro.' },
};

const STATUS_CONFIG: Record<TaskStatus, { color: string; label: string }> = {
  [TaskStatus.PENDING]: { color: APP_COLORS.textSecondary, label: 'À faire' },
  [TaskStatus.IN_PROGRESS]: { color: APP_COLORS.warning, label: 'En cours' },
  [TaskStatus.DONE]: { color: APP_COLORS.success, label: 'Terminée' },
};

function TaskCard({ task, onPress }: { task: Task; onPress: () => void }) {
  const typeConf = TASK_TYPE_CONFIG[task.type];
  const statusConf = STATUS_CONFIG[task.status];
  const items = task.checklist_items ?? [];
  const checkedCount = items.filter((i) => i.is_checked).length;
  const hasItems = items.length > 0;

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
      <Surface style={styles.card} elevation={1}>
        <View style={[styles.cardAccent, { backgroundColor: typeConf.color }]} />
        <View style={styles.cardContent}>
          <View style={styles.cardTop}>
            <View style={[styles.typeIcon, { backgroundColor: typeConf.color + '18' }]}>
              <MaterialCommunityIcons name={typeConf.icon as any} size={18} color={typeConf.color} />
            </View>
            <View style={styles.cardInfo}>
              <Text style={styles.cardTitle} numberOfLines={1}>{task.title}</Text>
              <View style={styles.cardMeta}>
                {task.property && (
                  <View style={styles.propertyBadge}>
                    <View style={[styles.propertyDot, { backgroundColor: task.property.color }]} />
                    <Text style={styles.propertyName}>{task.property.name}</Text>
                  </View>
                )}
                <Text style={styles.cardDate}>{formatDate(task.scheduled_date)}</Text>
              </View>
            </View>
            <View style={[styles.statusPill, { backgroundColor: statusConf.color + '18' }]}>
              <Text style={[styles.statusText, { color: statusConf.color }]}>{statusConf.label}</Text>
            </View>
          </View>

          {hasItems && (
            <View style={styles.progressRow}>
              <View style={styles.progressBar}>
                <View
                  style={[
                    styles.progressFill,
                    {
                      width: `${(checkedCount / items.length) * 100}%` as any,
                      backgroundColor:
                        checkedCount === items.length ? APP_COLORS.success : typeConf.color,
                    },
                  ]}
                />
              </View>
              <Text style={styles.progressLabel}>
                {checkedCount}/{items.length}
              </Text>
            </View>
          )}
        </View>
      </Surface>
    </TouchableOpacity>
  );
}

export default function TasksScreen() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('today');
  const [propertyId, setPropertyId] = useState<string | null>(null);

  const { data: properties } = useActiveProperties();
  const { data: tasks, isLoading } = useTasks({ tab, propertyId: propertyId ?? undefined });

  const tabLabel: Record<Tab, string> = {
    today: "Aujourd'hui",
    upcoming: 'À venir',
    done: 'Terminées',
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.title}>Tâches</Text>
            <Text style={styles.subtitle}>
              {tasks?.length ?? 0} tâche{(tasks?.length ?? 0) !== 1 ? 's' : ''}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => router.push('/(app)/tasks/new' as any)}
          >
            <MaterialCommunityIcons name="plus" size={22} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        <View style={styles.tabs}>
          {(['today', 'upcoming', 'done'] as Tab[]).map((t) => (
            <TouchableOpacity
              key={t}
              style={[styles.tab, tab === t && styles.tabActive]}
              onPress={() => setTab(t)}
            >
              <Text style={[styles.tabLabel, tab === t && styles.tabLabelActive]}>
                {tabLabel[t]}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {properties && properties.length > 1 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filterScroll}
          contentContainerStyle={styles.filterRow}
        >
          <Chip
            selected={!propertyId}
            onPress={() => setPropertyId(null)}
            style={styles.chip}
          >
            Tous
          </Chip>
          {properties.map((p) => (
            <Chip
              key={p.id}
              selected={propertyId === p.id}
              onPress={() => setPropertyId(propertyId === p.id ? null : p.id)}
              style={[styles.chip, { borderColor: p.color }]}
            >
              {p.name}
            </Chip>
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
            <TaskCard
              task={item}
              onPress={() => router.push(`/(app)/tasks/${item.id}` as any)}
            />
          )}
          ListEmptyComponent={
            <EmptyState
              icon="checkbox-marked-circle-outline"
              title="Aucune tâche"
              subtitle={
                tab === 'today'
                  ? "Pas de tâche aujourd'hui"
                  : tab === 'upcoming'
                  ? 'Aucune tâche à venir'
                  : 'Aucune tâche terminée'
              }
            />
          }
          contentContainerStyle={
            (tasks?.length ?? 0) === 0 ? { flex: 1 } : { paddingTop: 8, paddingBottom: 32 }
          }
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: APP_COLORS.background },
  header: {
    backgroundColor: APP_COLORS.primary,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 0,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  title: { fontSize: 22, fontFamily: FONTS.titleBold, color: '#FFFFFF' },
  subtitle: { fontSize: 13, color: 'rgba(255,255,255,0.7)', marginTop: 2 },
  addButton: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabs: {
    flexDirection: 'row',
    gap: 0,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: { borderBottomColor: '#FFFFFF' },
  tabLabel: { fontSize: 13, color: 'rgba(255,255,255,0.6)', fontWeight: '500' },
  tabLabelActive: { color: '#FFFFFF', fontWeight: '700' },
  filterScroll: { flexShrink: 0, flexGrow: 0, backgroundColor: '#FFFFFF' },
  filterRow: { paddingHorizontal: 12, paddingVertical: 10, gap: 8, alignItems: 'center' },
  chip: { borderRadius: 20 },
  card: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginTop: 10,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
  },
  cardAccent: { width: 4, flexShrink: 0 },
  cardContent: { flex: 1, padding: 14 },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  typeIcon: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  cardInfo: { flex: 1 },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: APP_COLORS.textPrimary,
    marginBottom: 4,
  },
  cardMeta: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  propertyBadge: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  propertyDot: { width: 8, height: 8, borderRadius: 4 },
  propertyName: { fontSize: 12, color: APP_COLORS.textSecondary },
  cardDate: { fontSize: 12, color: APP_COLORS.textSecondary },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
    flexShrink: 0,
  },
  statusText: { fontSize: 11, fontWeight: '600' },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
  },
  progressBar: {
    flex: 1,
    height: 4,
    backgroundColor: APP_COLORS.border,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: { height: 4, borderRadius: 2 },
  progressLabel: { fontSize: 11, color: APP_COLORS.textSecondary, minWidth: 28 },
});
