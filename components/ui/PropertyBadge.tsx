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
        { backgroundColor: color + '22', borderColor: color },
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
    borderRadius: 6,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 3,
    alignSelf: 'flex-start',
  },
  badgeSmall: {
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  text: {
    fontSize: 12,
    fontWeight: '600',
  },
  textSmall: {
    fontSize: 10,
  },
});
