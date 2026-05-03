import { FlatList, View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text, ActivityIndicator, Badge } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useActiveProperties } from '@/hooks/useProperties';
import { EmptyState } from '@/components/ui/EmptyState';
import { APP_COLORS } from '@/constants/colors';
import { FONTS } from '@/constants/typography';
import { Property } from '@/types';

interface InventoryPropertyCardProps {
  property: Property;
  onPressSub: (sub: 'linen' | 'equipment' | 'consumables') => void;
}

function InventoryPropertyCard({ property, onPressSub }: InventoryPropertyCardProps) {
  const sections = [
    { key: 'linen' as const, label: 'Linge', icon: 'tshirt-crew' },
    { key: 'equipment' as const, label: 'Équipements', icon: 'baby-carriage' },
    { key: 'consumables' as const, label: 'Consommables', icon: 'package-variant' },
  ];

  return (
    <View style={styles.card}>
      <View style={[styles.cardHeader, { borderLeftColor: property.color }]}>
        <Text style={styles.propertyName}>{property.name}</Text>
      </View>
      <View style={styles.sectionsRow}>
        {sections.map(({ key, label, icon }) => (
          <TouchableOpacity
            key={key}
            style={styles.sectionButton}
            onPress={() => onPressSub(key)}
          >
            <MaterialCommunityIcons name={icon as any} size={24} color={property.color} />
            <Text style={styles.sectionLabel}>{label}</Text>
            <MaterialCommunityIcons name="chevron-right" size={16} color={APP_COLORS.border} />
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

export default function InventoryScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { data: properties, isLoading } = useActiveProperties();

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Text style={styles.title}>{t('inventory.title')}</Text>
        <Text style={styles.subtitle}>Gérer le linge, équipements et stocks</Text>
      </View>

      {isLoading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={APP_COLORS.primary} />
      ) : (
        <FlatList
          data={properties ?? []}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <InventoryPropertyCard
              property={item}
              onPressSub={(sub) =>
                router.push(`/(app)/inventory/${sub}/${item.id}` as any)
              }
            />
          )}
          ListEmptyComponent={
            <EmptyState
              icon="package-variant-closed"
              title="Aucun logement actif"
              subtitle="Ajoutez un logement pour gérer son inventaire"
            />
          }
          contentContainerStyle={
            properties?.length === 0 ? { flex: 1 } : { paddingBottom: 24 }
          }
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: APP_COLORS.background },
  header: { backgroundColor: APP_COLORS.primary, paddingHorizontal: 20, paddingVertical: 16 },
  title: { fontSize: 22, fontFamily: FONTS.titleBold, color: '#FFFFFF' },
  subtitle: { fontSize: 13, color: 'rgba(255,255,255,0.7)', marginTop: 2 },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginHorizontal: 16,
    marginTop: 12,
    elevation: 2,
    overflow: 'hidden',
  },
  cardHeader: { padding: 14, borderLeftWidth: 4 },
  propertyName: { fontSize: 15, fontWeight: '700', color: APP_COLORS.textPrimary },
  sectionsRow: { borderTopWidth: 1, borderTopColor: APP_COLORS.border },
  sectionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: APP_COLORS.border,
  },
  sectionLabel: { flex: 1, fontSize: 14, color: APP_COLORS.textPrimary },
});
