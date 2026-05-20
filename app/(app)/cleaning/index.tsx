import { useState, useEffect, useMemo } from 'react';
import { View, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { Text, ActivityIndicator } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import { APP_COLORS } from '@/constants/colors';
import { SHADOWS, GRADIENTS, RADII } from '@/constants/theme';
import { FONTS } from '@/constants/typography';
import { useReservations } from '@/hooks/useReservations';
import { useActiveProperties } from '@/hooks/useProperties';
import { computeCleaningPlan, groupTasksByDate, CleaningTask, CleaningPriority } from '@/services/cleaningPlanner';
import { getCleaningPrefs } from '@/services/cleaningPrefs';

const HORIZON = '2026-10-30';

const PRIORITY_CONFIG: Record<CleaningPriority, { label: string; color: string; bg: string }> = {
  critique:   { label: 'Critique',    color: '#DC2626', bg: '#FEF2F2' },
  recommande: { label: 'Recommandé',  color: '#D97706', bg: '#FFFBEB' },
  flexible:   { label: 'Flexible',    color: '#059669', bg: '#F0FDF4' },
};

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h${String(m).padStart(2, '0')}` : `${h}h`;
}

function formatDayMinutes(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}min`;
  return m > 0 ? `${h}h${String(m).padStart(2, '0')}` : `${h}h`;
}

function LoadBar({ count, max, totalMinutes }: { count: number; max: number; totalMinutes: number }) {
  const overCount = count > max;
  const overTime = totalMinutes > 240;
  return (
    <View style={lb.row}>
      <Text style={[lb.timeLabel, (overCount || overTime) && lb.timeLabelWarn]}>
        {formatDayMinutes(totalMinutes)}
      </Text>
      {Array.from({ length: Math.max(count, max) }).map((_, i) => (
        <View
          key={i}
          style={[lb.dot, { backgroundColor: i < count ? (overCount ? '#DC2626' : APP_COLORS.primary) : APP_COLORS.borderLight }]}
        />
      ))}
    </View>
  );
}
const lb = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  timeLabel: { fontSize: 11, color: APP_COLORS.textSecondary, marginRight: 4 },
  timeLabelWarn: { color: '#DC2626', fontWeight: '700' },
});

function TaskCard({ task, onPress }: { task: CleaningTask; onPress: () => void }) {
  const cfg = PRIORITY_CONFIG[task.priority];
  const today = new Date().toISOString().slice(0, 10);
  const isPast = !task.isOverdue && task.suggestedDate < today;

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={task.depReservationId ? 0.75 : 1}>
      <View style={[card.container, SHADOWS.sm, isPast && card.past, task.isOverdue && card.overdue]}>
        <View style={[card.strip, { backgroundColor: task.property.color }]} />
        <View style={card.body}>
          <View style={card.topRow}>
            <Text style={card.propName} numberOfLines={1}>{task.property.name}</Text>
            {task.isOverdue && (
              <View style={card.overdueTag}>
                <Text style={card.overdueTagText}>EN RETARD</Text>
              </View>
            )}
            <View style={[card.badge, { backgroundColor: cfg.bg }]}>
              <Text style={[card.badgeText, { color: cfg.color }]}>{cfg.label}</Text>
            </View>
          </View>

          <View style={card.midRow}>
            <MaterialCommunityIcons name="clock-outline" size={12} color={APP_COLORS.textTertiary} />
            <Text style={card.meta}>{task.suggestedStartTime} – {task.suggestedEndTime}</Text>
            <View style={card.pill}>
              <Text style={card.pillText}>{formatDuration(task.estimatedMinutes)}</Text>
            </View>
            {task.guestCount > 0 && (
              <View style={card.guestPill}>
                <MaterialCommunityIcons name="account-group" size={10} color={APP_COLORS.textTertiary} />
                <Text style={card.meta}>{task.guestCount} pers.</Text>
              </View>
            )}
          </View>

          <View style={card.bottomRow}>
            <Text style={[card.reason, { color: task.isOverdue ? '#DC2626' : cfg.color }]}>{task.reason}</Text>
            {task.nextCheckIn && (
              <>
                <Text style={card.sep}>·</Text>
                <Text style={card.meta}>arrivée {format(parseISO(task.nextCheckIn), 'd MMM', { locale: fr })}</Text>
              </>
            )}
          </View>
        </View>
        {task.depReservationId ? <MaterialCommunityIcons name="chevron-right" size={16} color={APP_COLORS.border} /> : null}
      </View>
    </TouchableOpacity>
  );
}

