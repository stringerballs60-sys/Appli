import { useEffect, useMemo, useState } from 'react';
import { View, Text, Pressable, ScrollView, TextInput, StyleSheet, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useReservations } from '@/hooks/useReservations';
import { useProperties } from '@/hooks/useProperties';
import { Property, Reservation, ReservationSource } from '@/types';
import { CHANNELS, CHANNEL_LABELS, channelOf, amountLabel } from '@/constants/channels';
import { ChannelBadge } from '@/components/ui/ChannelBadge';
import { blockReasonLabel } from '@/constants/blocks';
import { CAL, PANEL_WIDTH } from '@/components/calendar/web/tokens';
import { linenFor } from '@/components/calendar/web/dayModel';
import { formatPrice } from '@/utils/price';
import { TABS, TabKey, tabOf, sortForTab, todayISO, turnoverKeys, guestsDetail, isBlockRow, isCancelled, timeLabel } from './model';
import { StubsView } from './StubsView';
import { SeasonView } from './SeasonView';
import { RevenueFooter } from './RevenueFooter';

const longDay = (iso: string) => {
  const s = format(parseISO(iso), 'EEEE d MMMM yyyy', { locale: fr });
  return s.charAt(0).toUpperCase() + s.slice(1);
};

export function WebReservations() {
  const router = useRouter();
  const today = useMemo(() => todayISO(), []);
  const { data, isLoading, isError, refetch } = useReservations();
  const { data: properties } = useProperties();

  const [tab, setTab] = useState<TabKey>('upcoming');
  const [query, setQuery] = useState('');
  const [site, setSite] = useState<string | null>(null);
  const [channel, setChannel] = useState<ReservationSource | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const propertiesById = useMemo(() => new Map((properties ?? []).map((p) => [p.id, p])), [properties]);
  const sites = useMemo(
    () => Array.from(new Set((properties ?? []).filter((p) => p.is_active).map((p) => p.group_name?.trim() || 'Autres logements'))).sort((a, b) => a.localeCompare(b, 'fr')),
    [properties]
  );
  const all = data ?? [];
  const turnovers = useMemo(() => turnoverKeys(all), [all]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return all.filter((r) => {
      const p = propertiesById.get(r.property_id);
      if (site && (p?.group_name?.trim() || 'Autres logements') !== site) return false;
      if (channel && (isBlockRow(r) || channelOf(r) !== channel)) return false;
      if (q && ![r.guest_name, r.guest_phone, r.guest_email, r.notes, p?.name].some((v) => v?.toLowerCase().includes(q))) return false;
      return true;
    });
  }, [all, query, site, channel, propertiesById]);

  const counts = useMemo(() => {
    const c: Record<TabKey, number> = { upcoming: 0, current: 0, past: 0, blocks: 0, cancelled: 0 };
    filtered.forEach((r) => { c[tabOf(r, today)] += 1; });
    return c;
  }, [filtered, today]);

  const rows = useMemo(() => sortForTab(filtered.filter((r) => tabOf(r, today) === tab), tab), [filtered, tab, today]);

  useEffect(() => {
    if (rows.length === 0) { setSelectedId(null); return; }
    if (!selectedId || !rows.some((r) => r.id === selectedId)) setSelectedId(rows[0].id);
  }, [rows, selectedId]);

  const openResa = (r: Reservation) =>
    router.push(isBlockRow(r) ? { pathname: '/(app)/reservations/block', params: { id: r.id } } : `/(app)/reservations/${r.id}`);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && ['INPUT', 'TEXTAREA'].includes(target.tagName)) return;
      if (!['ArrowDown', 'ArrowUp', 'Enter'].includes(e.key)) return;
      const i = rows.findIndex((r) => r.id === selectedId);
      if (e.key === 'Enter' && i >= 0) { openResa(rows[i]); return; }
      e.preventDefault();
      const next = e.key === 'ArrowDown' ? Math.min(rows.length - 1, i + 1) : Math.max(0, i - 1);
      if (rows[next]) setSelectedId(rows[next].id);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const selected = rows.find((r) => r.id === selectedId) ?? null;
  const arrivalsToday = all.filter((r) => !isBlockRow(r) && !isCancelled(r) && r.check_in === today).length;
  const departuresToday = all.filter((r) => !isBlockRow(r) && !isCancelled(r) && r.check_out === today).length;

  const viewProps = {
    rows,
    tab,
    today,
    selectedId,
    propertiesById,
    turnovers,
    onSelect: setSelectedId,
    onOpen: openResa,
  };

  return (
    <View style={styles.root}>
      <View style={styles.topBar}>
        <Text style={styles.title}>Réservations</Text>
        <Text style={styles.summary}>
          {arrivalsToday} arrivée{arrivalsToday > 1 ? 's' : ''} · {departuresToday} départ{departuresToday > 1 ? 's' : ''} aujourd’hui · {counts.current} en séjour
        </Text>
        <View style={{ flex: 1 }} />
        <View style={styles.search}>
          <MaterialCommunityIcons name="magnify" size={18} color="rgba(255,255,255,0.6)" />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Voyageur, logement, téléphone…"
            placeholderTextColor="rgba(255,255,255,0.5)"
            style={styles.searchInput as any}
          />
        </View>
        <Pressable onPress={() => router.push('/(app)/reservations/block')} style={({ hovered }: any) => [styles.blockBtn, hovered && { backgroundColor: CAL.nuitSoft }]}>
          <MaterialCommunityIcons name="lock" size={14} color={CAL.blanc} />
          <Text style={styles.blockText}>Blocage</Text>
        </Pressable>
        <Pressable onPress={() => router.push('/(app)/reservations/new')} style={({ hovered }: any) => [styles.addBtn, hovered && { backgroundColor: '#D6B13F' }]}>
          <Text style={styles.addText}>+ Réservation</Text>
        </Pressable>
      </View>

      <View style={styles.tabsRow}>
        {TABS.map((t) => (
          <Pressable key={t.key} onPress={() => setTab(t.key)} style={({ hovered }: any) => [styles.tab, tab === t.key && styles.tabOn, hovered && tab !== t.key && { backgroundColor: CAL.brumeClair }]}>
            <Text style={[styles.tabText, tab === t.key && styles.tabTextOn]}>{t.label}</Text>
            <Text style={[styles.tabCount, tab === t.key && styles.tabCountOn]}>{counts[t.key]}</Text>
          </Pressable>
        ))}
        <View style={{ flex: 1 }} />
      </View>

      <View style={styles.filters}>
        <Chip label="Tous les sites" on={site === null} onPress={() => setSite(null)} />
        {sites.map((s) => <Chip key={s} label={s} on={site === s} onPress={() => setSite(site === s ? null : s)} />)}
        {tab !== 'blocks' && (
          <>
            <View style={styles.sep} />
            {CHANNELS.map((c) => (
              <Chip key={c} label={CHANNEL_LABELS[c]} on={channel === c} onPress={() => setChannel(channel === c ? null : c)} badge={c} />
            ))}
          </>
        )}
      </View>

      <View style={styles.main}>
        <View style={{ flex: 1 }}>
          {isLoading ? (
            <View style={styles.center}>
              <ActivityIndicator color={CAL.nuit} />
              <Text style={styles.centerText}>Chargement des réservations…</Text>
            </View>
          ) : isError ? (
            <View style={styles.center}>
              <Text style={styles.centerTitle}>Impossible de charger les réservations.</Text>
              <Text style={styles.centerText}>Vérifie ta connexion internet, puis réessaie.</Text>
              <Pressable onPress={() => refetch()} style={styles.primaryBtn}><Text style={styles.primaryText}>Réessayer</Text></Pressable>
            </View>
          ) : rows.length === 0 ? (
            <View style={styles.center}>
              <Text style={styles.centerTitle}>{EMPTY[tab]}</Text>
              <Text style={styles.centerText}>{query || site || channel ? 'Change la recherche ou retire un filtre.' : tab === 'blocks' ? 'Utilise « Blocage » pour fermer des dates.' : ' '}</Text>
            </View>
          ) : tab === 'past' ? (
            <SeasonView
              rows={rows}
              all={filtered}
              properties={(properties ?? []).filter((p) => !site || (p.group_name?.trim() || 'Autres logements') === site)}
              selectedId={selectedId}
              onSelect={setSelectedId}
              onOpen={openResa}
            />
          ) : <StubsView {...viewProps} />}
        </View>
        {selected && <DetailPanel resa={selected} property={propertiesById.get(selected.property_id)} onOpen={() => openResa(selected)} router={router} />}
      </View>

      {!isLoading && !isError ? <RevenueFooter reservations={filtered} filtered={!!(query.trim() || site || channel)} /> : null}
    </View>
  );
}

