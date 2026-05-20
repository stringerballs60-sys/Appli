import { useState } from 'react';
import { ScrollView, View, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { Text, Button, ActivityIndicator, Switch, Snackbar, TextInput } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useProperty, useUpdateProperty, useTogglePropertyActive, useSyncIcal } from '@/hooks/useProperties';
import { useReservations } from '@/hooks/useReservations';
import { PropertyBadge } from '@/components/ui/PropertyBadge';
import { ReservationCard } from '@/components/reservation/ReservationCard';
import { StepperInput } from '@/components/ui/StepperInput';
import { PropertyType, PropertyFormData } from '@/types';
import { PROPERTY_TYPE_LABELS } from '@/constants/labels';
import { PROPERTY_COLORS, APP_COLORS } from '@/constants/colors';
import { SHADOWS, GRADIENTS, RADII } from '@/constants/theme';
import { FONTS } from '@/constants/typography';
import { todayISO } from '@/utils/dateHelpers';

export default function PropertyDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation();
  const router = useRouter();
  const { data: property, isLoading } = useProperty(id);
  const { data: reservations } = useReservations({ propertyId: id, from: todayISO() });
  const { mutateAsync: updateProperty, isPending: updating } = useUpdateProperty();
  const { mutateAsync: toggleActive } = useTogglePropertyActive();
  const { mutate: syncIcal, isPending: syncing } = useSyncIcal();
  const [syncResult, setSyncResult] = useState<string | null>(null);

  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<Partial<PropertyFormData>>({});
  const [error, setError] = useState('');

  const startEdit = () => {
    if (!property) return;
    setForm({
      name: property.name,
      address: property.address ?? '',
      notes: property.notes ?? '',
      property_type: property.property_type,
      nb_double_beds: property.nb_double_beds,
      nb_single_beds: property.nb_single_beds,
      nb_sofa_beds: property.nb_sofa_beds,
      nb_baby_cribs: property.nb_baby_cribs,
      max_guests: property.max_guests,
      nb_bathrooms: property.nb_bathrooms,
      is_active: property.is_active,
      color: property.color,
      ical_url: property.ical_url ?? '',
      group_name: property.group_name ?? '',
    });
    setEditing(true);
  };

  const handleSync = () => {
    syncIcal(id, {
      onSuccess: (data) => {
        const r = data?.results?.[0];
        if (r?.success) {
          const ins = r.inserted ?? 0;
          const upd = r.updated ?? 0;
          if (ins > 0 || upd > 0) {
            const parts = [];
            if (ins > 0) parts.push(`${ins} nouvelle(s)`);
            if (upd > 0) parts.push(`${upd} mise(s) à jour`);
            setSyncResult(parts.join(' · '));
          } else {
            setSyncResult('Calendrier à jour, aucune modification');
          }
        } else {
          setSyncResult(r?.error ?? 'Erreur de synchronisation');
        }
      },
      onError: (e: any) => setSyncResult(e.message ?? 'Erreur'),
    });
  };

  const handleSave = async () => {
    if (!form.name?.trim()) { setError('Le nom est obligatoire'); return; }
    try {
      await updateProperty({ id, updates: form });
      setEditing(false);
    } catch (e: any) {
      setError(e.message ?? t('common.error'));
    }
  };

  const handleToggleActive = async () => {
    if (!property) return;
    await toggleActive({ id, isActive: !property.is_active });
  };

  const set = (key: keyof PropertyFormData, value: any) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  if (isLoading || !property) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <LinearGradient colors={GRADIENTS.navyHeader as [string, string, ...string[]]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
            <MaterialCommunityIcons name="arrow-left" size={22} color="rgba(248,245,239,0.8)" />
          </TouchableOpacity>
          <Text style={styles.title}>Logement</Text>
        </LinearGradient>
        <ActivityIndicator style={{ marginTop: 40 }} color={APP_COLORS.primary} />
      </SafeAreaView>
    );
  }

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
          <Text style={styles.title} numberOfLines={1}>{property.name}</Text>
          <Text style={styles.subtitle}>{PROPERTY_TYPE_LABELS[property.property_type]}</Text>
        </View>
        {!editing ? (
          <TouchableOpacity style={styles.actionBtn} onPress={startEdit} activeOpacity={0.8}>
            <MaterialCommunityIcons name="pencil" size={18} color="#FFFFFF" />
          </TouchableOpacity>
        ) : (
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TouchableOpacity style={styles.actionBtn} onPress={() => setEditing(false)} activeOpacity={0.8}>
              <MaterialCommunityIcons name="close" size={18} color="#FFFFFF" />
            </TouchableOpacity>
            <TouchableOpacity style={[styles.actionBtn, { backgroundColor: 'rgba(201,168,76,0.25)' }]} onPress={handleSave} disabled={updating} activeOpacity={0.8}>
              <MaterialCommunityIcons name="check" size={18} color={APP_COLORS.accent} />
            </TouchableOpacity>
          </View>
        )}
      </LinearGradient>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        {!editing ? (
          <>
            {/* Color strip + info */}
            <View style={[styles.colorStrip, { backgroundColor: property.color }]}>
              <PropertyBadge type={property.property_type} />
              {!property.is_active && (
                <View style={styles.inactiveBadge}>
                  <Text style={styles.inactiveBadgeText}>Inactif</Text>
                </View>
              )}
            </View>

            <View style={[styles.infoCard, SHADOWS.sm]}>
              {property.address ? (
                <View style={styles.infoRow}>
                  <MaterialCommunityIcons name="map-marker" size={16} color={APP_COLORS.textSecondary} />
                  <Text style={styles.infoText}>{property.address}</Text>
                </View>
              ) : null}
              <View style={styles.infoRow}>
                <MaterialCommunityIcons name="account-group" size={16} color={APP_COLORS.textSecondary} />
                <Text style={styles.infoText}>{property.max_guests} voyageurs max · {property.nb_bathrooms} SDB</Text>
              </View>
            </View>

            {/* Beds */}
            <View style={styles.sectionLabel}>
              <View style={styles.sectionAccent} />
              <Text style={styles.sectionLabelText}>{t('properties.beds').toUpperCase()}</Text>
            </View>
            <View style={styles.bedsGrid}>
              {[
                { label: 'Lits doubles', value: property.nb_double_beds, icon: 'bed-double' },
                { label: 'Lits simples', value: property.nb_single_beds, icon: 'bed' },
                { label: 'Canapés-lits', value: property.nb_sofa_beds, icon: 'sofa' },
                { label: 'Berceaux', value: property.nb_baby_cribs, icon: 'baby-carriage' },
              ].filter(({ value }) => value > 0).map(({ label, value, icon }) => (
                <View key={label} style={[styles.bedItem, SHADOWS.xs]}>
                  <MaterialCommunityIcons name={icon as any} size={22} color={APP_COLORS.primary} />
                  <Text style={styles.bedCount}>{value}</Text>
                  <Text style={styles.bedLabel}>{label}</Text>
                </View>
              ))}
            </View>

            {/* Inventory shortcuts */}
            <View style={styles.sectionLabel}>
              <View style={styles.sectionAccent} />
              <Text style={styles.sectionLabelText}>INVENTAIRES</Text>
            </View>
            <View style={[styles.card, SHADOWS.sm]}>
              {[
                { label: 'Linge', icon: 'tshirt-crew', color: APP_COLORS.primary, route: `/(app)/inventory/linen/${id}` },
                { label: 'Équipements', icon: 'baby-carriage', color: '#0891B2', route: `/(app)/inventory/equipment/${id}` },
                { label: 'Consommables', icon: 'package-variant', color: '#EA580C', route: `/(app)/inventory/consumables/${id}` },
              ].map(({ label, icon, color, route }, idx, arr) => (
                <TouchableOpacity
                  key={label}
                  style={[styles.shortcut, idx < arr.length - 1 && styles.shortcutBorder]}
                  onPress={() => router.push(route as any)}
                >
                  <View style={[styles.shortcutIcon, { backgroundColor: color + '15' }]}>
                    <MaterialCommunityIcons name={icon as any} size={18} color={color} />
                  </View>
                  <Text style={styles.shortcutLabel}>{label}</Text>
                  <MaterialCommunityIcons name="chevron-right" size={16} color={APP_COLORS.border} />
                </TouchableOpacity>
              ))}
            </View>

            {/* Upcoming reservations */}
            {reservations && reservations.length > 0 && (
              <>
                <View style={styles.sectionLabel}>
                  <View style={styles.sectionAccent} />
                  <Text style={styles.sectionLabelText}>PROCHAINES RÉSERVATIONS</Text>
                </View>
                {reservations.slice(0, 5).map((r) => (
                  <ReservationCard key={r.id} reservation={r} onPress={() => router.push(`/(app)/reservations/${r.id}`)} />
                ))}
              </>
            )}

            {/* iCal sync */}
            <View style={styles.sectionLabel}>
              <View style={styles.sectionAccent} />
              <Text style={styles.sectionLabelText}>SYNCHRONISATION CALENDRIER</Text>
            </View>
            <View style={[styles.card, SHADOWS.sm, { padding: 16, gap: 12 }]}>
              {property.ical_url ? (
                <>
                  <View style={styles.icalUrlRow}>
                    <MaterialCommunityIcons name="calendar-sync" size={14} color={APP_COLORS.primary} />
                    <Text style={styles.icalUrlText} numberOfLines={1}>{property.ical_url}</Text>
                  </View>
                  <TouchableOpacity
                    style={[styles.syncBtn, syncing && { opacity: 0.6 }]}
                    onPress={handleSync}
                    disabled={syncing}
                    activeOpacity={0.8}
                  >
                    <MaterialCommunityIcons name="sync" size={16} color="#FFFFFF" />
                    <Text style={styles.syncBtnText}>{syncing ? 'Synchronisation…' : 'Synchroniser maintenant'}</Text>
                  </TouchableOpacity>
                </>
              ) : (
                <View style={styles.icalEmpty}>
                  <MaterialCommunityIcons name="calendar-remove-outline" size={28} color={APP_COLORS.textTertiary} />
                  <Text style={styles.icalEmptyText}>Aucun lien iCal configuré</Text>
                  <Text style={styles.icalEmptyHint}>Modifiez le logement pour ajouter un lien Airbnb ou Booking.</Text>
                </View>
              )}
            </View>

            {/* Toggle active */}
            <View style={{ marginHorizontal: 16, marginTop: 16, marginBottom: 8 }}>
              <TouchableOpacity
                style={[styles.dangerBtn, { borderColor: property.is_active ? APP_COLORS.danger : APP_COLORS.success }]}
                onPress={handleToggleActive}
                activeOpacity={0.8}
              >
                <Text style={[styles.dangerBtnText, { color: property.is_active ? APP_COLORS.danger : APP_COLORS.success }]}>
                  {property.is_active ? 'Désactiver ce logement' : 'Réactiver ce logement'}
                </Text>
              </TouchableOpacity>
            </View>
          </>
        ) : (
          <>
            <View style={styles.sectionLabel}>
              <View style={styles.sectionAccent} />
              <Text style={styles.sectionLabelText}>IDENTITÉ</Text>
            </View>
            <View style={[styles.card, SHADOWS.sm, { padding: 16, gap: 8 }]}>
              <TextInput label={t('properties.name') + ' *'} value={form.name ?? ''} onChangeText={(v) => set('name', v)} mode="outlined" style={styles.input} outlineColor={APP_COLORS.border} activeOutlineColor={APP_COLORS.primary} />
              <TextInput label={t('properties.address')} value={form.address ?? ''} onChangeText={(v) => set('address', v)} mode="outlined" style={styles.input} outlineColor={APP_COLORS.border} activeOutlineColor={APP_COLORS.primary} />
              <TextInput label="Groupe / Zone (ex : Les Cortalines)" value={form.group_name ?? ''} onChangeText={(v) => set('group_name', v)} mode="outlined" style={styles.input} outlineColor={APP_COLORS.border} activeOutlineColor={APP_COLORS.primary} />
            </View>

            <View style={styles.sectionLabel}>
              <View style={styles.sectionAccent} />
              <Text style={styles.sectionLabelText}>{t('properties.type').toUpperCase()}</Text>
            </View>
            <View style={[styles.card, SHADOWS.sm, { padding: 16, gap: 0 }]}>
              {Object.values(PropertyType).map((type) => (
                <TouchableOpacity key={type} style={[styles.typeOption, form.property_type === type && styles.typeOptionSelected]} onPress={() => set('property_type', type)}>
                  <View style={[styles.typeRadio, form.property_type === type && styles.typeRadioSelected]} />
                  <Text style={styles.typeLabel}>{PROPERTY_TYPE_LABELS[type]}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.sectionLabel}>
              <View style={styles.sectionAccent} />
              <Text style={styles.sectionLabelText}>{t('properties.beds').toUpperCase()}</Text>
            </View>
            <View style={[styles.card, SHADOWS.sm, { padding: 16, gap: 8 }]}>
              <StepperInput label={t('properties.bedsDouble')} value={form.nb_double_beds ?? 0} onChange={(v) => set('nb_double_beds', v)} />
              <StepperInput label={t('properties.bedsSingle')} value={form.nb_single_beds ?? 0} onChange={(v) => set('nb_single_beds', v)} />
              <StepperInput label={t('properties.bedsSofa')} value={form.nb_sofa_beds ?? 0} onChange={(v) => set('nb_sofa_beds', v)} />
              <StepperInput label={t('properties.bedsCrib')} value={form.nb_baby_cribs ?? 0} onChange={(v) => set('nb_baby_cribs', v)} />
            </View>

            <View style={styles.sectionLabel}>
              <View style={styles.sectionAccent} />
              <Text style={styles.sectionLabelText}>CAPACITÉ</Text>
            </View>
            <View style={[styles.card, SHADOWS.sm, { padding: 16, gap: 8 }]}>
              <StepperInput label={t('properties.maxGuests')} value={form.max_guests ?? 1} onChange={(v) => set('max_guests', v)} min={1} />
              <StepperInput label={t('properties.bathrooms')} value={form.nb_bathrooms ?? 1} onChange={(v) => set('nb_bathrooms', v)} min={1} />
            </View>

            <View style={styles.sectionLabel}>
              <View style={styles.sectionAccent} />
              <Text style={styles.sectionLabelText}>{t('properties.color').toUpperCase()}</Text>
            </View>
            <View style={[styles.card, SHADOWS.sm, { padding: 16, gap: 8 }]}>
              <View style={styles.colorGrid}>
                {PROPERTY_COLORS.map((color) => (
                  <TouchableOpacity key={color} style={[styles.colorSwatch, { backgroundColor: color }, form.color === color && styles.colorSwatchSelected]} onPress={() => set('color', color)} />
                ))}
              </View>
            </View>

            <View style={styles.sectionLabel}>
              <View style={styles.sectionAccent} />
              <Text style={styles.sectionLabelText}>{t('common.notes').toUpperCase()}</Text>
            </View>
            <View style={[styles.card, SHADOWS.sm, { padding: 16, gap: 8 }]}>
              <TextInput label={t('common.notes')} value={form.notes ?? ''} onChangeText={(v) => set('notes', v)} mode="outlined" multiline numberOfLines={3} style={styles.input} outlineColor={APP_COLORS.border} activeOutlineColor={APP_COLORS.primary} />
            </View>

            <View style={styles.sectionLabel}>
              <View style={styles.sectionAccent} />
              <Text style={styles.sectionLabelText}>SYNCHRONISATION CALENDRIER</Text>
            </View>
            <View style={[styles.card, SHADOWS.sm, { padding: 16, gap: 8 }]}>
              <TextInput label="Lien iCal (Airbnb, Booking…)" value={form.ical_url ?? ''} onChangeText={(v) => set('ical_url', v)} mode="outlined" style={styles.input} autoCapitalize="none" autoCorrect={false} outlineColor={APP_COLORS.border} activeOutlineColor={APP_COLORS.primary} />
              <Text style={styles.icalHint}>Airbnb : Calendrier → Paramètres → Lien d'exportation{'\n'}Booking.com : Extranet → Calendrier → Exporter</Text>
            </View>

            <TouchableOpacity style={[styles.submitBtn, SHADOWS.navy, updating && { opacity: 0.6 }]} onPress={handleSave} disabled={updating} activeOpacity={0.85}>
              <Text style={styles.submitBtnText}>{t('common.save')}</Text>
            </TouchableOpacity>
          </>
        )}

        <View style={{ height: 32 }} />
      </ScrollView>

      <Snackbar visible={!!error} onDismiss={() => setError('')} duration={3000}>{error}</Snackbar>
      <Snackbar visible={!!syncResult} onDismiss={() => setSyncResult(null)} duration={3000}>{syncResult ?? ''}</Snackbar>
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
  title: { fontSize: 20, fontFamily: FONTS.titleBold, color: APP_COLORS.accent, letterSpacing: 0.8 },
  subtitle: { fontSize: 12, color: 'rgba(248,245,239,0.65)', marginTop: 2 },
  actionBtn: {
    width: 34,
    height: 34,
    borderRadius: RADII.sm,
    backgroundColor: 'rgba(248,245,239,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(248,245,239,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scroll: { flex: 1, backgroundColor: APP_COLORS.background },
  sectionLabel: { flexDirection: 'row', alignItems: 'center', gap: 8, marginHorizontal: 16, marginTop: 20, marginBottom: 8 },
  sectionAccent: { width: 3, height: 13, borderRadius: 2, backgroundColor: APP_COLORS.accent },
  sectionLabelText: { fontSize: 11, fontWeight: '700', color: APP_COLORS.textSecondary, letterSpacing: 0.8 },
  colorStrip: { height: 10, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, gap: 8 },
  inactiveBadge: { marginLeft: 8, backgroundColor: APP_COLORS.backgroundAlt, borderRadius: RADII.xs, paddingHorizontal: 6, paddingVertical: 2 },
  inactiveBadgeText: { fontSize: 11, color: APP_COLORS.textSecondary },
  infoCard: { backgroundColor: APP_COLORS.surfaceElevated, marginHorizontal: 16, borderRadius: RADII.md, padding: 16, marginTop: 8, gap: 8 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  infoText: { fontSize: 14, color: APP_COLORS.textSecondary, flex: 1 },
  bedsGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 16, gap: 8 },
  bedItem: { backgroundColor: APP_COLORS.surfaceElevated, borderRadius: RADII.md, padding: 12, alignItems: 'center', width: '22%', gap: 4 },
  bedCount: { fontSize: 22, fontWeight: '700', color: APP_COLORS.primary },
  bedLabel: { fontSize: 10, color: APP_COLORS.textSecondary, textAlign: 'center' },
  card: { backgroundColor: APP_COLORS.surfaceElevated, marginHorizontal: 16, borderRadius: RADII.md, overflow: 'hidden' },
  shortcut: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  shortcutBorder: { borderBottomWidth: 1, borderBottomColor: APP_COLORS.borderLight },
  shortcutIcon: { width: 34, height: 34, borderRadius: RADII.xs, alignItems: 'center', justifyContent: 'center' },
  shortcutLabel: { flex: 1, fontSize: 14, color: APP_COLORS.textPrimary, fontWeight: '500' },
  icalUrlRow: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: APP_COLORS.background, borderRadius: RADII.xs, padding: 10 },
  icalUrlText: { flex: 1, fontSize: 12, color: APP_COLORS.textSecondary, fontFamily: 'monospace' },
  icalEmpty: { alignItems: 'center', gap: 6, paddingVertical: 8 },
  icalEmptyText: { fontSize: 14, fontWeight: '600', color: APP_COLORS.textSecondary },
  icalEmptyHint: { fontSize: 12, color: APP_COLORS.textTertiary, textAlign: 'center', lineHeight: 17 },
  icalHint: { fontSize: 11, color: APP_COLORS.textSecondary, lineHeight: 16 },
  syncBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: APP_COLORS.primary, borderRadius: RADII.sm, paddingVertical: 12 },
  syncBtnText: { fontSize: 14, fontWeight: '700', color: '#FFFFFF' },
  dangerBtn: { borderWidth: 1, borderRadius: RADII.md, paddingVertical: 13, alignItems: 'center' },
  dangerBtnText: { fontSize: 14, fontWeight: '600' },
  input: { backgroundColor: APP_COLORS.surfaceElevated },
  typeOption: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 2, gap: 12, borderBottomWidth: 1, borderBottomColor: APP_COLORS.borderLight },
  typeOptionSelected: { backgroundColor: APP_COLORS.primaryPale, borderRadius: RADII.xs },
  typeRadio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: APP_COLORS.border },
  typeRadioSelected: { borderColor: APP_COLORS.primary, backgroundColor: APP_COLORS.primary },
  typeLabel: { fontSize: 14, color: APP_COLORS.textPrimary },
  colorGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  colorSwatch: { width: 40, height: 40, borderRadius: 20 },
  colorSwatchSelected: { borderWidth: 3, borderColor: APP_COLORS.primaryDark },
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