const card = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: APP_COLORS.surfaceElevated,
    borderRadius: RADII.md,
    overflow: 'hidden',
    marginBottom: 8,
  },
  past: { opacity: 0.45 },
  overdue: { borderWidth: 1.5, borderColor: '#FECACA' },
  overdueTag: { backgroundColor: '#DC2626', borderRadius: RADII.xs, paddingHorizontal: 5, paddingVertical: 2 },
  overdueTagText: { fontSize: 9, fontWeight: '800', color: '#FFFFFF', letterSpacing: 0.5 },
  strip: { width: 5, alignSelf: 'stretch' },
  body: { flex: 1, paddingHorizontal: 12, paddingVertical: 11, gap: 4 },
  topRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  propName: { flex: 1, fontSize: 14, fontWeight: '700', color: APP_COLORS.textPrimary },
  badge: { borderRadius: RADII.xs, paddingHorizontal: 8, paddingVertical: 3 },
  badgeText: { fontSize: 11, fontWeight: '700' },
  midRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  meta: { fontSize: 11, color: APP_COLORS.textSecondary },
  pill: { backgroundColor: APP_COLORS.primaryPale, borderRadius: RADII.xs, paddingHorizontal: 6, paddingVertical: 2 },
  pillText: { fontSize: 10, fontWeight: '700', color: APP_COLORS.primary },
  guestPill: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  bottomRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  reason: { fontSize: 11, fontWeight: '600' },
  sep: { fontSize: 11, color: APP_COLORS.border },
});

function HelpBanner({ taskCount, arrivalsOnDay, departuresOnDay, totalMinutes }: {
  taskCount: number; arrivalsOnDay: number; departuresOnDay: number; totalMinutes: number;
}) {
  const hard = taskCount > 3;
  const soft = taskCount >= 3 && arrivalsOnDay + departuresOnDay >= 2;
  if (!hard && !soft) return null;
  const color = hard ? '#DC2626' : '#D97706';
  const bg = hard ? '#FEF2F2' : '#FFFBEB';
  const border = hard ? '#FECACA' : '#FDE68A';
  const detail = hard
    ? `${taskCount} ménages · ${formatDayMinutes(totalMinutes)}`
    : `${taskCount} ménages + ${arrivalsOnDay} arrivée(s) · ${formatDayMinutes(totalMinutes)}`;
  return (
    <View style={[help.container, { backgroundColor: bg, borderColor: border }]}>
      <MaterialCommunityIcons name="account-plus" size={16} color={color} />
      <Text style={[help.text, { color }]}>{hard ? 'Aide nécessaire' : 'Aide recommandée'} · {detail}</Text>
    </View>
  );
}
const help = StyleSheet.create({
  container: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: RADII.sm, paddingHorizontal: 12, paddingVertical: 7, marginBottom: 8, borderWidth: 1 },
  text: { fontSize: 12, fontWeight: '600', flex: 1 },
});

