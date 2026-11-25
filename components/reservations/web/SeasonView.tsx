import { useMemo, useState } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet, Image } from 'react-native';
import { addDays, differenceInDays, format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import { FONTS } from '@/constants/typography';
import { getSeason } from '@/constants/season';
import { computeOccupancy } from '@/constants/blocks';
import { channelOf, CHANNELS, CHANNEL_LABELS } from '@/constants/channels';
import { ChannelBadge } from '@/components/ui/ChannelBadge';
import { initials } from '@/components/properties/web/shared';
import { Property, Reservation } from '@/types';
import { isBlockRow, isCancelled, toISO } from './model';
import { STUB } from './StubsView';

const ROW_H = 58;
const LEFT_W = 210;
const STATS_W = 260;
const MONTHS = [3, 4, 5, 6, 7, 8, 9, 10, 11];

interface Props {
  rows: Reservation[];
  all: Reservation[];
  properties: Property[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onOpen: (r: Reservation) => void;
}

const dbl = (fn: () => void) => ({ onDoubleClick: fn }) as any;

/** Réservations passées : une saison entière par bloc, une ligne par logement, pour comparer. */
export function SeasonView({ rows, all, properties, selectedId, onSelect, onOpen }: Props) {
  const years = useMemo(() => {
    const set = new Set(rows.map((r) => Number(r.check_in.slice(0, 4))));
    return Array.from(set).sort((a, b) => b - a);
  }, [rows]);

  return (
    <ScrollView style={{ flex: 1, backgroundColor: STUB.kraft }} contentContainerStyle={s.wrap}>
      {years.map((y) => (
        <SeasonBlock key={y} year={y} rows={rows} all={all} properties={properties} selectedId={selectedId} onSelect={onSelect} onOpen={onOpen} />
      ))}
    </ScrollView>
  );
}

function SeasonBlock({ year, rows, all, properties, selectedId, onSelect, onOpen }: Props & { year: number }) {
  const season = getSeason(year);
  const start = parseISO(season.start);
  const endEx = addDays(parseISO(season.end), 1);
  const endExISO = toISO(endEx);
  const span = differenceInDays(endEx, start);
  const [width, setWidth] = useState(0);

  const pos = (iso: string) => Math.min(1, Math.max(0, differenceInDays(parseISO(iso), start) / span));

  const lines = useMemo(() => {
    const stays = rows.filter((r) => Number(r.check_in.slice(0, 4)) === year);
    const blocks = all.filter((r) => isBlockRow(r) && !isCancelled(r) && r.check_in < endExISO && r.check_out > season.start);
    const ids = new Set(stays.map((r) => r.property_id));
    const list = properties
      .filter((p) => p.is_active || ids.has(p.id))
      .sort((a, b) => (a.group_name ?? '').localeCompare(b.group_name ?? '', 'fr') || a.name.localeCompare(b.name, 'fr', { numeric: true }));
    return list.map((p) => {
      const mine = stays.filter((r) => r.property_id === p.id).sort((a, b) => a.check_in.localeCompare(b.check_in));
      const myBlocks = blocks.filter((r) => r.property_id === p.id);
      const occ = computeOccupancy([...mine, ...myBlocks], season.start, season.end);
      const byChannel = CHANNELS.map((c) => ({ c, n: mine.filter((r) => channelOf(r) === c).length })).filter((x) => x.n > 0);
      return { p, stays: mine, blocks: myBlocks, occ, byChannel };
    });
  }, [rows, all, properties, year, season.start, season.end, endExISO]);

  const totalStays = lines.reduce((n, l) => n + l.stays.length, 0);
  const totalNights = lines.reduce((n, l) => n + l.occ.bookedNights, 0);
  const available = lines.reduce((n, l) => n + l.occ.availableNights, 0);
  const avg = available ? totalNights / available : 0;
  const best = Math.max(0, ...lines.map((l) => l.occ.rate));

  return (
    <View style={s.block}>
      <View style={s.head}>
        <Text style={s.title}>Saison {year}</Text>
        <Text style={s.headMeta}>
          {format(start, 'd MMMM', { locale: fr })} → {format(parseISO(season.end), 'd MMMM', { locale: fr })} · {totalStays} séjour{totalStays > 1 ? 's' : ''} · {totalNights} nuits louées · remplissage moyen {Math.round(avg * 100)} %
        </Text>
      </View>

      <View style={s.ruler}>
        <View style={{ width: LEFT_W }} />
        <View style={{ flex: 1, height: 22 }} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
          {MONTHS.map((m) => {
            const iso = `${year}-${String(m).padStart(2, '0')}-01`;
            const x = m === 3 ? 0 : pos(iso);
            return (
              <View key={m} style={[s.tick, { left: `${x * 100}%` as any }]}>
                <Text style={s.tickText}>{format(parseISO(iso), 'MMM', { locale: fr }).replace('.', '')}</Text>
              </View>
            );
          })}
        </View>
        <View style={[s.statsHead, { width: STATS_W }]}>
          <Text style={[s.statsHeadText, { width: 70 }]}>Séjours</Text>
          <Text style={[s.statsHeadText, { width: 56 }]}>Nuits</Text>
          <Text style={[s.statsHeadText, { flex: 1 }]}>Remplissage</Text>
        </View>
      </View>

      {lines.map(({ p, stays, blocks, occ, byChannel }) => (
        <View key={p.id} style={s.line}>
          <View style={[s.left, { width: LEFT_W }]}>
            <View style={s.timbre}>
              {p.photo_url ? <Image source={{ uri: p.photo_url }} style={s.timbreImg} /> : (
                <View style={[s.timbreImg, { backgroundColor: `${p.color}55`, alignItems: 'center', justifyContent: 'center' }]}>
                  <Text style={s.timbreInit}>{initials(p.name)}</Text>
                </View>
              )}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.name} numberOfLines={1}>{p.name}</Text>
              <Text style={s.site} numberOfLines={1}>{p.group_name ?? ''}</Text>
            </View>
          </View>

          <View style={s.track}>
            {MONTHS.slice(1).map((m) => (
              <View key={m} style={[s.grid, { left: `${pos(`${year}-${String(m).padStart(2, '0')}-01`) * 100}%` as any }]} />
            ))}
            {blocks.map((r) => {
              const l = pos(r.check_in);
              const w = pos(r.check_out) - l;
              if (w <= 0) return null;
              return <View key={r.id} style={[s.blockSeg, { left: `${l * 100}%` as any, width: `${w * 100}%` as any }]} />;
            })}
            {stays.map((r) => {
              const l = pos(r.check_in);
              const w = Math.max(pos(r.check_out) - l, 0.004);
              const px = w * width;
              const sel = r.id === selectedId;
              return (
                <Pressable
                  key={r.id}
                  onPress={() => onSelect(r.id)}
                  {...dbl(() => onOpen(r))}
                  accessibilityLabel={`${r.guest_name}, du ${r.check_in} au ${r.check_out}`}
                  style={({ hovered }: any) => [
                    s.seg,
                    { left: `${l * 100}%` as any, width: `${w * 100}%` as any, backgroundColor: hovered || sel ? `${p.color}` : `${p.color}B0`, borderColor: p.color },
                    sel && s.segSel,
                  ]}
                >
                  {px > 46 ? <Text style={s.segText} numberOfLines={1}>{r.guest_name}</Text> : null}
                </Pressable>
              );
            })}
          </View>

          <View style={[s.stats, { width: STATS_W }]}>
            <Text style={[s.num, { width: 70 }]}>{stays.length}</Text>
            <Text style={[s.num, { width: 56 }]}>{occ.bookedNights}</Text>
            <View style={{ flex: 1 }}>
              <View style={s.inline}>
                <View style={s.meter}>
                  <View style={[s.meterFill, { width: `${Math.round(occ.rate * 100)}%` as any, backgroundColor: occ.rate === best && best > 0 ? STUB.carbone : '#8C9BB5' }]} />
                </View>
                <Text style={s.pct}>{Math.round(occ.rate * 100)} %</Text>
              </View>
              <View style={[s.inline, { marginTop: 4, gap: 8 }]}>
                {byChannel.map(({ c, n }) => (
                  <View key={c} style={s.inline} accessibilityLabel={`${n} ${CHANNEL_LABELS[c]}`}>
                    <ChannelBadge channel={c} size={12} />
                    <Text style={s.small}>{n}</Text>
                  </View>
                ))}
                {occ.blockedNights > 0 ? <Text style={s.small}>· {occ.blockedNights} n. bloquées</Text> : null}
              </View>
            </View>
          </View>
        </View>
      ))}
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { padding: 24, gap: 28, paddingBottom: 48 },
  block: { backgroundColor: STUB.papier, borderRadius: 8, borderWidth: 1, borderColor: STUB.trait, paddingVertical: 16, paddingHorizontal: 18 },
  head: { flexDirection: 'row', alignItems: 'baseline', gap: 14, flexWrap: 'wrap', marginBottom: 12 },
  title: { fontFamily: FONTS.stubSerif, fontSize: 32, color: STUB.nuit },
  headMeta: { fontFamily: FONTS.readable, fontSize: 13, color: STUB.carbone },
  ruler: { flexDirection: 'row', alignItems: 'flex-end', borderBottomWidth: 1, borderBottomColor: STUB.trait, paddingBottom: 4 },
  tick: { position: 'absolute', bottom: 0, paddingLeft: 3, borderLeftWidth: 1, borderLeftColor: STUB.trait, height: 18, justifyContent: 'flex-end' },
  tickText: { fontFamily: FONTS.readableBold, fontSize: 11, color: STUB.carbone, textTransform: 'uppercase', letterSpacing: 0.6 },
  statsHead: { flexDirection: 'row', paddingLeft: 16 },
  statsHeadText: { fontFamily: FONTS.readableBold, fontSize: 11, color: STUB.carbone, textTransform: 'uppercase', letterSpacing: 0.6 },
  line: { flexDirection: 'row', alignItems: 'center', height: ROW_H, borderBottomWidth: 1, borderBottomColor: '#EEE7DA' },
  left: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingRight: 10 },
  timbre: { padding: 2, backgroundColor: '#FFFFFF', borderWidth: 1, borderStyle: 'dashed', borderColor: STUB.trait },
  timbreImg: { width: 38, height: 38 },
  timbreInit: { fontFamily: FONTS.readableBold, fontSize: 12, color: STUB.nuit },
  name: { fontFamily: FONTS.readableBold, fontSize: 14, color: STUB.nuit },
  site: { fontFamily: FONTS.readable, fontSize: 12, color: STUB.carbone },
  track: { flex: 1, height: 26, position: 'relative', backgroundColor: '#F7F2E8', borderRadius: 3 },
  grid: { position: 'absolute', top: 0, bottom: 0, width: 1, backgroundColor: '#E9E0CF' },
  blockSeg: { position: 'absolute', top: 0, bottom: 0, backgroundImage: 'repeating-linear-gradient(135deg, rgba(110,100,87,0.22) 0 3px, transparent 3px 7px)' } as any,
  seg: { position: 'absolute', top: 2, bottom: 2, borderRadius: 3, borderWidth: 1, justifyContent: 'center', paddingHorizontal: 4, overflow: 'hidden', cursor: 'pointer' as any },
  segSel: { outlineWidth: 2, outlineStyle: 'solid', outlineColor: STUB.or, outlineOffset: 1, zIndex: 2 } as any,
  segText: { fontFamily: FONTS.readableBold, fontSize: 11, color: STUB.nuit },
  stats: { flexDirection: 'row', alignItems: 'center', paddingLeft: 16 },
  num: { fontFamily: FONTS.readableBold, fontSize: 15, color: STUB.nuit },
  inline: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  meter: { flex: 1, height: 6, borderRadius: 3, backgroundColor: '#ECE4D4', overflow: 'hidden' },
  meterFill: { height: '100%', borderRadius: 3 },
  pct: { fontFamily: FONTS.readableBold, fontSize: 13, color: STUB.nuit, width: 42, textAlign: 'right' },
  small: { fontFamily: FONTS.readable, fontSize: 11, color: STUB.carbone },
});
