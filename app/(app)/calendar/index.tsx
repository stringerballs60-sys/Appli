import { useCallback, useRef, useState, useEffect } from 'react';
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
  isWeekend,
  isSameMonth,
  parseISO,
  startOfMonth,
  subMonths,
} from 'date-fns';
import { fr } from 'date-fns/locale';
import { useReservationsForMonth } from '@/hooks/useReservations';
import { useActiveProperties } from '@/hooks/useProperties';
import { APP_COLORS } from '@/constants/colors';
import { Reservation, ReservationSource, Property } from '@/types';

const SIDEBAR_WIDTH = 76;
const DAY_WIDTH = 46;
const MONTH_NAV_HEIGHT = 52;
const DAY_HEADER_HEIGHT = 50;
const LEGEND_HEIGHT = 38;
const MIN_ROW_HEIGHT = 44;
const BLOCK_PADDING = 7;

const SOURCE_CONFIG: Record<string, { label: string; bg: string } | null> = {
  airbnb:  { label: 'AB', bg: '#FF5A5F' },
  booking: { label: 'BK', bg: '#003580' },
  abritel: { label: 'AV', bg: '#FF6600' },
  manual:  null,
};

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

// ── Preview Sheet ──────────────────────────────────────────────────────────────

interface PreviewSheetProps {
  resa: Reservation;
  onClose: () => void;
  onViewDetail: () => void;
}