const EMPTY: Record<TabKey, string> = {
  upcoming: 'Aucune réservation à venir.',
  current: 'Personne en séjour en ce moment.',
  past: 'Aucune réservation passée.',
  blocks: 'Aucune date bloquée.',
  cancelled: 'Aucune réservation annulée.',
};

function Chip({ label, on, onPress, badge }: { label: string; on: boolean; onPress: () => void; badge?: ReservationSource }) {
  return (
    <Pressable onPress={onPress} style={({ hovered }: any) => [styles.chip, on && styles.chipOn, hovered && !on && { backgroundColor: CAL.brumeClair }]}>
      {badge ? <ChannelBadge channel={badge} size={14} /> : null}
      <Text style={[styles.chipText, on && styles.chipTextOn]}>{label}</Text>
    </Pressable>
  );
}

const LINEN_LABELS: [keyof ReturnType<typeof linenFor>, string][] = [
  ['double_sheets', 'Draps doubles'],
  ['single_sheets', 'Draps simples'],
  ['baby_sheets', 'Draps bébé'],
  ['bath_towels', 'Serviettes'],
  ['hand_towels', 'Serviettes mains'],
  ['bath_mats', 'Tapis de bain'],
  ['kitchen_towels', 'Torchons'],
];

function DetailPanel({ resa, property, onOpen, router }: { resa: Reservation; property?: Property; onOpen: () => void; router: ReturnType<typeof useRouter> }) {
  const block = isBlockRow(resa);
  const time = timeLabel(resa.check_in_time);
  const linen = block ? null : linenFor(resa, property);
  return (
    <View style={styles.panel}>
      <ScrollView contentContainerStyle={styles.panelBody}>
        <View style={styles.panelHead}>
          <View style={[styles.panelTab, { backgroundColor: block ? '#9C907E' : property?.color ?? CAL.brume }]} />
          <View style={{ flex: 1 }}>
            <Text style={styles.panelTitle}>{block ? 'Dates bloquées' : resa.guest_name}</Text>
            <Text style={styles.panelSub}>{property?.name ?? 'Logement'}{property?.group_name ? ` · ${property.group_name}` : ''}</Text>
          </View>
        </View>

        <View style={styles.stay}>
          <View style={{ flex: 1 }}>
            <Text style={styles.stayLabel}>{block ? 'Du' : 'Arrivée'}</Text>
            <Text style={styles.stayValue}>{longDay(resa.check_in)}</Text>
            {!block && <Text style={styles.stayHint}>{time ? `${time}${resa.check_in_time_confirmed ? '' : ' · à confirmer'}` : 'Heure à confirmer'}</Text>}
          </View>
          <View style={styles.nights}>
            <Text style={styles.nightsNum}>{resa.nb_nights}</Text>
            <Text style={styles.nightsLabel}>nuit{resa.nb_nights > 1 ? 's' : ''}</Text>
          </View>
        </View>
        <View style={[styles.stay, { borderTopWidth: 0, paddingTop: 0 }]}>
          <View style={{ flex: 1 }}>
            <Text style={styles.stayLabel}>{block ? 'Au' : 'Départ'}</Text>
            <Text style={styles.stayValue}>{longDay(resa.check_out)}</Text>
          </View>
        </View>

        <View style={styles.facts}>
          {block ? (
            <>
              <Fact label="Motif" value={blockReasonLabel(resa.block_reason)} />
              <Fact label="Remplissage" value="Ces nuits sont retirées du calcul du taux." />
            </>
          ) : (
            <>
              <Fact label="Voyageurs" value={guestsDetail(resa) || '—'} />
              <View style={styles.fact}>
                <Text style={styles.factLabel}>Provenance</Text>
                <ChannelBadge channel={channelOf(resa)} size={18} withLabel labelColor={CAL.texte} />
              </View>
              <Fact label={amountLabel(channelOf(resa))} value={resa.price != null ? formatPrice(resa.price) : 'Non renseignée'} />
              <Fact label="Statut" value={resa.status === 'cancelled' ? 'Annulée' : resa.status === 'pending' ? 'En attente' : resa.status === 'completed' ? 'Terminée' : 'Confirmée'} />
              {resa.guest_phone ? <Fact label="Téléphone" value={resa.guest_phone} /> : null}
              {resa.guest_email ? <Fact label="E-mail" value={resa.guest_email} /> : null}
            </>
          )}
          {resa.notes ? <Fact label="Notes" value={resa.notes} /> : null}
        </View>

        {linen && !isCancelled(resa) ? (
          <>
            <Text style={styles.panelSection}>Linge pour ce séjour</Text>
            <View style={styles.linen}>
              {LINEN_LABELS.filter(([k]) => (linen[k] ?? 0) > 0).map(([k, label]) => (
                <View key={k} style={styles.linenItem}>
                  <Text style={styles.linenNum}>{linen[k]}</Text>
                  <Text style={styles.linenLabel}>{label}</Text>
                </View>
              ))}
            </View>
          </>
        ) : null}

        <View style={styles.actions}>
          <Pressable onPress={onOpen} style={({ hovered }: any) => [styles.primaryBtn, hovered && { backgroundColor: CAL.nuitSoft }]}>
            <Text style={styles.primaryText}>{block ? 'Modifier ou supprimer' : 'Ouvrir la fiche'}</Text>
          </Pressable>
          {!block && (
            <Pressable onPress={() => router.push(`/(app)/reservations/edit/${resa.id}`)} style={({ hovered }: any) => [styles.ghostBtn, hovered && { backgroundColor: CAL.brumeClair }]}>
              <Text style={styles.ghostText}>Modifier</Text>
            </Pressable>
          )}
          {property ? (
            <Pressable
              onPress={() => router.push({ pathname: '/(app)/(tabs)/calendar', params: { site: property.group_name?.trim() || 'Autres logements' } })}
              style={({ hovered }: any) => [styles.ghostBtn, hovered && { backgroundColor: CAL.brumeClair }]}
            >
              <Text style={styles.ghostText}>Voir au calendrier</Text>
            </Pressable>
          ) : null}
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
  topBar: { height: 56, backgroundColor: CAL.nuit, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, gap: 14 },
  title: { fontFamily: CAL.fontBold, fontSize: 20, color: CAL.blanc },
  summary: { fontFamily: CAL.font, fontSize: 14, color: 'rgba(255,255,255,0.7)' },
  search: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: CAL.nuitSoft, borderRadius: 6, paddingHorizontal: 10, height: 34, width: 260 },
  searchInput: { flex: 1, color: CAL.blanc, fontFamily: CAL.font, fontSize: 14, outlineStyle: 'none', height: 32 } as any,
  blockBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)', borderRadius: 5, paddingVertical: 7, paddingHorizontal: 12 },
  blockText: { fontFamily: CAL.fontBold, fontSize: 14, color: CAL.blanc },
  addBtn: { backgroundColor: CAL.or, borderRadius: 5, paddingVertical: 8, paddingHorizontal: 14 },
  addText: { fontFamily: CAL.fontBold, fontSize: 14, color: CAL.nuit },
  tabsRow: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 16, paddingTop: 8, borderBottomWidth: 1, borderBottomColor: CAL.brume },
  tab: { flexDirection: 'row', alignItems: 'center', gap: 7, paddingVertical: 9, paddingHorizontal: 12, borderBottomWidth: 3, borderBottomColor: 'transparent', marginBottom: -1 },
  tabOn: { borderBottomColor: CAL.or },
  tabText: { fontFamily: CAL.font, fontSize: 14, color: CAL.texteDoux },
  tabTextOn: { fontFamily: CAL.fontBold, color: CAL.texte },
  tabCount: { fontFamily: CAL.fontBold, fontSize: 11, color: CAL.texteDoux, backgroundColor: CAL.brumeClair, borderRadius: 9, paddingHorizontal: 6, paddingVertical: 1, overflow: 'hidden' },
  tabCountOn: { backgroundColor: CAL.nuit, color: CAL.blanc },
  filters: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6, paddingHorizontal: 20, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: CAL.brume },
  sep: { width: 1, height: 18, backgroundColor: CAL.brume, marginHorizontal: 4 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 4, paddingHorizontal: 10, borderRadius: 14, borderWidth: 1, borderColor: CAL.brume },
  chipOn: { backgroundColor: CAL.nuit, borderColor: CAL.nuit },
  chipText: { fontFamily: CAL.font, fontSize: 13, color: CAL.texte },
  chipTextOn: { color: CAL.blanc, fontFamily: CAL.fontBold },
  main: { flex: 1, flexDirection: 'row', minHeight: 0 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8, padding: 24 },
  centerTitle: { fontFamily: CAL.fontBold, fontSize: 16, color: CAL.texte },
  centerText: { fontFamily: CAL.font, fontSize: 14, color: CAL.texteDoux },
  panel: { width: PANEL_WIDTH, borderLeftWidth: 1, borderLeftColor: CAL.brume, backgroundColor: CAL.blanc },
  panelBody: { padding: 20, gap: 4 },
  panelHead: { flexDirection: 'row', gap: 12, alignItems: 'stretch' },
  panelTab: { width: 5, borderRadius: 2 },
  panelTitle: { fontFamily: CAL.fontBold, fontSize: 22, color: CAL.texte },
  panelSub: { fontFamily: CAL.font, fontSize: 14, color: CAL.texteDoux, marginTop: 2 },
  stay: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 14, paddingTop: 12, borderTopWidth: 1, borderTopColor: CAL.brume },
  stayLabel: { fontFamily: CAL.font, fontSize: 12, color: CAL.texteDoux, textTransform: 'uppercase', letterSpacing: 0.6 },
  stayValue: { fontFamily: CAL.fontBold, fontSize: 15, color: CAL.texte, marginTop: 2 },
  stayHint: { fontFamily: CAL.font, fontSize: 13, color: CAL.texteDoux, marginTop: 1 },
  nights: { alignItems: 'center', backgroundColor: CAL.brumeClair, borderRadius: 6, paddingVertical: 6, paddingHorizontal: 12 },
  nightsNum: { fontFamily: CAL.fontBold, fontSize: 20, color: CAL.texte },
  nightsLabel: { fontFamily: CAL.font, fontSize: 12, color: CAL.texteDoux },
  facts: { marginTop: 16, gap: 8 },
  fact: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  factLabel: { fontFamily: CAL.font, fontSize: 13, color: CAL.texteDoux, width: 96 },
  factValue: { fontFamily: CAL.font, fontSize: 14, color: CAL.texte, flex: 1 },
  panelSection: { fontFamily: CAL.fontBold, fontSize: 14, color: CAL.texte, marginTop: 20, marginBottom: 8 },
  linen: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  linenItem: { flexDirection: 'row', alignItems: 'baseline', gap: 6, backgroundColor: CAL.brumeClair, borderRadius: 5, paddingVertical: 5, paddingHorizontal: 9 },
  linenNum: { fontFamily: CAL.fontBold, fontSize: 15, color: CAL.texte },
  linenLabel: { fontFamily: CAL.font, fontSize: 13, color: CAL.texteDoux },
  actions: { marginTop: 24, gap: 8 },
  primaryBtn: { backgroundColor: CAL.nuit, borderRadius: 5, paddingVertical: 10, paddingHorizontal: 16, alignItems: 'center' },
  primaryText: { fontFamily: CAL.fontBold, fontSize: 14, color: CAL.blanc },
  ghostBtn: { borderWidth: 1, borderColor: CAL.brume, borderRadius: 5, paddingVertical: 10, paddingHorizontal: 16, alignItems: 'center' },
  ghostText: { fontFamily: CAL.fontBold, fontSize: 14, color: CAL.texte },
});
