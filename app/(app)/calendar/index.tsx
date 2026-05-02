import { useState, useMemo } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, ActivityIndicator, Chip } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Calendar } from 'react-native-calendars';
import { useActiveProperties } from '@/hooks/useProperties';
import { useReservationsForMonth, useReservationsForDay } from '@/hooks/useReservations';
import { useAppStore } from '@/stores/appStore';
import { DayReservationSheet } from '@/components/calendar/DayReservationSheet';
import { APP_COLORS } from '@/constants/colors';
import { getMonthRange, getDatesInRange, toISODateString } from '@/utils/dateHelpers';
import { Reservation } from '@/types';

type MarkedDates = Record<string, {
  startingDay?: boolean;
  endingDay?: boolean;
  color?: string;
  textColor?: string;
  dots?: { key: string; color: string }[];
  marked?: boolean;
  selected?: boolean;
  selectedColor?: string;
}>;

function buildMarkedDates(
  reservations: Reservation[],
  selectedDay: string | null,
  filterPropertyId: string | null
): MarkedDates {
  const marks: MarkedDates = {};
  const filtered = filterPropertyId
    ? reservations.filter((r) => r.property_id === filterPropertyId)
    : reservations;

  for (const res of filtered) {
    const color = (res.property as any)?.color ?? APP_COLORS.primary;
    const dates = getDatesInRange(res.check_in, res.check_out);

    dates.forEach((date, idx) => {
      if (!marks[date]) marks[date] = {};
      const isStart = idx === 0;
      const isEnd = idx === dates.length - 1;

      if (!marks[date].dots) marks[date].dots = [];
      if (isStart) {
        marks[date].dots!.push({ key: res.id + '_in', color: APP_COLORS.success });
        marks[date].startingDay = true;
        marks[date].color = color;
      } else if (isEnd) {
        marks[date].dots!.push({ key: res.id + '_out', color: APP_COLORS.warning });
        marks[date].endingDay = true;
        marks[date].color = color + '99';
      } else {
        marks[date].color = color + '44';
      }
    });
  }

  if (selectedDay) {
    marks[selectedDay] = {
      ...(marks[selectedDay] ?? {}),
      selected: true,
      selectedColor: APP_COLORS.primary,
    };
  }

  return marks;
}

export default function CalendarScreen() {
  const { t } = useTranslation();
  const { calendarMonth, setCalendarMonth } = useAppStore();
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [sheetVisible, setSheetVisible] = useState(false);
  const [filterPropertyId, setFilterPropertyId] = useState<string | null>(null);

  const { data: properties } = useActiveProperties();
  const { from, to } = getMonthRange(calendarMonth);
  const { data: monthReservations, isLoading } = useReservationsForMonth(from, to);
  const { data: dayReservations } = useReservationsForDay(selectedDay ?? '');

  const markedDates = useMemo(
    () => buildMarkedDates(monthReservations ?? [], selectedDay, filterPropertyId),
    [monthReservations, selectedDay, filterPropertyId]
  );

  const handleDayPress = (day: { dateString: string }) => {
    setSelectedDay(day.dateString);
    setSheetVisible(true);
  };

  const handleMonthChange = (month: { year: number; month: number }) => {
    const m = String(month.month).padStart(2, '0');
    setCalendarMonth(`${month.year}-${m}`);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Text style={styles.title}>{t('calendar.title')}</Text>
      </View>

      {/* Property filter */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterRow}
      >
        <Chip
          selected={!filterPropertyId}
          onPress={() => setFilterPropertyId(null)}
          style={styles.chip}
        >
          {t('calendar.allProperties')}
        </Chip>
        {(properties ?? []).map((p) => (
          <Chip
            key={p.id}
            selected={filterPropertyId === p.id}
            onPress={() => setFilterPropertyId(filterPropertyId === p.id ? null : p.id)}
            style={[styles.chip, { borderColor: p.color }]}
            selectedColor={p.color}
          >
            {p.name}
          </Chip>
        ))}
      </ScrollView>

      {isLoading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={APP_COLORS.primary} />
      ) : (
        <Calendar
          current={calendarMonth + '-01'}
          onDayPress={handleDayPress}
          onMonthChange={handleMonthChange}
          markingType="multi-dot"
          markedDates={markedDates}
          style={styles.calendar}
          theme={{
            backgroundColor: '#FFFFFF',
            calendarBackground: '#FFFFFF',
            selectedDayBackgroundColor: APP_COLORS.primary,
            selectedDayTextColor: '#FFFFFF',
            todayTextColor: APP_COLORS.primary,
            todayBackgroundColor: '#EEF2FF',
            dayTextColor: APP_COLORS.textPrimary,
            textDisabledColor: APP_COLORS.border,
            dotColor: APP_COLORS.primary,
            arrowColor: APP_COLORS.primary,
            monthTextColor: APP_COLORS.textPrimary,
            textDayFontWeight: '500',
            textMonthFontWeight: '700',
            textDayHeaderFontWeight: '600',
          }}
        />
      )}

      {/* Legend */}
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: APP_COLORS.success }]} />
          <Text style={styles.legendText}>Arrivée</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: APP_COLORS.warning }]} />
          <Text style={styles.legendText}>Départ</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: APP_COLORS.primary }]} />
          <Text style={styles.legendText}>Occupation</Text>
        </View>
      </View>

      <DayReservationSheet
        date={selectedDay ?? ''}
        reservations={dayReservations ?? []}
        visible={sheetVisible}
        onClose={() => setSheetVisible(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: APP_COLORS.background },
  header: { backgroundColor: APP_COLORS.primary, paddingHorizontal: 20, paddingVertical: 16 },
  title: { fontSize: 22, fontWeight: '700', color: '#FFFFFF' },
  filterRow: { paddingHorizontal: 12, paddingVertical: 8, gap: 8, backgroundColor: '#FFFFFF' },
  chip: { borderRadius: 20 },
  calendar: { margin: 8, borderRadius: 12, elevation: 2 },
  legend: { flexDirection: 'row', justifyContent: 'center', gap: 20, paddingVertical: 10, backgroundColor: '#FFFFFF', marginHorizontal: 8, borderRadius: 8 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { fontSize: 12, color: APP_COLORS.textSecondary },
});
