import { useMemo, useRef, useEffect } from 'react';
import {
  View, ScrollView, StyleSheet, TouchableOpacity, useWindowDimensions,
} from 'react-native';
import { Text, ActivityIndicator } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { parseISO, addDays, startOfMonth, endOfMonth, addMonths, subMonths, format, differenceInDays } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useActiveProperties } from '@/hooks/useProperties';
import { useReservationsForMonth } from '@/hooks/useReservations';
import { useAppStore } from '@/stores/appStore';
import { APP_COLORS } from '@/constants/colors';
import { FONTS } from '@/constants/typography';
import { toISODateString } from '@/utils/dateHelpers';
import { Property, Reservation } from '@/types';

const DAY_W = 38;
const ROW_H = 54;
const NAME_W = 110;
const HEADER_H = 48;
const TODAY = toISODateString(new Date());

function buildDays(yearMonth: string): string[] {
  const start = startOfMonth(parseISO(yearMonth + '-01'));
  const end = endOfMonth(start);
  const days: string[] = [];
  let cur = start;
  while (cur <= end) {
    days.push(toISODateString(cur));
    cur = addDays(cur, 1);
  }
  return days;
}

type Block = {
  left: number;
  width: number;
  color: string;
  label: string;
  isStart: boolean;
  isEnd: boolean;
  nightsInRange: number;
};

function buildBlocks(
  reservations: Reservation[],
  days: string[],
  propertyId: string
): Block[] {
  const rangeStart = days[0];
  const rangeEnd = days[days.length - 1];
  const blocks: Block[] = [];

  for (const res of reservations) {
    if (res.property_id !== propertyId) continue;

    const resStart = res.check_in > rangeStart ? res.check_in : rangeStart;
    const resEnd = res.check_out < rangeEnd ? res.check_out : addDays(parseISO(rangeEnd), 1).toISOString().slice(0, 10);

    if (resStart >= resEnd) continue;

    const offsetDays = differenceInDays(parseISO(resStart), parseISO(rangeStart));
    const widthDays = differenceInDays(parseISO(resEnd), parseISO(resStart));
    if (widthDays <= 0) continue;

    const color = (res.property as any)?.color ?? APP_COLORS.primary;

    blocks.push({
      left: offsetDays * DAY_W,
      width: widthDays * DAY_W - 2,
      color,
      label: res.guest_name,
      isStart: res.check_in >= rangeStart,
      isEnd: res.check_out <= rangeEnd,
      nightsInRange: widthDays,
    });
  }

  return blocks;
}

