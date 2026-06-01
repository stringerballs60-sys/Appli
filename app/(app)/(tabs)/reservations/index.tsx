import { useState } from 'react';
import { FlatList, View, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Text, ActivityIndicator } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useReservations } from '@/hooks/useReservations';
import { useActiveProperties } from '@/hooks/useProperties';
import { ReservationCard } from '@/components/reservation/ReservationCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { APP_COLORS } from '@/constants/colors';
import { RESERVATION_STATUS_COLORS } from '@/constants/colors';
import { SHADOWS, GRADIENTS, RADII } from '@/constants/theme';
import { FONTS } from '@/constants/typography';
import { ReservationStatus, ReservationSource } from '@/types';
import { RESERVATION_STATUS_LABELS } from '@/constants/labels';

const STATUS_FILTERS: (ReservationStatus | null)[] = [
  null,
  ReservationStatus.CONFIRMED,
  ReservationStatus.PENDING,
  ReservationStatus.COMPLETED,
  ReservationStatus.CANCELLED,
];

const SOURCE_FILTERS: { value: ReservationSource | null; label: string; color: string }[] = [
  { value: null, label: 'Toutes sources', color: APP_COLORS.primary },
  { value: 'airbnb', label: 'Airbnb', color: '#FF5A5F' },
  { value: 'booking', label: 'Booking.com', color: '#003580' },
  { value: 'abritel', label: 'Abritel', color: '#FF6600' },
  { value: 'manual', label: 'Direct', color: APP_COLORS.success },
];

export default function ReservationsScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<ReservationStatus | null>(null);
  const [selectedSource, setSelectedSource] = useState<ReservationSource | null>(null);

  const { data: properties } = useActiveProperties();
  const { data: reservations, isLoading } = useReservations({
    propertyId: selectedPropertyId ?? undefined,
    status: selectedStatus ?? undefined,
    source: selectedSource ?? undefined,
  });

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <LinearGradient
        colors={GRADIENTS.navyHeader as [string, string, ...string[]]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <View>
          <Text style={styles.title}>{t('reservations.title')}</Text>
          <Text style={styles.subtitle}>
            {reservations?.length ?? 0} réservation{(reservations?.length ?? 0) !== 1 ? 's' : ''}
          </Text>
        </View>
        <TouchableOpacity style={[styles.addBtn, SHADOWS.navy]} onPress={() => router.push('/(app)/reservations/new')} activeOpacity={0.8}>
          <MaterialCommunityIcons name="plus" size={22} color="#FFFFFF" />
        </TouchableOpacity>
      </LinearGradient>

      {/* Property filter */}
      {properties && properties.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterBar} contentContainerStyle={styles.filterContent}>
          <TouchableOpacity
            style={[styles.chip, !selectedPropertyId && styles.chipActive]}
            onPress={() => setSelectedPropertyId(null)}
          >
            <Text style={[styles.chipText, !selectedPropertyId && styles.chipTextActive]}>Tous</Text>
          </TouchableOpacity>
          {properties.map((p) => (
            <TouchableOpacity
              key={p.id}
              style={[styles.chip, selectedPropertyId === p.id && { backgroundColor: p.color, borderColor: p.color }]}
              onPress={() => setSelectedPropertyId(selectedPropertyId === p.id ? null : p.id)}
            >
              <View style={[styles.chipDot, { backgroundColor: selectedPropertyId === p.id ? '#FFFFFF' : p.color }]} />
              <Text style={[styles.chipText, selectedPropertyId === p.id && styles.chipTextActive]} numberOfLines={1}>
                {p.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {/* Status filter */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterBar} contentContainerStyle={styles.filterContent}>
        {STATUS_FILTERS.map((status) => {
          const isSelected = selectedStatus === status;
          const color = status ? RESERVATION_STATUS_COLORS[status] : APP_COLORS.primary;
          return (
            <TouchableOpacity
              key={status ?? 'all'}
              style={[styles.chip, isSelected && { backgroundColor: color, borderColor: color }]}
              onPress={() => setSelectedStatus(status)}
            >
              <Text style={[styles.chipText, isSelected && styles.chipTextActive]}>
                {status ? RESERVATION_STATUS_LABELS[status] : 'Tous les statuts'}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Source filter */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterBar} contentContainerStyle={styles.filterContent}>
        {SOURCE_FILTERS.map(({ value, label, color }) => {
          const isSelected = selectedSource === value;
          return (
            <TouchableOpacity
              key={value ?? 'all'}
              style={[styles.chip, isSelected && { backgroundColor: color, borderColor: color }]}
              onPress={() => setSelectedSource(value)}
            >
              <Text style={[styles.chipText, isSelected && styles.chipTextActive]}>{label}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {isLoading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={APP_COLORS.primary} />
      ) : (
        <FlatList
          data={reservations ?? []}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <ReservationCard
              reservation={item}
              onPress={() => router.push(`/(app)/reservations/${item.id}`)}
            />
          )}
          ListEmptyComponent={
            <EmptyState icon="bed-outline" title={t('reservations.noReservations')} subtitle="Ajoutez votre première réservation" />
          }
          contentContainerStyle={reservations?.length === 0 ? { flex: 1 } : { paddingTop: 8, paddingBottom: 24 }}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: APP_COLORS.primaryDark },
  header: {
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 22,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: { fontSize: 24, fontFamily: FONTS.titleBold, color: APP_COLORS.accent, letterSpacing: 1 },
  subtitle: { fontSize: 12, color: 'rgba(248,245,239,0.65)', marginTop: 2 },
  addBtn: {
    width: 38,
    height: 38,
    borderRadius: RADII.sm,
    backgroundColor: 'rgba(248,245,239,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(248,245,239,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterBar: { flexShrink: 0, flexGrow: 0, backgroundColor: APP_COLORS.surfaceElevated, borderBottomWidth: 1, borderBottomColor: APP_COLORS.borderLight },
  filterContent: { paddingHorizontal: 12, paddingVertical: 9, gap: 7, alignItems: 'center' },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: RADII.full,
    borderWidth: 1,
    borderColor: APP_COLORS.border,
    backgroundColor: APP_COLORS.background,
  },
  chipActive: { backgroundColor: APP_COLORS.primary, borderColor: APP_COLORS.primary },
  chipDot: { width: 6, height: 6, borderRadius: 3 },
  chipText: { fontSize: 12, fontWeight: '500', color: APP_COLORS.textSecondary },
  chipTextActive: { color: '#FFFFFF', fontWeight: '700' },
});
