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
      <Text style={styles.title}>{title}</Text>
      {right}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: APP_COLORS.background,
  },
  title: {
    fontSize: 13,
    fontWeight: '700',
    color: APP_COLORS.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});
