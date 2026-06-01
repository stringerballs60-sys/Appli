import { useMemo, useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Text, ActivityIndicator } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useReservations } from '@/hooks/useReservations';
import { useActiveProperties } from '@/hooks/useProperties';
import { APP_COLORS } from '@/constants/colors';
import { SHADOWS, GRADIENTS, RADII } from '@/constants/theme';
import { FONTS } from '@/constants/typography';
import { ReservationStatus } from '@/types';

// Tarifs des Voûtes de Pascalines
const VOUTES_TARIFS = {
  menage: 90,
  litDouble: 25,
  litSimple: 15,
};

const VOUTES_NAME = 'Les voûtes de Pascalines';

function fmt(n: number) {
  return n.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });
}

export default function AccountingScreen() {
  const router = useRouter();
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  const { data: reservations, isLoading } = useReservations();
  const { data: properties } = useActiveProperties();

  const years = useMemo(() => {
    const current = new Date().getFullYear();
    return [current - 1, current, current + 1];
  }, []);

  const filtered = useMemo(() => {
    if (!reservations) return [];
    return reservations.filter((r) => {
      if (r.status === ReservationStatus.CANCELLED) return false;
      const year = parseInt(r.check_in.slice(0, 4), 10);
      return year === selectedYear;
    });
  }, [reservations, selectedYear]);

  const voutesProperty = useMemo(
    () => properties?.find((p) => p.name.toLowerCase().includes('pascaline')),
    [properties]
  );

  const voutesReservations = useMemo(
    () => (voutesProperty ? filtered.filter((r) => r.property_id === voutesProperty.id) : []),
    [filtered, voutesProperty]
  );

  const voutesStats = useMemo(() => {
    let total = 0;
    let totalMenage = 0;
    let totalLinge = 0;
    let totalNuits = 0;
    for (const r of voutesReservations) {
      const menage = VOUTES_TARIFS.menage;
      const linge =
        (r.beds_double_used ?? 0) * VOUTES_TARIFS.litDouble +
        (r.beds_single_used ?? 0) * VOUTES_TARIFS.litSimple;
      total += menage + linge;
      totalMenage += menage;
      totalLinge += linge;
      totalNuits += r.nb_nights ?? 0;
    }
    return { total, totalMenage, totalLinge, totalNuits, count: voutesReservations.length };
  }, [voutesReservations]);

  const globalStats = useMemo(() => {
    let totalNuits = 0;
    const byProperty: Record<string, { name: string; color: string; count: number; nuits: number }> = {};
    for (const r of filtered) {
      totalNuits += r.nb_nights ?? 0;
      const pid = r.property_id;
      if (!byProperty[pid]) {
        byProperty[pid] = {
          name: r.property?.name ?? pid,
          color: r.property?.color ?? APP_COLORS.primary,
          count: 0,
          nuits: 0,
        };
      }
      byProperty[pid].count += 1;
      byProperty[pid].nuits += r.nb_nights ?? 0;
    }
    return { totalNuits, totalCount: filtered.length, byProperty };
  }, [filtered]);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <LinearGradient
        colors={GRADIENTS.navyHeader as [string, string, ...string[]]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <MaterialCommunityIcons name="arrow-left" size={22} color={APP_COLORS.accent} />
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={styles.title}>Comptabilité</Text>
          <Text style={styles.subtitle}>{globalStats.totalCount} réservations · {selectedYear}</Text>
        </View>
      </LinearGradient>

      {/* Year selector */}
      <View style={styles.yearBar}>
        {years.map((y) => (
          <TouchableOpacity
            key={y}
            style={[styles.yearChip, selectedYear === y && styles.yearChipActive]}
            onPress={() => setSelectedYear(y)}
          >
            <Text style={[styles.yearChipText, selectedYear === y && styles.yearChipTextActive]}>
              {y}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {isLoading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={APP_COLORS.primary} />
      ) : (
        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

          {/* KPI globaux */}
          <Text style={styles.sectionTitle}>Vue globale</Text>
          <View style={styles.kpiRow}>
            <View style={[styles.kpiCard, SHADOWS.sm]}>
              <MaterialCommunityIcons name="bed-king-outline" size={22} color={APP_COLORS.primary} />
              <Text style={styles.kpiValue}>{globalStats.totalCount}</Text>
              <Text style={styles.kpiLabel}>Réservations</Text>
            </View>
            <View style={[styles.kpiCard, SHADOWS.sm]}>
              <MaterialCommunityIcons name="weather-night" size={22} color={APP_COLORS.primary} />
              <Text style={styles.kpiValue}>{globalStats.totalNuits}</Text>
              <Text style={styles.kpiLabel}>Nuits louées</Text>
            </View>
            <View style={[styles.kpiCard, SHADOWS.sm]}>
              <MaterialCommunityIcons name="home-group" size={22} color={APP_COLORS.primary} />
              <Text style={styles.kpiValue}>{Object.keys(globalStats.byProperty).length}</Text>
              <Text style={styles.kpiLabel}>Logements</Text>
            </View>
          </View>

          {/* Répartition par logement */}
          {Object.entries(globalStats.byProperty).length > 0 && (
            <>
              <Text style={styles.sectionTitle}>Par logement</Text>
              <View style={[styles.card, SHADOWS.sm]}>
                {Object.entries(globalStats.byProperty).map(([pid, stat], idx, arr) => (
                  <View key={pid} style={[styles.propertyRow, idx < arr.length - 1 && styles.propertyRowBorder]}>
                    <View style={[styles.colorDot, { backgroundColor: stat.color }]} />
                    <Text style={styles.propertyName} numberOfLines={1}>{stat.name}</Text>
                    <Text style={styles.propertyCount}>{stat.count} resa</Text>
                    <Text style={styles.propertyNuits}>{stat.nuits} nuits</Text>
                  </View>
                ))}
              </View>
            </>
          )}

          {/* Section Les Voûtes de Pascalines */}
          <View style={styles.voutesHeader}>
            <MaterialCommunityIcons name="home-city-outline" size={18} color={APP_COLORS.accent} />
            <Text style={styles.voutesTitle}>{VOUTES_NAME}</Text>
          </View>

          {/* Grille des tarifs */}
          <View style={[styles.card, SHADOWS.sm]}>
            <Text style={styles.cardSectionLabel}>Grille tarifaire</Text>
            <View style={styles.tarifRow}>
              <MaterialCommunityIcons name="broom" size={16} color={APP_COLORS.textSecondary} />
              <Text style={styles.tarifLabel}>Ménage</Text>
              <Text style={styles.tarifAmount}>{fmt(VOUTES_TARIFS.menage)}</Text>
              <Text style={styles.tarifNote}>/ réservation</Text>
            </View>
            <View style={styles.tarifRow}>
              <MaterialCommunityIcons name="bed-king-outline" size={16} color={APP_COLORS.textSecondary} />
              <Text style={styles.tarifLabel}>Lit double</Text>
              <Text style={styles.tarifAmount}>{fmt(VOUTES_TARIFS.litDouble)}</Text>
              <Text style={styles.tarifNote}>/ lit</Text>
            </View>
            <View style={styles.tarifRow}>
              <MaterialCommunityIcons name="bed-outline" size={16} color={APP_COLORS.textSecondary} />
              <Text style={styles.tarifLabel}>Lit simple</Text>
              <Text style={styles.tarifAmount}>{fmt(VOUTES_TARIFS.litSimple)}</Text>
              <Text style={styles.tarifNote}>/ lit</Text>
            </View>
          </View>

          {/* Totaux calculés */}
          {voutesProperty ? (
            <>
              <View style={[styles.card, SHADOWS.sm]}>
                <Text style={styles.cardSectionLabel}>Revenus calculés {selectedYear}</Text>
                <View style={styles.statRow}>
                  <Text style={styles.statLabel}>Réservations traitées</Text>
                  <Text style={styles.statValue}>{voutesStats.count}</Text>
                </View>
                <View style={styles.statRow}>
                  <Text style={styles.statLabel}>Nuits louées</Text>
                  <Text style={styles.statValue}>{voutesStats.totalNuits}</Text>
                </View>
                <View style={styles.statRow}>
                  <Text style={styles.statLabel}>Ménages</Text>
                  <Text style={styles.statValue}>{fmt(voutesStats.totalMenage)}</Text>
                </View>
                <View style={styles.statRow}>
                  <Text style={styles.statLabel}>Linge</Text>
                  <Text style={styles.statValue}>{fmt(voutesStats.totalLinge)}</Text>
                </View>
                <View style={[styles.statRow, styles.totalRow]}>
                  <Text style={styles.totalLabel}>Total estimé</Text>
                  <Text style={styles.totalAmount}>{fmt(voutesStats.total)}</Text>
                </View>
              </View>

              {/* Détail par réservation */}
              {voutesReservations.length > 0 && (
                <>
                  <Text style={styles.sectionTitle}>Détail des réservations</Text>
                  <View style={[styles.card, SHADOWS.sm]}>
                    {voutesReservations.map((r, idx) => {
                      const linge =
                        (r.beds_double_used ?? 0) * VOUTES_TARIFS.litDouble +
                        (r.beds_single_used ?? 0) * VOUTES_TARIFS.litSimple;
                      const total = VOUTES_TARIFS.menage + linge;
                      return (
                        <View
                          key={r.id}
                          style={[styles.resaRow, idx < voutesReservations.length - 1 && styles.propertyRowBorder]}
                        >
                          <View style={{ flex: 1 }}>
                            <Text style={styles.resaGuest} numberOfLines={1}>{r.guest_name}</Text>
                            <Text style={styles.resaDates}>
                              {r.check_in} → {r.check_out} · {r.nb_nights}n
                            </Text>
                            <Text style={styles.resaBeds}>
                              {r.beds_double_used > 0 ? `${r.beds_double_used}×double ` : ''}
                              {r.beds_single_used > 0 ? `${r.beds_single_used}×simple` : ''}
                            </Text>
                          </View>
                          <Text style={styles.resaTotal}>{fmt(total)}</Text>
                        </View>
                      );
                    })}
                  </View>
                </>
              )}
            </>
          ) : (
            <View style={[styles.card, styles.emptyCard]}>
              <MaterialCommunityIcons name="home-search-outline" size={28} color={APP_COLORS.textTertiary} />
              <Text style={styles.emptyText}>Logement "{VOUTES_NAME}" introuvable dans vos propriétés.</Text>
            </View>
          )}

          <View style={{ height: 40 }} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: APP_COLORS.primaryDark },
  header: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 18,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: RADII.sm,
    backgroundColor: 'rgba(201,168,76,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { fontSize: 22, fontFamily: FONTS.titleBold, color: APP_COLORS.accent, letterSpacing: 0.8 },
  subtitle: { fontSize: 11, color: 'rgba(248,245,239,0.55)', marginTop: 2 },

  yearBar: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: APP_COLORS.surfaceElevated,
    borderBottomWidth: 1,
    borderBottomColor: APP_COLORS.borderLight,
  },
  yearChip: {
    paddingHorizontal: 18,
    paddingVertical: 6,
    borderRadius: RADII.full,
    borderWidth: 1,
    borderColor: APP_COLORS.border,
    backgroundColor: APP_COLORS.background,
  },
  yearChipActive: { backgroundColor: APP_COLORS.primary, borderColor: APP_COLORS.primary },
  yearChipText: { fontSize: 13, fontWeight: '600', color: APP_COLORS.textSecondary },
  yearChipTextActive: { color: '#FFFFFF' },

  scroll: { flex: 1, backgroundColor: APP_COLORS.background },
  scrollContent: { paddingHorizontal: 16, paddingTop: 20, gap: 12 },

  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: APP_COLORS.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginTop: 4,
    marginBottom: -4,
  },

  kpiRow: { flexDirection: 'row', gap: 10 },
  kpiCard: {
    flex: 1,
    backgroundColor: APP_COLORS.surfaceElevated,
    borderRadius: RADII.md,
    alignItems: 'center',
    paddingVertical: 14,
    gap: 4,
  },
  kpiValue: { fontSize: 22, fontWeight: '800', color: APP_COLORS.textPrimary },
  kpiLabel: { fontSize: 11, color: APP_COLORS.textSecondary, fontWeight: '500' },

  card: {
    backgroundColor: APP_COLORS.surfaceElevated,
    borderRadius: RADII.md,
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 10,
  },
  cardSectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: APP_COLORS.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 2,
  },

  propertyRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6 },
  propertyRowBorder: { borderBottomWidth: 1, borderBottomColor: APP_COLORS.borderLight },
  colorDot: { width: 10, height: 10, borderRadius: 5 },
  propertyName: { flex: 1, fontSize: 13, fontWeight: '600', color: APP_COLORS.textPrimary },
  propertyCount: { fontSize: 12, color: APP_COLORS.textSecondary },
  propertyNuits: { fontSize: 12, color: APP_COLORS.textTertiary, width: 52, textAlign: 'right' },

  voutesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
    marginBottom: -2,
  },
  voutesTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: APP_COLORS.accent,
    letterSpacing: 0.3,
  },

  tarifRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 4,
  },
  tarifLabel: { flex: 1, fontSize: 14, color: APP_COLORS.textPrimary, fontWeight: '500' },
  tarifAmount: { fontSize: 14, fontWeight: '700', color: APP_COLORS.primary },
  tarifNote: { fontSize: 11, color: APP_COLORS.textTertiary, width: 72, textAlign: 'right' },

  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: APP_COLORS.borderLight,
  },
  statLabel: { fontSize: 13, color: APP_COLORS.textSecondary },
  statValue: { fontSize: 13, fontWeight: '600', color: APP_COLORS.textPrimary },
  totalRow: { borderBottomWidth: 0, marginTop: 4, paddingTop: 10, borderTopWidth: 2, borderTopColor: APP_COLORS.accent },
  totalLabel: { fontSize: 15, fontWeight: '800', color: APP_COLORS.textPrimary },
  totalAmount: { fontSize: 20, fontWeight: '800', color: APP_COLORS.success },

  resaRow: { paddingVertical: 10, flexDirection: 'row', alignItems: 'center', gap: 10 },
  resaGuest: { fontSize: 13, fontWeight: '700', color: APP_COLORS.textPrimary },
  resaDates: { fontSize: 11, color: APP_COLORS.textSecondary, marginTop: 2 },
  resaBeds: { fontSize: 11, color: APP_COLORS.textTertiary, marginTop: 1 },
  resaTotal: { fontSize: 15, fontWeight: '800', color: APP_COLORS.primary },

  emptyCard: { alignItems: 'center', gap: 10, paddingVertical: 24 },
  emptyText: { fontSize: 13, color: APP_COLORS.textTertiary, textAlign: 'center' },
});
