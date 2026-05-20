import { useEffect, useCallback, useState } from 'react';
import { ScrollView, View, StyleSheet, Image, TouchableOpacity, Alert, Modal, Pressable } from 'react-native';
import { Text, ActivityIndicator } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { supabase } from '@/services/supabase';
import { useAuthStore } from '@/stores/authStore';
import { useTodayActivity, useUpcomingActivity, usePendingCheckInTime, useOccupiedToday, useFutureTurnovers, useRecentDepartures } from '@/hooks/useReservations';
import { useLowStockAlerts } from '@/hooks/useInventory';
import { useActiveProperties, useUpdateCleaningStatus } from '@/hooks/useProperties';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { APP_COLORS } from '@/constants/colors';
import { SHADOWS, RADII, GRADIENTS } from '@/constants/theme';
import { formatDateLong, formatDateShort } from '@/utils/dateHelpers';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Reservation, Property } from '@/types';
import { SafeAreaView } from 'react-native-safe-area-context';
import { scheduleUpcomingNotifications, scheduleCleaningAlerts } from '@/services/notifications';
import { usePendingMemos } from '@/hooks/useMemos';

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
    <View style={[styles.card, SHADOWS.sm]}>
      <View style={styles.cardHeader}>
        <View style={[styles.cardIconWrap, { backgroundColor: iconColor + '15' }]}>
          <MaterialCommunityIcons name={icon as any} size={15} color={iconColor} />
        </View>
        <Text style={[styles.cardTitle, { color: iconColor }]}>{title}</Text>
        <View style={[styles.countPill, { backgroundColor: iconColor }]}>
          <Text style={styles.countText}>{reservations.length}</Text>
        </View>
      </View>
      {reservations.length === 0 ? (
        <Text style={styles.emptyText}>{emptyLabel}</Text>
      ) : (
        reservations.map((r) => (
          <TouchableOpacity
            key={r.id}
            style={styles.cardItem}
            onPress={() => onPressItem?.(r)}
            activeOpacity={onPressItem ? 0.6 : 1}
          >
            {r.property && (
              <View style={[styles.propStripe, { backgroundColor: r.property.color }]} />
            )}
            <View style={{ flex: 1 }}>
              <Text style={styles.guestName} numberOfLines={1}>{r.guest_name}</Text>
              <Text style={styles.propName} numberOfLines={1}>
                {r.property?.name}
                {dateField ? ` · ${formatDateShort(r[dateField])}` : ''}
              </Text>
            </View>
            {onPressItem && (
              <MaterialCommunityIcons name="chevron-right" size={14} color={APP_COLORS.textTertiary} />
            )}
          </TouchableOpacity>
        ))
      )}
    </View>
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
    <View style={[styles.card, SHADOWS.sm]}>
      <View style={styles.cardHeader}>
        <View style={[styles.cardIconWrap, { backgroundColor: APP_COLORS.primaryPale }]}>
          <MaterialCommunityIcons name="home-account" size={15} color={APP_COLORS.primary} />
        </View>
        <Text style={[styles.cardTitle, { color: APP_COLORS.primary }]}>Occupés</Text>
        <View style={[styles.countPill, { backgroundColor: APP_COLORS.primary }]}>
          <Text style={styles.countText}>{unique.length}</Text>
        </View>
      </View>
      {unique.length === 0 ? (
        <Text style={styles.emptyText}>Aucun logement occupé</Text>
      ) : (
        unique.map((r) => (
          <TouchableOpacity
            key={r.id}
            style={styles.cardItem}
            onPress={() => onPressItem?.(r)}
            activeOpacity={0.6}
          >
            {r.property && <View style={[styles.propStripe, { backgroundColor: r.property.color }]} />}
            <Text style={[styles.guestName, { flex: 1 }]} numberOfLines={1}>{r.property?.name}</Text>
            <MaterialCommunityIcons name="chevron-right" size={14} color={APP_COLORS.textTertiary} />
          </TouchableOpacity>
        ))
      )}
    </View>
  );
}

