import { View, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Text, Surface } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { APP_COLORS } from '@/constants/colors';
import { FONTS } from '@/constants/typography';
import { useAuthStore } from '@/stores/authStore';

const ALL_MENU_ITEMS = [
  {
    key: 'tasks',
    label: 'Tâches',
    subtitle: 'Ménage, maintenance, réappro.',
    icon: 'checkbox-marked-circle-outline',
    color: '#7C3AED',
    route: '/(app)/tasks',
    managerOnly: false,
  },
  {
    key: 'inventory',
    label: 'Inventaire',
    subtitle: 'Linge, équipements, consommables',
    icon: 'package-variant',
    color: '#0891B2',
    route: '/(app)/inventory',
    managerOnly: true,
  },
  {
    key: 'roles',
    label: 'Rôles',
    subtitle: "Gérer les accès de l'équipe",
    icon: 'account-group',
    color: '#059669',
    route: '/(app)/roles',
    managerOnly: true,
  },
  {
    key: 'settings',
    label: 'Paramètres',
    subtitle: 'Profil et déconnexion',
    icon: 'cog',
    color: '#64748B',
    route: '/(app)/settings',
    managerOnly: false,
  },
];

export default function MenuScreen() {
  const router = useRouter();
  const membership = useAuthStore((s) => s.membership);
  const isManager = !membership;
  const menuItems = ALL_MENU_ITEMS.filter((item) => isManager || !item.managerOnly);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Text style={styles.title}>Menu</Text>
        {!isManager && (
          <View style={styles.roleBadge}>
            <Text style={styles.roleBadgeText}>Femme de ménage</Text>
          </View>
        )}
      </View>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          {menuItems.map((item) => (
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: { fontSize: 22, fontFamily: FONTS.titleBold, color: '#FFFFFF' },
  roleBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  roleBadgeText: { fontSize: 11, color: '#FFFFFF', fontWeight: '600' },
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
