import { useState } from 'react';
import { View, StyleSheet, FlatList, Alert } from 'react-native';
import { Text, ActivityIndicator, Appbar, FAB, TextInput, Button, Portal, Dialog, Snackbar } from 'react-native-paper';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useConsumablesForProperty, useCreateConsumable, useUpdateConsumable, useDeleteConsumable } from '@/hooks/useInventory';
import { useProperty } from '@/hooks/useProperties';
import { EmptyState } from '@/components/ui/EmptyState';
import { StepperInput } from '@/components/ui/StepperInput';
import { APP_COLORS } from '@/constants/colors';
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

  const [addDialogVisible, setAddDialogVisible] = useState(false);
  const [editItem, setEditItem] = useState<Consumable | null>(null);
  const [form, setForm] = useState({ item_name: '', unit: 'unité', current_stock: 0, min_threshold: 1, notes: '' });
  const [error, setError] = useState('');

  const handleCreate = async () => {
    if (!form.item_name.trim()) { setError('Le nom est obligatoire'); return; }
    try {
      await createConsumable({ propertyId, item: form });
      setAddDialogVisible(false);
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
    <SafeAreaView style={styles.safeArea}>
      <Appbar.Header style={styles.appbar}>
        <Appbar.BackAction onPress={() => router.back()} iconColor="#FFFFFF" />
        <Appbar.Content
          title={t('inventory.consumables')}
          titleStyle={styles.appbarTitle}
          subtitle={property?.name}
          subtitleStyle={styles.appbarSubtitle}
        />
      </Appbar.Header>

      {isLoading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={APP_COLORS.primary} />
      ) : (
        <FlatList
          data={consumables ?? []}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View style={[styles.row, item.is_low && styles.rowLow]}>
              <View style={styles.statusIcon}>
                <MaterialCommunityIcons
                  name={item.is_low ? 'alert-circle' : 'check-circle'}
                  size={20}
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
                <MaterialCommunityIcons
                  name="minus-circle-outline"
                  size={28}
                  color={APP_COLORS.textSecondary}
                  onPress={() => handleStockChange(item, -1)}
                />
                <Text style={styles.stockValue}>{item.current_stock}</Text>
                <MaterialCommunityIcons
                  name="plus-circle-outline"
                  size={28}
                  color={APP_COLORS.primary}
                  onPress={() => handleStockChange(item, 1)}
                />
              </View>
              <MaterialCommunityIcons
                name="delete-outline"
                size={20}
                color={APP_COLORS.danger}
                onPress={() => handleDelete(item)}
                style={{ marginLeft: 8 }}
              />
            </View>
          )}
          ListEmptyComponent={
            <EmptyState
              icon="package-variant-closed"
              title={t('inventory.noConsumables')}
              subtitle={t('inventory.addItem')}
            />
          }
          contentContainerStyle={consumables?.length === 0 ? { flex: 1 } : { paddingBottom: 80 }}
          showsVerticalScrollIndicator={false}
        />
      )}

      <FAB icon="plus" style={styles.fab} onPress={() => setAddDialogVisible(true)} />

      <Portal>
        <Dialog visible={addDialogVisible} onDismiss={() => setAddDialogVisible(false)}>
          <Dialog.Title>{t('inventory.addItem')}</Dialog.Title>
          <Dialog.Content style={{ gap: 10 }}>
            <TextInput label="Nom *" value={form.item_name} onChangeText={(v) => setForm((p) => ({ ...p, item_name: v }))} mode="outlined" />
            <TextInput label={t('inventory.unit')} value={form.unit} onChangeText={(v) => setForm((p) => ({ ...p, unit: v }))} mode="outlined" />
            <View>
              <Text style={styles.fieldLabel}>{t('inventory.currentStock')}</Text>
              <StepperInput value={form.current_stock} onChange={(v) => setForm((p) => ({ ...p, current_stock: v }))} />
            </View>
            <View>
              <Text style={styles.fieldLabel}>{t('inventory.minThreshold')}</Text>
              <StepperInput value={form.min_threshold} onChange={(v) => setForm((p) => ({ ...p, min_threshold: v }))} min={0} />
            </View>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setAddDialogVisible(false)}>{t('common.cancel')}</Button>
            <Button onPress={handleCreate} loading={creating}>{t('common.save')}</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      <Snackbar visible={!!error} onDismiss={() => setError('')} duration={3000}>{error}</Snackbar>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: APP_COLORS.background },
  appbar: { backgroundColor: APP_COLORS.primary },
  appbarTitle: { color: '#FFFFFF', fontSize: 18, fontWeight: '600' },
  appbarSubtitle: { color: 'rgba(255,255,255,0.7)', fontSize: 12 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 14,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: APP_COLORS.border,
  },
  rowLow: { backgroundColor: '#FEF2F2' },
  statusIcon: { width: 28, alignItems: 'center' },
  itemName: { fontSize: 14, fontWeight: '600', color: APP_COLORS.textPrimary },
  stockText: { fontSize: 12, color: APP_COLORS.textSecondary },
  stockTextLow: { color: APP_COLORS.danger, fontWeight: '600' },
  stockControls: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  stockValue: { fontSize: 16, fontWeight: '700', color: APP_COLORS.textPrimary, minWidth: 24, textAlign: 'center' },
  fab: { position: 'absolute', bottom: 24, right: 24, backgroundColor: APP_COLORS.primary },
  fieldLabel: { fontSize: 13, color: APP_COLORS.textSecondary, marginBottom: 4 },
});
