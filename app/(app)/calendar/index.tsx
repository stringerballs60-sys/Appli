import { useCallback, useRef } from 'react';
import {
  View,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { Text, Appbar, ActivityIndicator } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { addDays, differenceInDays, format, isToday, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useReservationsForMonth } from '@/hooks/useReservations';
import { useActiveProperties } from '@/hooks/useProperties';
import { APP_COLORS } from '@/constants/colors';
import { Reservation } from '@/types';

const DAY_WIDTH = 52;
const LEFT_COL = 88;
const ROW_HEIGHT = 62;
const HEADER_HEIGHT = 50;
const PAST_DAYS = 3;
const TOTAL_DAYS = 28;

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

export default function CalendarScreen() {
  const router = useRouter();
  const headerScrollRef = useRef<ScrollView>(null);

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - PAST_DAYS);
  startDate.setHours(0, 0, 0, 0);

  const from = format(startDate, 'yyyy-MM-dd');
  const to = format(addDays(startDate, TOTAL_DAYS), 'yyyy-MM-dd');

  const { data: reservations, isLoading: resaLoading } = useReservationsForMonth(from, to);
  const { data: properties, isLoading: propLoading } = useActiveProperties();

  const days = Array.from({ length: TOTAL_DAYS }, (_, i) => addDays(startDate, i));

  const handleContentScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      headerScrollRef.current?.scrollTo({
        x: e.nativeEvent.contentOffset.x,
        animated: false,
      });
    },
    []
  );

  const getResaForProperty = (propertyId: string): Reservation[] =>
    (reservations ?? []).filter(
      (r) => r.property_id === propertyId && r.status !== 'cancelled'
    );

  const isLoading = resaLoading || propLoading;
  const initialScrollX = (PAST_DAYS - 1) * DAY_WIDTH;

  return (
    <SafeAreaView style={styles.safeArea}>
      <Appbar.Header style={styles.appbar}>
        <Appbar.Content title="Calendrier" titleStyle={styles.appbarTitle} />
      </Appbar.Header>

      {isLoading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={APP_COLORS.primary} />
      ) : (
        <View style={styles.container}>
          <View style={styles.headerRow}>
            <View style={{ width: LEFT_COL, borderRightWidth: 1, borderRightColor: APP_COLORS.border }} />
            <ScrollView
              horizontal
              ref={headerScrollRef}
              scrollEnabled={false}
              showsHorizontalScrollIndicator={false}
            >
              <View style={{ flexDirection: 'row' }}>
                {days.map((day, i) => {
                  const isT = isToday(day);
                  return (
                    <View key={i} style={[styles.dayHeader, isT && styles.dayHeaderToday]}>
                      <Text style={[styles.dayNum, isT && styles.dayNumToday]}>
                        {format(day, 'd')}
                      </Text>
                      <Text style={[styles.dayLabel, isT && styles.dayNumToday]}>
                        {format(day, 'EEE', { locale: fr })}
                      </Text>
                    </View>
                  );
                })}
              </View>
            </ScrollView>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={{ flexDirection: 'row' }}>
              <View style={{ width: LEFT_COL, borderRightWidth: 1, borderRightColor: APP_COLORS.border }}>
                {(properties ?? []).map((p) => (
                  <View key={p.id} style={styles.propertyCell}>
                    <View style={[styles.propertyDot, { backgroundColor: p.color }]} />
                    <Text style={styles.propertyName} numberOfLines={2}>
                      {p.name}
                    </Text>
                  </View>
                ))}
              </View>

              <ScrollView
                horizontal
                onScroll={handleContentScroll}
                scrollEventThrottle={16}
                showsHorizontalScrollIndicator={false}
                contentOffset={{ x: initialScrollX, y: 0 }}
              >
                <View style={{ width: TOTAL_DAYS * DAY_WIDTH }}>
                  <View
                    style={[
                      styles.todayLine,
                      {
                        left: PAST_DAYS * DAY_WIDTH + DAY_WIDTH / 2 - 1,
                        height: (properties ?? []).length * ROW_HEIGHT,
                      },
                    ]}
                  />

                  {(properties ?? []).map((property) => (
                    <View key={property.id} style={styles.propertyRow}>
                      {days.map((day, i) => (
                        <View
                          key={i}
                          style={[
                            styles.gridLine,
                            { left: i * DAY_WIDTH },
                            isToday(day) && styles.gridLineToday,
                          ]}
                        />
                      ))}

                      {getResaForProperty(property.id).map((resa) => {
                        const { left, width } = getBlockGeometry(resa, startDate);
                        if (width <= 0) return null;
                        return (
                          <TouchableOpacity
                            key={resa.id}
                            style={[
                              styles.resaBlock,
                              { left, width, backgroundColor: property.color },
                            ]}
                            onPress={() => router.push(`/(app)/reservations/${resa.id}`)}
                            activeOpacity={0.85}
                          >
                            <Text style={styles.resaName} numberOfLines={1}>
                              {resa.guest_name}
                            </Text>
                            {width > 72 && (
                              <Text style={styles.resaNights}>{resa.nb_nights}n</Text>
                            )}
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  ))}
                </View>
              </ScrollView>
            </View>
          </ScrollView>

          <View style={styles.legend}>
            <View style={[styles.legendDot, { backgroundColor: APP_COLORS.danger }]} />
            <Text style={styles.legendText}>Aujourd'hui</Text>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: APP_COLORS.background },
  appbar: { backgroundColor: APP_COLORS.primary },
  appbarTitle: { color: '#FFFFFF', fontSize: 18, fontWeight: '600' },
  container: { flex: 1 },
  headerRow: {
    flexDirection: 'row',
    height: HEADER_HEIGHT,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: APP_COLORS.border,
  },
  dayHeader: {
    width: DAY_WIDTH,
    height: HEADER_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
    borderRightWidth: 1,
    borderRightColor: APP_COLORS.border,
  },
  dayHeaderToday: {
    backgroundColor: APP_COLORS.primary + '15',
  },
  dayNum: {
    fontSize: 15,
    fontWeight: '600',
    color: APP_COLORS.textPrimary,
  },
  dayLabel: {
    fontSize: 10,
    color: APP_COLORS.textSecondary,
    textTransform: 'capitalize',
  },
  dayNumToday: {
    color: APP_COLORS.primary,
    fontWeight: '700',
  },
  propertyCell: {
    height: ROW_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
    borderBottomWidth: 1,
    borderBottomColor: APP_COLORS.border,
    gap: 4,
  },
  propertyDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  propertyName: {
    fontSize: 10,
    color: APP_COLORS.textSecondary,
    textAlign: 'center',
    fontWeight: '500',
  },
  propertyRow: {
    height: ROW_HEIGHT,
    position: 'relative',
    borderBottomWidth: 1,
    borderBottomColor: APP_COLORS.border,
    backgroundColor: '#FAFAFA',
  },
  gridLine: {
    position: 'absolute',
    top: 0,
    width: 1,
    height: ROW_HEIGHT,
    backgroundColor: APP_COLORS.border,
  },
  gridLineToday: {
    backgroundColor: APP_COLORS.primary + '18',
    width: DAY_WIDTH,
  },
  todayLine: {
    position: 'absolute',
    top: 0,
    width: 2,
    backgroundColor: APP_COLORS.danger,
    zIndex: 10,
    opacity: 0.7,
  },
  resaBlock: {
    position: 'absolute',
    top: 10,
    height: ROW_HEIGHT - 20,
    borderRadius: 6,
    paddingHorizontal: 6,
    justifyContent: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.18,
    shadowRadius: 3,
  },
  resaName: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FFFFFF',
    flex: 1,
  },
  resaNights: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.85)',
    fontWeight: '500',
  },
  legend: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: APP_COLORS.border,
    backgroundColor: '#FFFFFF',
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 11,
    color: APP_COLORS.textSecondary,
  },
});
