import { View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import { PropertyType } from '@/types';
import { PROPERTY_TYPE_COLORS } from '@/constants/colors';
import { PROPERTY_TYPE_SHORT_LABELS } from '@/constants/labels';

interface PropertyBadgeProps {
  type: PropertyType;
  size?: 'small' | 'medium';
}

export function PropertyBadge({ type, size = 'medium' }: PropertyBadgeProps) {
  const color = PROPERTY_TYPE_COLORS[type];
  const label = PROPERTY_TYPE_SHORT_LABELS[type];

  return (
    <View
      style={[
        styles.badge,
        { backgroundColor: color + '15', borderColor: color + '40' },
        size === 'small' && styles.badgeSmall,
      ]}
    >
      <Text
        style={[
          styles.text,
          { color },
          size === 'small' && styles.textSmall,
        ]}
      >
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 9,
    paddingVertical: 4,
    alignSelf: 'flex-start',
  },
  badgeSmall: {
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  text: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  textSmall: {
    fontSize: 10,
  },
});
