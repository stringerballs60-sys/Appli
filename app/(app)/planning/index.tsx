import { useMemo, useRef, useEffect } from 'react';
import { View, ScrollView, StyleSheet, TouchableOpacity, useWindowDimensions } from 'react-native';
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

const DAY_W = 36;
const ROW_H = 52;
const NAME_W = 108;
const HEADER_H = 44;
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
  widthDays: number;
};

function buildAllBlocks(
  reservations: Reservation[],
  days: string[],
  propertyId: string
): Block[] {
  if (!reservations.length || !days.length) return [];
  const rangeStart = days[0];
  const rangeEnd = days[days.length - 1];
  const blocks: Block[] = [];

  for (const res of reservations) {
    if (res.property_id !== propertyId) continue;
    if (res.check_out <= rangeStart) continue;
    if (res.check_in > rangeEnd) continue;

    const clampedStart = res.check_in >= rangeStart ? res.check_in : rangeStart;
    const clampedEnd = res.check_out <= rangeEnd ? res.check_out : toISODateString(addDays(parseISO(rangeEnd), 1));

    const offsetDays = differenceInDays(parseISO(clampedStart), parseISO(rangeStart));
    const widthDays = differenceInDays(parseISO(clampedEnd), parseISO(clampedStart));
    if (widthDays <= 0) continue;

    const color = (res.property as any)?.color ?? APP_COLORS.primary;
    blocks.push({
      left: offsetDays * DAY_W,
      width: widthDays * DAY_W - 3,
      color,
      label: res.guest_name,
      isStart: res.check_in >= rangeStart,
      isEnd: res.check_out <= rangeEnd,
      widthDays,
    });
  }
  return blocks;
}

