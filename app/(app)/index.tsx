import { useEffect } from 'react';
import { ScrollView, View, StyleSheet, Image, TouchableOpacity, Alert } from 'react-native';
import { Text, Surface, ActivityIndicator } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { supabase } from '@/services/supabase';
import { useAuthStore } from '@/stores/authStore';
import { useTodayActivity, useUpcomingActivity, usePendingCheckInTime, useUpcomingReservations } from '@/hooks/useReservations';
import { useLowStockAlerts } from '@/hooks/useInventory';
import { ReservationCard } from '@/components/reservation/ReservationCard';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { APP_COLORS } from '@/constants/colors';
import { formatDateLong, formatDateShort } from '@/utils/dateHelpers';
import { Reservation } from '@/types';
import { SafeAreaView } from 'react-native-safe-area-context';
import { scheduleUpcomingNotifications } from '@/services/notifications';

function TodayCard({
  title,
  reservations,
  icon,
  iconColor,
  emptyLabel,
  dateField,
}: {
  title: string;
  reservations: Reservation[];
  icon: string;
  iconColor: string;
  emptyLabel: string;
  dateField?: 'check_in' | 'check_out';
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
          <View key={r.id} style={styles.todayItem}>
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
          </View>
        ))
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
    Alert.alert('Déconnexion', 'Voulez-vous vous déconnecter ?', [
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
  const { data: upcomingActivity, isLoading: upcomingLoading } = useUpcomingActivity(5);
  const { data: upcomingResas } = useUpcomingReservations(3);
  const { data: lowStock, isLoading: stockLoading } = useLowStockAlerts();
  const { data: pendingCallList } = usePendingCheckInTime(3);

  const isLoading = todayLoading || upcomingLoading || stockLoading;

  useEffect(() => {
    if (upcomingActivity) {
      scheduleUpcomingNotifications(
        upcomingActivity.arrivals,
        upcomingActivity.departures
      ).catch(() => {});
    }
  }, [upcomingActivity]);

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
                />
              </View>
              <View style={{ flex: 1 }}>
                <TodayCard
                  title={t('dashboard.todayCheckouts')}
                  reservations={todayData?.checkOuts ?? []}
                  icon="logout"
                  iconColor={APP_COLORS.warning}
                  emptyLabel={t('dashboard.noCheckouts')}
                />
              </View>
            </View>

            <SectionHeader title={t('dashboard.upcoming')} />
            <View style={styles.todayRow}>
              <View style={{ flex: 1 }}>
                <TodayCard
                  title={t('dashboard.upcomingArrivals')}
                  reservations={upcomingActivity?.arrivals ?? []}
                  icon="calendar-arrow-right"
                  iconColor={APP_COLORS.primary}
                  emptyLabel={t('dashboard.noUpcoming')}
                  dateField="check_in"
                />
              </View>
              <View style={{ flex: 1 }}>
                <TodayCard
                  title={t('dashboard.upcomingDepartures')}
                  reservations={upcomingActivity?.departures ?? []}
                  icon="calendar-arrow-left"
                  iconColor="#8B5CF6"
                  emptyLabel={t('dashboard.noUpcoming')}
                  dateField="check_out"
                />
              </View>
            </View>

            {upcomingResas && upcomingResas.length > 0 && (
              <>
                <SectionHeader title="Prochaines réservations" />
                {upcomingResas.map((r) => (
                  <ReservationCard
                    key={r.id}
                    reservation={r}
                    onPress={() => router.push(`/(app)/reservations/${r.id}`)}
                  />
                ))}
              </>
            )}

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
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerLogo: { width: 26, height: 26, borderRadius: 13 },
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
  emptySection: {
    fontSize: 14,
    color: APP_COLORS.textSecondary,
    textAlign: 'center',
    padding: 20,
    fontStyle: 'italic',
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
