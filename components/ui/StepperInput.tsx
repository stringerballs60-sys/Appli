import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
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
        <TouchableOpacity
          style={[styles.btn, value <= min && styles.btnDisabled]}
          onPress={() => onChange(Math.max(min, value - 1))}
          disabled={value <= min}
          activeOpacity={0.7}
        >
          <MaterialCommunityIcons
            name="minus"
            size={16}
            color={value <= min ? APP_COLORS.border : APP_COLORS.primary}
          />
        </TouchableOpacity>
        <Text style={styles.value}>{value}</Text>
        <TouchableOpacity
          style={[styles.btn, value >= max && styles.btnDisabled]}
          onPress={() => onChange(Math.min(max, value + 1))}
          disabled={value >= max}
          activeOpacity={0.7}
        >
          <MaterialCommunityIcons
            name="plus"
            size={16}
            color={value >= max ? APP_COLORS.border : APP_COLORS.primary}
          />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  label: {
    flex: 1,
    fontSize: 14,
    color: APP_COLORS.textPrimary,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  btn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: APP_COLORS.primaryPale,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: APP_COLORS.borderLight,
  },
  btnDisabled: {
    backgroundColor: APP_COLORS.backgroundAlt,
    borderColor: APP_COLORS.border,
  },
  value: {
    fontSize: 16,
    fontWeight: '700',
    minWidth: 36,
    textAlign: 'center',
    color: APP_COLORS.textPrimary,
  },
});
