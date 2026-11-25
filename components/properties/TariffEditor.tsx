import { useState } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text, TextInput } from 'react-native-paper';
import { APP_COLORS } from '@/constants/colors';
import { FONTS } from '@/constants/typography';
import { Payer, Property } from '@/types';
import { MONTHS_SHORT, PAYERS, tariffSummary, isPrestaProperty } from '@/constants/tariffs';
import { parsePrice } from '@/utils/price';
import { useUpdateProperty } from '@/hooks/useProperties';

const toText = (v: number | null | undefined) => (v != null ? String(v).replace('.', ',') : '');

function Field({ label, value, onChange, suffix = '€' }: { label: string; value: string; onChange: (v: string) => void; suffix?: string }) {
  return (
    <TextInput
      label={label}
      value={value}
      onChangeText={onChange}
      keyboardType="decimal-pad"
      mode="outlined"
      right={<TextInput.Affix text={suffix} />}
      error={value.trim() !== '' && parsePrice(value) === null}
      style={styles.input}
      outlineColor={APP_COLORS.border}
      activeOutlineColor={APP_COLORS.primary}
    />
  );
}

function PayerChoice({ label, value, onChange }: { label: string; value: Payer; onChange: (v: Payer) => void }) {
  return (
    <View style={{ gap: 6 }}>
      <Text style={styles.sub}>{label}</Text>
      <View style={styles.chips}>
        {PAYERS.map((p) => (
          <TouchableOpacity key={p.value} onPress={() => onChange(p.value)} style={[styles.chip, value === p.value && styles.chipOn]} activeOpacity={0.8}>
            <Text style={[styles.chipText, value === p.value && styles.chipTextOn]}>{p.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

/** Tarif du logement : sert à calculer tout seul ce que Charles gagne sur chaque résa. */
export function TariffEditor({ property }: { property: Property }) {
  const update = useUpdateProperty();
  const [editing, setEditing] = useState(false);
  const [cleaning, setCleaning] = useState('');
  const [peak, setPeak] = useState('');
  const [months, setMonths] = useState<number[]>([7, 8]);
  const [bedDouble, setBedDouble] = useState('');
  const [bedSingle, setBedSingle] = useState('');
  const [rate, setRate] = useState('');
  const [cleaningPayer, setCleaningPayer] = useState<Payer>('platform');
  const [bedsPayer, setBedsPayer] = useState<Payer>('platform');
  const [error, setError] = useState('');

  const start = () => {
    setCleaning(toText(property.cleaning_fee));
    setPeak(toText(property.cleaning_fee_peak));
    setMonths((property.peak_months ?? [7, 8]).map(Number));
    setBedDouble(toText(property.bed_double_fee));
    setBedSingle(toText(property.bed_single_fee));
    setRate(toText(property.commission_rate));
    setCleaningPayer(property.cleaning_payer ?? 'platform');
    setBedsPayer(property.beds_payer ?? 'platform');
    setError('');
    setEditing(true);
  };

  const save = async () => {
    const fields = [cleaning, peak, bedDouble, bedSingle, rate];
    if (fields.some((f) => f.trim() !== '' && parsePrice(f) === null)) {
      setError('Un des montants n’est pas un nombre.');
      return;
    }
    try {
      await update.mutateAsync({
        id: property.id,
        updates: {
          cleaning_fee: parsePrice(cleaning),
          cleaning_fee_peak: parsePrice(peak),
          peak_months: months.sort((a, b) => a - b),
          bed_double_fee: parsePrice(bedDouble),
          bed_single_fee: parsePrice(bedSingle),
          commission_rate: parsePrice(rate),
          cleaning_payer: cleaningPayer,
          beds_payer: bedsPayer,
        },
      });
      setEditing(false);
    } catch (e: any) {
      setError(e?.message ?? 'L’enregistrement a échoué.');
    }
  };

  if (!editing) {
    return (
      <View style={{ gap: 8 }}>
        {isPrestaProperty(property) ? <Text style={styles.badge}>Presta ménage : tu fais seulement le ménage ici</Text> : null}
        <Text style={styles.summary}>{tariffSummary(property)}</Text>
        <Text style={styles.sub}>
          Ménage payé par : {PAYERS.find((p) => p.value === property.cleaning_payer)?.label}
          {property.bed_double_fee != null || property.bed_single_fee != null ? ` · lits payés par : ${PAYERS.find((p) => p.value === property.beds_payer)?.label}` : ''}
        </Text>
        <TouchableOpacity onPress={start} style={styles.editBtn} activeOpacity={0.8}>
          <Text style={styles.editText}>Modifier le tarif</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={{ gap: 10 }}>
      <Field label="Forfait ménage" value={cleaning} onChange={setCleaning} />
      <Field label="Forfait haute saison (facultatif)" value={peak} onChange={setPeak} />
      {peak.trim() !== '' ? (
        <View style={{ gap: 6 }}>
          <Text style={styles.sub}>Mois de haute saison (mois du départ = jour du ménage)</Text>
          <View style={styles.chips}>
            {MONTHS_SHORT.map((m, i) => {
              const on = months.includes(i + 1);
              return (
                <TouchableOpacity key={m} onPress={() => setMonths((prev) => (on ? prev.filter((x) => x !== i + 1) : [...prev, i + 1]))} style={[styles.chip, on && styles.chipOn]}>
                  <Text style={[styles.chipText, on && styles.chipTextOn]}>{m}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      ) : null}
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <View style={{ flex: 1 }}><Field label="Par lit double" value={bedDouble} onChange={setBedDouble} /></View>
        <View style={{ flex: 1 }}><Field label="Par lit simple" value={bedSingle} onChange={setBedSingle} /></View>
      </View>
      <Text style={styles.sub}>Les canapés-lits comptent comme des lits simples. Laisse vide si tu ne factures pas les lits.</Text>
      <Field label="Commission sur les plateformes" value={rate} onChange={setRate} suffix="%" />
      <PayerChoice label="Qui te paie le ménage ?" value={cleaningPayer} onChange={setCleaningPayer} />
      {bedDouble.trim() !== '' || bedSingle.trim() !== '' ? <PayerChoice label="Qui te paie les lits ?" value={bedsPayer} onChange={setBedsPayer} /> : null}
      <Text style={styles.sub}>« La plateforme » devient automatiquement « le propriétaire » pour une résa en direct.</Text>
      {error ? <Text style={[styles.sub, { color: APP_COLORS.danger }]}>{error}</Text> : null}
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <TouchableOpacity onPress={save} disabled={update.isPending} style={[styles.saveBtn, update.isPending && { opacity: 0.6 }]} activeOpacity={0.85}>
          <Text style={styles.saveText}>{update.isPending ? 'Enregistrement…' : 'Enregistrer le tarif'}</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setEditing(false)} style={styles.editBtn} activeOpacity={0.8}>
          <Text style={styles.editText}>Annuler</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  input: { backgroundColor: '#FFFFFF' },
  summary: { fontFamily: FONTS.bodyMedium, fontSize: 14, color: APP_COLORS.textPrimary ?? '#1A1A1A' },
  sub: { fontFamily: FONTS.body, fontSize: 12, color: APP_COLORS.textSecondary },
  badge: { fontFamily: FONTS.bodyMedium, fontSize: 12, color: '#1E7A78' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { paddingVertical: 6, paddingHorizontal: 10, borderRadius: 14, borderWidth: 1, borderColor: APP_COLORS.border, backgroundColor: '#FFFFFF' },
  chipOn: { backgroundColor: APP_COLORS.primary, borderColor: APP_COLORS.primary },
  chipText: { fontFamily: FONTS.body, fontSize: 13, color: APP_COLORS.textSecondary },
  chipTextOn: { color: '#FFFFFF', fontFamily: FONTS.bodyMedium },
  editBtn: { alignSelf: 'flex-start', borderWidth: 1, borderColor: APP_COLORS.border, borderRadius: 8, paddingVertical: 8, paddingHorizontal: 14 },
  editText: { fontFamily: FONTS.bodyMedium, fontSize: 14, color: APP_COLORS.primary },
  saveBtn: { flex: 1, backgroundColor: APP_COLORS.primary, borderRadius: 8, paddingVertical: 10, alignItems: 'center' },
  saveText: { fontFamily: FONTS.bodyMedium, fontSize: 14, color: '#FFFFFF' },
});