function TurnoverCard({
  turnovers,
  today,
  onPressItem,
  onShowAll,
}: {
  turnovers: { dep: Reservation; arr: Reservation }[];
  today: string;
  onPressItem?: (dep: Reservation, arr: Reservation) => void;
  onShowAll?: () => void;
}) {
  const first = turnovers[0];
  const extra = turnovers.length - 1;
  return (
    <View style={[styles.card, SHADOWS.sm]}>
      <View style={styles.cardHeader}>
        <View style={[styles.cardIconWrap, { backgroundColor: APP_COLORS.warningLight }]}>
          <MaterialCommunityIcons name="swap-horizontal" size={15} color={APP_COLORS.warning} />
        </View>
        <Text style={[styles.cardTitle, { color: APP_COLORS.warning }]}>Turn-over</Text>
        <View style={[styles.countPill, { backgroundColor: APP_COLORS.warning }]}>
          <Text style={styles.countText}>{turnovers.length}</Text>
        </View>
      </View>
      {!first ? (
        <Text style={styles.emptyText}>Aucun turn-over</Text>
      ) : (
        <View style={styles.cardItem}>
          {first.dep.property && <View style={[styles.propStripe, { backgroundColor: first.dep.property.color }]} />}
          <TouchableOpacity style={{ flex: 1 }} onPress={() => onPressItem?.(first.dep, first.arr)} activeOpacity={0.6}>
            <Text style={styles.guestName} numberOfLines={1}>{first.dep.property?.name}</Text>
            {first.dep.check_out !== today && (
              <Text style={styles.propName}>{formatNextIn(first.dep.check_out, today)}</Text>
            )}
          </TouchableOpacity>
          {extra > 0 ? (
            <TouchableOpacity style={styles.extraPill} onPress={onShowAll} activeOpacity={0.7}>
              <Text style={styles.extraPillText}>+{extra}</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity onPress={() => onPressItem?.(first.dep, first.arr)} activeOpacity={0.6}>
              <MaterialCommunityIcons name="chevron-right" size={14} color={APP_COLORS.textTertiary} />
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
}

function TurnoverListModal({
  turnovers,
  today,
  onClose,
  onPressItem,
}: {
  turnovers: { dep: Reservation; arr: Reservation }[];
  today: string;
  onClose: () => void;
  onPressItem: (dep: Reservation, arr: Reservation) => void;
}) {
  return (
    <Modal transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={sheet.overlay} onPress={onClose}>
        <Pressable style={[sheet.container, { paddingBottom: 24 }]} onPress={() => {}}>
          <View style={sheet.handle} />
          <View style={[sheet.header, { paddingLeft: 20, paddingBottom: 12 }]}>
            <MaterialCommunityIcons name="swap-horizontal" size={20} color={APP_COLORS.warning} />
            <View style={{ flex: 1, paddingLeft: 10 }}>
              <Text style={sheet.title}>Tous les turn-overs</Text>
              <Text style={sheet.subtitle}>{turnovers.length} à venir</Text>
            </View>
          </View>
          <View style={sheet.divider} />
          {turnovers.map(({ dep, arr }) => (
            <TouchableOpacity
              key={dep.id}
              style={sheet.listItem}
              onPress={() => { onClose(); onPressItem(dep, arr); }}
              activeOpacity={0.7}
            >
              {dep.property && <View style={[sheet.strip, { backgroundColor: dep.property.color }]} />}
              <View style={{ flex: 1, paddingLeft: 12 }}>
                <Text style={styles.guestName} numberOfLines={1}>{dep.property?.name}</Text>
                <Text style={styles.propName}>{formatNextIn(dep.check_out, today)}</Text>
              </View>
              <MaterialCommunityIcons name="chevron-right" size={14} color={APP_COLORS.textTertiary} />
            </TouchableOpacity>
          ))}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function TurnoverSheet({
  dep,
  arr,
  onClose,
  onViewDep,
  onViewArr,
}: {
  dep: Reservation;
  arr: Reservation;
  onClose: () => void;
  onViewDep: () => void;
  onViewArr: () => void;
}) {
  const property = dep.property as Property | undefined;
  const cleaningReady = property?.cleaning_status === 'ready';
  const cleaningColor = cleaningReady ? APP_COLORS.success : APP_COLORS.warning;

  return (
    <Modal transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={sheet.overlay} onPress={onClose}>
        <Pressable style={sheet.container} onPress={() => {}}>
          <View style={sheet.handle} />

          <View style={sheet.header}>
            {property && <View style={[sheet.strip, { backgroundColor: property.color }]} />}
            <View style={{ flex: 1, paddingLeft: 12 }}>
              <Text style={sheet.title}>{property?.name ?? 'Logement'}</Text>
              <Text style={sheet.subtitle}>Turn-over</Text>
            </View>
            <View style={[sheet.pill, { backgroundColor: cleaningColor + '15', borderColor: cleaningColor + '50' }]}>
              <Text style={[sheet.pillText, { color: cleaningColor }]}>
                {cleaningReady ? '✓ Prêt' : 'À faire'}
              </Text>
            </View>
          </View>

          <View style={sheet.divider} />

          <View style={sheet.guestBlock}>
            <View style={[sheet.badge, { backgroundColor: APP_COLORS.warningLight }]}>
              <MaterialCommunityIcons name="logout" size={12} color={APP_COLORS.warning} />
              <Text style={[sheet.badgeLabel, { color: APP_COLORS.warning }]}>DÉPART</Text>
            </View>
            <Text style={sheet.guestName} numberOfLines={1}>{dep.guest_name}</Text>
            <Text style={sheet.guestDate}>
              {format(parseISO(dep.check_out), 'EEE d MMM', { locale: fr })} · {dep.nb_nights} nuits
            </Text>
          </View>

          {arr && (
            <>
              <View style={sheet.swapRow}>
                <View style={sheet.swapLine} />
                <View style={sheet.swapCircle}>
                  <MaterialCommunityIcons name="swap-vertical" size={15} color={APP_COLORS.primary} />
                </View>
                <View style={sheet.swapLine} />
              </View>

              <View style={sheet.guestBlock}>
                <View style={[sheet.badge, { backgroundColor: APP_COLORS.successLight }]}>
                  <MaterialCommunityIcons name="login" size={12} color={APP_COLORS.success} />
                  <Text style={[sheet.badgeLabel, { color: APP_COLORS.success }]}>ARRIVÉE</Text>
                </View>
                <Text style={sheet.guestName} numberOfLines={1}>{arr.guest_name}</Text>
                <Text style={sheet.guestDate}>
                  {format(parseISO(arr.check_in), 'EEE d MMM', { locale: fr })} · {arr.nb_nights} nuits
                </Text>
              </View>
            </>
          )}

          <View style={sheet.actions}>
            <TouchableOpacity style={sheet.btnOutline} onPress={onViewDep}>
              <MaterialCommunityIcons name="logout" size={14} color={APP_COLORS.warning} />
              <Text style={[sheet.btnOutlineText, { color: APP_COLORS.warning }]}>Voir le départ</Text>
            </TouchableOpacity>
            {arr && (
              <TouchableOpacity style={[sheet.btnFill, SHADOWS.navy]} onPress={onViewArr}>
                <MaterialCommunityIcons name="login" size={14} color="#FFFFFF" />
                <Text style={sheet.btnFillText}>Voir l'arrivée</Text>
              </TouchableOpacity>
            )}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function CleaningStatusCard({
  properties,
  today,
  allArrivals,
  onToggle,
  onShowAll,
}: {
  properties: Property[];
  today: string;
  allArrivals: Reservation[];
  onToggle: (property: Property) => void;
  onShowAll: () => void;
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
      if (a.property.cleaning_status !== b.property.cleaning_status) {
        return a.property.cleaning_status === 'to_do' ? -1 : 1;
      }
      if (a.urgent && !b.urgent) return -1;
      if (!a.urgent && b.urgent) return 1;
      if (a.nextArrival && b.nextArrival) return a.nextArrival.check_in.localeCompare(b.nextArrival.check_in);
      if (a.nextArrival) return -1;
      if (b.nextArrival) return 1;
      return 0;
    });

  const todoItems = active.filter((a) => a.property.cleaning_status === 'to_do');
  const readyCount = active.filter((a) => a.property.cleaning_status === 'ready').length;
  const first = todoItems[0];
  const extra = todoItems.length - 1;
  const cleaningColor = '#7C3AED';

  return (
    <View style={[styles.card, SHADOWS.sm]}>
      <View style={styles.cardHeader}>
        <View style={[styles.cardIconWrap, { backgroundColor: '#7C3AED15' }]}>
          <MaterialCommunityIcons name="broom" size={15} color={cleaningColor} />
        </View>
        <Text style={[styles.cardTitle, { color: cleaningColor }]}>Ménage</Text>
        {todoItems.length > 0 && (
          <View style={[styles.countPill, { backgroundColor: first?.urgent ? APP_COLORS.danger : cleaningColor }]}>
            <Text style={styles.countText}>{todoItems.length}</Text>
          </View>
        )}
        {readyCount > 0 && (
          <Text style={{ fontSize: 10, color: APP_COLORS.success, fontWeight: '700', marginLeft: 2 }}>
            {readyCount} ✓
          </Text>
        )}
      </View>
      {active.length === 0 ? (
        <Text style={styles.emptyText}>Aucun logement actif</Text>
      ) : todoItems.length === 0 ? (
        <Text style={[styles.emptyText, { color: APP_COLORS.success }]}>Tous les logements sont prêts ✓</Text>
      ) : (
        <View style={styles.cardItem}>
          {first.property && <View style={[styles.propStripe, { backgroundColor: first.property.color }]} />}
          <TouchableOpacity style={{ flex: 1 }} onPress={() => onToggle(first.property)} activeOpacity={0.6}>
            <Text style={styles.guestName} numberOfLines={1}>{first.property.name}</Text>
            {first.nextArrival && (
              <Text style={[styles.propName, first.urgent && { color: APP_COLORS.danger }]}>
                {first.urgent ? '⚠ ' : ''}Check-in {formatNextIn(first.nextArrival.check_in, today)}
              </Text>
            )}
          </TouchableOpacity>
          {extra > 0 ? (
            <TouchableOpacity
              style={[styles.extraPill, { backgroundColor: cleaningColor + '18', borderColor: cleaningColor + '40' }]}
              onPress={onShowAll}
              activeOpacity={0.7}
            >
              <Text style={[styles.extraPillText, { color: cleaningColor }]}>+{extra}</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity onPress={onShowAll} activeOpacity={0.6}>
              <MaterialCommunityIcons name="chevron-right" size={14} color={APP_COLORS.textTertiary} />
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
}

function CleaningListModal({
  properties,
  today,
  allArrivals,
  onClose,
  onToggle,
}: {
  properties: Property[];
  today: string;
  allArrivals: Reservation[];
  onClose: () => void;
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
      if (a.property.cleaning_status !== b.property.cleaning_status) return a.property.cleaning_status === 'to_do' ? -1 : 1;
      if (a.urgent && !b.urgent) return -1;
      if (!a.urgent && b.urgent) return 1;
      if (a.nextArrival && b.nextArrival) return a.nextArrival.check_in.localeCompare(b.nextArrival.check_in);
      return 0;
    });

  const todoCount = active.filter((a) => a.property.cleaning_status === 'to_do').length;

  return (
    <Modal transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={sheet.overlay} onPress={onClose}>
        <Pressable style={[sheet.container, { paddingBottom: 24 }]} onPress={() => {}}>
          <View style={sheet.handle} />
          <View style={[sheet.header, { paddingLeft: 20, paddingBottom: 12 }]}>
            <MaterialCommunityIcons name="broom" size={20} color="#7C3AED" />
            <View style={{ flex: 1, paddingLeft: 10 }}>
              <Text style={sheet.title}>Statut ménage</Text>
              <Text style={sheet.subtitle}>{todoCount} à faire · {active.length - todoCount} prêt{active.length - todoCount > 1 ? 's' : ''}</Text>
            </View>
          </View>
          <View style={sheet.divider} />
          {active.map(({ property: p, nextArrival, urgent }) => {
            const isDone = p.cleaning_status === 'ready';
            return (
              <TouchableOpacity
                key={p.id}
                style={sheet.listItem}
                onPress={() => { onClose(); onToggle(p); }}
                activeOpacity={0.7}
              >
                <View style={[sheet.strip, { backgroundColor: p.color }]} />
                <View style={{ flex: 1, paddingLeft: 12 }}>
                  <Text style={styles.guestName} numberOfLines={1}>{p.name}</Text>
                  {nextArrival && (
                    <Text style={[styles.propName, urgent && { color: APP_COLORS.danger }]}>
                      {urgent ? '⚠ ' : ''}Check-in {formatNextIn(nextArrival.check_in, today)}
                    </Text>
                  )}
                </View>
                <View style={[styles.cleaningBadge, {
                  backgroundColor: isDone ? APP_COLORS.successLight : urgent ? APP_COLORS.dangerLight : APP_COLORS.warningLight,
                }]}>
                  <MaterialCommunityIcons
                    name={isDone ? 'check-circle' : 'clock-outline'}
                    size={12}
                    color={isDone ? APP_COLORS.success : urgent ? APP_COLORS.danger : APP_COLORS.warning}
                  />
                  <Text style={[styles.cleaningBadgeText, {
                    color: isDone ? APP_COLORS.success : urgent ? APP_COLORS.danger : APP_COLORS.warning,
                  }]}>
                    {isDone ? 'Prêt' : 'À faire'}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </Pressable>
      </Pressable>
    </Modal>
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

  const [turnoverDetail, setTurnoverDetail] = useState<{ dep: Reservation; arr: Reservation } | null>(null);
  const [showTurnoverList, setShowTurnoverList] = useState(false);
  const [showCleaningList, setShowCleaningList] = useState(false);
  const [memoBannerDismissed, setMemoBannerDismissed] = useState(false);
  const { data: pendingMemos } = usePendingMemos();
  const pendingMemoCount = pendingMemos?.length ?? 0;

  const { data: recentDepartures } = useRecentDepartures(90);
  const { data: todayData, isLoading: todayLoading } = useTodayActivity();
  const { data: upcomingActivity, isLoading: upcomingLoading } = useUpcomingActivity(20);
  const { data: futureTurnovers } = useFutureTurnovers();
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
    if (!properties || !occupiedToday || !recentDepartures) return;

    const occupiedPropIds = new Set(occupiedToday.map((r) => r.property_id));

    properties.forEach((prop) => {
      if (!prop.is_active) return;

      if (occupiedPropIds.has(prop.id)) {
        if (prop.cleaning_status !== 'ready') {
          updateCleaningStatus({ id: prop.id, status: 'ready', date: today });
        }
      } else {
        if (prop.cleaning_status !== 'ready') return;
        const lastDep = recentDepartures
          .filter((r) => r.property_id === prop.id)
          .sort((a, b) => b.check_out.localeCompare(a.check_out))[0];
        if (!lastDep) return;
        const statusDate = prop.cleaning_status_date ?? '1970-01-01';
        if (lastDep.check_out > statusDate) {
          updateCleaningStatus({ id: prop.id, status: 'to_do', date: today });
        }
      }
    });
  }, [occupiedToday, recentDepartures, properties]);

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
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* ── Header ─────────────────────────────────────────────── */}
        <LinearGradient
          colors={GRADIENTS.navyHeader as [string, string, ...string[]]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.header}
        >
          <View>
            <Text style={styles.greeting}>KAZA</Text>
            <Text style={styles.headerDate} numberOfLines={1}>
              {formatDateLong(today)}
            </Text>
          </View>
          <View style={styles.headerRight}>
            <View style={styles.logoWrap}>
              <Image
                source={require('@/assets/icon.png')}
                style={styles.logo}
                resizeMode="contain"
              />
            </View>
            <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.7}>
              <MaterialCommunityIcons name="logout" size={19} color="rgba(248,245,239,0.75)" />
            </TouchableOpacity>
          </View>
        </LinearGradient>

        {isLoading ? (
          <ActivityIndicator style={{ marginTop: 48 }} color={APP_COLORS.primary} />
        ) : (
          <>
            {/* Memo banner */}
            {pendingMemoCount > 0 && !memoBannerDismissed && (
              <TouchableOpacity
                style={styles.memoBanner}
                onPress={() => router.push('/(app)/memo')}
                activeOpacity={0.8}
              >
                <View style={styles.memoBannerStrip} />
                <MaterialCommunityIcons name="note-text-outline" size={15} color={APP_COLORS.accent} />
                <Text style={styles.memoBannerText} numberOfLines={1}>
                  {pendingMemoCount} note{pendingMemoCount > 1 ? 's' : ''} en attente dans le mémo
                </Text>
                <TouchableOpacity
                  onPress={(e) => { e.stopPropagation(); setMemoBannerDismissed(true); }}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <MaterialCommunityIcons name="close" size={13} color={APP_COLORS.accentDark} />
                </TouchableOpacity>
              </TouchableOpacity>
            )}

            {/* Aujourd'hui */}
            <SectionHeader title={t('dashboard.today')} />
            <View style={styles.row}>
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

            {/* À venir */}
            <SectionHeader title={t('dashboard.upcoming')} />
            <View style={styles.row}>
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
                  iconColor="#7C3AED"
                  emptyLabel={t('dashboard.noUpcoming')}
                  dateField="check_out"
                  onPressItem={(r) => router.push(`/(app)/reservations/${r.id}`)}
                />
              </View>
            </View>

            {/* Statut logements */}
            <SectionHeader title="Statut logements" />
            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <OccupiedCard
                  reservations={occupiedToday ?? []}
                  onPressItem={(r) => router.push(`/(app)/reservations/${r.id}`)}
                />
              </View>
              <View style={{ flex: 1 }}>
                <TurnoverCard
                  turnovers={futureTurnovers ?? []}
                  today={today}
                  onPressItem={(dep, arr) => setTurnoverDetail({ dep, arr })}
                  onShowAll={() => setShowTurnoverList(true)}
                />
              </View>
            </View>
            <View style={styles.fullRow}>
              <CleaningStatusCard
                properties={properties ?? []}
                today={today}
                allArrivals={allArrivals}
                onToggle={handleCleaningToggle}
                onShowAll={() => setShowCleaningList(true)}
              />
            </View>

            {/* À appeler */}
            {pendingCallList && pendingCallList.length > 0 && (
              <>
                <SectionHeader title={`Appels à passer (${pendingCallList.length})`} />
                <View style={styles.callBox}>
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
                          <Text style={styles.guestName}>{r.guest_name}</Text>
                          <Text style={styles.propName}>{r.property?.name}</Text>
                        </View>
                        <View style={styles.callDatePill}>
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

            {/* Stocks */}
            {lowStock && lowStock.length > 0 && (
              <>
                <SectionHeader title={t('dashboard.lowStock')} />
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.stockScroll}
                >
                  {lowStock.map((c) => (
                    <View key={c.id} style={[styles.stockCard, SHADOWS.sm]}>
                      <MaterialCommunityIcons name="alert-circle" size={17} color={APP_COLORS.danger} />
                      <Text style={styles.stockName} numberOfLines={1}>{c.item_name}</Text>
                      <Text style={styles.stockProp} numberOfLines={1}>
                        {(c.property as any)?.name ?? ''}
                      </Text>
                      <Text style={styles.stockQty}>
                        {c.current_stock} {c.unit}
                      </Text>
                    </View>
                  ))}
                </ScrollView>
              </>
            )}

            {(!lowStock || lowStock.length === 0) && (
              <View style={styles.allGoodRow}>
                <MaterialCommunityIcons name="check-circle" size={15} color={APP_COLORS.success} />
                <Text style={styles.allGoodText}>{t('dashboard.noLowStock')}</Text>
              </View>
            )}
          </>
        )}

        <View style={{ height: 32 }} />
      </ScrollView>

      {showTurnoverList && (
        <TurnoverListModal
          turnovers={futureTurnovers ?? []}
          today={today}
          onClose={() => setShowTurnoverList(false)}
          onPressItem={(dep, arr) => setTurnoverDetail({ dep, arr })}
        />
      )}

      {showCleaningList && (
        <CleaningListModal
          properties={properties ?? []}
          today={today}
          allArrivals={allArrivals}
          onClose={() => setShowCleaningList(false)}
          onToggle={handleCleaningToggle}
        />
      )}

      {turnoverDetail && (
        <TurnoverSheet
          dep={turnoverDetail.dep}
          arr={turnoverDetail.arr}
          onClose={() => setTurnoverDetail(null)}
          onViewDep={() => {
            setTurnoverDetail(null);
            router.push(`/(app)/reservations/${turnoverDetail.dep.id}`);
          }}
          onViewArr={() => {
            setTurnoverDetail(null);
            router.push(`/(app)/reservations/${turnoverDetail.arr.id}`);
          }}
        />
      )}
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: APP_COLORS.primaryDark },
  scroll: { flex: 1, backgroundColor: APP_COLORS.background },

  // Header
  header: {
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 22,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  greeting: {
    fontSize: 24,
    fontWeight: '800',
    color: APP_COLORS.accent,
    letterSpacing: 2,
    fontFamily: 'Montserrat-Bold',
  },
  headerDate: {
    fontSize: 13,
    color: 'rgba(248,245,239,0.72)',
    marginTop: 3,
    textTransform: 'capitalize',
  },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  logoWrap: {
    width: 38,
    height: 38,
    borderRadius: RADII.sm,
    backgroundColor: 'rgba(248,245,239,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(248,245,239,0.18)',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  logo: { width: 38, height: 38, borderRadius: RADII.sm },
  logoutBtn: { padding: 4 },

  // Card grid
  row: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 16,
    paddingBottom: 10,
  },
  fullRow: {
    paddingHorizontal: 16,
    paddingBottom: 10,
  },

  // Base card
  card: {
    borderRadius: RADII.md,
    padding: 12,
    backgroundColor: APP_COLORS.surfaceElevated,
    gap: 8,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  cardIconWrap: {
    width: 26,
    height: 26,
    borderRadius: RADII.xs,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardTitle: { fontSize: 11, fontWeight: '700', flex: 1, letterSpacing: 0.1 },
  countPill: {
    borderRadius: RADII.full,
    paddingHorizontal: 7,
    paddingVertical: 1,
    minWidth: 20,
    alignItems: 'center',
  },
  countText: { fontSize: 10, fontWeight: '800', color: '#FFFFFF' },

  // Card items
  cardItem: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  propStripe: { width: 3, height: 30, borderRadius: 2, flexShrink: 0 },
  guestName: { fontSize: 12, fontWeight: '600', color: APP_COLORS.textPrimary },
  propName: { fontSize: 10, color: APP_COLORS.textSecondary, marginTop: 1 },
  emptyText: { fontSize: 11, color: APP_COLORS.textTertiary, fontStyle: 'italic' },
  extraPill: {
    backgroundColor: APP_COLORS.warningLight,
    borderRadius: RADII.full,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: APP_COLORS.warning + '40',
  },
  extraPillText: { fontSize: 10, fontWeight: '700', color: APP_COLORS.warning },

  // Cleaning badge (in modal list)
  cleaningBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: RADII.full,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  cleaningBadgeText: { fontSize: 10, fontWeight: '700' },

  // Memo banner
  memoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 16,
    marginTop: 14,
    marginBottom: 2,
    paddingVertical: 11,
    paddingRight: 12,
    backgroundColor: APP_COLORS.accentPale,
    borderRadius: RADII.md,
    borderWidth: 1,
    borderColor: APP_COLORS.accent + '50',
    overflow: 'hidden',
    ...SHADOWS.xs,
  },
  memoBannerStrip: {
    width: 4,
    alignSelf: 'stretch',
    backgroundColor: APP_COLORS.accent,
  },
  memoBannerText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: APP_COLORS.accentDark,
  },

  // Call list
  callBox: {
    backgroundColor: APP_COLORS.surfaceElevated,
    marginHorizontal: 16,
    borderRadius: RADII.md,
    marginBottom: 10,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: APP_COLORS.accent + '35',
    ...SHADOWS.xs,
  },
  callRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: APP_COLORS.borderLight,
  },
  callDot: { width: 8, height: 8, borderRadius: 4, flexShrink: 0 },
  callDatePill: {
    backgroundColor: APP_COLORS.accentPale,
    borderRadius: RADII.xs,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: APP_COLORS.accent + '30',
  },
  callDateText: { fontSize: 10, fontWeight: '700', color: APP_COLORS.accentDark },

  // Stock alerts
  stockScroll: { paddingHorizontal: 16, paddingBottom: 10, gap: 8 },
  stockCard: {
    borderRadius: RADII.md,
    padding: 12,
    backgroundColor: APP_COLORS.dangerLight,
    alignItems: 'center',
    minWidth: 110,
    gap: 4,
    borderWidth: 1,
    borderColor: APP_COLORS.danger + '30',
  },
  stockName: { fontSize: 12, fontWeight: '600', color: APP_COLORS.textPrimary, textAlign: 'center' },
  stockProp: { fontSize: 10, color: APP_COLORS.textSecondary, textAlign: 'center' },
  stockQty: { fontSize: 12, color: APP_COLORS.danger, fontWeight: '700' },
  allGoodRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  allGoodText: { fontSize: 12, color: APP_COLORS.success },
});

// ── Bottom sheet styles ───────────────────────────────────────────────────────

const sheet = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(5, 14, 26, 0.62)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: APP_COLORS.surfaceElevated,
    borderTopLeftRadius: RADII.xl,
    borderTopRightRadius: RADII.xl,
    paddingBottom: 36,
    ...SHADOWS.lg,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: APP_COLORS.border,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 4,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingRight: 16,
  },
  strip: {
    width: 5,
    alignSelf: 'stretch',
    borderRadius: 3,
    minHeight: 36,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: APP_COLORS.textPrimary,
    fontFamily: 'Montserrat-SemiBold',
  },
  subtitle: {
    fontSize: 12,
    color: APP_COLORS.textSecondary,
    marginTop: 2,
  },
  pill: {
    borderRadius: RADII.full,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  pillText: { fontSize: 11, fontWeight: '700' },
  divider: {
    height: 1,
    backgroundColor: APP_COLORS.borderLight,
    marginHorizontal: 16,
    marginBottom: 4,
  },
  guestBlock: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 3,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    borderRadius: RADII.xs,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginBottom: 4,
  },
  badgeLabel: { fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
  guestName: { fontSize: 16, fontWeight: '700', color: APP_COLORS.textPrimary },
  guestDate: { fontSize: 12, color: APP_COLORS.textSecondary },
  swapRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    marginVertical: 2,
  },
  swapLine: { flex: 1, height: 1, backgroundColor: APP_COLORS.borderLight },
  swapCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: APP_COLORS.primaryPale,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 8,
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 16,
    marginTop: 8,
  },
  btnOutline: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 13,
    borderRadius: RADII.md,
    backgroundColor: APP_COLORS.warningLight,
    borderWidth: 1,
    borderColor: APP_COLORS.warning + '40',
  },
  btnOutlineText: { fontSize: 13, fontWeight: '700' },
  btnFill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 13,
    borderRadius: RADII.md,
    backgroundColor: APP_COLORS.primary,
  },
  btnFillText: { fontSize: 13, fontWeight: '700', color: '#FFFFFF' },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: APP_COLORS.borderLight,
  },
});
