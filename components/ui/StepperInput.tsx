import { View, StyleSheet } from 'react-native';
import { Text, IconButton } from 'react-native-paper';
import { APP_COLORS } from '@/constants/colors';

interface StepperInputProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  label?: string;
}

export function StepperInput({ value, onChange, min = 0, max = 99, label }: StepperInputProps) {
  return (
    <View style={styles.container}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <View style={styles.controls}>
        <IconButton
          icon="minus"
          size={18}
          mode="contained-tonal"
          onPress={() => onChange(Math.max(min, value - 1))}
          disabled={value <= min}
          style={styles.button}
        />
        <Text style={styles.value}>{value}</Text>
        <IconButton
          icon="plus"
          size={18}
          mode="contained-tonal"
          onPress={() => onChange(Math.min(max, value + 1))}
          disabled={value >= max}
          style={styles.button}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  label: {
    flex: 1,
    fontSize: 14,
    color: APP_COLORS.textPrimary,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  button: {
    margin: 0,
  },
  value: {
    fontSize: 16,
    fontWeight: '600',
    minWidth: 28,
    textAlign: 'center',
    color: APP_COLORS.textPrimary,
  },
});
