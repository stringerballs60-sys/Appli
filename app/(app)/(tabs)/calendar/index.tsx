import { useCallback, useRef, useState, useEffect, useMemo } from 'react';
import {
  View,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  NativeSyntheticEvent,
  NativeScrollEvent,
  Modal,
  Pressable,
  LayoutChangeEvent,
} from 'react-native';
import { Text, ActivityIndicator } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  addDays,
  addMonths,
  differenceInDays,
  endOfMonth,
  format,
  isToday,
  isSameMonth,
  parseISO,
  startOfMonth,
  subMonths,
} from 'date-fns';
import { fr } from 'date-fns/locale';
import { FontAwesome5 } from '@expo/vector-icons';
import { useReservationsForMonth } from '@/hooks/useReservations';
import { useActiveProperties } from '@/hooks/useProperties';
import { APP_COLORS } from '@/constants/colors';
import { Reservation, ReservationSource, Property } from '@/types';

// ── Layout ────────────────────────────────────────────────────────────────────
const SIDEBAR_WIDTH = 76;
const DAY_WIDTH = 46;
const MONTH_NAV_HEIGHT = 54;
const DAY_HEADER_HEIGHT = 54;
const MIN_ROW_HEIGHT = 44;
const BLOCK_PADDING = 7;
const MAX_DATE = new Date(2026, 9, 30); // 30 octobre 2026 — limite absolue

// ── Platform config ───────────────────────────────────────────────────────────
function getPlatformCfg(category?: string, source?: string): { bg: string; icon?: string; label?: string } | null {
  // Category takes priority — covers manual entries with Airbnb category
  if (category?.startsWith('AIRBNB')) return { bg: '#FF5A5F', icon: 'airbnb' };
  if (category === 'BOOKING') return { bg: '#003580', label: 'B' };
  if (category === 'ABRITEL') return { bg: '#FF6600', label: 'V' };
  // Fallback to source for uncategorised entries
  if (source === 'airbnb') return { bg: '#FF5A5F', icon: 'airbnb' };
  if (source === 'booking') return { bg: '#003580', label: 'B' };
  if (source === 'abritel') return { bg: '#FF6600', label: 'V' };
  return null;
}

function SourceBadge({ category, source, size = 15, style }: { category?: string; source?: string; size?: number; style?: any }) {
  const cfg = getPlatformCfg(category, source);
  if (!cfg) return null;
  return (
    <View style={[{
      width: size,
      height: size,
      borderRadius: size / 2,
      backgroundColor: cfg.bg,
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 1.5,
      borderColor: 'rgba(255,255,255,0.55)',
    }, style]}>
      {cfg.icon ? (
        <FontAwesome5 name={cfg.icon} size={size * 0.6} color="#FFFFFF" brand />
      ) : (
        <Text style={{ fontSize: size * 0.5, fontWeight: '900', color: '#FFFFFF' }}>{cfg.label}</Text>
      )}
    </View>
  );
}

function getBlockGeometry(resa: Reservation, startDate: Date) {
  const checkIn = parseISO(resa.check_in);
  const dayOffset = differenceInDays(checkIn, startDate);
  const clampedOffset = Math.max(0, dayOffset);
  const visibleNights = dayOffset < 0 ? resa.nb_nights + dayOffset : resa.nb_nights;
  return {
    left: clampedOffset * DAY_WIDTH + 2,
    width: Math.max(visibleNights * DAY_WIDTH - 4, 0),
  };
}

// ── Preview Sheet ─────────────────────────────────────────────────────────────
interface PreviewSheetProps {
  resa: Reservation;
  onClose: () => void;
  onViewDetail: () => void;
}

