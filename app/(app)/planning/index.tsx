import { useMemo, useRef, useState, useCallback } from 'react';
import { View, ScrollView, StyleSheet, TouchableOpacity, NativeSyntheticEvent, NativeScrollEvent } from 'react-native';
import { Text, ActivityIndicator } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import {
  parseISO, addDays, startOfMonth, endOfMonth, format, differenceInDays, subDays,
} from 'date-fns';
import { fr } from 'date-fns/locale';
import { useProperties } from '@/hooks/useProperties';
import { useReservationsForMonth } from '@/hooks/useReservations';
import { APP_COLORS } from '@/constants/colors';
import { FONTS } from '@/constants/typography';
import { toISODateString } from '@/utils/dateHelpers';
import { Reservation } from '@/types';

const DAY_W = 36;
const ROW_H = 52;
const NAME_W = 108;
const HEADER_H = 44;
const MONTHS_BACK = 1;
const MONTHS_FORWARD = 4;
const TODAY = toISODateString(new Date());

/* Build a continuous range of days spanning several months */
function buildRange(): { days: string[]; from: string; to: string } {
  const start = startOfMonth(subDays(parseISO(TODAY), MONTHS_BACK * 30));
  const end = endOfMonth(addDays(parseISO(TODAY), MONTHS_FORWARD * 30));
  const days: string[] = [];
  let cur = start;
  while (cur <= end) {
    days.push(toISODateString(cur));
    cur = addDays(cur, 1);
  }
  return {
    days,
    from: toISODateString(start),
    to: toISODateString(end),
  };
}

type Block = {
  resId: string;
  left: number;
  width: number;
  color: string;
  label: string;
  isStart: boolean;
  isEnd: boolean;
  widthDays: number;
};