export default function PlanningScreen() {
  const router = useRouter();
  const { calendarMonth, setCalendarMonth } = useAppStore();
  const { data: properties, isLoading: loadingProps } = useActiveProperties();
  const scrollRef = useRef<ScrollView>(null);

  const { from, to } = useMemo(() => {
    const start = startOfMonth(parseISO(calendarMonth + '-01'));
    const end = endOfMonth(start);
    return { from: toISODateString(start), to: toISODateString(end) };
  }, [calendarMonth]);

  const { data: reservations, isLoading: loadingRes } = useReservationsForMonth(from, to);
  const days = useMemo(() => buildDays(calendarMonth), [calendarMonth]);

  const allBlocks = useMemo(() => {
    const result: Record<string, Block[]> = {};
    for (const p of (properties ?? [])) {
      result[p.id] = buildAllBlocks(reservations ?? [], days, p.id);
    }
    return result;
  }, [reservations, properties, days]);

  useEffect(() => {
    const todayIdx = days.indexOf(TODAY);
    if (todayIdx < 0) return;
    const offset = Math.max(0, NAME_W + todayIdx * DAY_W - 80);
    setTimeout(() => scrollRef.current?.scrollTo({ x: offset, animated: false }), 150);
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
  const totalDaysWidth = days.length * DAY_W;
  const reservationCount = (reservations ?? []).length;

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.navBtn}>
          <MaterialCommunityIcons name="arrow-left" size={22} color="#FFFFFF" />
        </TouchableOpacity>
        <View style={styles.monthRow}>
          <TouchableOpacity onPress={prevMonth} style={styles.navBtn}>
            <MaterialCommunityIcons name="chevron-left" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.monthTitle}>
            {format(parseISO(calendarMonth + '-01'), 'MMMM yyyy', { locale: fr })
              .replace(/^\w/, (c) => c.toUpperCase())}
          </Text>
          <TouchableOpacity onPress={nextMonth} style={styles.navBtn}>
            <MaterialCommunityIcons name="chevron-right" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
        <View style={styles.navBtn} />
      </View>

      {isLoading ? (
        <ActivityIndicator style={{ marginTop: 60 }} color={APP_COLORS.primary} />
      ) : (
        <ScrollView
          ref={scrollRef}
          horizontal
          showsHorizontalScrollIndicator
          bounces={false}
          style={{ flex: 1 }}
        >
          {/* All content scrolls together */}
          <View>
            {/* Day header row */}
            <View style={[styles.headerRow, { width: NAME_W + totalDaysWidth }]}>
              {/* Top-left corner */}
              <View style={[styles.cornerCell, { width: NAME_W }]} />
              {/* Day cells */}
              {days.map((d) => {
                const isToday = d === TODAY;
                const num = parseInt(d.slice(8), 10);
                const dow = format(parseISO(d), 'EEE', { locale: fr }).slice(0, 2);
                const isWeekend = [6, 0].includes(parseISO(d).getDay());
                return (
                  <View
                    key={d}
                    style={[
                      styles.dayCell,
                      isWeekend && styles.dayCellWE,
                      isToday && styles.dayCellToday,
                    ]}
                  >
                    <Text style={[styles.dow, isToday && styles.textToday, isWeekend && styles.textWE]}>
                      {dow}
                    </Text>
                    <Text style={[styles.dayNum, isToday && styles.textToday, isWeekend && styles.textWE]}>
                      {num}
                    </Text>
                  </View>
                );
              })}
            </View>

            {/* Property rows */}
            {(properties ?? []).map((property, idx) => {
              const blocks = allBlocks[property.id] ?? [];
              const todayIdx = days.indexOf(TODAY);
              return (
                <View
                  key={property.id}
                  style={[
                    styles.propertyRow,
                    { width: NAME_W + totalDaysWidth },
                    idx % 2 === 1 && styles.rowAlt,
                  ]}
                >
                  {/* Property name cell */}
                  <View style={[styles.nameCell, { width: NAME_W }]}>
                    <View style={[styles.colorDot, { backgroundColor: property.color }]} />
                    <Text style={styles.nameText} numberOfLines={2}>{property.name}</Text>
                  </View>

                  {/* Grid area for this property */}
                  <View style={{ width: totalDaysWidth, height: ROW_H }}>
                    {/* Column separators + weekend tint */}
                    {days.map((d, di) => {
                      const isWE = [6, 0].includes(parseISO(d).getDay());
                      return (
                        <View
                          key={d}
                          style={[
                            styles.colLine,
                            { left: di * DAY_W, width: DAY_W },
                            isWE && styles.colLineWE,
                          ]}
                        />
                      );
                    })}

                    {/* Today column highlight */}
                    {todayIdx >= 0 && (
                      <View
                        style={[
                          styles.todayCol,
                          { left: todayIdx * DAY_W, width: DAY_W },
                        ]}
                      />
                    )}

                    {/* Reservation blocks */}
                    {blocks.map((b, bi) => (
                      <View
                        key={bi}
                        style={[
                          styles.block,
                          {
                            left: b.left,
                            width: b.width,
                            backgroundColor: b.color,
                            borderTopLeftRadius: b.isStart ? 6 : 0,
                            borderBottomLeftRadius: b.isStart ? 6 : 0,
                            borderTopRightRadius: b.isEnd ? 6 : 0,
                            borderBottomRightRadius: b.isEnd ? 6 : 0,
                          },
                        ]}
                      >
                        {b.widthDays >= 2 && (
                          <Text style={styles.blockText} numberOfLines={1}>
                            {b.label}
                          </Text>
                        )}
                      </View>
                    ))}
                  </View>
                </View>
              );
            })}
          </View>
        </ScrollView>
      )}

      {/* Footer legend */}
      {!isLoading && (
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            💡 {reservationCount} réservation{reservationCount !== 1 ? 's' : ''} ce mois
          </Text>
          <View style={styles.legendItem}>
            <View style={styles.todayBadge} />
            <Text style={styles.footerText}>Aujourd'hui</Text>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: APP_COLORS.background },

  header: {
    backgroundColor: APP_COLORS.primary,
    paddingHorizontal: 12,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  navBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  monthRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  monthTitle: {
    fontSize: 16,
    fontFamily: FONTS.titleBold,
    color: '#FFFFFF',
    minWidth: 160,
    textAlign: 'center',
  },

  headerRow: {
    height: HEADER_H,
    flexDirection: 'row',
    backgroundColor: '#F0F2F5',
    borderBottomWidth: 1,
    borderBottomColor: APP_COLORS.border,
  },
  cornerCell: {
    height: HEADER_H,
    backgroundColor: '#F0F2F5',
    borderRightWidth: 2,
    borderRightColor: APP_COLORS.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dayCell: {
    width: DAY_W,
    height: HEADER_H,
    alignItems: 'center',
    justifyContent: 'center',
    borderRightWidth: 1,
    borderRightColor: APP_COLORS.border + '44',
    gap: 1,
  },
  dayCellWE: { backgroundColor: '#E8ECFA' },
  dayCellToday: { backgroundColor: APP_COLORS.primary + '22' },
  dow: { fontSize: 8, color: APP_COLORS.textSecondary, textTransform: 'uppercase', fontWeight: '600' },
  dayNum: { fontSize: 13, fontWeight: '700', color: APP_COLORS.textPrimary },
  textToday: { color: APP_COLORS.primary },
  textWE: { color: '#4F46E5' },

  propertyRow: {
    height: ROW_H,
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: APP_COLORS.border + '55',
    backgroundColor: '#FFFFFF',
  },
  rowAlt: { backgroundColor: '#F9FAFB' },

  nameCell: {
    height: ROW_H,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 8,
    borderRightWidth: 2,
    borderRightColor: APP_COLORS.border,
    backgroundColor: 'rgba(255,255,255,0.97)',
  },
  colorDot: { width: 9, height: 9, borderRadius: 5, flexShrink: 0 },
  nameText: { fontSize: 11, fontWeight: '600', color: APP_COLORS.textPrimary, flex: 1 },

  colLine: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    borderRightWidth: 1,
    borderRightColor: APP_COLORS.border + '33',
  },
  colLineWE: { backgroundColor: '#F0F4FF66' },
  todayCol: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    backgroundColor: APP_COLORS.primary + '12',
    borderLeftWidth: 2,
    borderLeftColor: APP_COLORS.primary + 'AA',
  },

  block: {
    position: 'absolute',
    top: 11,
    height: ROW_H - 22,
    justifyContent: 'center',
    paddingHorizontal: 5,
  },
  blockText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
    textShadowColor: 'rgba(0,0,0,0.4)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },

  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: APP_COLORS.border,
  },
  footerText: { fontSize: 12, color: APP_COLORS.textSecondary },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  todayBadge: {
    width: 14,
    height: 14,
    borderRadius: 2,
    backgroundColor: APP_COLORS.primary + '22',
    borderLeftWidth: 2,
    borderLeftColor: APP_COLORS.primary,
  },
});
