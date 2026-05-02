import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, ActivityIndicator, Appbar, Surface } from 'react-native-paper';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLinenForProperty, useUpsertLinen } from '@/hooks/useInventory';
import { useProperty } from '@/hooks/useProperties';
import { StepperInput } from '@/components/ui/StepperInput';
import { APP_COLORS } from '@/constants/colors';
import { LINEN_TYPE_LABELS } from '@/constants/labels';
import { LinenType } from '@/types';

const ALL_LINEN_TYPES = Object.values(LinenType);

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
    <SafeAreaView style={styles.safeArea}>
      <Appbar.Header style={styles.appbar}>
        <Appbar.BackAction onPress={() => router.back()} iconColor="#FFFFFF" />
        <Appbar.Content
          title={t('inventory.linen')}
          titleStyle={styles.appbarTitle}
          subtitle={property?.name}
          subtitleStyle={styles.appbarSubtitle}
        />
      </Appbar.Header>

      {/* Column headers */}
      <View style={styles.tableHeader}>
        <Text style={[styles.colHeader, styles.colType]}>Type</Text>
        <Text style={styles.colHeader}>{t('inventory.inProperty')}</Text>
        <Text style={styles.colHeader}>{t('inventory.dirty')}</Text>
        <Text style={styles.colHeader}>{t('inventory.cleanStock')}</Text>
        <Text style={styles.colHeader}>{t('inventory.target')}</Text>
      </View>

      {isLoading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={APP_COLORS.primary} />
      ) : (
        <ScrollView showsVerticalScrollIndicator={false}>
          {ALL_LINEN_TYPES.map((type) => {
            const item = getLinenItem(type);
            const inProp = item?.qty_in_property ?? 0;
            const dirty = item?.qty_dirty_washing ?? 0;
            const clean = item?.qty_clean_stock ?? 0;
            const target = item?.target_rotation ?? 3;
            const isLow = inProp + clean < target;

            return (
              <View
                key={type}
                style={[styles.row, isLow && styles.rowLow]}
              >
                <View style={styles.colType}>
                  <Text style={styles.linenLabel} numberOfLines={2}>
                    {LINEN_TYPE_LABELS[type]}
                  </Text>
                  {isLow && (
                    <Text style={styles.lowAlert}>{t('inventory.lowAlert')}</Text>
                  )}
                </View>
                <View style={styles.colStepper}>
                  <StepperInput
                    value={inProp}
                    onChange={(v) => handleUpdate(type, 'qty_in_property', v)}
                  />
                </View>
                <View style={styles.colStepper}>
                  <StepperInput
                    value={dirty}
                    onChange={(v) => handleUpdate(type, 'qty_dirty_washing', v)}
                  />
                </View>
                <View style={styles.colStepper}>
                  <StepperInput
                    value={clean}
                    onChange={(v) => handleUpdate(type, 'qty_clean_stock', v)}
                  />
                </View>
                <View style={styles.colStepper}>
                  <StepperInput
                    value={target}
                    onChange={(v) => handleUpdate(type, 'target_rotation', v)}
                    min={1}
                  />
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
  safeArea: { flex: 1, backgroundColor: APP_COLORS.background },
  appbar: { backgroundColor: APP_COLORS.primary },
  appbarTitle: { color: '#FFFFFF', fontSize: 18, fontWeight: '600' },
  appbarSubtitle: { color: 'rgba(255,255,255,0.7)', fontSize: 12 },
  tableHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: APP_COLORS.border,
  },
  colHeader: {
    flex: 1,
    fontSize: 11,
    fontWeight: '700',
    color: APP_COLORS.textSecondary,
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  colType: { flex: 2, textAlign: 'left' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: APP_COLORS.border,
  },
  rowLow: { backgroundColor: '#FEF2F2' },
  linenLabel: { fontSize: 13, fontWeight: '500', color: APP_COLORS.textPrimary },
  lowAlert: { fontSize: 10, color: APP_COLORS.danger, fontWeight: '600', marginTop: 2 },
  colStepper: { flex: 1, alignItems: 'center' },
});
