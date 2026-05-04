import { View, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Text, Surface } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { APP_COLORS } from '@/constants/colors';
import { FONTS } from '@/constants/typography';

const MENU_ITEMS = [
  {
    key: 'inventory',
    label: 'Inventaire',
    subtitle: 'Linge, équipements, consommables',
    icon: 'package-variant',
    color: '#7C3AED',
    route: '/(app)/inventory',
  },
  // Future items can be added here
];

export default function MenuScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Text style={styles.title}>Menu</Text>
      </View>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          {MENU_ITEMS.map((item) => (
            <TouchableOpacity
              key={item.key}
              onPress={() => router.push(item.route as any)}
              activeOpacity={0.7}
            >
              <Surface style={styles.menuCard} elevation={1}>
                <View style={[styles.iconBox, { backgroundColor: item.color + '18' }]}>
                  <MaterialCommunityIcons name={item.icon as any} size={28} color={item.color} />
                </View>
                <View style={styles.cardContent}>
                  <Text style={styles.cardLabel}>{item.label}</Text>
                  <Text style={styles.cardSubtitle}>{item.subtitle}</Text>
                </View>
                <MaterialCommunityIcons name="chevron-right" size={22} color={APP_COLORS.border} />
              </Surface>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: APP_COLORS.background },
  header: {
    backgroundColor: APP_COLORS.primary,
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  title: { fontSize: 22, fontFamily: FONTS.titleBold, color: '#FFFFFF' },
  scroll: { flex: 1 },
  section: { paddingHorizontal: 16, paddingTop: 16, gap: 10 },
  menuCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    gap: 14,
  },
  iconBox: {
    width: 52,
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  cardContent: { flex: 1 },
  cardLabel: { fontSize: 16, fontWeight: '700', color: APP_COLORS.textPrimary },
  cardSubtitle: { fontSize: 12, color: APP_COLORS.textSecondary, marginTop: 2 },
});
