import { useState } from 'react';
import { View, StyleSheet, FlatList, Alert } from 'react-native';
import { Text, ActivityIndicator, Appbar, FAB, TextInput, Button, Portal, Dialog, SegmentedButtons, Snackbar } from 'react-native-paper';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useEquipmentForProperty, useCreateEquipment, useDeleteEquipment } from '@/hooks/useInventory';
import { useProperty } from '@/hooks/useProperties';
import { EmptyState } from '@/components/ui/EmptyState';
import { APP_COLORS } from '@/constants/colors';
import { EquipmentInventory } from '@/types';

const CONDITION_COLORS: Record<string, string> = {
  good: APP_COLORS.success,
  worn: APP_COLORS.warning,
  broken: APP_COLORS.danger,
};

const CONDITION_ICONS: Record<string, string> = {
  good: 'check-circle',
  worn: 'alert-circle',
  broken: 'close-circle',
};

export default function EquipmentInventoryScreen() {
  const { propertyId } = useLocalSearchParams<{ propertyId: string }>();
  const { t } = useTranslation();
  const router = useRouter();
  const { data: property } = useProperty(propertyId);
  const { data: equipment, isLoading } = useEquipmentForProperty(propertyId);
  const { mutateAsync: createEquipment, isPending } = useCreateEquipment();
  const { mutateAsync: deleteEquipment } = useDeleteEquipment();

  const [dialogVisible, setDialogVisible] = useState(false);
  const [form, setForm] = useState({ item_name: '', quantity: 1, condition: 'good' as const, notes: '' });
  const [error, setError] = useState('');

  const handleCreate = async () => {
    if (!form.item_name.trim()) { setError('Le nom est obligatoire'); return; }
    try {
      await createEquipment({ propertyId, item: { ...form, quantity: form.quantity, condition: form.condition as any, notes: form.notes || null } });
      setDialogVisible(false);
      setForm({ item_name: '', quantity: 1, condition: 'good', notes: '' });
    } catch (e: any) {
      setError(e.message ?? t('common.error'));
    }
  };

  const handleDelete = (item: EquipmentInventory) => {
    Alert.alert('Supprimer', `Supprimer "${item.item_name}" ?`, [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('common.delete'), style: 'destructive', onPress: () => deleteEquipment({ id: item.id, propertyId }) },
    ]);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <Appbar.Header style={styles.appbar}>
        <Appbar.BackAction onPress={() => router.back()} iconColor="#FFFFFF" />
        <Appbar.Content
          title={t('inventory.equipment')}
          titleStyle={styles.appbarTitle}
          subtitle={property?.name}
          subtitleStyle={styles.appbarSubtitle}
        />
      </Appbar.Header>

      {isLoading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={APP_COLORS.primary} />
      ) : (
        <FlatList
          data={equipment ?? []}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View style={styles.row}>
              <View style={styles.conditionIcon}>
                <MaterialCommunityIcons
                  name={(item.condition ? CONDITION_ICONS[item.condition] : 'circle-outline') as any}
                  size={20}
                  color={item.condition ? CONDITION_COLORS[item.condition] : APP_COLORS.border}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.itemName}>{item.item_name}</Text>
                <Text style={styles.itemDetail}>
                  Qté : {item.quantity}
                  {item.condition ? ` · ${t(`inventory.condition.${item.condition}`)}` : ''}
                </Text>
                {item.notes ? <Text style={styles.itemNotes}>{item.notes}</Text> : null}
              </View>
              <MaterialCommunityIcons
                name="delete-outline"
                size={20}
                color={APP_COLORS.danger}
                onPress={() => handleDelete(item)}
              />
            </View>
          )}
          ListEmptyComponent={
            <EmptyState icon="baby-carriage" title={t('inventory.noEquipment')} subtitle={t('inventory.addItem')} />
          }
          contentContainerStyle={equipment?.length === 0 ? { flex: 1 } : { paddingBottom: 80 }}
          showsVerticalScrollIndicator={false}
        />
      )}

      <FAB icon="plus" style={styles.fab} onPress={() => setDialogVisible(true)} />

      <Portal>
        <Dialog visible={dialogVisible} onDismiss={() => setDialogVisible(false)}>
          <Dialog.Title>{t('inventory.addItem')}</Dialog.Title>
          <Dialog.Content style={{ gap: 10 }}>
            <TextInput
              label="Nom *"
              value={form.item_name}
              onChangeText={(v) => setForm((p) => ({ ...p, item_name: v }))}
              mode="outlined"
            />
            <Text style={styles.fieldLabel}>État</Text>
            <SegmentedButtons
              value={form.condition}
              onValueChange={(v) => setForm((p) => ({ ...p, condition: v as any }))}
              buttons={[
                { value: 'good', label: t('inventory.condition.good') },
                { value: 'worn', label: t('inventory.condition.worn') },
                { value: 'broken', label: t('inventory.condition.broken') },
              ]}
            />
            <TextInput
              label={`${t('inventory.quantity')}`}
              value={String(form.quantity)}
              onChangeText={(v) => setForm((p) => ({ ...p, quantity: parseInt(v) || 1 }))}
              keyboardType="number-pad"
              mode="outlined"
            />
            <TextInput
              label={t('common.notes')}
              value={form.notes}
              onChangeText={(v) => setForm((p) => ({ ...p, notes: v }))}
              mode="outlined"
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setDialogVisible(false)}>{t('common.cancel')}</Button>
            <Button onPress={handleCreate} loading={isPending}>{t('common.save')}</Button>
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
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: APP_COLORS.border },
  conditionIcon: { width: 32, alignItems: 'center' },
  itemName: { fontSize: 14, fontWeight: '600', color: APP_COLORS.textPrimary },
  itemDetail: { fontSize: 12, color: APP_COLORS.textSecondary },
  itemNotes: { fontSize: 12, color: APP_COLORS.textSecondary, fontStyle: 'italic' },
  fab: { position: 'absolute', bottom: 24, right: 24, backgroundColor: APP_COLORS.primary },
  fieldLabel: { fontSize: 13, color: APP_COLORS.textSecondary, marginBottom: -4 },
});
