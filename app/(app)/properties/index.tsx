import { FlatList, View, StyleSheet } from 'react-native';
import { Text, FAB, ActivityIndicator, Surface, Chip } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useProperties } from '@/hooks/useProperties';
import { PropertyBadge } from '@/components/ui/PropertyBadge';
import { EmptyState } from '@/components/ui/EmptyState';
import { APP_COLORS } from '@/constants/colors';
import { Property } from '@/types';

function PropertyCard({ property, onPress }: { property: Property; onPress: () => void }) {
  const totalBeds =
    property.nb_double_beds +
    property.nb_single_beds +
    property.nb_sofa_beds +
    property.nb_baby_cribs;

  return (
    <View style={[styles.card, !property.is_active && styles.cardInactive]}>
      <View style={[styles.colorStrip, { backgroundColor: property.color }]} />
      <View style={styles.cardContent} onTouchEnd={onPress}>
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
      </View>
      <MaterialCommunityIcons name="chevron-right" size={20} color={APP_COLORS.border} />
    </View>
  );
}

export default function PropertiesScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { data: properties, isLoading } = useProperties();

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Text style={styles.title}>{t('properties.title')}</Text>
        <Text style={styles.subtitle}>{properties?.length ?? 0} logements</Text>
      </View>

      {isLoading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={APP_COLORS.primary} />
      ) : (
        <FlatList
          data={properties ?? []}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <PropertyCard
              property={item}
              onPress={() => router.push(`/(app)/properties/${item.id}`)}
            />
          )}
          ListEmptyComponent={
            <EmptyState
              icon="home-city-outline"
              title={t('properties.noProperties')}
              subtitle={t('properties.addFirst')}
            />
          }
          contentContainerStyle={properties?.length === 0 ? { flex: 1 } : { paddingBottom: 80 }}
          showsVerticalScrollIndicator={false}
        />
      )}

      <FAB
        icon="plus"
        style={styles.fab}
        onPress={() => router.push('/(app)/properties/new')}
        label={t('properties.new')}
      />
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
  title: { fontSize: 22, fontWeight: '700', color: '#FFFFFF' },
  subtitle: { fontSize: 13, color: 'rgba(255,255,255,0.7)', marginTop: 2 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginHorizontal: 16,
    marginTop: 10,
    elevation: 2,
    overflow: 'hidden',
  },
  cardInactive: { opacity: 0.6 },
  colorStrip: { width: 5, alignSelf: 'stretch' },
  cardContent: { flex: 1, padding: 12, gap: 4 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  propertyName: { fontSize: 15, fontWeight: '600', color: APP_COLORS.textPrimary, flex: 1, marginRight: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  address: { fontSize: 12, color: APP_COLORS.textSecondary, flex: 1 },
  bedsText: { fontSize: 12, color: APP_COLORS.textSecondary, flex: 1 },
  inactiveChip: { backgroundColor: '#F3F4F6', marginLeft: 'auto' },
  inactiveText: { fontSize: 10, color: APP_COLORS.textSecondary },
  fab: { position: 'absolute', bottom: 24, right: 24, backgroundColor: APP_COLORS.primary },
});
