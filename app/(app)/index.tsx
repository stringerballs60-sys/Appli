import { useEffect, useCallback } from 'react';
import { ScrollView, View, StyleSheet, Image, TouchableOpacity, Alert } from 'react-native';
import { Text, Surface, ActivityIndicator } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { supabase } from '@/services/supabase';
import { useAuthStore } from '@/stores/authStore';
import { useTodayActivity, useUpcomingActivity, usePendingCheckInTime, useOccupiedToday } from '@/hooks/useReservations';
import { useLowStockAlerts } from '@/hooks/useInventory';
import { useActiveProperties, useUpdateCleaningStatus } from '@/hooks/useProperties';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { APP_COLORS } from '@/constants/colors';
import { formatDateLong, formatDateShort } from '@/utils/dateHelpers';
import { Reservation, Property } from '@/types';
import { SafeAreaView } from 'react-native-safe-area-context';
import { scheduleUpcomingNotifications, scheduleCleaningAlerts } from '@/services/notifications';

function formatNextIn(date: string, today: string): string {
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().slice(0, 10);
  if (date === today) return "Aujourd'hui";
  if (date === tomorrowStr) return 'Demain';
  return formatDateShort(date);
}

function TodayCard({
  title,
  reservations,
  icon,
  iconColor,
  emptyLabel,
  dateField,
  onPressItem,
}: {
  title: string;
  reservations: Reservation[];
  icon: string;
  iconColor: string;
  emptyLabel: string;
  dateField?: 'check_in' | 'check_out';
  onPressItem?: (r: Reservation) => void;
}) {
  return (
    <Surface style={styles.todayCard} elevation={1}>
      <View style={styles.todayCardHeader}>
        <MaterialCommunityIcons name={icon as any} size={18} color={iconColor} />
        <Text style={[styles.todayCardTitle, { color: iconColor }]}>{title}</Text>
        <View style={[styles.countBadge, { backgroundColor: iconColor }]}>
          <Text style={styles.countText}>{reservations.length}</Text>
        </View>
      </View>
      {reservations.length === 0 ? (
        <Text style={styles.emptyText}>{emptyLabel}</Text>
      ) : (
        reservations.map((r) => (
          <TouchableOpacity
            key={r.id}
            style={styles.todayItem}
            onPress={() => onPressItem?.(r)}
            activeOpacity={onPressItem ? 0.6 : 1}
          >
            {r.property && (
              <View style={[styles.dot, { backgroundColor: r.property.color }]} />
            )}
            <View style={{ flex: 1 }}>
              <Text style={styles.todayGuestName} numberOfLines={1}>{r.guest_name}</Text>
              <Text style={styles.todayPropertyName} numberOfLines={1}>
                {r.property?.name}
                {dateField ? ` · ${formatDateShort(r[dateField])}` : ''}
              </Text>
            </View>
            {onPressItem && (
              <MaterialCommunityIcons name="chevron-right" size={14} color={APP_COLORS.textSecondary} />
            )}
          </TouchableOpacity>
        ))
      )}
    </Surface>
  );
}

function OccupiedCard({
  reservations,
  onPressItem,
}: {
  reservations: Reservation[];
  onPressItem?: (r: Reservation) => void;
}) {
  const seen = new Set<string>();
  const unique = reservations.filter((r) => {
    if (seen.has(r.property_id)) return false;
    seen.add(r.property_id);
    return true;
  });
  return (
    <Surface style={styles.statusCard} elevation={1}>
      <View style={styles.statusCardHeader}>
        <MaterialCommunityIcons name="home-account" size={18} color={APP_COLORS.primary} />
        <Text style={[styles.statusCardTitle, { color: APP_COLORS.primary }]}>Occupés</Text>
        <View style={[styles.countBadge, { backgroundColor: APP_COLORS.primary }]}>
          <Text style={styles.countText}>{unique.length}</Text>
        </View>
      </View>
      {unique.length === 0 ? (
        <Text style={styles.emptyText}>Aucun logement occupé</Text>
      ) : (
        unique.map((r) => (
          <TouchableOpacity
            key={r.id}
            style={styles.statusItem}
            onPress={() => onPressItem?.(r)}
            activeOpacity={0.6}
          >
            {r.property && <View style={[styles.dot, { backgroundColor: r.property.color }]} />}
            <Text style={styles.statusItemText} numberOfLines={1}>{r.property?.name}</Text>
            <MaterialCommunityIcons name="chevron-right" size={14} color={APP_COLORS.textSecondary} />
          </TouchableOpacity>
        ))
      )}
    </Surface>
  );
}

