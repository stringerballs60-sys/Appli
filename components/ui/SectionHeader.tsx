import { View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import { APP_COLORS } from '@/constants/colors';

interface SectionHeaderProps {
  title: string;
  right?: React.ReactNode;
}

export function SectionHeader({ title, right }: SectionHeaderProps) {
  return (
    <View style={styles.container}>
      <View style={styles.leftGroup}>
        <View style={styles.accent} />
        <Text style={styles.title}>{title}</Text>
      </View>
      {right}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  leftGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  accent: {
    width: 3,
    height: 14,
    borderRadius: 2,
    backgroundColor: APP_COLORS.accent,
  },
  title: {
    fontSize: 11,
    fontWeight: '700',
    color: APP_COLORS.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
});
