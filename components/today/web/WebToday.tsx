import { useEffect, useMemo, useState } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useReservationsForMonth, usePendingCheckInTime } from '@/hooks/useReservations';
import { useActiveProperties } from '@/hooks/useProperties';
import { useLowStockAlerts } from '@/hooks/useInventory';
import { usePendingMemos } from '@/hooks/useMemos';
import { useCleaningDay, useSetCleaningDone } from '@/hooks/useTasks';
import { CAL, PANEL_WIDTH } from '@/components/calendar/web/tokens';
import { Property, Reservation } from '@/types';
import { VIEWS, ViewKey, buildToday, dayTitle, shiftDay, toISO, shortDay, hhmm } from './model';
import { SheetView } from './SheetView';
import { TourView } from './TourView';
import { HoursView } from './HoursView';

const VIEW_STORE = 'kaza_today_view';

const LINEN: [string, string][] = [
  ['double_sheets', 'Draps doubles'],
  ['single_sheets', 'Draps simples'],
  ['baby_sheets', 'Draps bébé'],
  ['bath_towels', 'Serviettes'],
  ['hand_towels', 'Serviettes mains'],
  ['bath_mats', 'Tapis de bain'],
  ['kitchen_towels', 'Torchons'],
];

export function WebToday() {
  const router = useRouter();
  const today = useMemo(() => toISO(new Date()), []);
  const [date, setDate] = useState(today);
  const [view, setView] = useState<ViewKey>('sheet');

  useEffect(() => {
    AsyncStorage.getItem(VIEW_STORE).then((v) => {
      if (v === 'sheet' || v === 'tour' || v === 'hours') setView(v);
    }).catch(() => {});
  }, []);
  const chooseView = (v: ViewKey) => {
    setView(v);
    AsyncStorage.setItem(VIEW_STORE, v).catch(() => {});
  };

  const from = shiftDay(date, -1);
  const to = shiftDay(date, 4);
  const { data: stays, isLoading: staysLoading, isError, refetch } = useReservationsForMonth(from, to, { staysOnly: true });
  const { data: properties, isLoading: propsLoading } = useActiveProperties();
  const { data: tasks } = useCleaningDay(date);
  const { data: calls } = usePendingCheckInTime(3);
  const { data: lowStock } = useLowStockAlerts();
  const { data: memos } = usePendingMemos();
  const setDone = useSetCleaningDone();

  const activeStays = useMemo(() => (stays ?? []).filter((r) => r.status !== 'cancelled'), [stays]);
  const model = useMemo(
    () => buildToday(date, activeStays, properties ?? [], tasks ?? [], today),
    [date, activeStays, properties, tasks, today]
  );

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      if (el && ['INPUT', 'TEXTAREA'].includes(el.tagName)) return;
      if (e.key === 'ArrowLeft') setDate((d) => shiftDay(d, -1));
      else if (e.key === 'ArrowRight') setDate((d) => shiftDay(d, 1));
      else if (e.key === 't' || e.key === 'T') setDate(today);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [today]);

  const openResa = (r: Reservation) => router.push(`/(app)/reservations/${r.id}`);
  const toggleCleaning = (p: Property, done: boolean) => {
    const row = model.rows.find((x) => x.property.id === p.id);
    if (row?.task) setDone.mutate({ id: row.task.id, done });
  };

  const isToday = date === today;
  const loading = staysLoading || propsLoading;
  const cleaningsLeft = model.cleanings.filter((c) => !c.cleaningDone).length;
  const viewProps = { model, isToday, onOpen: openResa, onToggleCleaning: toggleCleaning };
  const linen = model.day.linen as unknown as Record<string, number>;
  const linenItems = LINEN.filter(([k]) => (linen[k] ?? 0) > 0);

  return (
    <View style={s.root}>
      <View style={s.top}>
        <Pressable onPress={() => setDate((d) => shiftDay(d, -1))} style={({ hovered }: any) => [s.navBtn, hovered && s.navHover]} accessibilityLabel="Jour précédent">
          <MaterialCommunityIcons name="chevron-left" size={22} color={CAL.blanc} />
        </Pressable>
        <View style={{ minWidth: 250 }}>
          <Text style={s.kicker}>{isToday ? 'Aujourd’hui' : date < today ? 'Jour passé' : 'Jour à venir'}</Text>
          <Text style={s.title}>{dayTitle(date)}</Text>
        </View>
        <Pressable onPress={() => setDate((d) => shiftDay(d, 1))} style={({ hovered }: any) => [s.navBtn, hovered && s.navHover]} accessibilityLabel="Jour suivant">
          <MaterialCommunityIcons name="chevron-right" size={22} color={CAL.blanc} />
        </Pressable>
        {!isToday ? (
          <Pressable onPress={() => setDate(today)} style={({ hovered }: any) => [s.todayBtn, hovered && { backgroundColor: CAL.nuitSoft }]}>
            <Text style={s.todayText}>Revenir à aujourd’hui</Text>
          </Pressable>
        ) : null}
        <View style={{ flex: 1 }} />
        <Count n={model.departures.length} label="départ" />
        <Count n={cleaningsLeft} label={cleaningsLeft > 1 ? 'ménages à faire' : 'ménage à faire'} invariable tone={model.cleanings.some((c) => c.turnover && !c.cleaningDone) ? 'alert' : undefined} />
        <Count n={model.arrivals.length} label="arrivée" />
        <Count n={model.stayingCount} label="en séjour" invariable />
      </View>

      <View style={s.body}>
        <View style={{ flex: 1, minWidth: 0 }}>
          {loading ? (
            <View style={s.center}><ActivityIndicator color={CAL.nuit} /><Text style={s.centerText}>Chargement de la journée…</Text></View>
          ) : isError ? (
            <View style={s.center}>
              <Text style={s.centerTitle}>Impossible de charger la journée.</Text>
              <Text style={s.centerText}>Vérifie ta connexion internet, puis réessaie.</Text>
              <Pressable onPress={() => refetch()} style={s.retry}><Text style={s.retryText}>Réessayer</Text></Pressable>
            </View>
          ) : model.rows.length === 0 ? (
            <View style={s.center}>
              <Text style={s.centerTitle}>Journée calme : aucun départ, ménage ni arrivée.</Text>
              <Text style={s.centerText}>Flèche → pour voir le jour suivant.</Text>
            </View>
          ) : view === 'tour' ? <TourView {...viewProps} />
            : view === 'hours' ? <HoursView {...viewProps} />
            : <SheetView {...viewProps} />}
        </View>

        <ScrollView style={s.aside} contentContainerStyle={s.asideBody}>
          <Text style={s.asideTitle}>Linge à préparer</Text>
          {linenItems.length === 0 ? <Text style={s.muted}>Aucune arrivée ce jour-là.</Text> : (
            <View style={s.linen}>
              {linenItems.map(([k, label]) => (
                <View key={k} style={s.linenItem}>
                  <Text style={s.linenNum}>{linen[k]}</Text>
                  <Text style={s.linenLabel}>{label}</Text>
                </View>
              ))}
            </View>
          )}

          <Text style={s.asideTitle}>Heures d’arrivée à confirmer</Text>
          {(calls ?? []).length === 0 ? <Text style={s.muted}>Tout est confirmé pour les 3 prochains jours.</Text> : (calls ?? []).map((r) => (
            <Pressable key={r.id} onPress={() => openResa(r)} style={({ hovered }: any) => [s.line, hovered && { backgroundColor: CAL.brumeClair }]}>
              <View style={[s.dot, { backgroundColor: r.property?.color ?? CAL.brume }]} />
              <View style={{ flex: 1 }}>
                <Text style={s.lineMain} numberOfLines={1}>{r.guest_name}</Text>
                <Text style={s.lineSub} numberOfLines={1}>{r.property?.name} · {shortDay(r.check_in)}</Text>
              </View>
              <MaterialCommunityIcons name={r.guest_phone ? 'phone-outline' : 'phone-off-outline'} size={18} color={r.guest_phone ? CAL.nuit : CAL.texteDoux} />
            </Pressable>
          ))}

          <Text style={s.asideTitle}>Les 3 jours suivants</Text>
          {model.next.map((n) => (
            <Pressable key={n.date} onPress={() => setDate(n.date)} style={({ hovered }: any) => [s.nextRow, hovered && { backgroundColor: CAL.brumeClair }]}>
              <Text style={s.nextDay}>{shortDay(n.date)}</Text>
              <Text style={s.lineSub}>
                {n.departures.length} départ{n.departures.length > 1 ? 's' : ''} · {n.arrivals.length} arrivée{n.arrivals.length > 1 ? 's' : ''}
                {n.arrivals[0] ? ` · 1re à ${hhmm(n.arrivals[0].check_in_time) ?? '?'}` : ''}
              </Text>
            </Pressable>
          ))}

          {(lowStock ?? []).length > 0 ? (
            <>
              <Text style={s.asideTitle}>Stocks bas</Text>
              {(lowStock ?? []).slice(0, 6).map((c) => (
                <View key={c.id} style={s.line}>
                  <MaterialCommunityIcons name="alert-circle-outline" size={16} color={CAL.changement} />
                  <Text style={[s.lineMain, { flex: 1 }]} numberOfLines={1}>{c.item_name}</Text>
                  <Text style={s.lineSub}>{c.current_stock} {c.unit}</Text>
                </View>
              ))}
            </>
          ) : null}

          {(memos ?? []).length > 0 ? (
            <Pressable onPress={() => router.push('/(app)/memo')} style={({ hovered }: any) => [s.memo, hovered && { backgroundColor: '#F4EBCB' }]}>
              <MaterialCommunityIcons name="note-text-outline" size={16} color={CAL.nuit} />
              <Text style={s.lineMain}>{memos!.length} note{memos!.length > 1 ? 's' : ''} en attente dans le mémo</Text>
            </Pressable>
          ) : null}
        </ScrollView>
      </View>

      <View style={s.variantBar}>
        <Text style={s.variantLabel}>Version à tester :</Text>
        {VIEWS.map((v) => (
          <Pressable key={v.key} onPress={() => chooseView(v.key)} style={[s.variantChip, view === v.key && s.variantOn]}>
            <Text style={[s.variantText, view === v.key && { color: CAL.blanc }]}>{v.label}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

function Count({ n, label, tone, invariable }: { n: number; label: string; tone?: 'alert'; invariable?: boolean }) {
  return (
    <View style={s.count}>
      <Text style={[s.countNum, tone === 'alert' && { color: '#FF8A80' }]}>{n}</Text>
      <Text style={s.countLabel}>{invariable || n <= 1 ? label : `${label}s`}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: CAL.blanc },
  top: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: CAL.nuit, paddingHorizontal: 16, height: 68 },
  navBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  navHover: { backgroundColor: CAL.nuitSoft },
  kicker: { fontFamily: CAL.font, fontSize: 12, color: 'rgba(255,255,255,0.6)' },
  title: { fontFamily: CAL.fontBold, fontSize: 21, color: CAL.blanc },
  todayBtn: { borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)', borderRadius: 6, paddingVertical: 7, paddingHorizontal: 12, marginLeft: 6 },
  todayText: { fontFamily: CAL.fontBold, fontSize: 13, color: CAL.blanc },
  count: { alignItems: 'center', minWidth: 76, paddingHorizontal: 6 },
  countNum: { fontFamily: CAL.fontBold, fontSize: 22, color: CAL.blanc, fontVariant: ['tabular-nums'] },
  countLabel: { fontFamily: CAL.font, fontSize: 12, color: 'rgba(255,255,255,0.65)' },
  body: { flex: 1, flexDirection: 'row', minHeight: 0 },
  aside: { width: PANEL_WIDTH, flexGrow: 0, flexShrink: 0, borderLeftWidth: 1, borderLeftColor: CAL.brume, backgroundColor: CAL.blanc },
  asideBody: { padding: 20, paddingBottom: 80, gap: 6 },
  asideTitle: { fontFamily: CAL.fontBold, fontSize: 15, color: CAL.texte, marginTop: 14, marginBottom: 4 },
  muted: { fontFamily: CAL.font, fontSize: 13, color: CAL.texteDoux },
  linen: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  linenItem: { flexDirection: 'row', alignItems: 'baseline', gap: 6, backgroundColor: CAL.brumeClair, borderRadius: 6, paddingVertical: 6, paddingHorizontal: 10 },
  linenNum: { fontFamily: CAL.fontBold, fontSize: 17, color: CAL.texte, fontVariant: ['tabular-nums'] },
  linenLabel: { fontFamily: CAL.font, fontSize: 13, color: CAL.texteDoux },
  line: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, paddingHorizontal: 8, borderRadius: 6, minHeight: 40 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  lineMain: { fontFamily: CAL.fontBold, fontSize: 14, color: CAL.texte },
  lineSub: { fontFamily: CAL.font, fontSize: 12, color: CAL.texteDoux },
  nextRow: { paddingVertical: 8, paddingHorizontal: 8, borderRadius: 6, gap: 2 },
  nextDay: { fontFamily: CAL.fontBold, fontSize: 14, color: CAL.texte, textTransform: 'capitalize' },
  memo: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 16, backgroundColor: '#FAF3DC', borderRadius: 6, padding: 12, minHeight: 40 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8, padding: 24 },
  centerTitle: { fontFamily: CAL.fontBold, fontSize: 16, color: CAL.texte, textAlign: 'center' },
  centerText: { fontFamily: CAL.font, fontSize: 14, color: CAL.texteDoux },
  retry: { backgroundColor: CAL.nuit, borderRadius: 6, paddingVertical: 10, paddingHorizontal: 16, marginTop: 6 },
  retryText: { fontFamily: CAL.fontBold, fontSize: 14, color: CAL.blanc },
  variantBar: { position: 'absolute', left: 16, bottom: 16, flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(255,255,255,0.95)', borderRadius: 8, padding: 6, boxShadow: '0 4px 14px rgba(0,0,0,0.18)' } as any,
  variantLabel: { fontFamily: CAL.font, fontSize: 12, color: CAL.texteDoux, marginHorizontal: 4 },
  variantChip: { paddingVertical: 5, paddingHorizontal: 10, borderRadius: 5 },
  variantOn: { backgroundColor: CAL.nuit },
  variantText: { fontFamily: CAL.fontBold, fontSize: 12, color: CAL.nuit },
});