function ReservationPreviewSheet({ resa, onClose, onViewDetail }: PreviewSheetProps) {
  const property = resa.property;
  const sourceConf = SOURCE_CONFIG[resa.source ?? 'manual'];
  const isPending = resa.status === 'pending';
  const totalGuests = resa.nb_couples * 2 + resa.nb_solo_adults + resa.nb_children + resa.nb_babies;

  return (
    <Modal transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={sheet.overlay} onPress={onClose}>
        <Pressable style={sheet.container} onPress={() => {}}>
          <View style={sheet.handle} />

          {/* Header */}
          <View style={sheet.header}>
            {property && (
              <View style={[sheet.colorStrip, { backgroundColor: property.color }]} />
            )}
            <View style={{ flex: 1, paddingLeft: 12 }}>
              <Text style={sheet.guestName} numberOfLines={1}>{resa.guest_name}</Text>
              {property && (
                <Text style={sheet.propertyName}>{property.name}</Text>
              )}
            </View>
            {sourceConf && (
              <View style={[sheet.sourceBadge, { backgroundColor: sourceConf.bg }]}>
                <Text style={sheet.sourceBadgeText}>{sourceConf.label}</Text>
              </View>
            )}
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

          {/* Meta row */}
          <View style={sheet.metaRow}>
            <View style={[sheet.statusPill, {
              backgroundColor: isPending ? APP_COLORS.warning + '22' : APP_COLORS.success + '22',
              borderColor: isPending ? APP_COLORS.warning : APP_COLORS.success,
            }]}>
              <View style={[sheet.statusDot, {
                backgroundColor: isPending ? APP_COLORS.warning : APP_COLORS.success
              }]} />
              <Text style={[sheet.statusText, {
                color: isPending ? APP_COLORS.warning : APP_COLORS.success
              }]}>
                {isPending ? 'En attente' : 'Confirmée'}
              </Text>
            </View>
            {totalGuests > 0 && (
              <Text style={sheet.guestsText}>{totalGuests} voyageur{totalGuests > 1 ? 's' : ''}</Text>
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

// ── Calendar Screen ─────────────────────────────────────────────────────────────

export default function CalendarScreen() {
  const router = useRouter();
  const headerScrollRef = useRef<ScrollView>(null);
  const contentScrollRef = useRef<ScrollView>(null);

  const [currentMonth, setCurrentMonth] = useState(() => startOfMonth(new Date()));
  const [selectedResa, setSelectedResa] = useState<Reservation | null>(null);
  const [gridHeight, setGridHeight] = useState(0);

  const startDate = currentMonth;
  const endDate = endOfMonth(currentMonth);
  const TOTAL_DAYS = differenceInDays(endDate, startDate) + 1;
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

  const todayDayIndex = isSameMonth(new Date(), currentMonth)
    ? differenceInDays(new Date(), startDate)
    : -1;

  const isCurrentMonth = isSameMonth(currentMonth, new Date());

  // Auto-scroll to today / beginning of month
  useEffect(() => {
    const offset = todayDayIndex > 2
      ? Math.max(0, (todayDayIndex - 2) * DAY_WIDTH)
      : 0;
    setTimeout(() => {
      contentScrollRef.current?.scrollTo({ x: offset, animated: false });
      headerScrollRef.current?.scrollTo({ x: offset, animated: false });
    }, 150);
  }, [currentMonth]);

  const handleContentScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      headerScrollRef.current?.scrollTo({
        x: e.nativeEvent.contentOffset.x,
        animated: false,
      });
    },
    []
  );

  const handleGridLayout = useCallback((e: LayoutChangeEvent) => {
    setGridHeight(e.nativeEvent.layout.height);
  }, []);

  const getResaForProperty = (propertyId: string): Reservation[] =>
    (reservations ?? []).filter(
      (r) => r.property_id === propertyId && r.status !== 'cancelled'
    );

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>

      {/* ── Month navigation ── */}
      <View style={styles.monthNav}>
        <TouchableOpacity
          style={styles.navBtn}
          onPress={() => setCurrentMonth(m => subMonths(m, 1))}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={styles.navArrow}>‹</Text>
        </TouchableOpacity>

        <Text style={styles.monthTitle}>
          {format(currentMonth, 'MMMM yyyy', { locale: fr })}
        </Text>

        <TouchableOpacity
          style={styles.navBtn}
          onPress={() => setCurrentMonth(m => addMonths(m, 1))}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={styles.navArrow}>›</Text>
        </TouchableOpacity>

        {!isCurrentMonth && (
          <TouchableOpacity
            style={styles.todayBtn}
            onPress={() => setCurrentMonth(startOfMonth(new Date()))}
          >
            <Text style={styles.todayBtnText}>Auj.</Text>
          </TouchableOpacity>
        )}
      </View>

      {isLoading ? (
        <ActivityIndicator style={{ flex: 1 }} color={APP_COLORS.primary} />
      ) : (
        <View style={styles.calendarWrapper}>

          {/* ── Day headers (synced scroll) ── */}
          <View style={styles.dayHeaderRow}>
            <View style={{ width: SIDEBAR_WIDTH, borderRightWidth: 1, borderRightColor: APP_COLORS.border }} />
            <ScrollView
              horizontal
              ref={headerScrollRef}
              scrollEnabled={false}
              showsHorizontalScrollIndicator={false}
            >
              {days.map((day, i) => {
                const isT = isToday(day);
                const isWE = isWeekend(day);
                return (
                  <View
                    key={i}
                    style={[
                      styles.dayHeader,
                      { width: DAY_WIDTH },
                      isWE && styles.dayHeaderWE,
                      isT && styles.dayHeaderToday,
                    ]}
                  >
                    <Text style={[styles.dayNum, isT && styles.dayNumToday]}>
                      {format(day, 'd')}
                    </Text>
                    <Text style={[
                      styles.dayLabel,
                      isWE && styles.dayLabelWE,
                      isT && styles.dayLabelToday,
                    ]}>
                      {format(day, 'EEE', { locale: fr })}
                    </Text>
                  </View>
                );
              })}
            </ScrollView>
          </View>

          {/* ── Grid: sidebar + horizontal scroll ── */}
          <View style={styles.gridContainer} onLayout={handleGridLayout}>

            {/* Fixed property sidebar */}
            <View style={[styles.sidebar, { width: SIDEBAR_WIDTH }]}>
              {(properties ?? []).map((p) => (
                <View key={p.id} style={[styles.propertyCell, { height: ROW_HEIGHT }]}>
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

            {/* Scrollable day columns */}
            <ScrollView
              horizontal
              ref={contentScrollRef}
              onScroll={handleContentScroll}
              scrollEventThrottle={16}
              showsHorizontalScrollIndicator={false}
              style={{ flex: 1 }}
            >
              <View style={{ width: TOTAL_DAYS * DAY_WIDTH }}>

                {/* Today vertical red line */}
                {todayDayIndex >= 0 && (
                  <View
                    style={[
                      styles.todayLine,
                      {
                        left: todayDayIndex * DAY_WIDTH + DAY_WIDTH / 2 - 1,
                        height: numProps * ROW_HEIGHT,
                      },
                    ]}
                  />
                )}

                {/* Property rows */}
                {(properties ?? []).map((property) => {
                  const rowResas = getResaForProperty(property.id);
                  return (
                    <View key={property.id} style={[styles.propertyRow, { height: ROW_HEIGHT }]}>

                      {/* Column tinting (weekend / today) */}
                      {days.map((day, i) => (
                        <View
                          key={i}
                          style={[
                            styles.dayCol,
                            { left: i * DAY_WIDTH, height: ROW_HEIGHT },
                            isWeekend(day) && styles.dayColWE,
                            isToday(day) && styles.dayColToday,
                          ]}
                        />
                      ))}

                      {/* Vertical grid lines */}
                      {days.map((_, i) => (
                        <View
                          key={`gl-${i}`}
                          style={[styles.gridLine, { left: i * DAY_WIDTH, height: ROW_HEIGHT }]}
                        />
                      ))}

                      {/* Reservation blocks */}
                      {rowResas.map((resa) => {
                        const { left, width } = getBlockGeometry(resa, startDate);
                        if (width <= 0) return null;
                        const isPending = resa.status === 'pending';
                        const sourceConf = SOURCE_CONFIG[resa.source ?? 'manual'];
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
                                opacity: isPending ? 0.58 : 1,
                              },
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
                            {sourceConf && width > 52 && (
                              <View style={[styles.sourceBadge, { backgroundColor: sourceConf.bg }]}>
                                <Text style={styles.sourceBadgeText}>{sourceConf.label}</Text>
                              </View>
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

          {/* ── Legend ── */}
          <View style={styles.legend}>
            <View style={styles.legendItem}>
              <View style={[styles.legendLine, { backgroundColor: APP_COLORS.danger }]} />
              <Text style={styles.legendText}>Aujourd'hui</Text>
            </View>
            <View style={styles.legendSep} />
            {[
              { label: 'AB', bg: '#FF5A5F', name: 'Airbnb' },
              { label: 'BK', bg: '#003580', name: 'Booking' },
              { label: 'AV', bg: '#FF6600', name: 'Abritel' },
            ].map(s => (
              <View key={s.label} style={styles.legendItem}>
                <View style={[styles.sourceBadge, { backgroundColor: s.bg }]}>
                  <Text style={styles.sourceBadgeText}>{s.label}</Text>
                </View>
                <Text style={styles.legendText}>{s.name}</Text>
              </View>
            ))}
            <View style={styles.legendSep} />
            <View style={styles.legendItem}>
              <View style={[styles.legendBlock]} />
              <Text style={styles.legendText}>En attente</Text>
            </View>
          </View>
        </View>
      )}

      {/* ── Reservation preview bottom sheet ── */}
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

// ── Styles ──────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: APP_COLORS.background,
  },

  // Month nav
  monthNav: {
    height: MONTH_NAV_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    backgroundColor: APP_COLORS.primary,
  },
  navBtn: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  navArrow: {
    fontSize: 22,
    color: '#FFFFFF',
    lineHeight: 26,
    fontWeight: '300',
  },
  monthTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    textTransform: 'capitalize',
    letterSpacing: 0.3,
  },
  todayBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
    marginLeft: 6,
  },
  todayBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },

  // Calendar wrapper
  calendarWrapper: {
    flex: 1,
    backgroundColor: APP_COLORS.surface,
  },

  // Day header row
  dayHeaderRow: {
    height: DAY_HEADER_HEIGHT,
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1.5,
    borderBottomColor: APP_COLORS.border,
  },
  dayHeader: {
    width: DAY_WIDTH,
    justifyContent: 'center',
    alignItems: 'center',
    borderRightWidth: 1,
    borderRightColor: APP_COLORS.border,
    gap: 2,
  },
  dayHeaderWE: {
    backgroundColor: '#F3F4F6',
  },
  dayHeaderToday: {
    backgroundColor: APP_COLORS.primary + '12',
  },
  dayNum: {
    fontSize: 15,
    fontWeight: '600',
    color: APP_COLORS.textPrimary,
  },
  dayNumToday: {
    color: APP_COLORS.primary,
    fontWeight: '800',
  },
  dayLabel: {
    fontSize: 9,
    color: APP_COLORS.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  dayLabelWE: {
    color: '#9CA3AF',
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

  // Sidebar
  sidebar: {
    borderRightWidth: 1.5,
    borderRightColor: APP_COLORS.border,
    backgroundColor: '#FAFAFA',
  },
  propertyCell: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: APP_COLORS.border,
    paddingRight: 6,
    overflow: 'hidden',
  },
  colorBar: {
    width: 4,
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
  dayCol: {
    position: 'absolute',
    top: 0,
    width: DAY_WIDTH,
  },
  dayColWE: {
    backgroundColor: '#F9FAFB',
  },
  dayColToday: {
    backgroundColor: APP_COLORS.primary + '09',
  },
  gridLine: {
    position: 'absolute',
    top: 0,
    width: 1,
    backgroundColor: APP_COLORS.border,
  },
  todayLine: {
    position: 'absolute',
    top: 0,
    width: 2,
    backgroundColor: APP_COLORS.danger,
    opacity: 0.75,
    zIndex: 10,
  },

  // Reservation blocks
  resaBlock: {
    position: 'absolute',
    borderRadius: 5,
    paddingHorizontal: 5,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    overflow: 'hidden',
  },
  resaName: {
    flex: 1,
    fontSize: 10.5,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  resaNights: {
    fontSize: 9.5,
    color: 'rgba(255,255,255,0.82)',
    fontWeight: '500',
  },
  sourceBadge: {
    borderRadius: 3,
    paddingHorizontal: 3,
    paddingVertical: 1,
    minWidth: 18,
    alignItems: 'center',
  },
  sourceBadgeText: {
    fontSize: 7.5,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },

  // Legend
  legend: {
    height: LEGEND_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: APP_COLORS.border,
    backgroundColor: '#FAFAFA',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendText: {
    fontSize: 10,
    color: APP_COLORS.textSecondary,
    fontWeight: '500',
  },
  legendLine: {
    width: 3,
    height: 14,
    borderRadius: 2,
  },
  legendBlock: {
    width: 14,
    height: 10,
    borderRadius: 2,
    backgroundColor: '#888',
    opacity: 0.45,
  },
  legendSep: {
    width: 1,
    height: 16,
    backgroundColor: APP_COLORS.border,
    marginHorizontal: 2,
  },
});

// ── Preview Sheet Styles ─────────────────────────────────────────────────────────

const sheet = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingBottom: 32,
    overflow: 'hidden',
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: APP_COLORS.border,
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 4,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingRight: 16,
  },
  colorStrip: {
    width: 5,
    alignSelf: 'stretch',
    borderRadius: 3,
  },
  guestName: {
    fontSize: 18,
    fontWeight: '700',
    color: APP_COLORS.textPrimary,
  },
  propertyName: {
    fontSize: 13,
    color: APP_COLORS.textSecondary,
    marginTop: 2,
  },
  sourceBadge: {
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginLeft: 8,
  },
  sourceBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: APP_COLORS.border,
  },
  dateBlock: {
    flex: 1,
  },
  dateLabel: {
    fontSize: 11,
    color: APP_COLORS.textSecondary,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 3,
  },
  dateValue: {
    fontSize: 15,
    fontWeight: '700',
    color: APP_COLORS.textPrimary,
    textTransform: 'capitalize',
  },
  nightsPill: {
    alignItems: 'center',
    backgroundColor: APP_COLORS.primary + '12',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginHorizontal: 8,
  },
  nightsNum: {
    fontSize: 20,
    fontWeight: '800',
    color: APP_COLORS.primary,
    lineHeight: 24,
  },
  nightsLabel: {
    fontSize: 10,
    color: APP_COLORS.primary,
    fontWeight: '500',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginHorizontal: 16,
    marginBottom: 16,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  guestsText: {
    fontSize: 12,
    color: APP_COLORS.textSecondary,
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 16,
    marginTop: 4,
  },
  btnClose: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 12,
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
    paddingVertical: 13,
    borderRadius: 12,
    backgroundColor: APP_COLORS.primary,
    alignItems: 'center',
  },
  btnDetailText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
