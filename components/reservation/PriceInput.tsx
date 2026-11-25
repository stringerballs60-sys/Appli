import { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, TextInput } from 'react-native-paper';
import { APP_COLORS } from '@/constants/colors';
import { FONTS } from '@/constants/typography';
import { parsePrice, formatPrice } from '@/utils/price';

interface Props {
  value: number | null | undefined;
  nights?: number;
  onChange: (value: number | null) => void;
}

export function PriceInput({ value, nights, onChange }: Props) {
  const [text, setText] = useState(value != null ? String(value).replace('.', ',') : '');
  const parsed = parsePrice(text);
  const invalid = text.trim() !== '' && parsed === null;
  return (
    <View>
      <TextInput
        label="Prix total du séjour (€)"
        value={text}
        onChangeText={(v) => { setText(v); onChange(parsePrice(v)); }}
        keyboardType="decimal-pad"
        mode="outlined"
        placeholder="ex. 650"
        right={<TextInput.Affix text="€" />}
        error={invalid}
        style={styles.input}
        outlineColor={APP_COLORS.border}
        activeOutlineColor={APP_COLORS.primary}
      />
      <Text style={[styles.hint, invalid && { color: APP_COLORS.danger }]}>
        {invalid
          ? 'Écris seulement un nombre, par exemple 650 ou 650,50.'
          : parsed != null && nights && nights > 0
            ? `Soit ${formatPrice(Math.round((parsed / nights) * 100) / 100, true)} par nuit`
            : 'Facultatif. Laisse vide si tu ne le connais pas encore.'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  input: { backgroundColor: '#FFFFFF' },
  hint: { fontFamily: FONTS.body, fontSize: 12, color: APP_COLORS.textSecondary, marginTop: 4 },
});
