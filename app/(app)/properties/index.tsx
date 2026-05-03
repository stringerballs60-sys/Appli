import { useCallback, useEffect, useState } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text, FAB, ActivityIndicator, Surface, Chip } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import DraggableFlatList, { RenderItemParams, ScaleDecorator } from 'react-native-draggable-flatlist';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useProperties } from '@/hooks/useProperties';
import { PropertyBadge } from '@/components/ui/PropertyBadge';
import { EmptyState } from '@/components/ui/EmptyState';
import { APP_COLORS } from '@/constants/colors';
import { FONTS } from '@/constants/typography';
import { Property, PropertyType } from '@/types';
import { PROPERTY_TYPE_LABELS } from '@/constants/labels';

const ORDER_KEY = 'kaza_properties_order';

type FilterType = 'all' | 'active' | 'inactive' | PropertyType;

function PropertyCard({
  property,
  onPress,
  drag,
  isActive: isDragging,
}: {
  property: Property;
  onPress: () => void;
  drag: () => void;
  isActive: boolean;
}) {
  const totalBeds =
    property.nb_double_beds +
    property.nb_single_beds +
    property.nb_sofa_beds +
    property.nb_baby_cribs;

  return (
    <Surface
      style={[styles.card, !property.is_active && styles.cardInactive, isDragging && styles.cardDragging]}
      elevation={isDragging ? 6 : 2}
    >
      <View style={[styles.colorStrip, { backgroundColor: property.color }]} />
      <TouchableOpacity style={styles.dragHandle} onLongPress={drag} delayLongPress={150}>
        <MaterialCommunityIcons name="drag-horizontal-variant" size={20} color={APP_COLORS.border} />
      </TouchableOpacity>
      <View style={styles.cardContent}>
        <TouchableOpacity onPress={onPress} style={{ flex: 1 }}>
          <View style={styles.cardHeader}>
            <Text style={styles.propertyName} numberOfLines={1}>{property.name}</Text>
            <PropertyBadge type={property.property_type} size="small" />
          </View>
          {property.address ? (
            <View style={styles.row}>
              <MaterialCommunityIcons name="map-marker" size={13} color={APP_COLORS.textSecondary} />
              <Text style={styles.address} numberOfLines={1}>{property.address}</Text>
            </View>
          ) : null}
          <View style={styles.row}>
            <MaterialCommunityIcons name="bed" size={13} color={APP_COLORS.textSecondary} />
            <Text style={styles.bedsText}>
              {property.nb_double_beds > 0 ? `${property.nb_double_beds}× double ` : ''}
              {property.nb_single_beds > 0 ? `${property.nb_single_beds}× simple ` : ''}
              {property.nb_sofa_beds > 0 ? `${property.nb_sofa_beds}× canapé ` : ''}
              {property.nb_baby_cribs > 0 ? `${property.nb_baby_cribs}× berceau` : ''}
              {totalBeds === 0 ? 'Aucun lit configuré' : ''}
            </Text>
          </View>
          <View style={styles.row}>
            <MaterialCommunityIcons name="account-group" size={13} color={APP_COLORS.textSecondary} />
            <Text style={styles.bedsText}>{property.max_guests} voyageurs max</Text>
            {!property.is_active && (
              <Chip compact style={styles.inactiveChip} textStyle={styles.inactiveText}>
                Inactif
              </Chip>
            )}
          </View>
        </TouchableOpacity>
      </View>
      <MaterialCommunityIcons name="chevron-right" size={20} color={APP_COLORS.border} style={{ marginRight: 8 }} />
    </Surface>
  );
}

