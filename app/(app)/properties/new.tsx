import { useState } from 'react';
import { ScrollView, View, StyleSheet, TouchableOpacity, TextInput as RNTextInput } from 'react-native';
import { Text, TextInput, Button, Switch, Snackbar } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useCreateProperty } from '@/hooks/useProperties';
import { StepperInput } from '@/components/ui/StepperInput';
import { PropertyType, PropertyFormData } from '@/types';
import { PROPERTY_TYPE_LABELS } from '@/constants/labels';
import { PROPERTY_COLORS, APP_COLORS } from '@/constants/colors';
import { SHADOWS, GRADIENTS, RADII } from '@/constants/theme';
import { FONTS } from '@/constants/typography';

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
    ical_url: '',
  });
  const [error, setError] = useState('');

  const set = (key: keyof PropertyFormData, value: any) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = async () => {
    if (!form.name.trim()) { setError('Le nom est obligatoire'); return; }
    try {
      await createProperty(form);
      router.back();
    } catch (e: any) {
      setError(e.message ?? t('common.error'));
    }
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
        <Text style={styles.title}>{t('properties.new')}</Text>
        <TouchableOpacity style={styles.saveBtn} onPress={handleSubmit} disabled={isPending} activeOpacity={0.8}>
          <MaterialCommunityIcons name="check" size={20} color="#FFFFFF" />
        </TouchableOpacity>
      </LinearGradient>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.sectionLabel}>
          <View style={styles.sectionAccent} />
          <Text style={styles.sectionLabelText}>IDENTITÉ</Text>
        </View>
        <View style={[styles.section, SHADOWS.sm]}>
          <TextInput label={t('properties.name') + ' *'} value={form.name} onChangeText={(v) => set('name', v)} mode="outlined" style={styles.input} outlineColor={APP_COLORS.border} activeOutlineColor={APP_COLORS.primary} />
          <TextInput label={t('properties.address')} value={form.address} onChangeText={(v) => set('address', v)} mode="outlined" style={styles.input} outlineColor={APP_COLORS.border} activeOutlineColor={APP_COLORS.primary} />
        </View>

        <View style={styles.sectionLabel}>
          <View style={styles.sectionAccent} />
          <Text style={styles.sectionLabelText}>{t('properties.type').toUpperCase()}</Text>
        </View>
        <View style={[styles.section, SHADOWS.sm]}>
          {PROPERTY_TYPES.map((type) => (
            <TouchableOpacity
              key={type}
              style={[styles.typeOption, form.property_type === type && styles.typeOptionSelected]}
              onPress={() => set('property_type', type)}
            >
              <View style={[styles.typeRadio, form.property_type === type && styles.typeRadioSelected]} />
              <Text style={styles.typeLabel}>{PROPERTY_TYPE_LABELS[type]}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.sectionLabel}>
          <View style={styles.sectionAccent} />
          <Text style={styles.sectionLabelText}>{t('properties.beds').toUpperCase()}</Text>
        </View>
        <View style={[styles.section, SHADOWS.sm]}>
          <StepperInput label={t('properties.bedsDouble')} value={form.nb_double_beds} onChange={(v) => set('nb_double_beds', v)} />
          <StepperInput label={t('properties.bedsSingle')} value={form.nb_single_beds} onChange={(v) => set('nb_single_beds', v)} />
          <StepperInput label={t('properties.bedsSofa')} value={form.nb_sofa_beds} onChange={(v) => set('nb_sofa_beds', v)} />
          <StepperInput label={t('properties.bedsCrib')} value={form.nb_baby_cribs} onChange={(v) => set('nb_baby_cribs', v)} />
        </View>

        <View style={styles.sectionLabel}>
          <View style={styles.sectionAccent} />
          <Text style={styles.sectionLabelText}>CAPACITÉ</Text>
        </View>
        <View style={[styles.section, SHADOWS.sm]}>
          <StepperInput label={t('properties.maxGuests')} value={form.max_guests} onChange={(v) => set('max_guests', v)} min={1} />
          <StepperInput label={t('properties.bathrooms')} value={form.nb_bathrooms} onChange={(v) => set('nb_bathrooms', v)} min={1} />
        </View>

        <View style={styles.sectionLabel}>
          <View style={styles.sectionAccent} />
          <Text style={styles.sectionLabelText}>{t('properties.color').toUpperCase()}</Text>
        </View>
        <View style={[styles.section, SHADOWS.sm]}>
          {Array.from({ length: Math.ceil(PROPERTY_COLORS.length / 4) }, (_, i) => (
            <View key={i} style={styles.colorRow}>
              {PROPERTY_COLORS.slice(i * 4, i * 4 + 4).map((color) => (
                <TouchableOpacity
                  key={color}
                  style={[styles.colorSwatch, { backgroundColor: color }, form.color === color && styles.colorSwatchSelected]}
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
            <Text style={styles.hexHint}>Personnalisée</Text>
          </View>
        </View>

        <View style={styles.sectionLabel}>
          <View style={styles.sectionAccent} />
          <Text style={styles.sectionLabelText}>{t('common.notes').toUpperCase()}</Text>
        </View>
        <View style={[styles.section, SHADOWS.sm]}>
          <TextInput label={t('common.notes')} value={form.notes} onChangeText={(v) => set('notes', v)} mode="outlined" multiline numberOfLines={3} style={styles.input} outlineColor={APP_COLORS.border} activeOutlineColor={APP_COLORS.primary} />
          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>{t('properties.isActive')}</Text>
            <Switch value={form.is_active} onValueChange={(v) => set('is_active', v)} color={APP_COLORS.primary} />
          </View>
        </View>

        <View style={styles.sectionLabel}>
          <View style={styles.sectionAccent} />
          <Text style={styles.sectionLabelText}>SYNCHRONISATION CALENDRIER</Text>
        </View>
        <View style={[styles.section, SHADOWS.sm]}>
          <TextInput label="Lien iCal (Airbnb, Booking…)" value={form.ical_url} onChangeText={(v) => set('ical_url', v)} mode="outlined" style={styles.input} autoCapitalize="none" autoCorrect={false} outlineColor={APP_COLORS.border} activeOutlineColor={APP_COLORS.primary} />
          <Text style={styles.icalHint}>Airbnb : Calendrier → Paramètres → Lien d'exportation{'\n'}Booking.com : Extranet → Calendrier → Exporter</Text>
        </View>

        <TouchableOpacity
          style={[styles.submitBtn, SHADOWS.navy, isPending && { opacity: 0.6 }]}
          onPress={handleSubmit}
          disabled={isPending}
          activeOpacity={0.85}
        >
          <Text style={styles.submitBtnText}>{t('common.save')}</Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>

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
  title: { flex: 1, fontSize: 20, fontFamily: FONTS.titleBold, color: APP_COLORS.accent, letterSpacing: 0.8 },
  saveBtn: {
    width: 36,
    height: 36,
    borderRadius: RADII.sm,
    backgroundColor: 'rgba(248,245,239,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(248,245,239,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scroll: { flex: 1, backgroundColor: APP_COLORS.background },
  sectionLabel: { flexDirection: 'row', alignItems: 'center', gap: 8, marginHorizontal: 16, marginTop: 20, marginBottom: 8 },
  sectionAccent: { width: 3, height: 13, borderRadius: 2, backgroundColor: APP_COLORS.accent },
  sectionLabelText: { fontSize: 11, fontWeight: '700', color: APP_COLORS.textSecondary, letterSpacing: 0.8 },
  section: { backgroundColor: APP_COLORS.surfaceElevated, marginHorizontal: 16, borderRadius: RADII.md, padding: 16, gap: 8 },
  input: { backgroundColor: APP_COLORS.surfaceElevated },
  typeOption: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, gap: 12, borderBottomWidth: 1, borderBottomColor: APP_COLORS.borderLight },
  typeOptionSelected: { backgroundColor: APP_COLORS.primaryPale, borderRadius: RADII.xs },
  typeRadio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: APP_COLORS.border },
  typeRadioSelected: { borderColor: APP_COLORS.primary, backgroundColor: APP_COLORS.primary },
  typeLabel: { fontSize: 14, color: APP_COLORS.textPrimary },
  colorRow: { flexDirection: 'row', gap: 8 },
  colorSwatch: { flex: 1, height: 40, borderRadius: RADII.sm },
  colorSwatchSelected: { borderWidth: 3, borderColor: APP_COLORS.primaryDark },
  customColorRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 8, paddingTop: 12, borderTopWidth: 1, borderTopColor: APP_COLORS.borderLight },
  customPreview: { width: 36, height: 36, borderRadius: 18, borderWidth: 1, borderColor: APP_COLORS.border },
  hexInput: { borderWidth: 1, borderColor: APP_COLORS.border, borderRadius: RADII.xs, paddingHorizontal: 10, paddingVertical: 6, fontSize: 14, width: 100, fontFamily: 'monospace', color: APP_COLORS.textPrimary },
  hexHint: { fontSize: 12, color: APP_COLORS.textSecondary, flex: 1 },
  icalHint: { fontSize: 11, color: APP_COLORS.textSecondary, lineHeight: 16 },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 4 },
  switchLabel: { fontSize: 14, color: APP_COLORS.textPrimary },
  submitBtn: {
    marginHorizontal: 16,
    marginTop: 24,
    borderRadius: RADII.md,
    paddingVertical: 15,
    backgroundColor: APP_COLORS.primary,
    alignItems: 'center',
  },
  submitBtnText: { fontSize: 15, fontWeight: '700', color: '#FFFFFF' },
});
