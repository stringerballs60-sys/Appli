import { useCallback, useEffect, useState } from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Text, ActivityIndicator } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
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
import { SHADOWS, GRADIENTS, RADII } from '@/constants/theme';
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
  const totalBeds = property.nb_double_beds + property.nb_single_beds + property.nb_sofa_beds + property.nb_baby_cribs;

  return (
    <View style={[styles.card, SHADOWS.sm, !property.is_active && styles.cardInactive]}>
      <View style={[styles.strip, { backgroundColor: property.color }]} />
      <TouchableOpacity style={styles.dragHandle} onLongPress={drag} delayLongPress={150}>
        <MaterialCommunityIcons name="drag-horizontal-variant" size={18} color={APP_COLORS.border} />
      </TouchableOpacity>
      <View style={styles.cardContent}>
        <TouchableOpacity onPress={onPress} style={{ flex: 1 }}>
          <View style={styles.cardTop}>
            <Text style={styles.propertyName} numberOfLines={1}>{property.name}</Text>
            <PropertyBadge type={property.property_type} size="small" />
          </View>
          {property.address ? (
            <View style={styles.infoRow}>
              <MaterialCommunityIcons name="map-marker-outline" size={12} color={APP_COLORS.textTertiary} />
              <Text style={styles.infoText} numberOfLines={1}>{property.address}</Text>
            </View>
          ) : null}
          <View style={styles.infoRow}>
            <MaterialCommunityIcons name="bed-outline" size={12} color={APP_COLORS.textTertiary} />
            <Text style={styles.infoText}>
              {property.nb_double_beds > 0 ? `${property.nb_double_beds}× double ` : ''}
              {property.nb_single_beds > 0 ? `${property.nb_single_beds}× simple ` : ''}
              {property.nb_sofa_beds > 0 ? `${property.nb_sofa_beds}× canapé ` : ''}
              {property.nb_baby_cribs > 0 ? `${property.nb_baby_cribs}× berceau` : ''}
              {totalBeds === 0 ? 'Aucun lit configuré' : ''}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <MaterialCommunityIcons name="account-group-outline" size={12} color={APP_COLORS.textTertiary} />
            <Text style={styles.infoText}>{property.max_guests} voyageurs max</Text>
            {!property.is_active && (
              <View style={styles.inactivePill}>
                <Text style={styles.inactivePillText}>Inactif</Text>
              </View>
            )}
          </View>
          {property.notes ? (
            <View style={styles.infoRow}>
              <Text style={styles.noteIcon}>⚠️</Text>
              <Text style={styles.noteText} numberOfLines={2}>{property.notes}</Text>
            </View>
          ) : null}
        </TouchableOpacity>
      </View>
      <MaterialCommunityIcons name="chevron-right" size={18} color={APP_COLORS.border} style={{ marginRight: 10 }} />
    </View>
  );
}

export default function PropertiesScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { data: properties, isLoading } = useProperties();
  const [sorted, setSorted] = useState<Property[]>([]);
  const [filter, setFilter] = useState<FilterType>('all');
  const [filtersOpen, setFiltersOpen] = useState(false);

  useEffect(() => {
    if (!properties) return;
    AsyncStorage.getItem(ORDER_KEY).then((raw) => {
      if (!raw) { setSorted(properties); return; }
      const order: string[] = JSON.parse(raw);
      const map = new Map(properties.map((p) => [p.id, p]));
      const reordered = order.map((id) => map.get(id)).filter(Boolean) as Property[];
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
    ...Object.values(PropertyType).map((type) => ({ key: type as FilterType, label: PROPERTY_TYPE_LABELS[type] })),
  ];

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <LinearGradient
          colors={GRADIENTS.navyHeader as [string, string, ...string[]]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.header}
        >
          <View>
            <Text style={styles.title}>{t('properties.title')}</Text>
            <Text style={styles.subtitle}>{properties?.length ?? 0} logements</Text>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity
              style={[styles.iconBtn, filtersOpen && styles.iconBtnActive]}
              onPress={() => setFiltersOpen((v) => !v)}
            >
              <MaterialCommunityIcons name="filter-variant" size={19} color="#FFFFFF" />
            </TouchableOpacity>
            <TouchableOpacity style={[styles.iconBtn, SHADOWS.navy]} onPress={() => router.push('/(app)/properties/new')}>
              <MaterialCommunityIcons name="plus" size={21} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </LinearGradient>

        {filtersOpen && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterBar} contentContainerStyle={styles.filterContent}>
            {filters.map((f) => (
              <TouchableOpacity
                key={f.key}
                style={[styles.chip, filter === f.key && styles.chipActive]}
                onPress={() => setFilter(f.key)}
              >
                <Text style={[styles.chipText, filter === f.key && styles.chipTextActive]}>{f.label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        {isLoading ? (
          <ActivityIndicator style={{ marginTop: 40 }} color={APP_COLORS.primary} />
        ) : filtered.length === 0 ? (
          <EmptyState icon="home-city-outline" title={t('properties.noProperties')} subtitle={t('properties.addFirst')} />
        ) : (
          <DraggableFlatList
            data={filtered}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            onDragEnd={handleDragEnd}
            contentContainerStyle={{ paddingBottom: 24, paddingTop: 8 }}
            showsVerticalScrollIndicator={false}
          />
        )}
      </SafeAreaView>
    </GestureHandlerRootView>
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
  headerActions: { flexDirection: 'row', gap: 8 },
  iconBtn: {
    width: 38,
    height: 38,
    borderRadius: RADII.sm,
    backgroundColor: 'rgba(248,245,239,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(248,245,239,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBtnActive: { backgroundColor: 'rgba(248,245,239,0.25)' },

  filterBar: { flexShrink: 0, flexGrow: 0, backgroundColor: APP_COLORS.surfaceElevated, borderBottomWidth: 1, borderBottomColor: APP_COLORS.borderLight },
  filterContent: { paddingHorizontal: 12, paddingVertical: 9, gap: 7, alignItems: 'center' },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: RADII.full,
    borderWidth: 1,
    borderColor: APP_COLORS.border,
    backgroundColor: APP_COLORS.background,
  },
  chipActive: { backgroundColor: APP_COLORS.primary, borderColor: APP_COLORS.primary },
  chipText: { fontSize: 12, fontWeight: '500', color: APP_COLORS.textSecondary },
  chipTextActive: { color: '#FFFFFF', fontWeight: '700' },

  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: APP_COLORS.surfaceElevated,
    borderRadius: RADII.md,
    marginHorizontal: 16,
    marginTop: 10,
    overflow: 'hidden',
  },
  cardInactive: { opacity: 0.55 },
  strip: { width: 4, alignSelf: 'stretch' },
  dragHandle: { paddingHorizontal: 8, alignSelf: 'stretch', justifyContent: 'center' },
  cardContent: { flex: 1, paddingVertical: 12, paddingRight: 4, gap: 3 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  propertyName: { fontSize: 14, fontWeight: '700', color: APP_COLORS.textPrimary, flex: 1, marginRight: 8 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  infoText: { fontSize: 11, color: APP_COLORS.textSecondary, flex: 1 },
  inactivePill: { backgroundColor: APP_COLORS.backgroundAlt, borderRadius: RADII.full, paddingHorizontal: 7, paddingVertical: 1, marginLeft: 4 },
  inactivePillText: { fontSize: 10, color: APP_COLORS.textTertiary, fontWeight: '600' },
  noteIcon: { fontSize: 10 },
  noteText: { fontSize: 11, color: APP_COLORS.warning, flex: 1, fontStyle: 'italic' },
});
