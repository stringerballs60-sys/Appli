import { View, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Text, ActivityIndicator } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useLinenForProperty, useUpsertLinen } from '@/hooks/useInventory';
import { useProperty } from '@/hooks/useProperties';
import { StepperInput } from '@/components/ui/StepperInput';
import { APP_COLORS } from '@/constants/colors';
import { SHADOWS, GRADIENTS, RADII } from '@/constants/theme';
import { FONTS } from '@/constants/typography';
import { LINEN_TYPE_LABELS } from '@/constants/labels';
import { LinenType } from '@/types';

const ALL_LINEN_TYPES = Object.values(LinenType).filter((t) => t !== LinenType.FACE_TOWELS);

export default function LinenInventoryScreen() {
  const { propertyId } = useLocalSearchParams<{ propertyId: string }>();
  const { t } = useTranslation();
  const router = useRouter();
  const { data: property } = useProperty(propertyId);
  const { data: linen, isLoading } = useLinenForProperty(propertyId);
  const { mutateAsync: upsertLinen } = useUpsertLinen();

  const getLinenItem = (type: LinenType) =>
    linen?.find((l) => l.linen_type === type);

  const handleUpdate = async (
    type: LinenType,
    field: 'qty_in_property' | 'qty_dirty_washing' | 'qty_clean_stock' | 'target_rotation',
    value: number
  ) => {
    const current = getLinenItem(type);
    await upsertLinen({
      propertyId,
      linenType: type,
      updates: {
        qty_in_property: current?.qty_in_property ?? 0,
        qty_dirty_washing: current?.qty_dirty_washing ?? 0,
        qty_clean_stock: current?.qty_clean_stock ?? 0,
        target_rotation: current?.target_rotation ?? 3,
        [field]: value,
      },
    });
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <LinearGradient
        colors={GRADIENTS.navyHeader as [string, string, ...string[]]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
          <MaterialCommunityIcons name="arrow-left" size={22} color="rgba(248,245,239,0.8)" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>{t('inventory.linen')}</Text>
          {property && <Text style={styles.subtitle}>{property.name}</Text>}
        </View>
      </LinearGradient>

      <View style={styles.tableHeader}>
        <Text style={[styles.colHeader, styles.colTypeHeader]}>Type</Text>
        <Text style={styles.colHeader}>{t('inventory.inProperty')}</Text>
        <Text style={styles.colHeader}>{t('inventory.dirty')}</Text>
        <Text style={styles.colHeader}>{t('inventory.cleanStock')}</Text>
        <Text style={styles.colHeader}>{t('inventory.target')}</Text>
      </View>

      {isLoading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={APP_COLORS.primary} />
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} style={styles.scroll}>
          {ALL_LINEN_TYPES.map((type) => {
            const item = getLinenItem(type);
            const inProp = item?.qty_in_property ?? 0;
            const dirty = item?.qty_dirty_washing ?? 0;
            const clean = item?.qty_clean_stock ?? 0;
            const target = item?.target_rotation ?? 3;
            const isLow = inProp + clean < target;

            return (
              <View key={type} style={[styles.row, isLow && styles.rowLow]}>
                <View style={styles.colType}>
                  <Text style={styles.linenLabel} numberOfLines={2}>
                    {LINEN_TYPE_LABELS[type]}
                  </Text>
                  {isLow && (
                    <Text style={styles.lowAlert}>{t('inventory.lowAlert')}</Text>
                  )}
                </View>
                <View style={styles.colStepper}>
                  <StepperInput value={inProp} onChange={(v) => handleUpdate(type, 'qty_in_property', v)} />
                </View>
                <View style={styles.colStepper}>
                  <StepperInput value={dirty} onChange={(v) => handleUpdate(type, 'qty_dirty_washing', v)} />
                </View>
                <View style={styles.colStepper}>
                  <StepperInput value={clean} onChange={(v) => handleUpdate(type, 'qty_clean_stock', v)} />
                </View>
                <View style={styles.colStepper}>
                  <StepperInput value={target} onChange={(v) => handleUpdate(type, 'target_rotation', v)} min={1} />
                </View>
              </View>
            );
          })}
          <View style={{ height: 32 }} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: APP_COLORS.primaryDark },
  header: {
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  backBtn: { padding: 2 },
  title: { fontSize: 22, fontFamily: FONTS.titleBold, color: APP_COLORS.accent, letterSpacing: 1 },
  subtitle: { fontSize: 12, color: 'rgba(248,245,239,0.65)', marginTop: 2 },
  scroll: { flex: 1, backgroundColor: APP_COLORS.background },
  tableHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: APP_COLORS.surfaceElevated,
    borderBottomWidth: 1,
    borderBottomColor: APP_COLORS.borderLight,
  },
  colHeader: {
    flex: 1,
    fontSize: 10,
    fontWeight: '700',
    color: APP_COLORS.textTertiary,
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  colTypeHeader: { flex: 2, textAlign: 'left' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: APP_COLORS.surfaceElevated,
    borderBottomWidth: 1,
    borderBottomColor: APP_COLORS.borderLight,
  },
  rowLow: { backgroundColor: APP_COLORS.dangerLight },
  colType: { flex: 2 },
  linenLabel: { fontSize: 13, fontWeight: '500', color: APP_COLORS.textPrimary },
  lowAlert: { fontSize: 10, color: APP_COLORS.danger, fontWeight: '600', marginTop: 2 },
  colStepper: { flex: 1, alignItems: 'center' },
});
