import { View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { APP_COLORS } from '@/constants/colors';

interface EmptyStateProps {
  icon: string;
  title: string;
  subtitle?: string;
}

export function EmptyState({ icon, title, subtitle }: EmptyStateProps) {
  return (
    <View style={styles.container}>
      <MaterialCommunityIcons name={icon as any} size={64} color={APP_COLORS.border} />
      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    gap: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: APP_COLORS.textSecondary,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: APP_COLORS.textSecondary,
    textAlign: 'center',
  },
});
