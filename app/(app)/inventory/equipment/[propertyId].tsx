import { useState } from 'react';
import { View, StyleSheet, FlatList, Alert, TouchableOpacity, Modal } from 'react-native';
import { Text, ActivityIndicator, TextInput, Button, SegmentedButtons, Snackbar } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useEquipmentForProperty, useCreateEquipment, useDeleteEquipment } from '@/hooks/useInventory';
import { useProperty } from '@/hooks/useProperties';
import { EmptyState } from '@/components/ui/EmptyState';
import { APP_COLORS } from '@/constants/colors';
import { SHADOWS, GRADIENTS, RADII } from '@/constants/theme';
import { FONTS } from '@/constants/typography';
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

  const [modalVisible, setModalVisible] = useState(false);
  const [form, setForm] = useState({ item_name: '', quantity: 1, condition: 'good' as const, notes: '' });
  const [error, setError] = useState('');

  const handleCreate = async () => {
    if (!form.item_name.trim()) { setError('Le nom est obligatoire'); return; }
    try {
      await createEquipment({ propertyId, item: { ...form, quantity: form.quantity, condition: form.condition as any, notes: form.notes || null } });
      setModalVisible(false);
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
          <Text style={styles.title}>{t('inventory.equipment')}</Text>
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
          data={equipment ?? []}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View style={[styles.row, SHADOWS.xs]}>
              <View style={[styles.conditionDot, { backgroundColor: item.condition ? CONDITION_COLORS[item.condition] + '20' : APP_COLORS.borderLight }]}>
                <MaterialCommunityIcons
                  name={(item.condition ? CONDITION_ICONS[item.condition] : 'circle-outline') as any}
                  size={18}
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
              <TouchableOpacity onPress={() => handleDelete(item)} style={styles.deleteBtn}>
                <MaterialCommunityIcons name="delete-outline" size={20} color={APP_COLORS.danger} />
              </TouchableOpacity>
            </View>
          )}
          ListEmptyComponent={
            <EmptyState icon="baby-carriage" title={t('inventory.noEquipment')} subtitle={t('inventory.addItem')} />
          }
          contentContainerStyle={equipment?.length === 0 ? { flex: 1 } : { paddingBottom: 32, paddingTop: 8 }}
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
            <TextInput
              label="Nom *"
              value={form.item_name}
              onChangeText={(v) => setForm((p) => ({ ...p, item_name: v }))}
              mode="outlined"
              style={modal.input}
              outlineColor={APP_COLORS.border}
              activeOutlineColor={APP_COLORS.primary}
            />
            <Text style={modal.fieldLabel}>État</Text>
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
              label={t('inventory.quantity')}
              value={String(form.quantity)}
              onChangeText={(v) => setForm((p) => ({ ...p, quantity: parseInt(v) || 1 }))}
              keyboardType="number-pad"
              mode="outlined"
              style={modal.input}
              outlineColor={APP_COLORS.border}
              activeOutlineColor={APP_COLORS.primary}
            />
            <TextInput
              label={t('common.notes')}
              value={form.notes}
              onChangeText={(v) => setForm((p) => ({ ...p, notes: v }))}
              mode="outlined"
              style={modal.input}
              outlineColor={APP_COLORS.border}
              activeOutlineColor={APP_COLORS.primary}
            />
            {error ? <Text style={modal.error}>{error}</Text> : null}
            <View style={modal.actions}>
              <Button mode="outlined" onPress={() => setModalVisible(false)} style={{ flex: 1 }}>{t('common.cancel')}</Button>
              <Button mode="contained" onPress={handleCreate} loading={isPending} buttonColor={APP_COLORS.primary} style={{ flex: 1 }} labelStyle={{ color: '#FFFFFF' }}>
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
    gap: 12,
    marginHorizontal: 16,
    marginTop: 8,
    padding: 14,
    backgroundColor: APP_COLORS.surfaceElevated,
    borderRadius: RADII.md,
  },
  conditionDot: { width: 36, height: 36, borderRadius: RADII.xs, alignItems: 'center', justifyContent: 'center' },
  itemName: { fontSize: 14, fontWeight: '600', color: APP_COLORS.textPrimary },
  itemDetail: { fontSize: 12, color: APP_COLORS.textSecondary, marginTop: 1 },
  itemNotes: { fontSize: 12, color: APP_COLORS.textTertiary, fontStyle: 'italic', marginTop: 1 },
  deleteBtn: { padding: 4 },
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
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  title: { fontSize: 17, fontWeight: '700', color: APP_COLORS.textPrimary, fontFamily: FONTS.titleBold },
  fieldLabel: { fontSize: 13, color: APP_COLORS.textSecondary },
  input: { backgroundColor: APP_COLORS.surface },
  error: { color: APP_COLORS.danger, fontSize: 13, textAlign: 'center' },
  actions: { flexDirection: 'row', gap: 10, marginTop: 4 },
});