function TurnoverCard({
  allDepartures,
  allArrivals,
  today,
  onPressItem,
}: {
  allDepartures: Reservation[];
  allArrivals: Reservation[];
  today: string;
  onPressItem?: (r: Reservation) => void;
}) {
  const seen = new Set<string>();
  const turnovers = allDepartures
    .filter((dep) => allArrivals.some((arr) => arr.property_id === dep.property_id && arr.check_in === dep.check_out))
    .filter((dep) => {
      const key = `${dep.property_id}-${dep.check_out}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((a, b) => a.check_out.localeCompare(b.check_out));

  return (
    <Surface style={styles.statusCard} elevation={1}>
      <View style={styles.statusCardHeader}>
        <MaterialCommunityIcons name="swap-horizontal" size={18} color={APP_COLORS.warning} />
        <Text style={[styles.statusCardTitle, { color: APP_COLORS.warning }]}>Turn-over</Text>
        <View style={[styles.countBadge, { backgroundColor: APP_COLORS.warning }]}>
          <Text style={styles.countText}>{turnovers.length}</Text>
        </View>
      </View>
      {turnovers.length === 0 ? (
        <Text style={styles.emptyText}>Aucun turn-over</Text>
      ) : (
        turnovers.map((r) => (
          <TouchableOpacity
            key={r.id}
            style={styles.statusItem}
            onPress={() => onPressItem?.(r)}
            activeOpacity={0.6}
          >
            {r.property && <View style={[styles.dot, { backgroundColor: r.property.color }]} />}
            <View style={{ flex: 1 }}>
              <Text style={styles.statusItemText} numberOfLines={1}>{r.property?.name}</Text>
              {r.check_out !== today && (
                <Text style={styles.todayPropertyName}>{formatNextIn(r.check_out, today)}</Text>
              )}
            </View>
            <MaterialCommunityIcons name="chevron-right" size={14} color={APP_COLORS.textSecondary} />
          </TouchableOpacity>
        ))
      )}
    </Surface>
  );
}

function CleaningStatusCard({
  properties,
  today,
  allArrivals,
  onToggle,
}: {
  properties: Property[];
  today: string;
  allArrivals: Reservation[];
  onToggle: (property: Property) => void;
}) {
  const in4days = new Date(today);
  in4days.setDate(in4days.getDate() + 4);
  const in3daysStr = in4days.toISOString().slice(0, 10);

  const active = properties
    .filter((p) => p.is_active)
    .map((p) => {
      const nextArrival = allArrivals
        .filter((r) => r.property_id === p.id)
        .sort((a, b) => a.check_in.localeCompare(b.check_in))[0];
      const urgent = p.cleaning_status === 'to_do' && !!nextArrival && nextArrival.check_in <= in3daysStr;
      return { property: p, nextArrival, urgent };
    })
    .sort((a, b) => {
      if (a.nextArrival && b.nextArrival) {
        return a.nextArrival.check_in.localeCompare(b.nextArrival.check_in);
      }
      if (a.nextArrival) return -1;
      if (b.nextArrival) return 1;
      return 0;
    });

  return (
    <Surface style={styles.cleaningCard} elevation={1}>
      <View style={styles.statusCardHeader}>
        <MaterialCommunityIcons name="broom" size={18} color="#8B5CF6" />
        <Text style={[styles.statusCardTitle, { color: '#8B5CF6' }]}>Statut ménage</Text>
      </View>
      {active.length === 0 ? (
        <Text style={styles.emptyText}>Aucun logement actif</Text>
      ) : (
        active.map(({ property: p, nextArrival, urgent }) => {
          const isDone = p.cleaning_status === 'ready';
          return (
            <TouchableOpacity
              key={p.id}
              style={[
                styles.cleaningRow,
                urgent && styles.cleaningRowUrgent,
              ]}
              onPress={() => onToggle(p)}
              activeOpacity={0.7}
            >
              <View style={[styles.dot, { backgroundColor: p.color }]} />
              <View style={{ flex: 1 }}>
                <Text style={styles.cleaningPropertyName} numberOfLines={1}>{p.name}</Text>
                {nextArrival && (
                  <Text style={[styles.cleaningNextIn, urgent && { color: APP_COLORS.danger }]}>
                    {urgent && '⚠ '}Check-in {formatNextIn(nextArrival.check_in, today)}
                  </Text>
                )}
              </View>
              <View
                style={[
                  styles.cleaningBadge,
                  { backgroundColor: isDone ? '#D1FAE5' : urgent ? '#FEE2E2' : '#FEF3C7' },
                ]}
              >
                <MaterialCommunityIcons
                  name={isDone ? 'check-circle' : 'clock-outline'}
                  size={13}
                  color={isDone ? APP_COLORS.success : urgent ? APP_COLORS.danger : '#B45309'}
                />
                <Text
                  style={[
                    styles.cleaningBadgeText,
                    { color: isDone ? APP_COLORS.success : urgent ? APP_COLORS.danger : '#B45309' },
                  ]}
                >
                  {isDone ? 'Prêt' : 'À faire'}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })
      )}
    </Surface>
  );
}

export default function DashboardScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { reset } = useAuthStore();
  const today = new Date().toISOString().slice(0, 10);

  const handleLogout = () => {
    Alert.alert('Déconnexion', 'Voulez-vous vous déconnecter ?', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Déconnexion',
        style: 'destructive',
        onPress: async () => {
          try { await supabase.auth.signOut(); } catch (_) {}
          reset();
          router.replace('/(auth)/login');
        },
      },
    ]);
  };

  const { data: todayData, isLoading: todayLoading } = useTodayActivity();
  const { data: upcomingActivity, isLoading: upcomingLoading } = useUpcomingActivity(20);
  const { data: occupiedToday } = useOccupiedToday();
  const { data: lowStock, isLoading: stockLoading } = useLowStockAlerts();
  const { data: pendingCallList } = usePendingCheckInTime(3);
  const { data: properties } = useActiveProperties();
  const { mutate: updateCleaningStatus } = useUpdateCleaningStatus();

  const isLoading = todayLoading || upcomingLoading || stockLoading;

  const allArrivals = [
    ...(todayData?.checkIns ?? []),
    ...(upcomingActivity?.arrivals ?? []),
  ];

  useEffect(() => {
    if (!todayData?.checkOuts || !properties) return;
    todayData.checkOuts.forEach((r) => {
      const prop = properties.find((p) => p.id === r.property_id);
      if (!prop) return;
      if (prop.cleaning_status_date === today) return;
      updateCleaningStatus({ id: prop.id, status: 'to_do', date: today });
    });
  }, [todayData?.checkOuts, properties]);

  useEffect(() => {
    if (!upcomingActivity || !properties) return;
    const in4daysStr = (() => {
      const d = new Date(today);
      d.setDate(d.getDate() + 4);
      return d.toISOString().slice(0, 10);
    })();
    const arrivals = [...(todayData?.checkIns ?? []), ...(upcomingActivity.arrivals ?? [])];
    const urgent = properties
      .filter((p) => p.is_active && p.cleaning_status === 'to_do')
      .flatMap((p) => {
        const next = arrivals
          .filter((r) => r.property_id === p.id)
          .sort((a, b) => a.check_in.localeCompare(b.check_in))[0];
        if (!next || next.check_in > in4daysStr) return [];
        return [{ name: p.name, checkIn: next.check_in }];
      });
    scheduleUpcomingNotifications(upcomingActivity.arrivals, upcomingActivity.departures)
      .then(() => scheduleCleaningAlerts(urgent))
      .catch(() => {});
  }, [upcomingActivity, properties, todayData]);

  const handleCleaningToggle = useCallback(
    (property: Property) => {
      const newStatus = property.cleaning_status === 'ready' ? 'to_do' : 'ready';
      updateCleaningStatus({ id: property.id, status: newStatus, date: today });
    },
    [today, updateCleaningStatus]
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>KAZA</Text>
            <Text style={styles.date}>{formatDateLong(today)}</Text>
          </View>
          <View style={styles.headerRight}>
            <View style={styles.headerLogoContainer}>
              <Image
                source={require('@/assets/icon.png')}
                style={styles.headerLogo}
                resizeMode="contain"
              />
            </View>
            <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
              <MaterialCommunityIcons name="logout" size={20} color="rgba(255,255,255,0.85)" />
            </TouchableOpacity>
          </View>
        </View>

        {isLoading ? (
          <ActivityIndicator style={{ marginTop: 40 }} color={APP_COLORS.primary} />
        ) : (
          <>
            <SectionHeader title={t('dashboard.today')} />
            <View style={styles.todayRow}>
              <View style={{ flex: 1 }}>
                <TodayCard
                  title={t('dashboard.todayCheckins')}
                  reservations={todayData?.checkIns ?? []}
                  icon="login"
                  iconColor={APP_COLORS.success}
                  emptyLabel={t('dashboard.noCheckins')}
                  onPressItem={(r) => router.push(`/(app)/reservations/${r.id}`)}
                />
              </View>
              <View style={{ flex: 1 }}>
                <TodayCard
                  title={t('dashboard.todayCheckouts')}
                  reservations={todayData?.checkOuts ?? []}
                  icon="logout"
                  iconColor={APP_COLORS.warning}
                  emptyLabel={t('dashboard.noCheckouts')}
                  onPressItem={(r) => router.push(`/(app)/reservations/${r.id}`)}
                />
              </View>
            </View>

            <SectionHeader title={t('dashboard.upcoming')} />
            <View style={styles.todayRow}>
              <View style={{ flex: 1 }}>
                <TodayCard
                  title="3 prochains check-in"
                  reservations={(upcomingActivity?.arrivals ?? []).slice(0, 3)}
                  icon="calendar-arrow-right"
                  iconColor={APP_COLORS.primary}
                  emptyLabel={t('dashboard.noUpcoming')}
                  dateField="check_in"
                  onPressItem={(r) => router.push(`/(app)/reservations/${r.id}`)}
                />
              </View>
              <View style={{ flex: 1 }}>
                <TodayCard
                  title="3 prochains check-out"
                  reservations={(upcomingActivity?.departures ?? []).slice(0, 3)}
                  icon="calendar-arrow-left"
                  iconColor="#8B5CF6"
                  emptyLabel={t('dashboard.noUpcoming')}
                  dateField="check_out"
                  onPressItem={(r) => router.push(`/(app)/reservations/${r.id}`)}
                />
              </View>
            </View>

            <SectionHeader title="Statut logements" />
            <View style={styles.todayRow}>
              <View style={{ flex: 1 }}>
                <OccupiedCard
                  reservations={occupiedToday ?? []}
                  onPressItem={(r) => router.push(`/(app)/reservations/${r.id}`)}
                />
              </View>
              <View style={{ flex: 1 }}>
                <TurnoverCard
                  allDepartures={[...(todayData?.checkOuts ?? []), ...(upcomingActivity?.departures ?? [])]}
                  allArrivals={allArrivals}
                  today={today}
                  onPressItem={(r) => router.push(`/(app)/reservations/${r.id}`)}
                />
              </View>
            </View>
            <View style={styles.cleaningWrapper}>
              <CleaningStatusCard
                properties={properties ?? []}
                today={today}
                allArrivals={allArrivals}
                onToggle={handleCleaningToggle}
              />
            </View>

            {pendingCallList && pendingCallList.length > 0 && (
              <>
                <SectionHeader title={`📞 À appeler (${pendingCallList.length})`} />
                <View style={styles.callAlertBox}>
                  {pendingCallList.map((r) => {
                    const daysUntil = Math.round(
                      (new Date(r.check_in).getTime() - new Date(today).getTime()) / 86400000
                    );
                    const label =
                      daysUntil === 0 ? "Aujourd'hui" : daysUntil === 1 ? 'Demain' : `Dans ${daysUntil}j`;
                    return (
                      <TouchableOpacity
                        key={r.id}
                        style={styles.callRow}
                        onPress={() => router.push(`/(app)/reservations/${r.id}`)}
                        activeOpacity={0.7}
                      >
                        {r.property && (
                          <View style={[styles.callDot, { backgroundColor: r.property.color }]} />
                        )}
                        <View style={{ flex: 1 }}>
                          <Text style={styles.callGuestName}>{r.guest_name}</Text>
                          <Text style={styles.callPropertyName}>{r.property?.name}</Text>
                        </View>
                        <View style={styles.callDateBadge}>
                          <Text style={styles.callDateText}>{label}</Text>
                        </View>
                        {r.guest_phone ? (
                          <MaterialCommunityIcons name="phone" size={18} color={APP_COLORS.primary} />
                        ) : (
                          <MaterialCommunityIcons name="phone-off" size={18} color={APP_COLORS.border} />
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </>
            )}

            {lowStock && lowStock.length > 0 && (
              <>
                <SectionHeader title={t('dashboard.lowStock')} />
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.stockRow}
                >
                  {lowStock.map((c) => (
                    <Surface key={c.id} style={styles.stockAlert} elevation={1}>
                      <MaterialCommunityIcons name="alert-circle" size={18} color={APP_COLORS.danger} />
                      <Text style={styles.stockItemName} numberOfLines={1}>{c.item_name}</Text>
                      <Text style={styles.stockPropertyName} numberOfLines={1}>
                        {(c.property as any)?.name ?? ''}
                      </Text>
                      <Text style={styles.stockQty}>
                        {c.current_stock} {c.unit}
                      </Text>
                    </Surface>
                  ))}
                </ScrollView>
              </>
            )}

            {(!lowStock || lowStock.length === 0) && (
              <View style={styles.allGoodRow}>
                <MaterialCommunityIcons name="check-circle" size={16} color={APP_COLORS.success} />
                <Text style={styles.allGoodText}>{t('dashboard.noLowStock')}</Text>
              </View>
            )}
          </>
        )}

        <View style={{ height: 24 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: APP_COLORS.background },
  container: { flex: 1 },
  header: {
    backgroundColor: APP_COLORS.primary,
    paddingHorizontal: 20,
    paddingVertical: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  greeting: { fontSize: 20, fontWeight: '700', color: '#FFFFFF' },
  date: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
    textTransform: 'capitalize',
  },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerLogoContainer: {
    width: 40,
    height: 40,
    borderRadius: 6,
    backgroundColor: '#F8F9FA',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  headerLogo: { width: 40, height: 40, borderRadius: 6 },
  logoutBtn: { padding: 4 },
  todayRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  todayCard: {
    borderRadius: 12,
    padding: 10,
    backgroundColor: '#FFFFFF',
    gap: 6,
  },
  todayCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  todayCardTitle: { fontSize: 11, fontWeight: '700', flex: 1 },
  countBadge: { borderRadius: 10, paddingHorizontal: 6, paddingVertical: 1 },
  countText: { fontSize: 11, fontWeight: '700', color: '#FFFFFF' },
  todayItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 7, height: 7, borderRadius: 4 },
  todayGuestName: { fontSize: 12, fontWeight: '600', color: APP_COLORS.textPrimary },
  todayPropertyName: { fontSize: 10, color: APP_COLORS.textSecondary },
  emptyText: { fontSize: 11, color: APP_COLORS.textSecondary, fontStyle: 'italic' },
  statusCard: {
    borderRadius: 12,
    padding: 10,
    backgroundColor: '#FFFFFF',
    gap: 6,
  },
  statusCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  statusCardTitle: { fontSize: 11, fontWeight: '700', flex: 1 },
  statusItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  statusItemText: { fontSize: 12, fontWeight: '600', color: APP_COLORS.textPrimary, flex: 1 },
  cleaningWrapper: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  cleaningCard: {
    borderRadius: 12,
    padding: 12,
    backgroundColor: '#FFFFFF',
    gap: 4,
  },
  cleaningRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 6,
    paddingHorizontal: 4,
    borderRadius: 8,
  },
  cleaningRowUrgent: {
    backgroundColor: '#FFF1F2',
  },
  cleaningPropertyName: {
    fontSize: 13,
    fontWeight: '600',
    color: APP_COLORS.textPrimary,
  },
  cleaningNextIn: {
    fontSize: 10,
    color: APP_COLORS.textSecondary,
    marginTop: 1,
  },
  cleaningBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  cleaningBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  stockRow: { paddingHorizontal: 16, paddingBottom: 8, gap: 8 },
  stockAlert: {
    borderRadius: 12,
    padding: 12,
    backgroundColor: '#FEF2F2',
    alignItems: 'center',
    minWidth: 110,
    gap: 4,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  stockItemName: { fontSize: 13, fontWeight: '600', color: APP_COLORS.textPrimary, textAlign: 'center' },
  stockPropertyName: { fontSize: 11, color: APP_COLORS.textSecondary, textAlign: 'center' },
  stockQty: { fontSize: 12, color: APP_COLORS.danger, fontWeight: '600' },
  allGoodRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  allGoodText: { fontSize: 13, color: APP_COLORS.success },
  callAlertBox: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    borderRadius: 12,
    marginBottom: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  callRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#FEF3C7',
  },
  callDot: { width: 9, height: 9, borderRadius: 5, flexShrink: 0 },
  callGuestName: { fontSize: 13, fontWeight: '700', color: APP_COLORS.textPrimary },
  callPropertyName: { fontSize: 11, color: APP_COLORS.textSecondary },
  callDateBadge: { backgroundColor: '#FEF3C7', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  callDateText: { fontSize: 11, fontWeight: '700', color: '#B45309' },
});