export default function PlanningScreen() {
  const router = useRouter();
  const { calendarMonth, setCalendarMonth } = useAppStore();
  const { data: properties, isLoading: loadingProps } = useActiveProperties();
  const { width: screenWidth } = useWindowDimensions();

  const { from, to } = useMemo(() => {
    const start = startOfMonth(parseISO(calendarMonth + '-01'));
    const end = endOfMonth(start);
    return { from: toISODateString(start), to: toISODateString(end) };
  }, [calendarMonth]);

  const { data: reservations, isLoading: loadingRes } = useReservationsForMonth(from, to);
  const days = useMemo(() => buildDays(calendarMonth), [calendarMonth]);

  const scrollRef = useRef<ScrollView>(null);

  // Auto-scroll to today if in current month
  useEffect(() => {
    if (!days.length) return;
    const todayIdx = days.indexOf(TODAY);
    if (todayIdx >= 0) {
      const offset = Math.max(0, todayIdx * DAY_W - 60);
      setTimeout(() => scrollRef.current?.scrollTo({ x: offset, animated: false }), 100);
    }
  }, [days]);

  const prevMonth = () => {
    const d = subMonths(parseISO(calendarMonth + '-01'), 1);
    setCalendarMonth(format(d, 'yyyy-MM'));
  };
  const nextMonth = () => {
    const d = addMonths(parseISO(calendarMonth + '-01'), 1);
    setCalendarMonth(format(d, 'yyyy-MM'));
  };

  const isLoading = loadingProps || loadingRes;
  const totalWidth = days.length * DAY_W;

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <MaterialCommunityIcons name="arrow-left" size={22} color="#FFFFFF" />
        </TouchableOpacity>
        <View style={styles.monthNav}>
          <TouchableOpacity onPress={prevMonth} style={styles.navBtn}>
            <MaterialCommunityIcons name="chevron-left" size={22} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.monthTitle}>
            {format(parseISO(calendarMonth + '-01'), 'MMMM yyyy', { locale: fr })
              .replace(/^\w/, (c) => c.toUpperCase())}
          </Text>
          <TouchableOpacity onPress={nextMonth} style={styles.navBtn}>
            <MaterialCommunityIcons name="chevron-right" size={22} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
        <View style={{ width: 36 }} />
      </View>

      {isLoading ? (
        <ActivityIndicator style={{ marginTop: 60 }} color={APP_COLORS.primary} />
      ) : (
        <View style={styles.grid}>
          {/* Top-left corner: empty */}
          <View style={[styles.cornerCell, { width: NAME_W }]} />

          {/* Scrollable area: day header + rows */}
          <ScrollView
            ref={scrollRef}
            horizontal
            showsHorizontalScrollIndicator={false}
            style={{ flex: 1 }}
            bounces={false}
          >
            {/* Day headers */}
            <View style={[styles.dayHeaderRow, { width: totalWidth }]}>
              {days.map((d) => {
                const isToday = d === TODAY;
                const dayNum = parseInt(d.slice(8), 10);
                const dayName = format(parseISO(d), 'EEE', { locale: fr }).slice(0, 2);
                const isWeekend = [6, 0].includes(parseISO(d).getDay());
                return (
                  <View
                    key={d}
                    style={[
                      styles.dayCell,
                      isWeekend && styles.dayCellWeekend,
                      isToday && styles.dayCellToday,
                    ]}
                  >
                    <Text style={[styles.dayName, isToday && styles.dayTextToday, isWeekend && styles.dayTextWeekend]}>
                      {dayName}
                    </Text>
                    <Text style={[styles.dayNum, isToday && styles.dayTextToday, isWeekend && styles.dayTextWeekend]}>
                      {dayNum}
                    </Text>
                  </View>
                );
              })}
            </View>

            {/* Property rows (scrollable part) */}
            {(properties ?? []).map((property, idx) => {
              const blocks = buildBlocks(reservations ?? [], days, property.id);
              const todayIdx = days.indexOf(TODAY);
              return (
                <View
                  key={property.id}
                  style={[styles.propertyRow, { width: totalWidth }, idx % 2 === 1 && styles.rowAlt]}
                >
                  {/* Background grid lines */}
                  {days.map((d, di) => {
                    const isWeekend = [6, 0].includes(parseISO(d).getDay());
                    return (
                      <View
                        key={d}
                        style={[
                          styles.gridCell,
                          { left: di * DAY_W },
                          isWeekend && styles.gridCellWeekend,
                        ]}
                      />
                    );
                  })}

                  {/* Today highlight */}
                  {todayIdx >= 0 && (
                    <View style={[styles.todayLine, { left: todayIdx * DAY_W }]} />
                  )}

                  {/* Reservation blocks */}
                  {blocks.map((b, bi) => (
                    <View
                      key={bi}
                      style={[
                        styles.block,
                        {
                          left: b.left + 1,
                          width: b.width,
                          backgroundColor: b.color,
                          borderTopLeftRadius: b.isStart ? 6 : 0,
                          borderBottomLeftRadius: b.isStart ? 6 : 0,
                          borderTopRightRadius: b.isEnd ? 6 : 0,
                          borderBottomRightRadius: b.isEnd ? 6 : 0,
                        },
                      ]}
                    >
                      {b.nightsInRange >= 2 && (
                        <Text style={styles.blockLabel} numberOfLines={1}>
                          {b.label}
                        </Text>
                      )}
                    </View>
                  ))}
                </View>
              );
            })}
          </ScrollView>

          {/* Property names column (fixed, overlays scroll) */}
          <View style={[styles.namesColumn, { top: HEADER_H }]} pointerEvents="none">
            {(properties ?? []).map((p, idx) => (
              <View
                key={p.id}
                style={[
                  styles.nameCell,
                  idx % 2 === 1 && styles.rowAlt,
                ]}
              >
                <View style={[styles.nameColorDot, { backgroundColor: p.color }]} />
                <Text style={styles.nameText} numberOfLines={2}>{p.name}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Legend */}
      {!isLoading && (
        <View style={styles.legend}>
          <Text style={styles.legendHint}>
            💡 {reservations?.length ?? 0} réservation{(reservations?.length ?? 0) !== 1 ? 's' : ''} ce mois
          </Text>
          <View style={styles.legendTodayDot} />
          <Text style={styles.legendHint}>Aujourd'hui</Text>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: APP_COLORS.background },

  header: {
    backgroundColor: APP_COLORS.primary,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  monthNav: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  navBtn: { padding: 4 },
  monthTitle: { fontSize: 16, fontFamily: FONTS.titleBold, color: '#FFFFFF', minWidth: 160, textAlign: 'center' },

  grid: { flex: 1, flexDirection: 'row' },

  cornerCell: {
    height: HEADER_H,
    backgroundColor: '#F8F9FA',
    borderBottomWidth: 1,
    borderRightWidth: 1,
    borderColor: APP_COLORS.border,
    zIndex: 10,
  },

  dayHeaderRow: {
    height: HEADER_H,
    flexDirection: 'row',
    backgroundColor: '#F8F9FA',
    borderBottomWidth: 1,
    borderBottomColor: APP_COLORS.border,
  },
  dayCell: {
    width: DAY_W,
    height: HEADER_H,
    alignItems: 'center',
    justifyContent: 'center',
    borderRightWidth: 1,
    borderRightColor: APP_COLORS.border + '55',
    gap: 1,
  },
  dayCellWeekend: { backgroundColor: '#F0F4FF' },
  dayCellToday: { backgroundColor: APP_COLORS.primary + '18' },
  dayName: { fontSize: 9, color: APP_COLORS.textSecondary, textTransform: 'uppercase' },
  dayNum: { fontSize: 13, fontWeight: '700', color: APP_COLORS.textPrimary },
  dayTextToday: { color: APP_COLORS.primary },
  dayTextWeekend: { color: '#6366F1' },

  propertyRow: {
    height: ROW_H,
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: APP_COLORS.border + '55',
    position: 'relative',
  },
  rowAlt: { backgroundColor: '#F9FAFB' },

  gridCell: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: DAY_W,
    borderRightWidth: 1,
    borderRightColor: APP_COLORS.border + '33',
  },
  gridCellWeekend: { backgroundColor: '#F0F4FF55' },

  todayLine: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: DAY_W,
    backgroundColor: APP_COLORS.primary + '0F',
    borderLeftWidth: 2,
    borderLeftColor: APP_COLORS.primary + '88',
  },

  block: {
    position: 'absolute',
    top: 10,
    height: ROW_H - 20,
    justifyContent: 'center',
    paddingHorizontal: 6,
    opacity: 0.92,
  },
  blockLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FFFFFF',
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },

  namesColumn: {
    position: 'absolute',
    left: 0,
    bottom: 0,
    width: NAME_W,
    backgroundColor: 'transparent',
  },
  nameCell: {
    height: ROW_H,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 8,
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderBottomWidth: 1,
    borderRightWidth: 1,
    borderColor: APP_COLORS.border + '66',
  },
  nameColorDot: { width: 8, height: 8, borderRadius: 4, flexShrink: 0 },
  nameText: { fontSize: 11, fontWeight: '600', color: APP_COLORS.textPrimary, flex: 1 },

  legend: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: APP_COLORS.border,
  },
  legendHint: { fontSize: 12, color: APP_COLORS.textSecondary },
  legendTodayDot: { width: 12, height: 12, borderRadius: 2, backgroundColor: APP_COLORS.primary + '88', borderLeftWidth: 2, borderLeftColor: APP_COLORS.primary },
});
