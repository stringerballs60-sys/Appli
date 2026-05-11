import { View, StyleSheet } from 'react-native';
import { Text, Surface } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinenCalculation } from '@/types';
import { LINEN_TYPE_LABELS } from '@/constants/labels';
import { LinenType } from '@/types';
import { APP_COLORS } from '@/constants/colors';

interface LinenPreviewCardProps {
  linen: LinenCalculation;
  title?: string;
}

const LINEN_ITEMS: { key: keyof LinenCalculation; type: LinenType }[] = [
  { key: 'double_sheets', type: LinenType.DOUBLE_SHEETS },
  { key: 'single_sheets', type: LinenType.SINGLE_SHEETS },
  { key: 'baby_sheets', type: LinenType.BABY_SHEETS },
  { key: 'bath_towels', type: LinenType.BATH_TOWELS },
  { key: 'hand_towels', type: LinenType.HAND_TOWELS },
  { key: 'bath_mats', type: LinenType.BATH_MATS },
  { key: 'kitchen_towels', type: LinenType.KITCHEN_TOWELS },
];

export function LinenPreviewCard({ linen, title = 'Linge prévu' }: LinenPreviewCardProps) {
  const relevant = LINEN_ITEMS.filter((item) => linen[item.key] > 0);

  if (relevant.length === 0) return null;

  return (
    <Surface style={styles.card} elevation={1}>
      <View style={styles.header}>
        <MaterialCommunityIcons name="tshirt-crew" size={18} color={APP_COLORS.primary} />
        <Text style={styles.title}>{title}</Text>
      </View>
      <View style={styles.grid}>
        {relevant.map((item) => (
          <View key={item.key} style={styles.item}>
            <Text style={styles.qty}>{linen[item.key]}</Text>
            <Text style={styles.label} numberOfLines={2}>
              {LINEN_TYPE_LABELS[item.type]}
            </Text>
          </View>
        ))}
      </View>
    </Surface>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 12, padding: 12, backgroundColor: '#EEF2FF' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 },
  title: { fontSize: 13, fontWeight: '700', color: APP_COLORS.primary, textTransform: 'uppercase', letterSpacing: 0.5 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  item: { backgroundColor: '#FFFFFF', borderRadius: 8, padding: 8, alignItems: 'center', minWidth: 72 },
  qty: { fontSize: 20, fontWeight: '700', color: APP_COLORS.primary },
  label: { fontSize: 10, color: APP_COLORS.textSecondary, textAlign: 'center', marginTop: 2 },
});
