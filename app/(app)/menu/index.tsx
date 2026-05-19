import { View, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Text, Surface } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { APP_COLORS } from '@/constants/colors';
import { FONTS } from '@/constants/typography';
import { useAuthStore } from '@/stores/authStore';
import { usePendingMemos } from '@/hooks/useMemos';

const ALL_MENU_ITEMS = [
  {
    key: 'memo',
    label: 'Mémo',
    subtitle: 'Notes rapides et rappels',
    icon: 'note-text-outline',
    color: '#D4AF37',
    route: '/(app)/memo',
    managerOnly: false,
    showBadge: true,
  },
  {
    key: 'tasks',
    label: 'Tâches',
    subtitle: 'Ménage, maintenance, réappro.',
    icon: 'checkbox-marked-circle-outline',
    color: '#7C3AED',
    route: '/(app)/tasks',
    managerOnly: false,
    showBadge: false,
  },
  {
    key: 'inventory',
    label: 'Inventaire',
    subtitle: 'Linge, équipements, consommables',
    icon: 'package-variant',
    color: '#0891B2',
    route: '/(app)/inventory',
    managerOnly: true,
    showBadge: false,
  },
  {
    key: 'roles',
    label: 'Rôles',
    subtitle: "Gérer les accès de l'équipe",
    icon: 'account-group',
    color: '#059669',
    route: '/(app)/roles',
    managerOnly: true,
    showBadge: false,
  },
  {
    key: 'settings',
    label: 'Paramètres',
    subtitle: 'Profil et déconnexion',
    icon: 'cog-outline',
    color: '#64748B',
    route: '/(app)/settings',
    managerOnly: false,
    showBadge: false,
  },
];

export default function MenuScreen() {
  const router = useRouter();
  const membership = useAuthStore((s) => s.membership);
  const isManager = !membership;
  const menuItems = ALL_MENU_ITEMS.filter((item) => isManager || !item.managerOnly);
  const { data: pendingMemos } = usePendingMemos();
  const pendingCount = pendingMemos?.length ?? 0;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Menu</Text>
        {!isManager && (
          <View style={styles.roleBadge}>
            <MaterialCommunityIcons name="broom" size={12} color="rgba(255,255,255,0.9)" />
            <Text style={styles.roleBadgeText}>Femme de ménage</Text>
          </View>
        )}
      </View>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          {menuItems.map((item) => {
            const badge = item.showBadge && pendingCount > 0 ? pendingCount : 0;
            return (
              <TouchableOpacity
                key={item.key}
                onPress={() => router.push(item.route as any)}
                activeOpacity={0.7}
              >
                <Surface style={styles.menuCard} elevation={2}>
                  <View style={[styles.colorStrip, { backgroundColor: item.color }]} />

                  <View style={[styles.iconBox, { backgroundColor: item.color + '18' }]}>
                    <MaterialCommunityIcons name={item.icon as any} size={26} color={item.color} />
                  </View>

                  <View style={styles.cardContent}>
                    <Text style={styles.cardLabel}>{item.label}</Text>
                    <Text style={styles.cardSubtitle}>{item.subtitle}</Text>
                  </View>

                  {badge > 0 && (
                    <View style={[styles.badge, { backgroundColor: item.color }]}>
                      <Text style={styles.badgeText}>{badge}</Text>
                    </View>
                  )}

                  <MaterialCommunityIcons name="chevron-right" size={20} color={APP_COLORS.border} />
                </Surface>
              </TouchableOpacity>
            );
          })}
        </View>
        <View style={{ height: 24 }} />
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  roleBadgeText: { fontSize: 11, color: '#FFFFFF', fontWeight: '600' },
  scroll: { flex: 1 },
  section: { paddingHorizontal: 16, paddingTop: 16, gap: 10 },
  menuCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    overflow: 'hidden',
    gap: 14,
    paddingRight: 16,
    paddingVertical: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 6,
  },
  colorStrip: {
    width: 5,
    alignSelf: 'stretch',
    borderRadius: 0,
    flexShrink: 0,
  },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  cardContent: { flex: 1 },
  cardLabel: { fontSize: 15, fontWeight: '700', color: APP_COLORS.textPrimary },
  cardSubtitle: { fontSize: 12, color: APP_COLORS.textSecondary, marginTop: 2 },
  badge: {
    borderRadius: 10,
    minWidth: 22,
    height: 22,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
    flexShrink: 0,
  },
  badgeText: { fontSize: 11, fontWeight: '800', color: '#FFFFFF' },
});
