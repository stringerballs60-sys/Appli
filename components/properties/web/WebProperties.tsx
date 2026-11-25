import { useEffect, useMemo, useState } from 'react';
import { View, Text, Pressable, ScrollView, TextInput, StyleSheet, ActivityIndicator, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { addDays, differenceInDays, format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useProperties } from '@/hooks/useProperties';
import { useReservationsForMonth } from '@/hooks/useReservations';
import { Property, Reservation } from '@/types';
import { PROPERTY_TYPE_LABELS, PROPERTY_TYPE_SHORT_LABELS } from '@/constants/labels';
import { getCurrentSeason } from '@/constants/season';
import { channelOf } from '@/constants/channels';
import { ChannelBadge } from '@/components/ui/ChannelBadge';
import { CAL, PANEL_WIDTH } from '@/components/calendar/web/tokens';
import { CLEANING, Row, TodayTag, groupKey, dayMonth } from './shared';
import { KeyBoardView, Section } from './views';
import { isBlock, isStay, blockReasonLabel } from '@/constants/blocks';
import { computeOccupancy } from '@/constants/blocks';
import { ICAL_PAUSED } from '@/constants/ical';
import { PropertyPhotoEditor } from '@/components/properties/PropertyPhotoEditor';

const toISO = (d: Date) => format(d, 'yyyy-MM-dd');

type SortKey = 'name' | 'occupancy' | 'next';

export function WebProperties() {
  const router = useRouter();
  const season = useMemo(() => getCurrentSeason(), []);
  const today = toISO(new Date());
  const from = today < season.start ? today : season.start;
  const to = toISO(addDays(parseISO(season.end), 1));

  const { data: properties, isLoading: propLoading, isError: propError, refetch } = useProperties();
  const { data: reservationsData, isLoading: resaLoading } = useReservationsForMonth(from, to);

  const [query, setQuery] = useState('');
  const [site, setSite] = useState<string | null>(null);
  const [onlyTodo, setOnlyTodo] = useState(false);
  const [showInactive, setShowInactive] = useState(false);
  const [sort, setSort] = useState<SortKey>('name');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const rows = useMemo<Row[]>(() => {
    const all = (reservationsData ?? []).filter((r) => r.status !== 'cancelled');
    return (properties ?? []).map((property) => {
      const mine = all.filter((r) => r.property_id === property.id).sort((a, b) => a.check_in.localeCompare(b.check_in));
      const stays = mine.filter(isStay);
      const blocks = mine.filter(isBlock);
      const current = stays.find((r) => r.check_in <= today && r.check_out > today) ?? null;
      const currentBlock = current ? null : blocks.find((r) => r.check_in <= today && r.check_out > today) ?? null;
      const upcoming = stays.filter((r) => r.check_in > today);
      const arriving = stays.find((r) => r.check_in === today) ?? null;
      const leaving = stays.some((r) => r.check_out === today);
      const todayTag: TodayTag | null =
        arriving && leaving ? { kind: 'turnover', time: arriving.check_in_time }
        : leaving ? { kind: 'departure' }
        : arriving ? { kind: 'arrival', time: arriving.check_in_time }
        : null;
      const occ = computeOccupancy(mine, season.start, season.end);
      return {
        property,
        current,
        currentBlock,
        next: upcoming[0] ?? null,
        upcoming,
        upcomingBlocks: blocks.filter((r) => r.check_out > today),
        today: todayTag,
        bookedNights: occ.bookedNights,
        blockedNights: occ.blockedNights,
        occupancy: occ.rate,
      };
    });
  }, [properties, reservationsData, today, season]);

  const sites = useMemo(
    () => Array.from(new Set((properties ?? []).filter((p) => p.is_active).map(groupKey))).sort((a, b) => a.localeCompare(b, 'fr')),
    [properties]
  );

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter(({ property: p }) => {
      if (!showInactive && !p.is_active) return false;
      if (site && groupKey(p) !== site) return false;
      if (onlyTodo && p.cleaning_status !== 'to_do') return false;
      if (q && ![p.name, p.address, p.notes, p.group_name].some((v) => v?.toLowerCase().includes(q))) return false;
      return true;
    });
  }, [rows, query, site, onlyTodo, showInactive]);

  const sections = useMemo<Section[]>(() => {
    const byName = (a: Row, b: Row) => a.property.name.localeCompare(b.property.name, 'fr', { numeric: true });
    const sorter =
      sort === 'occupancy' ? (a: Row, b: Row) => b.occupancy - a.occupancy
      : sort === 'next' ? (a: Row, b: Row) => (a.next?.check_in ?? '9999').localeCompare(b.next?.check_in ?? '9999')
      : byName;
    const map = new Map<string, Row[]>();
    visible.forEach((r) => {
      const key = r.property.is_active ? groupKey(r.property) : 'Inactifs';
      map.set(key, [...(map.get(key) ?? []), r]);
    });
    return Array.from(map.entries())
      .sort(([a], [b]) => (a === 'Inactifs' ? 1 : b === 'Inactifs' ? -1 : a.localeCompare(b, 'fr')))
      .map(([title, list]) => ({ title, rows: list.sort(sorter) }));
  }, [visible, sort]);

  const flat = useMemo(() => sections.flatMap((s) => s.rows), [sections]);

  useEffect(() => {
    if (flat.length === 0) { setSelectedId(null); return; }
    if (!selectedId || !flat.some((r) => r.property.id === selectedId)) setSelectedId(flat[0].property.id);
  }, [flat, selectedId]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && ['INPUT', 'TEXTAREA'].includes(target.tagName)) return;
      if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp' && e.key !== 'Enter') return;
      const i = flat.findIndex((r) => r.property.id === selectedId);
      if (e.key === 'Enter' && i >= 0) { router.push(`/(app)/properties/${flat[i].property.id}`); return; }
      e.preventDefault();
      const next = e.key === 'ArrowDown' ? Math.min(flat.length - 1, i + 1) : Math.max(0, i - 1);
      if (flat[next]) setSelectedId(flat[next].property.id);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [flat, selectedId, router]);

  const selected = rows.find((r) => r.property.id === selectedId) ?? null;
  const activeCount = (properties ?? []).filter((p) => p.is_active).length;
  const todoCount = rows.filter((r) => r.property.is_active && r.property.cleaning_status === 'to_do').length;
  const occupiedNow = rows.filter((r) => r.property.is_active && r.current).length;
  const loading = propLoading;

  return (
    <View style={styles.root}>
      <View style={styles.topBar}>
        <Text style={styles.title}>Logements</Text>
        <Text style={styles.summary}>
          {activeCount} actifs · {occupiedNow} occupé{occupiedNow > 1 ? 's' : ''} aujourd'hui · {todoCount} ménage{todoCount > 1 ? 's' : ''} à faire
        </Text>
        <View style={{ flex: 1 }} />
        <View style={styles.search}>
          <MaterialCommunityIcons name="magnify" size={18} color="rgba(255,255,255,0.6)" />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Rechercher un logement"
            placeholderTextColor="rgba(255,255,255,0.5)"
            style={styles.searchInput as any}
          />
        </View>
        <Pressable onPress={() => router.push('/(app)/properties/new')} style={({ hovered }: any) => [styles.addBtn, hovered && { backgroundColor: '#D6B13F' }]}>
          <Text style={styles.addText}>+ Ajouter un logement</Text>
        </Pressable>
      </View>

      <View style={styles.filters}>
        <Chip label="Tous les sites" on={site === null} onPress={() => setSite(null)} />
        {sites.map((s) => (
          <Chip key={s} label={s} on={site === s} onPress={() => setSite(site === s ? null : s)} />
        ))}
        <View style={styles.sep} />
        <Chip label="Ménage à faire" on={onlyTodo} tone="alert" onPress={() => setOnlyTodo((v) => !v)} />
        <Chip label="Afficher les inactifs" on={showInactive} onPress={() => setShowInactive((v) => !v)} />
        <View style={{ flex: 1 }} />
        <Text style={styles.sortLabel}>Trier :</Text>
        {([
          ['name', 'par nom'],
          ['occupancy', 'par remplissage'],
          ['next', 'par arrivée'],
        ] as [SortKey, string][]).map(([k, label]) => (
          <Pressable key={k} onPress={() => setSort(k)} style={({ hovered }: any) => [styles.sortItem, hovered && { backgroundColor: CAL.brumeClair }]}>
            <Text style={[styles.sortText, sort === k && styles.sortTextOn]}>{label}</Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.main}>
        <View style={{ flex: 1 }}>
          {loading ? (
            <View style={styles.center}>
              <ActivityIndicator color={CAL.nuit} />
              <Text style={styles.centerText}>Chargement des logements…</Text>
            </View>
          ) : propError ? (
            <View style={styles.center}>
              <Text style={styles.centerTitle}>Impossible de charger les logements.</Text>
              <Text style={styles.centerText}>Vérifie ta connexion internet, puis réessaie.</Text>
              <Pressable onPress={() => refetch()} style={styles.primaryBtn}>
                <Text style={styles.primaryText}>Réessayer</Text>
              </Pressable>
            </View>
          ) : flat.length === 0 ? (
            <View style={styles.center}>
              <Text style={styles.centerTitle}>{(properties ?? []).length === 0 ? 'Aucun logement pour l’instant.' : 'Aucun logement ne correspond.'}</Text>
              <Text style={styles.centerText}>
                {(properties ?? []).length === 0 ? 'Ajoute ton premier logement pour commencer.' : 'Change la recherche ou retire un filtre.'}
              </Text>
            </View>
          ) : (
            (() => {
              const props = {
                sections,
                selectedId,
                resaLoading,
                onSelect: setSelectedId,
                onOpen: (id: string) => router.push(`/(app)/properties/${id}`),
              };
              return <KeyBoardView {...props} />;
            })()
          )}
        </View>

        {selected && !loading && (
          <DetailPanel
            row={selected}
            seasonYear={season.year}
            onOpen={() => router.push(`/(app)/properties/${selected.property.id}`)}
            onCalendar={() => router.push({ pathname: '/(app)/(tabs)/calendar', params: { site: groupKey(selected.property) } })}
            onNewResa={() => router.push({ pathname: '/(app)/reservations/new', params: { propertyId: selected.property.id } })}
            onNewBlock={() => router.push({ pathname: '/(app)/reservations/block', params: { propertyId: selected.property.id } })}
            onOpenResa={(r) => router.push(`/(app)/reservations/${r.id}`)}
          />
        )}
      </View>
    </View>
  );
}

function Chip({ label, on, onPress, tone }: { label: string; on: boolean; onPress: () => void; tone?: 'alert' }) {
  const onStyle = tone === 'alert' ? { backgroundColor: CAL.changement, borderColor: CAL.changement } : styles.chipOn;
  return (
    <Pressable onPress={onPress} style={({ hovered }: any) => [styles.chip, on && onStyle, hovered && !on && styles.chipHover]}>
      <Text style={[styles.chipText, on && styles.chipTextOn]}>{label}</Text>
    </Pressable>
  );
}

function DetailPanel({
  row,
  seasonYear,
  onOpen,
  onCalendar,
  onNewResa,
  onNewBlock,
  onOpenResa,
}: {
  row: Row;
  seasonYear: number;
  onOpen: () => void;
  onCalendar: () => void;
  onNewResa: () => void;
  onNewBlock: () => void;
  onOpenResa: (r: Reservation) => void;
}) {
  const { property: p, current, currentBlock, upcoming, upcomingBlocks, bookedNights, blockedNights, occupancy } = row;
  const cleaning = CLEANING[p.cleaning_status] ?? CLEANING.to_do;
  const beds = [
    p.nb_double_beds > 0 && `${p.nb_double_beds} lit${p.nb_double_beds > 1 ? 's' : ''} double${p.nb_double_beds > 1 ? 's' : ''}`,
    p.nb_single_beds > 0 && `${p.nb_single_beds} lit${p.nb_single_beds > 1 ? 's' : ''} simple${p.nb_single_beds > 1 ? 's' : ''}`,
    p.nb_sofa_beds > 0 && `${p.nb_sofa_beds} canapé${p.nb_sofa_beds > 1 ? 's' : ''}-lit${p.nb_sofa_beds > 1 ? 's' : ''}`,
    p.nb_baby_cribs > 0 && `${p.nb_baby_cribs} lit${p.nb_baby_cribs > 1 ? 's' : ''} bébé`,
  ].filter(Boolean).join(', ');

  return (
    <View style={styles.panel}>
      <ScrollView contentContainerStyle={styles.panelBody}>
        <Text style={styles.panelTitle}>{p.name}</Text>
        <Text style={[styles.panelSub, { marginBottom: 14 }]}>{groupKey(p)} · {PROPERTY_TYPE_LABELS[p.property_type]}</Text>
        <PropertyPhotoEditor key={p.id} property={p} size={88} />

        <View style={styles.stateBox}>
          <View style={[styles.dot, { backgroundColor: cleaning.color }]} />
          <Text style={[styles.stateText, cleaning.strong && { color: CAL.changement }]}>{cleaning.label}</Text>
          {p.cleaning_status_date ? <Text style={styles.muted}>depuis le {dayMonth(p.cleaning_status_date)}</Text> : null}
        </View>

        {p.notes ? (
          <View style={styles.note}>
            <Text style={styles.noteText}>{p.notes}</Text>
          </View>
        ) : null}

        <View style={styles.facts}>
          <Fact label="Capacité" value={`${p.max_guests} voyageurs`} />
          <Fact label="Couchages" value={beds || 'Aucun lit configuré'} />
          <Fact label="Salles de bain" value={String(p.nb_bathrooms)} />
          {p.address ? <Fact label="Adresse" value={p.address} /> : null}
          <Fact label="Synchro" value={ICAL_PAUSED ? 'Saisie manuelle (iCal en pause)' : p.ical_url ? 'Calendrier Airbnb relié' : 'Saisie manuelle'} />
        </View>

        <Text style={styles.panelSection}>Saison {seasonYear}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <View style={[styles.meter, { flex: 1, height: 8 }]}>
            <View style={[styles.meterFill, { width: `${Math.round(occupancy * 100)}%`, backgroundColor: p.color }]} />
          </View>
          <Text style={styles.percent}>{Math.round(occupancy * 100)} %</Text>
        </View>
        <Text style={[styles.muted, { marginTop: 4 }]}>
          {bookedNights} nuit{bookedNights > 1 ? 's' : ''} louée{bookedNights > 1 ? 's' : ''}
          {blockedNights > 0 ? ` · ${blockedNights} bloquée${blockedNights > 1 ? 's' : ''}, hors calcul` : ''}
        </Text>

        {currentBlock ? (
          <View style={styles.blockNow}>
            <MaterialCommunityIcons name="lock" size={16} color="#6E6457" />
            <Text style={styles.blockNowText}>
              Bloqué aujourd’hui · {blockReasonLabel(currentBlock.block_reason)} jusqu’au {dayMonth(currentBlock.check_out)}
            </Text>
          </View>
        ) : null}

        <Text style={styles.panelSection}>{current ? 'En séjour' : 'Prochains séjours'}</Text>
        {[...(current ? [current] : []), ...upcoming].slice(0, 6).map((r) => (
          <Pressable key={r.id} onPress={() => onOpenResa(r)} style={({ hovered }: any) => [styles.resaLine, hovered && { backgroundColor: CAL.brumeClair }]}>
            <ChannelBadge channel={channelOf(r)} size={18} />
            <View style={{ flex: 1 }}>
              <Text style={styles.value} numberOfLines={1}>{r.guest_name}</Text>
              <Text style={styles.meta}>{dayMonth(r.check_in)} → {dayMonth(r.check_out)} · {r.nb_nights} n.</Text>
            </View>
          </Pressable>
        ))}
        {!current && upcoming.length === 0 && <Text style={styles.muted}>Aucune réservation à venir.</Text>}

        {upcomingBlocks.length > 0 ? (
          <>
            <Text style={styles.panelSection}>Dates bloquées</Text>
            {upcomingBlocks.slice(0, 4).map((r) => (
              <Pressable key={r.id} onPress={() => onOpenResa(r)} style={({ hovered }: any) => [styles.resaLine, hovered && { backgroundColor: CAL.brumeClair }]}>
                <MaterialCommunityIcons name="lock-outline" size={18} color="#6E6457" />
                <View style={{ flex: 1 }}>
                  <Text style={styles.value} numberOfLines={1}>{blockReasonLabel(r.block_reason)}</Text>
                  <Text style={styles.meta}>{dayMonth(r.check_in)} → {dayMonth(r.check_out)}</Text>
                </View>
              </Pressable>
            ))}
          </>
        ) : null}

        <View style={styles.actions}>
          <Pressable onPress={onOpen} style={({ hovered }: any) => [styles.primaryBtn, hovered && { backgroundColor: CAL.nuitSoft }]}>
            <Text style={styles.primaryText}>Ouvrir la fiche</Text>
          </Pressable>
          <Pressable onPress={onNewResa} style={({ hovered }: any) => [styles.ghostBtn, hovered && { backgroundColor: CAL.brumeClair }]}>
            <Text style={styles.ghostText}>Nouvelle réservation</Text>
          </Pressable>
          <Pressable onPress={onNewBlock} style={({ hovered }: any) => [styles.ghostBtn, hovered && { backgroundColor: CAL.brumeClair }]}>
            <Text style={styles.ghostText}>Bloquer des dates</Text>
          </Pressable>
          <Pressable onPress={onCalendar} style={({ hovered }: any) => [styles.ghostBtn, hovered && { backgroundColor: CAL.brumeClair }]}>
            <Text style={styles.ghostText}>Voir le site au calendrier</Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.fact}>
      <Text style={styles.factLabel}>{label}</Text>
      <Text style={styles.factValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: CAL.blanc },
  topBar: { height: 56, backgroundColor: CAL.nuit, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, gap: 16 },
  title: { fontFamily: CAL.fontBold, fontSize: 20, color: CAL.blanc },
  summary: { fontFamily: CAL.font, fontSize: 14, color: 'rgba(255,255,255,0.7)' },
  search: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: CAL.nuitSoft, borderRadius: 6, paddingHorizontal: 10, height: 34, width: 260 },
  searchInput: { flex: 1, color: CAL.blanc, fontFamily: CAL.font, fontSize: 14, outlineStyle: 'none', height: 32 } as any,
  addBtn: { backgroundColor: CAL.or, borderRadius: 5, paddingVertical: 8, paddingHorizontal: 14 },
  addText: { fontFamily: CAL.fontBold, fontSize: 14, color: CAL.nuit },
  filters: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6, paddingHorizontal: 20, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: CAL.brume },
  sep: { width: 1, height: 18, backgroundColor: CAL.brume, marginHorizontal: 4 },
  chip: { paddingVertical: 4, paddingHorizontal: 10, borderRadius: 14, borderWidth: 1, borderColor: CAL.brume },
  chipOn: { backgroundColor: CAL.nuit, borderColor: CAL.nuit },
  chipHover: { backgroundColor: CAL.brumeClair },
  chipText: { fontFamily: CAL.font, fontSize: 13, color: CAL.texte },
  chipTextOn: { color: CAL.blanc, fontFamily: CAL.fontBold },
  sortLabel: { fontFamily: CAL.font, fontSize: 13, color: CAL.texteDoux },
  sortItem: { paddingVertical: 4, paddingHorizontal: 6, borderRadius: 4 },
  sortText: { fontFamily: CAL.font, fontSize: 13, color: CAL.texteDoux },
  sortTextOn: { fontFamily: CAL.fontBold, color: CAL.texte, textDecorationLine: 'underline', textDecorationColor: CAL.or },
  main: { flex: 1, flexDirection: 'row', minHeight: 0 },
  headRow: { flexDirection: 'row', paddingHorizontal: 20, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: CAL.brume, backgroundColor: CAL.blanc },
  headCell: { fontFamily: CAL.fontBold, fontSize: 12, color: CAL.texteDoux },
  sectionRow: { flexDirection: 'row', alignItems: 'baseline', gap: 8, paddingHorizontal: 20, paddingTop: 16, paddingBottom: 6 },
  sectionText: { fontFamily: CAL.fontBold, fontSize: 13, color: CAL.texte },
  sectionCount: { fontFamily: CAL.font, fontSize: 12, color: CAL.texteDoux },
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, minHeight: 58, borderBottomWidth: 1, borderBottomColor: CAL.brumeClair, cursor: 'pointer' as any },
  rowHover: { backgroundColor: CAL.brumeClair },
  rowSelected: { backgroundColor: CAL.orClair },
  cell: { paddingVertical: 10, paddingRight: 12 },
  tab: { width: 4, height: 34, borderRadius: 2 },
  tabTall: { width: 5, alignSelf: 'stretch', borderRadius: 2 },
  name: { fontFamily: CAL.fontBold, fontSize: 15, color: CAL.texte },
  meta: { fontFamily: CAL.font, fontSize: 12, color: CAL.texteDoux, marginTop: 2 },
  metaNote: { color: '#9A6A00' },
  dot: { width: 8, height: 8, borderRadius: 4 },
  value: { fontFamily: CAL.font, fontSize: 14, color: CAL.texte, flexShrink: 1 },
  muted: { fontFamily: CAL.font, fontSize: 13, color: CAL.texteDoux },
  inline: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  meter: { flex: 1, height: 6, borderRadius: 3, backgroundColor: CAL.brumeClair, overflow: 'hidden' },
  meterFill: { height: '100%', borderRadius: 3 },
  percent: { fontFamily: CAL.fontBold, fontSize: 13, color: CAL.texte, width: 40, textAlign: 'right', fontVariant: ['tabular-nums'] },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8, padding: 24 },
  centerTitle: { fontFamily: CAL.fontBold, fontSize: 16, color: CAL.texte },
  centerText: { fontFamily: CAL.font, fontSize: 14, color: CAL.texteDoux },
  panel: { width: PANEL_WIDTH, borderLeftWidth: 1, borderLeftColor: CAL.brume, backgroundColor: CAL.blanc },
  panelBody: { padding: 20, gap: 4 },
  panelTitle: { fontFamily: CAL.fontBold, fontSize: 22, color: CAL.texte },
  panelSub: { fontFamily: CAL.font, fontSize: 14, color: CAL.texteDoux, marginTop: 2 },
  stateBox: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 16, paddingVertical: 10, borderTopWidth: 1, borderBottomWidth: 1, borderColor: CAL.brume },
  stateText: { fontFamily: CAL.fontBold, fontSize: 15, color: CAL.texte },
  note: { marginTop: 12, backgroundColor: '#FFF7E0', borderLeftWidth: 3, borderLeftColor: CAL.or, paddingVertical: 8, paddingHorizontal: 10, borderRadius: 3 },
  noteText: { fontFamily: CAL.font, fontSize: 14, color: CAL.texte },
  facts: { marginTop: 14, gap: 8 },
  fact: { flexDirection: 'row', gap: 12 },
  factLabel: { fontFamily: CAL.font, fontSize: 13, color: CAL.texteDoux, width: 100 },
  factValue: { fontFamily: CAL.font, fontSize: 14, color: CAL.texte, flex: 1 },
  blockNow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12, backgroundColor: '#F3F0EA', borderRadius: 5, paddingVertical: 8, paddingHorizontal: 10 },
  blockNowText: { fontFamily: CAL.fontBold, fontSize: 13, color: '#6E6457', flex: 1 },
  panelSection: { fontFamily: CAL.fontBold, fontSize: 14, color: CAL.texte, marginTop: 20, marginBottom: 8 },
  resaLine: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 7, paddingHorizontal: 6, marginHorizontal: -6, borderRadius: 4 },
  actions: { marginTop: 24, gap: 8 },
  primaryBtn: { backgroundColor: CAL.nuit, borderRadius: 5, paddingVertical: 10, paddingHorizontal: 16, alignItems: 'center' },
  primaryText: { fontFamily: CAL.fontBold, fontSize: 14, color: CAL.blanc },
  ghostBtn: { borderWidth: 1, borderColor: CAL.brume, borderRadius: 5, paddingVertical: 10, paddingHorizontal: 16, alignItems: 'center' },
  ghostText: { fontFamily: CAL.fontBold, fontSize: 14, color: CAL.texte },
});
