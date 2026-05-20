import { useState } from 'react';
import { FlatList, View, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Text, ActivityIndicator, Chip } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useReservations } from '@/hooks/useReservations';
import { useActiveProperties } from '@/hooks/useProperties';
import { ReservationCard } from '@/components/reservation/ReservationCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { APP_COLORS } from '@/constants/colors';
import { FONTS } from '@/constants/typography';
import { ReservationStatus } from '@/types';
import { RESERVATION_STATUS_LABELS } from '@/constants/labels';

const STATUS_FILTERS: (ReservationStatus | null)[] = [
  null,
  ReservationStatus.CONFIRMED,
  ReservationStatus.PENDING,
  ReservationStatus.COMPLETED,
  ReservationStatus.CANCELLED,
];

export default function ReservationsScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<ReservationStatus | null>(null);

  const { data: properties } = useActiveProperties();
  const { data: reservations, isLoading } = useReservations({
    propertyId: selectedPropertyId ?? undefined,
    status: selectedStatus ?? undefined,
  });

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.title}>{t('reservations.title')}</Text>
            <Text style={styles.subtitle}>{reservations?.length ?? 0} réservation{(reservations?.length ?? 0) !== 1 ? 's' : ''}</Text>
          </View>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => router.push('/(app)/reservations/new')}
          >
            <MaterialCommunityIcons name="plus" size={22} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </View>

      {properties && properties.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filterScroll}
          contentContainerStyle={styles.filterRow}
        >
          <Chip
            selected={!selectedPropertyId}
            onPress={() => setSelectedPropertyId(null)}
            style={styles.filterChip}
          >
            Tous
          </Chip>
          {properties.map((p) => (
            <Chip
              key={p.id}
              selected={selectedPropertyId === p.id}
              onPress={() => setSelectedPropertyId(selectedPropertyId === p.id ? null : p.id)}
              style={[styles.filterChip, { borderColor: p.color }]}
            >
              {p.name}
            </Chip>
          ))}
        </ScrollView>
      )}

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterScroll}
        contentContainerStyle={styles.filterRow}
      >
        {STATUS_FILTERS.map((status) => (
          <Chip
            key={status ?? 'all'}
            selected={selectedStatus === status}
            onPress={() => setSelectedStatus(status)}
            style={styles.filterChip}
          >
            {status ? RESERVATION_STATUS_LABELS[status] : 'Tous les statuts'}
          </Chip>
        ))}
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
            <EmptyState
              icon="bed-outline"
              title={t('reservations.noReservations')}
              subtitle="Ajoutez votre première réservation"
            />
          }
          contentContainerStyle={
            reservations?.length === 0 ? { flex: 1 } : { paddingTop: 8, paddingBottom: 24 }
          }
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: APP_COLORS.background },
  header: {
    backgroundColor: APP_COLORS.primary,
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: { fontSize: 22, fontFamily: FONTS.titleBold, color: '#FFFFFF' },
  subtitle: { fontSize: 13, color: 'rgba(255,255,255,0.7)', marginTop: 2 },
  addButton: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterScroll: { flexShrink: 0, flexGrow: 0, backgroundColor: '#FFFFFF' },
  filterRow: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
    alignItems: 'center',
  },
  filterChip: { borderRadius: 20 },
});