function ReservationPreviewSheet({ resa, onClose, onViewDetail }: PreviewSheetProps) {
  const property = resa.property as Property | undefined;
  const today = new Date().toISOString().slice(0, 10);

  const isOngoing = resa.check_in <= today && resa.check_out > today;
  const isDone    = resa.check_out <= today;
  const isPending = resa.status === 'pending';

  const stayLabel = isOngoing ? 'En cours' : isDone ? 'Terminée' : isPending ? 'En attente' : 'À venir';
  const stayColor = isOngoing
    ? APP_COLORS.primary
    : isDone
    ? '#95A5A6'
    : isPending
    ? APP_COLORS.warning
    : APP_COLORS.success;

  const cleaningReady = property?.cleaning_status === 'ready';
  const cleaningLabel = cleaningReady ? 'Prêt' : 'À faire';
  const cleaningColor = cleaningReady ? APP_COLORS.success : APP_COLORS.warning;

  const totalGuests = resa.nb_couples * 2 + resa.nb_solo_adults + resa.nb_children + resa.nb_babies;

  return (
    <Modal transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={sheet.overlay} onPress={onClose}>
        <Pressable style={sheet.container} onPress={() => {}}>
          <View style={sheet.handle} />

          {/* Header */}
          <View style={sheet.header}>
            {property && <View style={[sheet.colorStrip, { backgroundColor: property.color }]} />}
            <View style={{ flex: 1, paddingLeft: 12 }}>
              <Text style={sheet.guestName} numberOfLines={1}>{resa.guest_name}</Text>
              {property && <Text style={sheet.propertyName}>{property.name}</Text>}
            </View>
            <SourceBadge category={resa.category} source={resa.source} size={32} />
          </View>

          {/* Date range */}
          <View style={sheet.dateRow}>
            <View style={sheet.dateBlock}>
              <Text style={sheet.dateLabel}>Arrivée</Text>
              <Text style={sheet.dateValue}>
                {format(parseISO(resa.check_in), 'EEE d MMM', { locale: fr })}
              </Text>
            </View>
            <View style={sheet.nightsPill}>
              <Text style={sheet.nightsNum}>{resa.nb_nights}</Text>
              <Text style={sheet.nightsLabel}>nuits</Text>
            </View>
            <View style={[sheet.dateBlock, { alignItems: 'flex-end' }]}>
              <Text style={sheet.dateLabel}>Départ</Text>
              <Text style={sheet.dateValue}>
                {format(parseISO(resa.check_out), 'EEE d MMM', { locale: fr })}
              </Text>
            </View>
          </View>

          {/* Status row */}
          <View style={sheet.metaRow}>
            <View style={[sheet.pill, {
              backgroundColor: stayColor + '22',
              borderColor: stayColor,
            }]}>
              <View style={[sheet.pillDot, { backgroundColor: stayColor }]} />
              <Text style={[sheet.pillText, { color: stayColor }]}>{stayLabel}</Text>
            </View>

            <View style={[sheet.pill, {
              backgroundColor: cleaningColor + '22',
              borderColor: cleaningColor,
            }]}>
              <Text style={[sheet.pillText, { color: cleaningColor }]}>
                {cleaningReady ? '✓ ' : ''}{cleaningLabel}
              </Text>
            </View>

            {totalGuests > 0 && (
              <Text style={sheet.guestsText}>{totalGuests} voy.</Text>
            )}
          </View>

          {/* Actions */}
          <View style={sheet.actions}>
            <TouchableOpacity style={sheet.btnClose} onPress={onClose}>
              <Text style={sheet.btnCloseText}>Fermer</Text>
            </TouchableOpacity>
            <TouchableOpacity style={sheet.btnDetail} onPress={onViewDetail}>
              <Text style={sheet.btnDetailText}>Voir le détail →</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ── Calendar Screen ───────────────────────────────────────────────────────────
export default function CalendarScreen() {
  const router = useRouter();
  const headerScrollRef = useRef<ScrollView>(null);
  const contentScrollRef = useRef<ScrollView>(null);

  // Window anchor = first month displayed
  const [windowStart, setWindowStart] = useState(() => startOfMonth(new Date()));
  // Displayed month = derived from scroll, shown in header
  const [displayedMonth, setDisplayedMonth] = useState(() => startOfMonth(new Date()));
  const [selectedResa, setSelectedResa] = useState<Reservation | null>(null);
  const [gridHeight, setGridHeight] = useState(0);

  const startDate = windowStart;
  const endDate = MAX_DATE; // limite fixe au 30 octobre 2026
  const TOTAL_DAYS = Math.max(1, differenceInDays(endDate, startDate) + 1);
  const days = Array.from({ length: TOTAL_DAYS }, (_, i) => addDays(startDate, i));

  const from = format(startDate, 'yyyy-MM-dd');
  const to = format(addDays(endDate, 1), 'yyyy-MM-dd');

  const { data: reservations, isLoading: resaLoading } = useReservationsForMonth(from, to);
  const { data: properties, isLoading: propLoading } = useActiveProperties();

  const isLoading = resaLoading || propLoading;
  const numProps = (properties ?? []).length;

  const ROW_HEIGHT = numProps > 0 && gridHeight > 0
    ? Math.max(MIN_ROW_HEIGHT, Math.floor(gridHeight / numProps))
    : 60;

  const todayDayIndex = differenceInDays(new Date(), startDate);

  // Catégorisation des jours par activité (toutes propriétés confondues)
  const { arrivalDays, departureDays, turnoverDays } = useMemo(() => {
    const checkIns = new Set<string>();
    const checkOuts = new Set<string>();
    (reservations ?? []).forEach(r => {
      checkIns.add(r.check_in);
      checkOuts.add(r.check_out);
    });
    const arrivals = new Set<string>();
    const departures = new Set<string>();
    const turnovers = new Set<string>();
    days.forEach(day => {
      const d = format(day, 'yyyy-MM-dd');
      const hasIn = checkIns.has(d);
      const hasOut = checkOuts.has(d);
      if (hasIn && hasOut) turnovers.add(d);
      else if (hasIn) arrivals.add(d);
      else if (hasOut) departures.add(d);
    });
    return { arrivalDays: arrivals, departureDays: departures, turnoverDays: turnovers };
  }, [reservations, days]);

  // Scroll to today (or start of displayed month) when window changes
  useEffect(() => {
    const targetDay = isSameMonth(new Date(), windowStart)
      ? Math.max(0, todayDayIndex - 2)
      : 0;
    const offset = targetDay * DAY_WIDTH;
    setTimeout(() => {
      contentScrollRef.current?.scrollTo({ x: offset, animated: false });
      headerScrollRef.current?.scrollTo({ x: offset, animated: false });
    }, 150);
  }, [windowStart]);

  // Update header month label as user scrolls
  const handleContentScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const x = e.nativeEvent.contentOffset.x;
      headerScrollRef.current?.scrollTo({ x, animated: false });

      const dayIndex = Math.floor((x + DAY_WIDTH / 2) / DAY_WIDTH);
      const visibleDate = addDays(startDate, Math.max(0, Math.min(dayIndex, TOTAL_DAYS - 1)));
      const newMonth = startOfMonth(visibleDate);
      setDisplayedMonth(prev => isSameMonth(prev, newMonth) ? prev : newMonth);
    },
    [startDate, TOTAL_DAYS]
  );

  const scrollToMonth = useCallback((targetMonth: Date) => {
    const targetStart = startOfMonth(targetMonth);
    if (targetStart > MAX_DATE) return; // bloqué au 30 octobre

    if (targetStart < windowStart) {
      setWindowStart(targetStart);
      return; // useEffect scrolle après re-render
    }

    const offset = Math.max(0, differenceInDays(targetStart, startDate)) * DAY_WIDTH;
    contentScrollRef.current?.scrollTo({ x: offset, animated: true });
    headerScrollRef.current?.scrollTo({ x: offset, animated: true });
    setDisplayedMonth(targetStart);
  }, [windowStart, startDate]);

  const handleGridLayout = useCallback((e: LayoutChangeEvent) => {
    setGridHeight(e.nativeEvent.layout.height);
  }, []);

  const getResaForProperty = (propertyId: string): Reservation[] =>
    (reservations ?? []).filter(r => r.property_id === propertyId && r.status !== 'cancelled');

  const todayLineLeft = todayDayIndex >= 0 && todayDayIndex < TOTAL_DAYS
    ? todayDayIndex * DAY_WIDTH + DAY_WIDTH / 2 - 1
    : -10;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>

      {/* ── Month nav ── */}
      <View style={styles.monthNav}>
        <TouchableOpacity
          style={styles.navBtn}
          onPress={() => scrollToMonth(subMonths(displayedMonth, 1))}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Text style={styles.navArrow}>‹</Text>
        </TouchableOpacity>

        <Text style={styles.monthTitle}>
          {format(displayedMonth, 'MMMM yyyy', { locale: fr })}
        </Text>

        <TouchableOpacity
          style={[styles.navBtn, isSameMonth(displayedMonth, MAX_DATE) && styles.navBtnDisabled]}
          onPress={() => scrollToMonth(addMonths(displayedMonth, 1))}
          disabled={isSameMonth(displayedMonth, MAX_DATE)}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Text style={[styles.navArrow, isSameMonth(displayedMonth, MAX_DATE) && { opacity: 0.25 }]}>›</Text>
        </TouchableOpacity>

        {!isSameMonth(displayedMonth, new Date()) && (
          <TouchableOpacity
            style={styles.todayBtn}
            onPress={() => scrollToMonth(startOfMonth(new Date()))}
          >
            <Text style={styles.todayBtnText}>Auj.</Text>
          </TouchableOpacity>
        )}
      </View>

      {isLoading ? (
        <ActivityIndicator style={{ flex: 1 }} color={APP_COLORS.primary} />
      ) : (
        <View style={styles.calendarWrapper}>

          {/* ── Day headers ── */}
          <View style={styles.dayHeaderRow}>
            <View style={{ width: SIDEBAR_WIDTH, borderRightWidth: 1.5, borderRightColor: APP_COLORS.border }} />
            <ScrollView
              horizontal
              ref={headerScrollRef}
              scrollEnabled={false}
              showsHorizontalScrollIndicator={false}
            >
              {days.map((day, i) => {
                const isT = isToday(day);
                const d = format(day, 'yyyy-MM-dd');
                const isArrival  = arrivalDays.has(d);
                const isDeparture = departureDays.has(d);
                const isTurnover = turnoverDays.has(d);
                const isFirst = day.getDate() === 1;
                return (
                  <View
                    key={i}
                    style={[
                      styles.dayHeader,
                      { width: DAY_WIDTH },
                      isDeparture && styles.dayHeaderDeparture,
                      isArrival   && styles.dayHeaderArrival,
                      isTurnover  && styles.dayHeaderTurnover,
                      isT && styles.dayHeaderToday,
                      isFirst && styles.dayHeaderFirst,
                    ]}
                  >
                    {isFirst && (
                      <Text style={styles.monthMini} numberOfLines={1}>
                        {format(day, 'MMM', { locale: fr })}
                      </Text>
                    )}
                    <View style={[styles.dayNumWrap, isT && styles.dayNumWrapToday]}>
                      <Text style={[styles.dayNum, isT && styles.dayNumToday]}>
                        {format(day, 'd')}
                      </Text>
                    </View>
                    <Text style={[
                      styles.dayLabel,
                      isDeparture && styles.dayLabelDeparture,
                      isArrival   && styles.dayLabelArrival,
                      isTurnover  && styles.dayLabelTurnover,
                      isT && styles.dayLabelToday,
                    ]}>
                      {format(day, 'EEE', { locale: fr })}
                    </Text>
                    {(isDeparture || isArrival || isTurnover) && (
                      <View style={[
                        styles.dayIndicator,
                        isDeparture && { backgroundColor: '#F59E0B' },
                        isArrival   && { backgroundColor: '#EA580C' },
                        isTurnover  && { backgroundColor: '#7C3AED' },
                      ]} />
                    )}
                  </View>
                );
              })}
            </ScrollView>
          </View>

          {/* ── Grid ── */}
          <View style={styles.gridContainer} onLayout={handleGridLayout}>

            {/* Sidebar */}
            <View style={[styles.sidebar, { width: SIDEBAR_WIDTH }]}>
              {(properties ?? []).map((p, pi) => (
                <View key={p.id} style={[
                  styles.propertyCell,
                  { height: ROW_HEIGHT },
                  pi % 2 === 1 && styles.propertyCellAlt,
                ]}>
                  <View style={[styles.colorBar, { backgroundColor: p.color }]} />
                  <Text
                    style={styles.propertyName}
                    numberOfLines={2}
                    adjustsFontSizeToFit
                    minimumFontScale={0.65}
                  >
                    {p.name}
                  </Text>
                </View>
              ))}
            </View>

            {/* Scrollable grid */}
            <ScrollView
              horizontal
              ref={contentScrollRef}
              onScroll={handleContentScroll}
              scrollEventThrottle={16}
              showsHorizontalScrollIndicator={false}
              style={{ flex: 1 }}
            >
              <View style={{ width: TOTAL_DAYS * DAY_WIDTH }}>

                {/* Today line */}
                {todayDayIndex >= 0 && todayDayIndex < TOTAL_DAYS && (
                  <View style={[styles.todayLine, {
                    left: todayLineLeft,
                    height: numProps * ROW_HEIGHT,
                  }]} />
                )}

                {/* Month separator lines */}
                {days.map((day, i) => day.getDate() === 1 && i > 0 ? (
                  <View key={`sep-${i}`} style={[styles.monthSep, {
                    left: i * DAY_WIDTH,
                    height: numProps * ROW_HEIGHT,
                  }]} />
                ) : null)}

                {/* Property rows */}
                {(properties ?? []).map((property, pi) => {
                  const rowResas = getResaForProperty(property.id);
                  return (
                    <View key={property.id} style={[
                      styles.propertyRow,
                      { height: ROW_HEIGHT },
                      pi % 2 === 1 && styles.propertyRowAlt,
                    ]}>

                      {/* Column backgrounds */}
                      {days.map((day, i) => {
                        const d = format(day, 'yyyy-MM-dd');
                        const isArrival  = arrivalDays.has(d);
                        const isDeparture = departureDays.has(d);
                        const isTurnover = turnoverDays.has(d);
                        const isT = isToday(day);
                        if (!isArrival && !isDeparture && !isTurnover && !isT) return null;
                        return (
                          <View
                            key={i}
                            style={[
                              styles.dayCol,
                              { left: i * DAY_WIDTH, height: ROW_HEIGHT },
                              isDeparture && styles.dayColDeparture,
                              isArrival   && styles.dayColArrival,
                              isTurnover  && styles.dayColTurnover,
                              isT && styles.dayColToday,
                            ]}
                          />
                        );
                      })}

                      {/* Grid lines */}
                      {days.map((_, i) => (
                        <View key={`gl-${i}`} style={[styles.gridLine, { left: i * DAY_WIDTH, height: ROW_HEIGHT }]} />
                      ))}

                      {/* Reservation blocks */}
                      {rowResas.map((resa) => {
                        const { left, width } = getBlockGeometry(resa, startDate);
                        if (width <= 0) return null;
                        const isPending = resa.status === 'pending';
                        const blockH = ROW_HEIGHT - BLOCK_PADDING * 2;

                        return (
                          <TouchableOpacity
                            key={resa.id}
                            style={[
                              styles.resaBlock,
                              {
                                left,
                                width,
                                height: blockH,
                                top: BLOCK_PADDING,
                                backgroundColor: property.color,
                              },
                              isPending && styles.resaBlockPending,
                            ]}
                            onPress={() => setSelectedResa({ ...resa, property })}
                            activeOpacity={0.7}
                          >
                            <Text style={styles.resaName} numberOfLines={1}>
                              {resa.guest_name}
                            </Text>
                            {width > 68 && (
                              <Text style={styles.resaNights}>{resa.nb_nights}n</Text>
                            )}
                            {width > 42 && (
                              <SourceBadge category={resa.category} source={resa.source} size={15} />
                            )}
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  );
                })}
              </View>
            </ScrollView>
          </View>
        </View>
      )}

      {/* Preview sheet */}
      {selectedResa && (
        <ReservationPreviewSheet
          resa={selectedResa}
          onClose={() => setSelectedResa(null)}
          onViewDetail={() => {
            setSelectedResa(null);
            router.push(`/(app)/reservations/${selectedResa.id}`);
          }}
        />
      )}
    </SafeAreaView>
  );
}

// ── Calendar Styles ───────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#0F2240',
  },
  monthNav: {
    height: MONTH_NAV_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    backgroundColor: APP_COLORS.primary,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  navBtn: {
    width: 38,
    height: 38,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.14)',
  },
  navBtnDisabled: {
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  navArrow: {
    fontSize: 24,
    color: '#FFFFFF',
    lineHeight: 28,
    fontWeight: '300',
  },
  monthTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
    textTransform: 'capitalize',
    letterSpacing: 0.4,
  },
  todayBtn: {
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: APP_COLORS.accent + 'CC',
    marginLeft: 8,
  },
  todayBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },

  calendarWrapper: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },

  // Day header row
  dayHeaderRow: {
    height: DAY_HEADER_HEIGHT,
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 2,
    borderBottomColor: APP_COLORS.primary + '18',
  },
  dayHeader: {
    width: DAY_WIDTH,
    justifyContent: 'center',
    alignItems: 'center',
    borderRightWidth: 1,
    borderRightColor: APP_COLORS.border,
    paddingTop: 2,
    gap: 1,
  },
  dayHeaderDeparture: {
    backgroundColor: '#FFFBEB',
  },
  dayHeaderArrival: {
    backgroundColor: '#FFF4ED',
  },
  dayHeaderTurnover: {
    backgroundColor: '#F5F3FF',
  },
  dayIndicator: {
    position: 'absolute',
    bottom: 0,
    left: 4,
    right: 4,
    height: 3,
    borderRadius: 2,
  },
  dayHeaderToday: {
    backgroundColor: APP_COLORS.primary + '0D',
  },
  dayHeaderFirst: {
    borderLeftWidth: 2,
    borderLeftColor: APP_COLORS.primary + '40',
  },
  monthMini: {
    fontSize: 8,
    fontWeight: '700',
    color: APP_COLORS.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    position: 'absolute',
    top: 3,
  },
  dayNumWrap: {
    width: 26,
    height: 26,
    borderRadius: 13,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dayNumWrapToday: {
    backgroundColor: APP_COLORS.primary,
  },
  dayNum: {
    fontSize: 14,
    fontWeight: '600',
    color: APP_COLORS.textPrimary,
  },
  dayNumToday: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  dayLabel: {
    fontSize: 8.5,
    color: APP_COLORS.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  dayLabelDeparture: {
    color: '#B45309',
    fontWeight: '700',
  },
  dayLabelArrival: {
    color: '#9A3412',
    fontWeight: '700',
  },
  dayLabelTurnover: {
    color: '#5B21B6',
    fontWeight: '700',
  },
  dayLabelToday: {
    color: APP_COLORS.primary,
    fontWeight: '700',
  },

  // Grid
  gridContainer: {
    flex: 1,
    flexDirection: 'row',
    overflow: 'hidden',
  },
  sidebar: {
    borderRightWidth: 2,
    borderRightColor: APP_COLORS.primary + '20',
    backgroundColor: '#FAFBFC',
  },
  propertyCell: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: APP_COLORS.border,
    paddingRight: 6,
    overflow: 'hidden',
    backgroundColor: '#FAFBFC',
  },
  propertyCellAlt: {
    backgroundColor: '#F3F4F6',
  },
  colorBar: {
    width: 5,
    alignSelf: 'stretch',
    marginRight: 6,
  },
  propertyName: {
    flex: 1,
    fontSize: 10.5,
    fontWeight: '600',
    color: APP_COLORS.textPrimary,
    lineHeight: 13,
  },

  // Grid content
  propertyRow: {
    position: 'relative',
    borderBottomWidth: 1,
    borderBottomColor: APP_COLORS.border,
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
  },
  propertyRowAlt: {
    backgroundColor: '#FAFBFC',
  },
  dayCol: {
    position: 'absolute',
    top: 0,
    width: DAY_WIDTH,
  },
  dayColDeparture: {
    backgroundColor: '#FFFBEB',
  },
  dayColArrival: {
    backgroundColor: '#FFF4ED',
  },
  dayColTurnover: {
    backgroundColor: '#F5F3FF',
  },
  dayColToday: {
    backgroundColor: APP_COLORS.primary + '0B',
  },
  gridLine: {
    position: 'absolute',
    top: 0,
    width: 1,
    backgroundColor: '#F0F0F0',
  },
  todayLine: {
    position: 'absolute',
    top: 0,
    width: 2,
    backgroundColor: APP_COLORS.danger,
    opacity: 0.85,
    zIndex: 10,
    borderRadius: 1,
  },
  monthSep: {
    position: 'absolute',
    top: 0,
    width: 2,
    backgroundColor: APP_COLORS.primary + '30',
    zIndex: 5,
  },

  // Reservation blocks
  resaBlock: {
    position: 'absolute',
    borderRadius: 8,
    paddingHorizontal: 7,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.22,
    shadowRadius: 5,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.30)',
    overflow: 'hidden',
  },
  resaBlockPending: {
    opacity: 0.58,
  },
  resaName: {
    flex: 1,
    fontSize: 10.5,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.1,
  },
  resaNights: {
    fontSize: 9.5,
    color: 'rgba(255,255,255,0.82)',
    fontWeight: '600',
  },
  sourceDot: {
    width: 15,
    height: 15,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.55)',
  },
  sourceDotText: {
    fontSize: 7.5,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -0.2,
  },
});

