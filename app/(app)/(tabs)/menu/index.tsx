import { View, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Text } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { APP_COLORS } from '@/constants/colors';
import { SHADOWS, GRADIENTS, RADII } from '@/constants/theme';
import { FONTS } from '@/constants/typography';
import { useAuthStore } from '@/stores/authStore';
import { usePendingMemos } from '@/hooks/useMemos';

const ALL_MENU_ITEMS = [
  {
    key: 'memo',
    label: 'Mémo',
    subtitle: 'Notes rapides et rappels',
    icon: 'note-text-outline',
    color: APP_COLORS.accent,
    route: '/(app)/memo',
    managerOnly: false,
    cleanerOnly: false,
    showBadge: true,
  },
  {
    key: 'cleaning',
    label: 'Planning ménage',
    subtitle: 'Créneaux suggérés par logement',
    icon: 'broom',
    color: '#8B5CF6',
    route: '/(app)/cleaning',
    managerOnly: false,
    cleanerOnly: true,
    showBadge: false,
  },
  {
    key: 'tasks',
    label: 'Tâches',
    subtitle: 'Ménage, maintenance, réappro.',
    icon: 'checkbox-marked-circle-outline',
    color: '#7C3AED',
    route: '/(app)/tasks',
    managerOnly: false,
    cleanerOnly: true,
    showBadge: false,
  },
  {
    key: 'accounting',
    label: 'Comptabilité',
    subtitle: 'Revenus, tarifs et analyse',
    icon: 'chart-bar',
    color: '#059669',
    route: '/(app)/accounting',
    managerOnly: true,
    cleanerOnly: false,
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
    cleanerOnly: false,
    showBadge: false,
  },
  {
    key: 'roles',
    label: 'Rôles',
    subtitle: "Gérer les accès de l'équipe",
    icon: 'account-group',
    color: APP_COLORS.success,
    route: '/(app)/roles',
    managerOnly: true,
    cleanerOnly: false,
    showBadge: false,
  },
  {
    key: 'settings',
    label: 'Paramètres',
    subtitle: 'Profil et déconnexion',
    icon: 'cog-outline',
    color: APP_COLORS.primaryLight,
    route: '/(app)/settings',
    managerOnly: false,
    cleanerOnly: false,
    showBadge: false,
  },
];

export default function MenuScreen() {
  const router = useRouter();
  const membership = useAuthStore((s) => s.membership);
  const isManager = !membership;
  const isComptable = membership?.role === 'comptable';
  const menuItems = ALL_MENU_ITEMS.filter((item) => {
    if (item.managerOnly && !isManager) return false;
    if (item.cleanerOnly && isComptable) return false;
    return true;
  });
  const { data: pendingMemos } = usePendingMemos();
  const pendingCount = pendingMemos?.length ?? 0;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <LinearGradient
        colors={GRADIENTS.navyHeader as [string, string, ...string[]]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <Text style={styles.title}>Menu</Text>
        {!isManager && (
          <View style={styles.rolePill}>
            <MaterialCommunityIcons
              name={isComptable ? 'calculator-variant-outline' : 'broom'}
              size={12}
              color={APP_COLORS.accent}
            />
            <Text style={styles.rolePillText}>
              {isComptable ? 'Comptable' : 'Aide ménagère'}
            </Text>
          </View>
        )}
      </LinearGradient>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.list}>
          {menuItems.map((item) => {
            const badge = item.showBadge && pendingCount > 0 ? pendingCount : 0;
            return (
              <TouchableOpacity
                key={item.key}
                onPress={() => router.push(item.route as any)}
                activeOpacity={0.75}
              >
                <View style={[styles.card, SHADOWS.sm]}>
                  <View style={[styles.strip, { backgroundColor: item.color }]} />
                  <View style={[styles.iconBox, { backgroundColor: item.color + '15' }]}>
                    <MaterialCommunityIcons name={item.icon as any} size={24} color={item.color} />
                  </View>
                  <View style={styles.content}>
                    <Text style={styles.label}>{item.label}</Text>
                    <Text style={styles.subtitle}>{item.subtitle}</Text>
                  </View>
                  {badge > 0 && (
                    <View style={[styles.badge, { backgroundColor: item.color }]}>
                      <Text style={styles.badgeText}>{badge}</Text>
                    </View>
                  )}
                  <MaterialCommunityIcons name="chevron-right" size={18} color={APP_COLORS.border} />
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: APP_COLORS.primaryDark },
  scroll: { flex: 1, backgroundColor: APP_COLORS.background },

  header: {
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 22,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    fontSize: 24,
    fontFamily: FONTS.titleBold,
    color: APP_COLORS.accent,
    letterSpacing: 1,
  },
  rolePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(248,245,239,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(201,168,76,0.35)',
    borderRadius: RADII.full,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  rolePillText: {
    fontSize: 11,
    color: APP_COLORS.accentLight,
    fontWeight: '600',
  },

  list: {
    paddingHorizontal: 16,
    paddingTop: 18,
    gap: 10,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: APP_COLORS.surfaceElevated,
    borderRadius: RADII.md,
    overflow: 'hidden',
    gap: 14,
    paddingRight: 14,
    paddingVertical: 14,
  },
  strip: {
    width: 4,
    alignSelf: 'stretch',
    flexShrink: 0,
  },
  iconBox: {
    width: 46,
    height: 46,
    borderRadius: RADII.sm,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  content: { flex: 1 },
  label: {
    fontSize: 15,
    fontWeight: '700',
    color: APP_COLORS.textPrimary,
  },
  subtitle: {
    fontSize: 12,
    color: APP_COLORS.textSecondary,
    marginTop: 2,
  },
  badge: {
    borderRadius: RADII.full,
    minWidth: 22,
    height: 22,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
    flexShrink: 0,
  },
  badgeText: { fontSize: 11, fontWeight: '800', color: '#FFFFFF' },
});