export default function CleaningPlannerScreen() {
  const router = useRouter();
  const [maxPerDay, setMaxPerDay] = useState(2);

  useEffect(() => {
    getCleaningPrefs().then((p) => setMaxPerDay(p.maxPerDay));
  }, []);

  const { data: reservations, isLoading: resLoading } = useReservations();
  const { data: properties, isLoading: propLoading } = useActiveProperties();

  const tasks = useMemo(() => {
    if (!reservations || !properties) return [];
    return computeCleaningPlan(reservations, properties, maxPerDay, HORIZON);
  }, [reservations, properties, maxPerDay]);

  const grouped = useMemo(() => groupTasksByDate(tasks), [tasks]);
  const sortedDates = useMemo(() => Array.from(grouped.keys()).sort(), [grouped]);

  const today = new Date().toISOString().slice(0, 10);
  const totalPending = tasks.length;
  const critiques = tasks.filter((t) => t.priority === 'critique').length;
  const totalHours = Math.round(tasks.reduce((acc, t) => acc + t.estimatedMinutes, 0) / 60);
  const daysWithHelp = new Set(tasks.filter((t) => t.helpNeeded).map((t) => t.suggestedDate)).size;

  const isLoading = resLoading || propLoading;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <LinearGradient
        colors={GRADIENTS.navyHeader as [string, string, ...string[]]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <MaterialCommunityIcons name="arrow-left" size={22} color="rgba(248,245,239,0.8)" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Planning ménage</Text>
          <Text style={styles.subtitle}>Jusqu'au 30 oct. 2026</Text>
        </View>
        <TouchableOpacity onPress={() => router.push('/(app)/settings')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <MaterialCommunityIcons name="cog-outline" size={22} color="rgba(248,245,239,0.7)" />
        </TouchableOpacity>
      </LinearGradient>

      {isLoading ? (
        <ActivityIndicator style={{ marginTop: 60 }} color={APP_COLORS.primary} />
      ) : (
        <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
          {/* Summary pills */}
          <View style={styles.summaryRow}>
            <View style={[styles.summaryPill, { backgroundColor: '#EDE9FE' }]}>
              <MaterialCommunityIcons name="broom" size={13} color="#8B5CF6" />
              <Text style={[styles.summaryText, { color: '#8B5CF6' }]}>{totalPending} ménage{totalPending !== 1 ? 's' : ''}</Text>
            </View>
            <View style={[styles.summaryPill, { backgroundColor: APP_COLORS.primaryPale }]}>
              <MaterialCommunityIcons name="clock-outline" size={13} color={APP_COLORS.primary} />
              <Text style={[styles.summaryText, { color: APP_COLORS.primary }]}>~{totalHours}h</Text>
            </View>
            {critiques > 0 && (
              <View style={[styles.summaryPill, { backgroundColor: '#FEF2F2' }]}>
                <MaterialCommunityIcons name="alert-circle" size={13} color="#DC2626" />
                <Text style={[styles.summaryText, { color: '#DC2626' }]}>{critiques} critique{critiques !== 1 ? 's' : ''}</Text>
              </View>
            )}
            {daysWithHelp > 0 && (
              <View style={[styles.summaryPill, { backgroundColor: '#F3E8FF' }]}>
                <MaterialCommunityIcons name="account-plus" size={13} color="#7C3AED" />
                <Text style={[styles.summaryText, { color: '#7C3AED' }]}>{daysWithHelp}j chargé{daysWithHelp !== 1 ? 's' : ''}</Text>
              </View>
            )}
          </View>

          {/* Capacity info */}
          <View style={styles.capacityInfo}>
            <MaterialCommunityIcons name="information-outline" size={13} color={APP_COLORS.textTertiary} />
            <Text style={styles.capacityText}>
              Capacité : {maxPerDay} ménage{maxPerDay !== 1 ? 's' : ''}/jour · Planifiés au plus tôt après le départ
            </Text>
          </View>

          {sortedDates.length === 0 ? (
            <View style={styles.empty}>
              <MaterialCommunityIcons name="check-circle-outline" size={48} color={APP_COLORS.success} />
              <Text style={styles.emptyTitle}>Tout est planifié !</Text>
              <Text style={styles.emptyText}>Aucun ménage à prévoir pour le moment.</Text>
            </View>
          ) : (
            <View style={styles.timeline}>
              {sortedDates.map((date) => {
                const dayTasks = grouped.get(date)!;
                const load = dayTasks.length;
                const overload = load > maxPerDay;
                const dayMinutes = dayTasks.reduce((acc, t) => acc + t.estimatedMinutes, 0);
                const arrivalsOnDay = dayTasks[0]?.arrivalsOnDay ?? 0;
                const departuresOnDay = dayTasks[0]?.departuresOnDay ?? 0;
                const needsHelp = dayTasks.some((t) => t.helpNeeded);
                const isToday = date === today;
                const isPast = date < today;

                return (
                  <View key={date} style={styles.daySection}>
                    <View style={[styles.dayHeader, overload && styles.dayHeaderOverload, isToday && styles.dayHeaderToday]}>
                      <View style={styles.dayHeaderLeft}>
                        <Text style={[styles.dayName, isToday && styles.dayNameToday, isPast && styles.dayPast]}>
                          {isToday ? "Aujourd'hui" : format(parseISO(date), 'EEEE d MMMM', { locale: fr })}
                        </Text>
                        {overload && (
                          <View style={styles.overloadBadge}>
                            <MaterialCommunityIcons name="alert" size={10} color="#DC2626" />
                            <Text style={styles.overloadText}>Surcharge</Text>
                          </View>
                        )}
                      </View>
                      <LoadBar count={load} max={maxPerDay} totalMinutes={dayMinutes} />
                    </View>

                    {needsHelp && (
                      <HelpBanner taskCount={load} arrivalsOnDay={arrivalsOnDay} departuresOnDay={departuresOnDay} totalMinutes={dayMinutes} />
                    )}

                    {dayTasks.map((task, i) => (
                      <TaskCard
                        key={task.depReservationId || `${task.property.id}-${i}`}
                        task={task}
                        onPress={() => { if (task.depReservationId) router.push(`/(app)/reservations/${task.depReservationId}` as any); }}
                      />
                    ))}
                  </View>
                );
              })}
            </View>
          )}

          <View style={{ height: 32 }} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: APP_COLORS.background },
  header: { paddingHorizontal: 20, paddingTop: 18, paddingBottom: 18, flexDirection: 'row', alignItems: 'center', gap: 12 },
  backBtn: { padding: 2 },
  title: { fontSize: 22, fontFamily: FONTS.titleBold, color: APP_COLORS.accent, letterSpacing: 1 },
  subtitle: { fontSize: 11, color: 'rgba(248,245,239,0.65)', marginTop: 2 },
  scroll: { flex: 1, backgroundColor: APP_COLORS.background },
  summaryRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 16, paddingTop: 16, paddingBottom: 4 },
  summaryPill: { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: RADII.full, paddingHorizontal: 12, paddingVertical: 6 },
  summaryText: { fontSize: 12, fontWeight: '700' },
  capacityInfo: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, paddingVertical: 8, marginBottom: 4 },
  capacityText: { fontSize: 11, color: APP_COLORS.textTertiary, flex: 1, lineHeight: 16 },
  timeline: { paddingHorizontal: 16, paddingTop: 8 },
  daySection: { marginBottom: 22 },
  dayHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, paddingBottom: 7, borderBottomWidth: 1, borderBottomColor: APP_COLORS.borderLight },
  dayHeaderOverload: { borderBottomColor: '#FECACA' },
  dayHeaderToday: { borderBottomColor: APP_COLORS.accent },
  dayHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dayName: { fontSize: 13, fontWeight: '700', color: APP_COLORS.textPrimary, textTransform: 'capitalize' },
  dayNameToday: { color: APP_COLORS.primary },
  dayPast: { color: APP_COLORS.textTertiary },
  overloadBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: '#FEF2F2', borderRadius: RADII.xs, paddingHorizontal: 6, paddingVertical: 2 },
  overloadText: { fontSize: 10, color: '#DC2626', fontWeight: '700' },
  empty: { alignItems: 'center', paddingTop: 80, gap: 12, paddingHorizontal: 40 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: APP_COLORS.textPrimary },
  emptyText: { fontSize: 13, color: APP_COLORS.textSecondary, textAlign: 'center' },
});