// ── Preview Sheet Styles ──────────────────────────────────────────────────────
const sheet = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 36,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 12,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#D1D5DB',
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 4,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingRight: 16,
  },
  colorStrip: {
    width: 5,
    alignSelf: 'stretch',
    borderRadius: 3,
  },
  guestName: {
    fontSize: 19,
    fontWeight: '700',
    color: APP_COLORS.textPrimary,
    letterSpacing: -0.2,
  },
  propertyName: {
    fontSize: 13,
    color: APP_COLORS.textSecondary,
    marginTop: 2,
  },
  sourceDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
  },
  sourceDotText: {
    fontSize: 14,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: APP_COLORS.border,
  },
  dateBlock: { flex: 1 },
  dateLabel: {
    fontSize: 10,
    color: APP_COLORS.textSecondary,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 4,
  },
  dateValue: {
    fontSize: 15,
    fontWeight: '700',
    color: APP_COLORS.textPrimary,
    textTransform: 'capitalize',
  },
  nightsPill: {
    alignItems: 'center',
    backgroundColor: APP_COLORS.primary,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginHorizontal: 10,
    shadowColor: APP_COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  nightsNum: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
    lineHeight: 26,
  },
  nightsLabel: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.8)',
    fontWeight: '600',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 16,
    marginBottom: 18,
    flexWrap: 'wrap',
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  pillDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  pillText: {
    fontSize: 12,
    fontWeight: '600',
  },
  guestsText: {
    fontSize: 12,
    color: APP_COLORS.textSecondary,
    marginLeft: 2,
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 16,
  },
  btnClose: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: '#F1F3F5',
    alignItems: 'center',
  },
  btnCloseText: {
    fontSize: 14,
    fontWeight: '600',
    color: APP_COLORS.textSecondary,
  },
  btnDetail: {
    flex: 2,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: APP_COLORS.primary,
    alignItems: 'center',
    shadowColor: APP_COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 4,
  },
  btnDetailText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
});