function buildBlocks(reservations: Reservation[], days: string[], propertyId: string): Block[] {
  if (!reservations.length || !days.length) return [];
  const rangeStart = days[0];
  const rangeEnd = days[days.length - 1];
  const blocks: Block[] = [];

  for (const res of reservations) {
    if (res.property_id !== propertyId) continue;
    if (res.check_out <= rangeStart || res.check_in > rangeEnd) continue;

    const clampedStart = res.check_in >= rangeStart ? res.check_in : rangeStart;
    const clampedEnd =
      res.check_out <= rangeEnd
        ? res.check_out
        : toISODateString(addDays(parseISO(rangeEnd), 1));

    const offsetDays = differenceInDays(parseISO(clampedStart), parseISO(rangeStart));
    const widthDays = differenceInDays(parseISO(clampedEnd), parseISO(clampedStart));
    if (widthDays <= 0) continue;

    blocks.push({
      resId: res.id,
      left: offsetDays * DAY_W,
      width: widthDays * DAY_W - 3,
      color: (res.property as any)?.color ?? APP_COLORS.primary,
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
  const { data: properties, isLoading: loadingProps } = useProperties();
  const scrollRef = useRef<ScrollView>(null);

  const { days, from, to } = useMemo(() => buildRange(), []);
  const { data: reservations, isLoading: loadingRes } = useReservationsForMonth(from, to);

  const [visibleMonth, setVisibleMonth] = useState(() =>
    format(parseISO(TODAY), 'MMMM yyyy', { locale: fr }).replace(/^\w/, (c) => c.toUpperCase())
  );

  const todayIdx = days.indexOf(TODAY);
  const todayScrollX = NAME_W + todayIdx * DAY_W - 80;

  /* Auto-scroll to today on first load */
  const onContentReady = useCallback(() => {
    if (todayIdx >= 0) {
      scrollRef.current?.scrollTo({ x: Math.max(0, todayScrollX), animated: false });
    }
  }, [todayIdx, todayScrollX]);

  /* Update month label based on scroll position */
  const onScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const x = e.nativeEvent.contentOffset.x;
      const dayIdx = Math.floor((x - NAME_W) / DAY_W);
      const idx = Math.max(0, Math.min(dayIdx, days.length - 1));
      const d = days[idx];
      if (d) {
        const label = format(parseISO(d), 'MMMM yyyy', { locale: fr })
          .replace(/^\w/, (c) => c.toUpperCase());
        setVisibleMonth(label);
      }
    },
    [days]
  );

  const allBlocks = useMemo(() => {
    const result: Record<string, Block[]> = {};
    for (const p of properties ?? []) {
      result[p.id] = buildBlocks(reservations ?? [], days, p.id);
    }
    return result;
  }, [reservations, properties, days]);

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
        <Text style={styles.monthTitle}>{visibleMonth}</Text>
        <TouchableOpacity
          style={styles.todayBtn}
          onPress={() =>
            scrollRef.current?.scrollTo({ x: Math.max(0, todayScrollX), animated: true })
          }
        >
          <Text style={styles.todayBtnText}>Aujourd'hui</Text>
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <ActivityIndicator style={{ marginTop: 60 }} color={APP_COLORS.primary} />
      ) : (
        <ScrollView
          ref={scrollRef}
          horizontal
          showsHorizontalScrollIndicator
          bounces={false}
          scrollEventThrottle={16}
          onScroll={onScroll}
          onContentSizeChange={onContentReady}
          style={{ flex: 1 }}
        >
          <View>
            {/* Day header row */}
            <View style={[styles.headerRow, { width: NAME_W + totalDaysWidth }]}>
              <View style={[styles.cornerCell, { width: NAME_W }]}>
                <Text style={styles.cornerText}>Logements</Text>
              </View>
              {days.map((d) => {
                const isToday = d === TODAY;
                const num = parseInt(d.slice(8), 10);
                const dow = format(parseISO(d), 'EEE', { locale: fr }).slice(0, 2);
                const isWE = [6, 0].includes(parseISO(d).getDay());
                const isFirst = num === 1;
                return (
                  <View
                    key={d}
                    style={[
                      styles.dayCell,
                      isWE && styles.dayCellWE,
                      isToday && styles.dayCellToday,
                      isFirst && styles.dayCellFirst,
                    ]}
                  >
                    {isFirst && (
                      <Text style={styles.monthMark}>
                        {format(parseISO(d), 'MMM', { locale: fr }).toUpperCase()}
                      </Text>
                    )}
                    <Text style={[styles.dow, isToday && styles.textToday, isWE && styles.textWE]}>
                      {dow}
                    </Text>
                    <Text style={[styles.dayNum, isToday && styles.textToday, isWE && styles.textWE]}>
                      {num}
                    </Text>
                  </View>
                );
              })}
            </View>

            {/* Property rows */}
            {(properties ?? []).map((property, idx) => {
              const blocks = allBlocks[property.id] ?? [];
              return (
                <View
                  key={property.id}
                  style={[
                    styles.propertyRow,
                    { width: NAME_W + totalDaysWidth },
                    idx % 2 === 1 && styles.rowAlt,
                    !property.is_active && styles.rowInactive,
                  ]}
                >
                  {/* Property name cell */}
                  <View style={[styles.nameCell, { width: NAME_W }]}>
                    <View style={[styles.colorDot, { backgroundColor: property.color }]} />
                    <Text style={styles.nameText} numberOfLines={2}>{property.name}</Text>
                  </View>

                  {/* Grid area */}
                  <View style={{ width: totalDaysWidth, height: ROW_H }}>
                    {/* Weekend + month separator tints */}
                    {days.map((d, di) => {
                      const isWE = [6, 0].includes(parseISO(d).getDay());
                      const isFirst = d.slice(8) === '01';
                      return (
                        <View
                          key={d}
                          style={[
                            styles.colLine,
                            { left: di * DAY_W, width: DAY_W },
                            isWE && styles.colLineWE,
                            isFirst && styles.colLineFirst,
                          ]}
                        />
                      );
                    })}

                    {/* Today highlight */}
                    {todayIdx >= 0 && (
                      <View style={[styles.todayCol, { left: todayIdx * DAY_W, width: DAY_W }]} />
                    )}

                    {/* Reservation blocks — tappable */}
                    {blocks.map((b, bi) => (
                      <TouchableOpacity
                        key={bi}
                        activeOpacity={0.75}
                        onPress={() => router.push(`/(app)/reservations/${b.resId}` as any)}
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
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              );
            })}
          </View>
        </ScrollView>
      )}

      {/* Footer */}
      {!isLoading && (
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            {reservationCount} réservation{reservationCount !== 1 ? 's' : ''} sur la période
          </Text>
          <View style={styles.legendItem}>
            <View style={styles.todayMark} />
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
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  navBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  monthTitle: {
    fontSize: 16,
    fontFamily: FONTS.titleBold,
    color: '#FFFFFF',
    flex: 1,
    textAlign: 'center',
  },
  todayBtn: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  todayBtnText: { fontSize: 12, color: '#FFFFFF', fontWeight: '600' },

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
    paddingHorizontal: 6,
  },
  cornerText: { fontSize: 10, fontWeight: '700', color: APP_COLORS.textSecondary, textTransform: 'uppercase' },
  dayCell: {
    width: DAY_W,
    height: HEADER_H,
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: 4,
    borderRightWidth: 1,
    borderRightColor: APP_COLORS.border + '44',
    gap: 0,
  },
  dayCellWE: { backgroundColor: '#E8ECFA' },
  dayCellToday: { backgroundColor: APP_COLORS.primary + '22' },
  dayCellFirst: { borderLeftWidth: 2, borderLeftColor: APP_COLORS.border },
  monthMark: {
    position: 'absolute',
    top: 3,
    fontSize: 7,
    fontWeight: '800',
    color: APP_COLORS.primary,
    letterSpacing: 0.5,
  },
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
  rowInactive: { opacity: 0.45 },

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
  colLineWE: { backgroundColor: '#F0F4FF55' },
  colLineFirst: { borderLeftWidth: 2, borderLeftColor: APP_COLORS.border + '88' },
  todayCol: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    backgroundColor: APP_COLORS.primary + '14',
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
  todayMark: {
    width: 14,
    height: 14,
    borderRadius: 2,
    backgroundColor: APP_COLORS.primary + '20',
    borderLeftWidth: 2,
    borderLeftColor: APP_COLORS.primary,
  },
});