export default function PropertiesScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { data: properties, isLoading } = useProperties();
  const [sorted, setSorted] = useState<Property[]>([]);
  const [filter, setFilter] = useState<FilterType>('all');

  // Load and apply saved order
  useEffect(() => {
    if (!properties) return;
    AsyncStorage.getItem(ORDER_KEY).then((raw) => {
      if (!raw) { setSorted(properties); return; }
      const order: string[] = JSON.parse(raw);
      const map = new Map(properties.map((p) => [p.id, p]));
      const reordered = order.map((id) => map.get(id)).filter(Boolean) as Property[];
      // Append any new properties not yet in the saved order
      const extra = properties.filter((p) => !order.includes(p.id));
      setSorted([...reordered, ...extra]);
    });
  }, [properties]);

  const handleDragEnd = useCallback(({ data }: { data: Property[] }) => {
    setSorted(data);
    AsyncStorage.setItem(ORDER_KEY, JSON.stringify(data.map((p) => p.id)));
  }, []);

  const filtered = sorted.filter((p) => {
    if (filter === 'active') return p.is_active;
    if (filter === 'inactive') return !p.is_active;
    if (Object.values(PropertyType).includes(filter as PropertyType)) return p.property_type === filter;
    return true;
  });

  const renderItem = useCallback(
    ({ item, drag, isActive }: RenderItemParams<Property>) => (
      <ScaleDecorator>
        <PropertyCard
          property={item}
          onPress={() => router.push(`/(app)/properties/${item.id}`)}
          drag={drag}
          isActive={isActive}
        />
      </ScaleDecorator>
    ),
    [router]
  );

  const filters: { key: FilterType; label: string }[] = [
    { key: 'all', label: 'Tous' },
    { key: 'active', label: 'Actifs' },
    { key: 'inactive', label: 'Inactifs' },
    ...Object.values(PropertyType).map((type) => ({
      key: type as FilterType,
      label: PROPERTY_TYPE_LABELS[type],
    })),
  ];

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <Text style={styles.title}>{t('properties.title')}</Text>
          <Text style={styles.subtitle}>{properties?.length ?? 0} logements</Text>
        </View>

        {/* Filter chips */}
        <View style={styles.filterRow}>
          {filters.map((f) => (
            <Chip
              key={f.key}
              selected={filter === f.key}
              onPress={() => setFilter(f.key)}
              style={[styles.filterChip, filter === f.key && styles.filterChipSelected]}
              textStyle={[styles.filterChipText, filter === f.key && styles.filterChipTextSelected]}
              compact
            >
              {f.label}
            </Chip>
          ))}
        </View>

        {isLoading ? (
          <ActivityIndicator style={{ marginTop: 40 }} color={APP_COLORS.primary} />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon="home-city-outline"
            title={t('properties.noProperties')}
            subtitle={t('properties.addFirst')}
          />
        ) : (
          <DraggableFlatList
            data={filtered}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            onDragEnd={handleDragEnd}
            contentContainerStyle={{ paddingBottom: 80, paddingTop: 4 }}
            showsVerticalScrollIndicator={false}
          />
        )}

        <FAB
          icon="plus"
          style={styles.fab}
          onPress={() => router.push('/(app)/properties/new')}
          label={t('properties.new')}
          labelStyle={styles.fabLabel}
        />
      </SafeAreaView>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: APP_COLORS.background },
  header: {
    backgroundColor: APP_COLORS.primary,
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  title: { fontSize: 22, fontFamily: FONTS.titleBold, color: '#FFFFFF' },
  subtitle: { fontSize: 13, color: 'rgba(255,255,255,0.7)', marginTop: 2 },
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: APP_COLORS.border,
  },
  filterChip: { backgroundColor: APP_COLORS.background },
  filterChipSelected: { backgroundColor: APP_COLORS.primary },
  filterChipText: { fontSize: 11, color: APP_COLORS.textSecondary },
  filterChipTextSelected: { color: '#FFFFFF' },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginHorizontal: 16,
    marginTop: 10,
    overflow: 'hidden',
  },
  cardDragging: { opacity: 0.95 },
  cardInactive: { opacity: 0.6 },
  colorStrip: { width: 5, alignSelf: 'stretch' },
  dragHandle: {
    paddingHorizontal: 8,
    alignSelf: 'stretch',
    justifyContent: 'center',
  },
  cardContent: { flex: 1, padding: 12, gap: 4 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  propertyName: { fontSize: 15, fontWeight: '600', color: APP_COLORS.textPrimary, flex: 1, marginRight: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  address: { fontSize: 12, color: APP_COLORS.textSecondary, flex: 1 },
  bedsText: { fontSize: 12, color: APP_COLORS.textSecondary, flex: 1 },
  inactiveChip: { backgroundColor: '#F3F4F6', marginLeft: 'auto' },
  inactiveText: { fontSize: 10, color: APP_COLORS.textSecondary },
  fab: { position: 'absolute', bottom: 24, right: 24, backgroundColor: APP_COLORS.primary },
  fabLabel: { color: '#FFFFFF' },
});
