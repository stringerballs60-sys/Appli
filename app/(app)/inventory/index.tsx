import { FlatList, View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text, ActivityIndicator } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useActiveProperties } from '@/hooks/useProperties';
import { EmptyState } from '@/components/ui/EmptyState';
import { APP_COLORS } from '@/constants/colors';
import { SHADOWS, GRADIENTS, RADII } from '@/constants/theme';
import { FONTS } from '@/constants/typography';
import { Property } from '@/types';

const SECTIONS = [
  { key: 'linen' as const,       label: 'Linge',         icon: 'tshirt-crew',    color: APP_COLORS.primary },
  { key: 'equipment' as const,   label: 'Équipements',   icon: 'baby-carriage',  color: '#0891B2' },
  { key: 'consumables' as const, label: 'Consommables',  icon: 'package-variant',color: '#EA580C' },
];

function PropertyCard({ property, onPressSub }: { property: Property; onPressSub: (sub: 'linen' | 'equipment' | 'consumables') => void }) {
  return (
    <View style={[styles.card, SHADOWS.sm]}>
      <View style={styles.cardHeader}>
        <View style={[styles.strip, { backgroundColor: property.color }]} />
        <Text style={styles.propertyName}>{property.name}</Text>
      </View>
      <View style={styles.sections}>
        {SECTIONS.map(({ key, label, icon, color }) => (
          <TouchableOpacity key={key} style={styles.sectionBtn} onPress={() => onPressSub(key)} activeOpacity={0.7}>
            <View style={[styles.sectionIcon, { backgroundColor: color + '15' }]}>
              <MaterialCommunityIcons name={icon as any} size={20} color={color} />
            </View>
            <Text style={styles.sectionLabel}>{label}</Text>
            <MaterialCommunityIcons name="chevron-right" size={15} color={APP_COLORS.border} />
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
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <LinearGradient
        colors={GRADIENTS.navyHeader as [string, string, ...string[]]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <Text style={styles.title}>{t('inventory.title')}</Text>
        <Text style={styles.subtitle}>Linge, équipements et stocks</Text>
      </LinearGradient>

      {isLoading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={APP_COLORS.primary} />
      ) : (
        <FlatList
          data={properties ?? []}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <PropertyCard
              property={item}
              onPressSub={(sub) => router.push(`/(app)/inventory/${sub}/${item.id}` as any)}
            />
          )}
          ListEmptyComponent={
            <EmptyState icon="package-variant-closed" title="Aucun logement actif" subtitle="Ajoutez un logement pour gérer son inventaire" />
          }
          contentContainerStyle={properties?.length === 0 ? { flex: 1 } : { paddingBottom: 24, paddingTop: 8 }}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: APP_COLORS.primaryDark },
  header: { paddingHorizontal: 20, paddingTop: 18, paddingBottom: 22 },
  title: { fontSize: 24, fontFamily: FONTS.titleBold, color: APP_COLORS.accent, letterSpacing: 1 },
  subtitle: { fontSize: 12, color: 'rgba(248,245,239,0.65)', marginTop: 2 },

  card: {
    backgroundColor: APP_COLORS.surfaceElevated,
    borderRadius: RADII.md,
    marginHorizontal: 16,
    marginTop: 12,
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: APP_COLORS.borderLight,
  },
  strip: { width: 4, height: 20, borderRadius: 2 },
  propertyName: { fontSize: 14, fontWeight: '700', color: APP_COLORS.textPrimary, flex: 1 },
  sections: {},
  sectionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: APP_COLORS.borderLight,
  },
  sectionIcon: { width: 36, height: 36, borderRadius: RADII.xs, justifyContent: 'center', alignItems: 'center' },
  sectionLabel: { flex: 1, fontSize: 13, fontWeight: '500', color: APP_COLORS.textPrimary },
});
