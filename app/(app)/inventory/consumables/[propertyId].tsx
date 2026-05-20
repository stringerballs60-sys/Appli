import { useState } from 'react';
import { View, StyleSheet, FlatList, Alert, TouchableOpacity, Modal } from 'react-native';
import { Text, ActivityIndicator, TextInput, Button, Snackbar } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useConsumablesForProperty, useCreateConsumable, useUpdateConsumable, useDeleteConsumable } from '@/hooks/useInventory';
import { useProperty } from '@/hooks/useProperties';
import { EmptyState } from '@/components/ui/EmptyState';
import { StepperInput } from '@/components/ui/StepperInput';
import { APP_COLORS } from '@/constants/colors';
import { SHADOWS, GRADIENTS, RADII } from '@/constants/theme';
import { FONTS } from '@/constants/typography';
import { Consumable } from '@/types';

export default function ConsumablesScreen() {
  const { propertyId } = useLocalSearchParams<{ propertyId: string }>();
  const { t } = useTranslation();
  const router = useRouter();
  const { data: property } = useProperty(propertyId);
  const { data: consumables, isLoading } = useConsumablesForProperty(propertyId);
  const { mutateAsync: createConsumable, isPending: creating } = useCreateConsumable();
  const { mutateAsync: updateConsumable } = useUpdateConsumable();
  const { mutateAsync: deleteConsumable } = useDeleteConsumable();

  const [modalVisible, setModalVisible] = useState(false);
  const [form, setForm] = useState({ item_name: '', unit: 'unité', current_stock: 0, min_threshold: 1, notes: '' });
  const [error, setError] = useState('');

  const handleCreate = async () => {
    if (!form.item_name.trim()) { setError('Le nom est obligatoire'); return; }
    try {
      await createConsumable({ propertyId, item: form });
      setModalVisible(false);
      setForm({ item_name: '', unit: 'unité', current_stock: 0, min_threshold: 1, notes: '' });
    } catch (e: any) {
      setError(e.message ?? t('common.error'));
    }
  };

  const handleStockChange = (item: Consumable, delta: number) => {
    const newStock = Math.max(0, Number(item.current_stock) + delta);
    updateConsumable({ id: item.id, propertyId, updates: { current_stock: newStock } });
  };

  const handleDelete = (item: Consumable) => {
    Alert.alert('Supprimer', `Supprimer "${item.item_name}" ?`, [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('common.delete'), style: 'destructive', onPress: () => deleteConsumable({ id: item.id, propertyId }) },
    ]);
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
          <Text style={styles.title}>{t('inventory.consumables')}</Text>
          {property && <Text style={styles.subtitle}>{property.name}</Text>}
        </View>
        <TouchableOpacity style={styles.addBtn} onPress={() => setModalVisible(true)} activeOpacity={0.8}>
          <MaterialCommunityIcons name="plus" size={21} color="#FFFFFF" />
        </TouchableOpacity>
      </LinearGradient>

      {isLoading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={APP_COLORS.primary} />
      ) : (
        <FlatList
          data={consumables ?? []}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View style={[styles.row, SHADOWS.xs, item.is_low && styles.rowLow]}>
              <View style={[styles.statusDot, { backgroundColor: item.is_low ? APP_COLORS.dangerLight : APP_COLORS.successLight }]}>
                <MaterialCommunityIcons
                  name={item.is_low ? 'alert-circle' : 'check-circle'}
                  size={18}
                  color={item.is_low ? APP_COLORS.danger : APP_COLORS.success}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.itemName}>{item.item_name}</Text>
                <Text style={[styles.stockText, item.is_low && styles.stockTextLow]}>
                  {item.current_stock} {item.unit} · seuil : {item.min_threshold}
                </Text>
              </View>
              <View style={styles.stockControls}>
                <TouchableOpacity onPress={() => handleStockChange(item, -1)} style={styles.stockBtn}>
                  <MaterialCommunityIcons name="minus" size={16} color={APP_COLORS.textSecondary} />
                </TouchableOpacity>
                <Text style={styles.stockValue}>{item.current_stock}</Text>
                <TouchableOpacity onPress={() => handleStockChange(item, 1)} style={[styles.stockBtn, styles.stockBtnPlus]}>
                  <MaterialCommunityIcons name="plus" size={16} color={APP_COLORS.primary} />
                </TouchableOpacity>
              </View>
              <TouchableOpacity onPress={() => handleDelete(item)} style={styles.deleteBtn}>
                <MaterialCommunityIcons name="delete-outline" size={18} color={APP_COLORS.danger} />
              </TouchableOpacity>
            </View>
          )}
          ListEmptyComponent={
            <EmptyState icon="package-variant-closed" title={t('inventory.noConsumables')} subtitle={t('inventory.addItem')} />
          }
          contentContainerStyle={consumables?.length === 0 ? { flex: 1 } : { paddingBottom: 32, paddingTop: 8 }}
          showsVerticalScrollIndicator={false}
          style={styles.list}
        />
      )}

      <Modal visible={modalVisible} transparent animationType="slide" onRequestClose={() => setModalVisible(false)}>
        <View style={modal.overlay}>
          <View style={[modal.container, SHADOWS.lg]}>
            <View style={modal.handle} />
            <View style={modal.header}>
              <Text style={modal.title}>{t('inventory.addItem')}</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <MaterialCommunityIcons name="close" size={20} color={APP_COLORS.textSecondary} />
              </TouchableOpacity>
            </View>
            <TextInput label="Nom *" value={form.item_name} onChangeText={(v) => setForm((p) => ({ ...p, item_name: v }))} mode="outlined" style={modal.input} outlineColor={APP_COLORS.border} activeOutlineColor={APP_COLORS.primary} />
            <TextInput label={t('inventory.unit')} value={form.unit} onChangeText={(v) => setForm((p) => ({ ...p, unit: v }))} mode="outlined" style={modal.input} outlineColor={APP_COLORS.border} activeOutlineColor={APP_COLORS.primary} />
            <View style={modal.stepperRow}>
              <Text style={modal.fieldLabel}>{t('inventory.currentStock')}</Text>
              <StepperInput value={form.current_stock} onChange={(v) => setForm((p) => ({ ...p, current_stock: v }))} />
            </View>
            <View style={modal.stepperRow}>
              <Text style={modal.fieldLabel}>{t('inventory.minThreshold')}</Text>
              <StepperInput value={form.min_threshold} onChange={(v) => setForm((p) => ({ ...p, min_threshold: v }))} min={0} />
            </View>
            {error ? <Text style={modal.error}>{error}</Text> : null}
            <View style={modal.actions}>
              <Button mode="outlined" onPress={() => setModalVisible(false)} style={{ flex: 1 }}>{t('common.cancel')}</Button>
              <Button mode="contained" onPress={handleCreate} loading={creating} buttonColor={APP_COLORS.primary} style={{ flex: 1 }} labelStyle={{ color: '#FFFFFF' }}>
                {t('common.save')}
              </Button>
            </View>
          </View>
        </View>
      </Modal>

      <Snackbar visible={!!error} onDismiss={() => setError('')} duration={3000}>{error}</Snackbar>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: APP_COLORS.background },
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
  addBtn: {
    width: 36,
    height: 36,
    borderRadius: RADII.sm,
    backgroundColor: 'rgba(248,245,239,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(248,245,239,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  list: { flex: 1, backgroundColor: APP_COLORS.background },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginHorizontal: 16,
    marginTop: 8,
    padding: 14,
    backgroundColor: APP_COLORS.surfaceElevated,
    borderRadius: RADII.md,
  },
  rowLow: { borderLeftWidth: 3, borderLeftColor: APP_COLORS.danger },
  statusDot: { width: 34, height: 34, borderRadius: RADII.xs, alignItems: 'center', justifyContent: 'center' },
  itemName: { fontSize: 14, fontWeight: '600', color: APP_COLORS.textPrimary },
  stockText: { fontSize: 12, color: APP_COLORS.textSecondary, marginTop: 1 },
  stockTextLow: { color: APP_COLORS.danger, fontWeight: '600' },
  stockControls: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  stockBtn: { width: 28, height: 28, borderRadius: 14, backgroundColor: APP_COLORS.backgroundAlt, alignItems: 'center', justifyContent: 'center' },
  stockBtnPlus: { backgroundColor: APP_COLORS.primaryPale },
  stockValue: { fontSize: 16, fontWeight: '700', color: APP_COLORS.textPrimary, minWidth: 24, textAlign: 'center' },
  deleteBtn: { padding: 4, marginLeft: 2 },
});

const modal = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(5,14,26,0.62)', justifyContent: 'flex-end' },
  container: {
    backgroundColor: APP_COLORS.surfaceElevated,
    borderTopLeftRadius: RADII.xl,
    borderTopRightRadius: RADII.xl,
    padding: 20,
    paddingBottom: 36,
    gap: 10,
  },
  handle: { width: 36, height: 4, borderRadius: 2, backgroundColor: APP_COLORS.border, alignSelf: 'center', marginBottom: 8 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  title: { fontSize: 17, fontWeight: '700', color: APP_COLORS.textPrimary, fontFamily: FONTS.titleBold },
  fieldLabel: { fontSize: 13, color: APP_COLORS.textSecondary, flex: 1 },
  stepperRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  input: { backgroundColor: APP_COLORS.surface },
  error: { color: APP_COLORS.danger, fontSize: 13, textAlign: 'center' },
  actions: { flexDirection: 'row', gap: 10, marginTop: 4 },
});
