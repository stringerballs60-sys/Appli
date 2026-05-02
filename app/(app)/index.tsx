import { ScrollView, View, StyleSheet } from 'react-native';
import { Text, Surface, ActivityIndicator } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTodayActivity, useUpcomingReservations } from '@/hooks/useReservations';
import { useLowStockAlerts } from '@/hooks/useInventory';
import { ReservationCard } from '@/components/reservation/ReservationCard';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { APP_COLORS } from '@/constants/colors';
import { formatDateLong, formatDate, getNightsLabel } from '@/utils/dateHelpers';
import { Reservation } from '@/types';
import { SafeAreaView } from 'react-native-safe-area-context';

function TodayCard({
  title,
  reservations,
  icon,
  iconColor,
  emptyLabel,
}: {
  title: string;
  reservations: Reservation[];
  icon: string;
  iconColor: string;
  emptyLabel: string;
}) {
  return (
    <Surface style={styles.todayCard} elevation={1}>
      <View style={styles.todayCardHeader}>
        <MaterialCommunityIcons name={icon as any} size={20} color={iconColor} />
        <Text style={[styles.todayCardTitle, { color: iconColor }]}>
          {title}
        </Text>
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
              <Text style={styles.todayGuestName}>{r.guest_name}</Text>
              {r.property && (
                <Text style={styles.todayPropertyName}>{r.property.name}</Text>
              )}
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
  const today = new Date().toISOString().slice(0, 10);

  const { data: todayData, isLoading: todayLoading } = useTodayActivity();
  const { data: upcoming, isLoading: upcomingLoading } = useUpcomingReservations(3);
  const { data: lowStock, isLoading: stockLoading } = useLowStockAlerts();

  const isLoading = todayLoading || upcomingLoading || stockLoading;

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>ConciergePro</Text>
            <Text style={styles.date}>{formatDateLong(today)}</Text>
          </View>
          <MaterialCommunityIcons name="home-city" size={32} color="#FFFFFF" />
        </View>

        {isLoading ? (
          <ActivityIndicator style={{ marginTop: 40 }} color={APP_COLORS.primary} />
        ) : (
          <>
            {/* Today's activity */}
            <SectionHeader title={t('dashboard.title')} />
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

            {/* Upcoming reservations */}
            <SectionHeader title={t('dashboard.upcoming')} />
            {!upcoming || upcoming.length === 0 ? (
              <Text style={styles.emptySection}>{t('dashboard.noUpcoming')}</Text>
            ) : (
              upcoming.map((r) => (
                <ReservationCard
                  key={r.id}
                  reservation={r}
                  onPress={() => router.push(`/(app)/reservations/${r.id}`)}
                />
              ))
            )}

            {/* Low stock alerts */}
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
  safeArea: {
    flex: 1,
    backgroundColor: APP_COLORS.background,
  },
  container: {
    flex: 1,
  },
  header: {
    backgroundColor: APP_COLORS.primary,
    paddingHorizontal: 20,
    paddingVertical: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  greeting: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  date: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
    textTransform: 'capitalize',
  },
  todayRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  todayCard: {
    borderRadius: 12,
    padding: 12,
    backgroundColor: '#FFFFFF',
    gap: 8,
  },
  todayCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  todayCardTitle: {
    fontSize: 12,
    fontWeight: '700',
    flex: 1,
  },
  countBadge: {
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  countText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  todayItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  todayGuestName: {
    fontSize: 13,
    fontWeight: '600',
    color: APP_COLORS.textPrimary,
  },
  todayPropertyName: {
    fontSize: 11,
    color: APP_COLORS.textSecondary,
  },
  emptyText: {
    fontSize: 12,
    color: APP_COLORS.textSecondary,
    fontStyle: 'italic',
  },
  emptySection: {
    fontSize: 14,
    color: APP_COLORS.textSecondary,
    textAlign: 'center',
    padding: 20,
    fontStyle: 'italic',
  },
  stockRow: {
    paddingHorizontal: 16,
    paddingBottom: 8,
    gap: 8,
  },
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
  stockItemName: {
    fontSize: 13,
    fontWeight: '600',
    color: APP_COLORS.textPrimary,
    textAlign: 'center',
  },
  stockPropertyName: {
    fontSize: 11,
    color: APP_COLORS.textSecondary,
    textAlign: 'center',
  },
  stockQty: {
    fontSize: 12,
    color: APP_COLORS.danger,
    fontWeight: '600',
  },
  allGoodRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  allGoodText: {
    fontSize: 13,
    color: APP_COLORS.success,
  },
});
