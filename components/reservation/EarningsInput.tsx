import { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text, TextInput } from 'react-native-paper';
import { APP_COLORS } from '@/constants/colors';
import { FONTS } from '@/constants/typography';
import { parsePrice, formatPrice } from '@/utils/price';
import { Property, Reservation, ReservationSource } from '@/types';
import { bedsFor, cleaningFor, commissionApplies, isPrestaProperty, payerFor, payerLabel } from '@/constants/tariffs';

export type Earnings = {
  cleaning_amount: number | null;
  beds_amount: number | null;
  commission_amount: number | null;
};

interface Props {
  property: Property | null;
  channel: ReservationSource;
  checkOut: string;
  beds: Pick<Reservation, 'beds_double_used' | 'beds_single_used' | 'beds_sofa_used'>;
  value: Earnings;
  /** true quand on modifie une résa déjà enregistrée : on garde ses montants au lieu de recalculer. */
  keepStored?: boolean;
  onChange: (patch: Partial<Earnings>) => void;
}

const toText = (v: number | null | undefined) => (v != null ? String(v).replace('.', ',') : '');

function AmountField({
  label,
  hint,
  auto,
  value,
  initiallyTouched,
  onChange,
}: {
  label: string;
  hint: string;
  auto: number | null;
  value: number | null;
  initiallyTouched: boolean;
  onChange: (v: number | null) => void;
}) {
  const [text, setText] = useState(toText(value));
  const touched = useRef(initiallyTouched);

  useEffect(() => {
    if (touched.current) return;
    setText(toText(auto));
    if (auto !== value) onChange(auto);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auto]);

  const parsed = parsePrice(text);
  const invalid = text.trim() !== '' && parsed === null;
  const differs = touched.current && auto != null && parsed !== auto;

  return (
    <View style={{ gap: 2 }}>
      <TextInput
        label={`${label} (€)`}
        value={text}
        onChangeText={(v) => { touched.current = true; setText(v); onChange(parsePrice(v)); }}
        keyboardType="decimal-pad"
        mode="outlined"
        right={<TextInput.Affix text="€" />}
        error={invalid}
        style={styles.input}
        outlineColor={APP_COLORS.border}
        activeOutlineColor={APP_COLORS.primary}
      />
      <View style={styles.hintRow}>
        <Text style={[styles.hint, invalid && { color: APP_COLORS.danger }]}>{invalid ? 'Écris seulement un nombre, par exemple 90 ou 90,50.' : hint}</Text>
        {differs && !invalid ? (
          <TouchableOpacity onPress={() => { touched.current = false; setText(toText(auto)); onChange(auto); }}>
            <Text style={styles.reset}>Remettre {formatPrice(auto)}</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  );
}

export function EarningsInput({ property, channel, checkOut, beds, value, keepStored, onChange }: Props) {
  const presta = isPrestaProperty(property);
  const autoCleaning = cleaningFor(property, checkOut);
  const bedCalc = bedsFor(property, beds);
  const showBeds = bedCalc.total != null || value.beds_amount != null;
  const showCommission = commissionApplies(property, channel) || value.commission_amount != null;
  const rate = property?.commission_rate != null ? Number(property.commission_rate) : null;
  const total = (value.cleaning_amount ?? 0) + (value.beds_amount ?? 0) + (value.commission_amount ?? 0);
  const any = value.cleaning_amount != null || value.beds_amount != null || value.commission_amount != null;

  const cleaningPayer = payerLabel(payerFor(property?.cleaning_payer, channel), channel);
  const bedsPayer = payerLabel(payerFor(property?.beds_payer, channel), channel);

  return (
    <View style={{ gap: 12 }} key={property?.id ?? 'none'}>
      {!property ? <Text style={styles.hint}>Choisis d’abord le logement : le ménage se calculera avec son tarif.</Text> : null}

      <AmountField
        label={presta ? 'Presta ménage' : 'Ménage'}
        auto={autoCleaning}
        value={value.cleaning_amount}
        initiallyTouched={!!keepStored && value.cleaning_amount != null}
        hint={autoCleaning != null ? `Forfait du logement, payé ${cleaningPayer}` : `Pas de forfait réglé pour ce logement · payé ${cleaningPayer}`}
        onChange={(v) => onChange({ cleaning_amount: v })}
      />

      {showBeds ? (
        <AmountField
          label="Lits"
          auto={bedCalc.total}
          value={value.beds_amount}
          initiallyTouched={!!keepStored && value.beds_amount != null}
          hint={bedCalc.detail ? `${bedCalc.detail} d’après les lits utilisés, payé ${bedsPayer}` : `D’après les lits utilisés, payé ${bedsPayer}`}
          onChange={(v) => onChange({ beds_amount: v })}
        />
      ) : null}

      {showCommission ? (
        <AmountField
          label="Commission"
          auto={null}
          value={value.commission_amount}
          initiallyTouched
          hint={`${rate ? `${rate} % ` : ''}à taper à la main, versée ${payerLabel('platform', channel)}`}
          onChange={(v) => onChange({ commission_amount: v })}
        />
      ) : null}

      <View style={styles.totalRow}>
        <Text style={styles.totalLabel}>Total gagné sur cette résa</Text>
        <Text style={styles.total}>{any ? formatPrice(total) : '—'}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  input: { backgroundColor: '#FFFFFF' },
  hintRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' },
  hint: { fontFamily: FONTS.body, fontSize: 12, color: APP_COLORS.textSecondary, flexShrink: 1 },
  reset: { fontFamily: FONTS.bodyMedium, fontSize: 12, color: APP_COLORS.primary, textDecorationLine: 'underline' },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', borderTopWidth: 1, borderTopColor: APP_COLORS.border, paddingTop: 10 },
  totalLabel: { fontFamily: FONTS.bodyMedium, fontSize: 14, color: APP_COLORS.textSecondary },
  total: { fontFamily: FONTS.titleBold, fontSize: 18, color: APP_COLORS.primary },
});
