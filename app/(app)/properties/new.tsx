import { useState } from 'react';
import { ScrollView, View, StyleSheet, TouchableOpacity, TextInput as RNTextInput } from 'react-native';
import { Text, TextInput, Button, Switch, Snackbar, Appbar } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useCreateProperty } from '@/hooks/useProperties';
import { StepperInput } from '@/components/ui/StepperInput';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { PropertyType, PropertyFormData } from '@/types';
import { PROPERTY_TYPE_LABELS } from '@/constants/labels';
import { PROPERTY_COLORS, APP_COLORS } from '@/constants/colors';

const PROPERTY_TYPES = Object.values(PropertyType);

export default function NewPropertyScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { mutateAsync: createProperty, isPending } = useCreateProperty();

  const [form, setForm] = useState<PropertyFormData>({
    name: '',
    address: '',
    notes: '',
    property_type: PropertyType.SCI,
    nb_double_beds: 0,
    nb_single_beds: 0,
    nb_sofa_beds: 0,
    nb_baby_cribs: 0,
    max_guests: 2,
    nb_bathrooms: 1,
    is_active: true,
    color: PROPERTY_COLORS[0],
  });
  const [error, setError] = useState('');

  const set = (key: keyof PropertyFormData, value: any) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = async () => {
    if (!form.name.trim()) {
      setError('Le nom est obligatoire');
      return;
    }
    try {
      await createProperty(form);
      router.back();
    } catch (e: any) {
      setError(e.message ?? t('common.error'));
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <Appbar.Header style={styles.appbar}>
        <Appbar.BackAction onPress={() => router.back()} iconColor="#FFFFFF" />
        <Appbar.Content title={t('properties.new')} titleStyle={styles.appbarTitle} />
        <Appbar.Action
          icon="check"
          iconColor="#FFFFFF"
          onPress={handleSubmit}
          disabled={isPending}
        />
      </Appbar.Header>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        <SectionHeader title="Identité" />
        <View style={styles.section}>
          <TextInput
            label={t('properties.name') + ' *'}
            value={form.name}
            onChangeText={(v) => set('name', v)}
            mode="outlined"
            style={styles.input}
          />
          <TextInput
            label={t('properties.address')}
            value={form.address}
            onChangeText={(v) => set('address', v)}
            mode="outlined"
            style={styles.input}
          />
        </View>

        <SectionHeader title={t('properties.type')} />
        <View style={styles.section}>
          {PROPERTY_TYPES.map((type) => (
            <TouchableOpacity
              key={type}
              style={[
                styles.typeOption,
                form.property_type === type && styles.typeOptionSelected,
              ]}
              onPress={() => set('property_type', type)}
            >
              <View
                style={[
                  styles.typeRadio,
                  form.property_type === type && styles.typeRadioSelected,
                ]}
              />
              <Text style={styles.typeLabel}>{PROPERTY_TYPE_LABELS[type]}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <SectionHeader title={t('properties.beds')} />
        <View style={styles.section}>
          <StepperInput
            label={t('properties.bedsDouble')}
            value={form.nb_double_beds}
            onChange={(v) => set('nb_double_beds', v)}
          />
          <StepperInput
            label={t('properties.bedsSingle')}
            value={form.nb_single_beds}
            onChange={(v) => set('nb_single_beds', v)}
          />
          <StepperInput
            label={t('properties.bedsSofa')}
            value={form.nb_sofa_beds}
            onChange={(v) => set('nb_sofa_beds', v)}
          />
          <StepperInput
            label={t('properties.bedsCrib')}
            value={form.nb_baby_cribs}
            onChange={(v) => set('nb_baby_cribs', v)}
          />
        </View>

        <SectionHeader title="Capacité" />
        <View style={styles.section}>
          <StepperInput
            label={t('properties.maxGuests')}
            value={form.max_guests}
            onChange={(v) => set('max_guests', v)}
            min={1}
          />
          <StepperInput
            label={t('properties.bathrooms')}
            value={form.nb_bathrooms}
            onChange={(v) => set('nb_bathrooms', v)}
            min={1}
          />
        </View>

        <SectionHeader title={t('properties.color')} />
        <View style={styles.section}>
          {Array.from({ length: PROPERTY_COLORS.length / 3 }, (_, i) => (
            <View key={i} style={styles.colorFamily}>
              {PROPERTY_COLORS.slice(i * 3, i * 3 + 3).map((color) => (
                <TouchableOpacity
                  key={color}
                  style={[
                    styles.colorSwatch,
                    { backgroundColor: color },
                    form.color === color && styles.colorSwatchSelected,
                  ]}
                  onPress={() => set('color', color)}
                />
              ))}
            </View>
          ))}
          <View style={styles.customColorRow}>
            <View style={[styles.customPreview, { backgroundColor: form.color }]} />
            <RNTextInput
              style={styles.hexInput}
              value={form.color}
              onChangeText={(v) => {
                const hex = v.startsWith('#') ? v : `#${v}`;
                if (/^#[0-9A-Fa-f]{0,6}$/.test(hex)) set('color', hex);
              }}
              placeholder="#RRGGBB"
              autoCapitalize="characters"
              maxLength={7}
            />
            <Text style={styles.hexHint}>Couleur personnalisée</Text>
          </View>
        </View>

        <SectionHeader title={t('common.notes')} />
        <View style={styles.section}>
          <TextInput
            label={t('common.notes')}
            value={form.notes}
            onChangeText={(v) => set('notes', v)}
            mode="outlined"
            multiline
            numberOfLines={3}
            style={styles.input}
          />
          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>{t('properties.isActive')}</Text>
            <Switch
              value={form.is_active}
              onValueChange={(v) => set('is_active', v)}
              color={APP_COLORS.primary}
            />
          </View>
        </View>

        <Button
          mode="contained"
          onPress={handleSubmit}
          loading={isPending}
          disabled={isPending}
          style={styles.submitButton}
          contentStyle={styles.submitButtonContent}
        >
          {t('common.save')}
        </Button>

        <View style={{ height: 32 }} />
      </ScrollView>

      <Snackbar visible={!!error} onDismiss={() => setError('')} duration={3000}>
        {error}
      </Snackbar>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: APP_COLORS.background },
  appbar: { backgroundColor: APP_COLORS.primary },
  appbarTitle: { color: '#FFFFFF', fontSize: 18, fontWeight: '600' },
  scroll: { flex: 1 },
  section: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 12,
    padding: 16,
    gap: 8,
  },
  input: { backgroundColor: '#FFFFFF' },
  typeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: APP_COLORS.border,
  },
  typeOptionSelected: { backgroundColor: '#EEF2FF', borderRadius: 8 },
  typeRadio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: APP_COLORS.border,
  },
  typeRadioSelected: {
    borderColor: APP_COLORS.primary,
    backgroundColor: APP_COLORS.primary,
  },
  typeLabel: { fontSize: 14, color: APP_COLORS.textPrimary },
  colorFamily: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  colorSwatch: {
    width: 44,
    height: 44,
    borderRadius: 22,
    flex: 1,
  },
  colorSwatchSelected: {
    borderWidth: 3,
    borderColor: APP_COLORS.textPrimary,
  },
  customColorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: APP_COLORS.border,
  },
  customPreview: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: APP_COLORS.border,
  },
  hexInput: {
    borderWidth: 1,
    borderColor: APP_COLORS.border,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 14,
    width: 100,
    fontFamily: 'monospace',
  },
  hexHint: {
    fontSize: 12,
    color: APP_COLORS.textSecondary,
    flex: 1,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 4,
  },
  switchLabel: { fontSize: 14, color: APP_COLORS.textPrimary },
  submitButton: {
    marginHorizontal: 16,
    marginTop: 8,
    borderRadius: 8,
    backgroundColor: APP_COLORS.primary,
  },
  submitButtonContent: { paddingVertical: 6 },
});
