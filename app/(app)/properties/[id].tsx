import { useState } from 'react';
import { ScrollView, View, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { Text, Button, ActivityIndicator, Appbar, Switch, Snackbar, TextInput } from 'react-native-paper';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useProperty, useUpdateProperty, useTogglePropertyActive, useSyncIcal } from '@/hooks/useProperties';
import { useReservations } from '@/hooks/useReservations';
import { PropertyBadge } from '@/components/ui/PropertyBadge';
import { ReservationCard } from '@/components/reservation/ReservationCard';
import { StepperInput } from '@/components/ui/StepperInput';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { PropertyType, PropertyFormData } from '@/types';
import { PROPERTY_TYPE_LABELS } from '@/constants/labels';
import { PROPERTY_COLORS, APP_COLORS } from '@/constants/colors';
import { todayISO } from '@/utils/dateHelpers';

export default function PropertyDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation();
  const router = useRouter();
  const { data: property, isLoading } = useProperty(id);
  const { data: reservations } = useReservations({
    propertyId: id,
    from: todayISO(),
  });
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

  if (isLoading || !property) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <ActivityIndicator style={{ marginTop: 40 }} color={APP_COLORS.primary} />
      </SafeAreaView>
    );
  }

  const set = (key: keyof PropertyFormData, value: any) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  return (
    <SafeAreaView style={styles.safeArea}>
      <Appbar.Header style={styles.appbar}>
        <Appbar.BackAction onPress={() => router.back()} iconColor="#FFFFFF" />
        <Appbar.Content
          title={property.name}
          titleStyle={styles.appbarTitle}
          subtitle={PROPERTY_TYPE_LABELS[property.property_type]}
          subtitleStyle={styles.appbarSubtitle}
        />
        {!editing && (
          <Appbar.Action icon="pencil" iconColor="#FFFFFF" onPress={startEdit} />
        )}
        {editing && (
          <>
            <Appbar.Action icon="close" iconColor="#FFFFFF" onPress={() => setEditing(false)} />
            <Appbar.Action icon="check" iconColor="#FFFFFF" onPress={handleSave} disabled={updating} />
          </>
        )}
      </Appbar.Header>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        {!editing ? (
          // ── View mode ─────────────────────────────────────────
          <>
            <View style={[styles.colorBanner, { backgroundColor: property.color }]}>
              <PropertyBadge type={property.property_type} />
              {!property.is_active && (
                <View style={styles.inactiveBadge}>
                  <Text style={styles.inactiveBadgeText}>Inactif</Text>
                </View>
              )}
            </View>

            <View style={styles.infoCard}>
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

            <SectionHeader title={t('properties.beds')} />
            <View style={styles.bedsGrid}>
              {[
                { label: 'Lits doubles', value: property.nb_double_beds, icon: 'bed-double' },
                { label: 'Lits simples', value: property.nb_single_beds, icon: 'bed' },
                { label: 'Canapés-lits', value: property.nb_sofa_beds, icon: 'sofa' },
                { label: 'Berceaux', value: property.nb_baby_cribs, icon: 'baby-carriage' },
              ].map(({ label, value, icon }) => value > 0 ? (
                <View key={label} style={styles.bedItem}>
                  <MaterialCommunityIcons name={icon as any} size={24} color={APP_COLORS.primary} />
                  <Text style={styles.bedCount}>{value}</Text>
                  <Text style={styles.bedLabel}>{label}</Text>
                </View>
              ) : null)}
            </View>

            {/* Inventory shortcuts */}
            <SectionHeader title="Inventaires" />
            <View style={styles.shortcutsRow}>
              {[
                { label: 'Linge', icon: 'tshirt-crew', route: `/(app)/inventory/linen/${id}` },
                { label: 'Équipements', icon: 'baby-carriage', route: `/(app)/inventory/equipment/${id}` },
                { label: 'Consommables', icon: 'package-variant', route: `/(app)/inventory/consumables/${id}` },
              ].map(({ label, icon, route }) => (
                <TouchableOpacity
                  key={label}
                  style={styles.shortcut}
                  onPress={() => router.push(route as any)}
                >
                  <MaterialCommunityIcons name={icon as any} size={24} color={APP_COLORS.primary} />
                  <Text style={styles.shortcutLabel}>{label}</Text>
                  <MaterialCommunityIcons name="chevron-right" size={16} color={APP_COLORS.border} />
                </TouchableOpacity>
              ))}
            </View>

            {/* Upcoming reservations */}
            {reservations && reservations.length > 0 && (
              <>
                <SectionHeader title="Prochaines réservations" />
                {reservations.slice(0, 5).map((r) => (
                  <ReservationCard
                    key={r.id}
                    reservation={r}
                    onPress={() => router.push(`/(app)/reservations/${r.id}`)}
                  />
                ))}
              </>
            )}

            {/* iCal sync */}
            <SectionHeader title="Synchronisation calendrier" />
            <View style={styles.icalCard}>
              {property.ical_url ? (
                <>
                  <View style={styles.icalUrlRow}>
                    <MaterialCommunityIcons name="calendar-sync" size={16} color={APP_COLORS.primary} />
                    <Text style={styles.icalUrlText} numberOfLines={1}>{property.ical_url}</Text>
                  </View>
                  <Button
                    mode="contained"
                    onPress={handleSync}
                    loading={syncing}
                    disabled={syncing}
                    icon="sync"
                    buttonColor={APP_COLORS.primary}
                    style={{ borderRadius: 8 }}
                  >
                    Synchroniser maintenant
                  </Button>
                </>
              ) : (
                <View style={styles.icalEmpty}>
                  <MaterialCommunityIcons name="calendar-remove-outline" size={28} color={APP_COLORS.textSecondary} />
                  <Text style={styles.icalEmptyText}>Aucun lien iCal configuré</Text>
                  <Text style={styles.icalEmptyHint}>Modifiez le logement pour ajouter un lien Airbnb ou Booking.</Text>
                </View>
              )}
            </View>

            {/* Toggle active */}
            <View style={styles.dangerZone}>
              <Button
                mode="outlined"
                onPress={handleToggleActive}
                textColor={property.is_active ? APP_COLORS.danger : APP_COLORS.success}
                style={{ borderColor: property.is_active ? APP_COLORS.danger : APP_COLORS.success }}
              >
                {property.is_active ? 'Désactiver ce logement' : 'Réactiver ce logement'}
              </Button>
            </View>
          </>
        ) : (
          // ── Edit mode ─────────────────────────────────────────
          <>
            <SectionHeader title="Identité" />
            <View style={styles.section}>
              <TextInput
                label={t('properties.name') + ' *'}
                value={form.name ?? ''}
                onChangeText={(v) => set('name', v)}
                mode="outlined"
                style={styles.input}
              />
              <TextInput
                label={t('properties.address')}
                value={form.address ?? ''}
                onChangeText={(v) => set('address', v)}
                mode="outlined"
                style={styles.input}
              />
            </View>

            <SectionHeader title={t('properties.type')} />
            <View style={styles.section}>
              {Object.values(PropertyType).map((type) => (
                <TouchableOpacity
                  key={type}
                  style={[
                    styles.typeOption,
                    form.property_type === type && styles.typeOptionSelected,
                  ]}
                  onPress={() => set('property_type', type)}
                >
                  <View style={[styles.typeRadio, form.property_type === type && styles.typeRadioSelected]} />
                  <Text style={styles.typeLabel}>{PROPERTY_TYPE_LABELS[type]}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <SectionHeader title={t('properties.beds')} />
            <View style={styles.section}>
              <StepperInput label={t('properties.bedsDouble')} value={form.nb_double_beds ?? 0} onChange={(v) => set('nb_double_beds', v)} />
              <StepperInput label={t('properties.bedsSingle')} value={form.nb_single_beds ?? 0} onChange={(v) => set('nb_single_beds', v)} />
              <StepperInput label={t('properties.bedsSofa')} value={form.nb_sofa_beds ?? 0} onChange={(v) => set('nb_sofa_beds', v)} />
              <StepperInput label={t('properties.bedsCrib')} value={form.nb_baby_cribs ?? 0} onChange={(v) => set('nb_baby_cribs', v)} />
            </View>

            <SectionHeader title="Capacité" />
            <View style={styles.section}>
              <StepperInput label={t('properties.maxGuests')} value={form.max_guests ?? 1} onChange={(v) => set('max_guests', v)} min={1} />
              <StepperInput label={t('properties.bathrooms')} value={form.nb_bathrooms ?? 1} onChange={(v) => set('nb_bathrooms', v)} min={1} />
            </View>

            <SectionHeader title={t('properties.color')} />
            <View style={[styles.section, styles.colorGrid]}>
              {PROPERTY_COLORS.map((color) => (
                <TouchableOpacity
                  key={color}
                  style={[styles.colorSwatch, { backgroundColor: color }, form.color === color && styles.colorSwatchSelected]}
                  onPress={() => set('color', color)}
                />
              ))}
            </View>

            <SectionHeader title={t('common.notes')} />
            <View style={styles.section}>
              <TextInput
                label={t('common.notes')}
                value={form.notes ?? ''}
                onChangeText={(v) => set('notes', v)}
                mode="outlined"
                multiline
                numberOfLines={3}
                style={styles.input}
              />
            </View>

            <SectionHeader title="Synchronisation calendrier" />
            <View style={styles.section}>
              <TextInput
                label="Lien iCal (Airbnb, Booking…)"
                value={form.ical_url ?? ''}
                onChangeText={(v) => set('ical_url', v)}
                mode="outlined"
                style={styles.input}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <Text style={styles.icalHint}>
                Airbnb : Calendrier → Paramètres → Lien d'exportation{'\n'}
                Booking.com : Extranet → Calendrier → Exporter
              </Text>
            </View>

            <Button mode="contained" onPress={handleSave} loading={updating} style={styles.saveButton}>
              {t('common.save')}
            </Button>
          </>
        )}

        <View style={{ height: 32 }} />
      </ScrollView>

      <Snackbar visible={!!error} onDismiss={() => setError('')} duration={3000}>
        {error}
      </Snackbar>
      <Snackbar visible={!!syncResult} onDismiss={() => setSyncResult(null)} duration={3000}>
        {syncResult ?? ''}
      </Snackbar>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: APP_COLORS.background },
  appbar: { backgroundColor: APP_COLORS.primary },
  appbarTitle: { color: '#FFFFFF', fontSize: 18, fontWeight: '600' },
  appbarSubtitle: { color: 'rgba(255,255,255,0.7)', fontSize: 12 },
  scroll: { flex: 1 },
  colorBanner: { height: 8, marginBottom: 12, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16 },
  inactiveBadge: { marginLeft: 8, backgroundColor: '#E5E7EB', borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 },
  inactiveBadgeText: { fontSize: 11, color: APP_COLORS.textSecondary },
  infoCard: { backgroundColor: '#FFFFFF', marginHorizontal: 16, borderRadius: 12, padding: 16, marginBottom: 8, gap: 8 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  infoText: { fontSize: 14, color: APP_COLORS.textSecondary, flex: 1 },
  bedsGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 16, gap: 8, marginBottom: 8 },
  bedItem: { backgroundColor: '#FFFFFF', borderRadius: 12, padding: 12, alignItems: 'center', width: '22%', gap: 4 },
  bedCount: { fontSize: 22, fontWeight: '700', color: APP_COLORS.primary },
  bedLabel: { fontSize: 10, color: APP_COLORS.textSecondary, textAlign: 'center' },
  shortcutsRow: { marginHorizontal: 16, backgroundColor: '#FFFFFF', borderRadius: 12, marginBottom: 8 },
  shortcut: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderBottomWidth: 1, borderBottomColor: APP_COLORS.border },
  shortcutLabel: { flex: 1, fontSize: 14, color: APP_COLORS.textPrimary },
  dangerZone: { marginHorizontal: 16, marginTop: 16, marginBottom: 8 },
  section: { backgroundColor: '#FFFFFF', marginHorizontal: 16, marginBottom: 8, borderRadius: 12, padding: 16, gap: 8 },
  input: { backgroundColor: '#FFFFFF' },
  typeOption: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, gap: 12, borderBottomWidth: 1, borderBottomColor: APP_COLORS.border },
  typeOptionSelected: { backgroundColor: '#EEF2FF', borderRadius: 8 },
  typeRadio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: APP_COLORS.border },
  typeRadioSelected: { borderColor: APP_COLORS.primary, backgroundColor: APP_COLORS.primary },
  typeLabel: { fontSize: 14, color: APP_COLORS.textPrimary },
  colorGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  colorSwatch: { width: 40, height: 40, borderRadius: 20 },
  colorSwatchSelected: { borderWidth: 3, borderColor: APP_COLORS.textPrimary },
  saveButton: { marginHorizontal: 16, marginTop: 8, backgroundColor: APP_COLORS.primary, borderRadius: 8 },
  icalCard: {
    backgroundColor: '#FFFFFF', marginHorizontal: 16, borderRadius: 12,
    padding: 16, marginBottom: 8, gap: 12,
  },
  icalUrlRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: APP_COLORS.background, borderRadius: 8, padding: 10,
  },
  icalUrlText: { flex: 1, fontSize: 12, color: APP_COLORS.textSecondary, fontFamily: 'monospace' },
  icalEmpty: { alignItems: 'center', gap: 6, paddingVertical: 8 },
  icalEmptyText: { fontSize: 14, fontWeight: '600', color: APP_COLORS.textSecondary },
  icalEmptyHint: { fontSize: 12, color: APP_COLORS.textSecondary, textAlign: 'center', lineHeight: 17 },
  icalHint: { fontSize: 11, color: APP_COLORS.textSecondary, lineHeight: 16 },
});
