import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { channelOf } from '@/constants/channels';
import { ChannelBadge } from '@/components/ui/ChannelBadge';
import { CAL } from '@/components/calendar/web/tokens';
import { CLEANING, Row, Thumb, dayMonth, initials } from './shared';

export interface Section {
  title: string;
  rows: Row[];
}

export interface ViewProps {
  sections: Section[];
  selectedId: string | null;
  resaLoading: boolean;
  onSelect: (id: string) => void;
  onOpen: (id: string) => void;
}

const pct = (r: Row) => `${Math.round(r.occupancy * 100)} %`;
const dbl = (fn: () => void) => ({ onDoubleClick: fn }) as any;

function Meter({ value, color, track }: { value: number; color: string; track: string }) {
  return (
    <View style={{ height: 4, borderRadius: 2, backgroundColor: track, overflow: 'hidden', flex: 1 }}>
      <View style={{ height: '100%', width: `${Math.round(value * 100)}%`, backgroundColor: color, borderRadius: 2 }} />
    </View>
  );
}

const KEY = {
  fond: '#ECEFEA',
  planche: '#E2E7E1',
  sauge: '#7E9688',
  tuile: '#FFFFFF',
  trait: '#D3DAD3',
};

export function KeyBoardView({ sections, selectedId, resaLoading, onSelect, onOpen }: ViewProps) {
  return (
    <ScrollView style={{ flex: 1, backgroundColor: KEY.fond }} contentContainerStyle={k.wrap}>
      {sections.map((section) => (
        <View key={section.title} style={k.board}>
          <View style={k.boardHead}>
            <Text style={[k.boardTitle, { marginRight: 24 }]}>{section.title}</Text>
            <Text style={k.boardMeta}>
              {section.rows.filter((r) => !r.current).length} clé{section.rows.filter((r) => !r.current).length > 1 ? 's' : ''} au tableau sur {section.rows.length}
            </Text>
          </View>
          <View style={k.rail} />
          <View style={k.hooks}>
            {section.rows.map((row) => {
              const p = row.property;
              const c = CLEANING[p.cleaning_status] ?? CLEANING.to_do;
              const sel = p.id === selectedId;
              return (
                <Pressable
                  key={p.id}
                  onPress={() => onSelect(p.id)}
                  {...dbl(() => onOpen(p.id))}
                  style={({ hovered }: any) => [k.tile, hovered && k.tileHover, sel && k.tileSel, !p.is_active && { opacity: 0.5 }]}
                >
                  <View style={k.hookZone}>
                    <View style={k.hook} />
                    {row.current ? (
                      <View style={k.away}>
                        <Text style={k.awayText} numberOfLines={1}>Clé chez {row.current.guest_name}</Text>
                        <Text style={k.awaySub}>rendue le {dayMonth(row.current.check_out)}</Text>
                      </View>
                    ) : (
                      <View style={k.keyWrap}>
                        <View style={k.string} />
                        <View style={[k.tag, { backgroundColor: p.color }]}>
                          <View style={k.tagHole} />
                          <Text style={k.tagText}>{initials(p.name)}</Text>
                        </View>
                      </View>
                    )}
                  </View>
                  <Text style={k.name} numberOfLines={1}>{p.name}</Text>
                  <View style={k.line}>
                    <View style={[k.dot, { backgroundColor: c.color }]} />
                    <Text style={[k.small, c.strong && { color: CAL.changement, fontFamily: CAL.fontBold }]}>{c.label}</Text>
                  </View>
                  <View style={k.line}>
                    {row.next ? <ChannelBadge channel={channelOf(row.next)} size={14} /> : null}
                    <Text style={k.small} numberOfLines={1}>{resaLoading ? '…' : row.next ? `Arrivée ${dayMonth(row.next.check_in)}` : 'Aucune arrivée prévue'}</Text>
                  </View>
                  <View style={[k.line, { marginTop: 8 }]}>
                    <Meter value={row.occupancy} color={KEY.sauge} track={KEY.planche} />
                    <Text style={k.pct}>{pct(row)}</Text>
                  </View>
                </Pressable>
              );
            })}
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

const k = StyleSheet.create({
  wrap: { padding: 24, gap: 20, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-start' },
  board: { backgroundColor: KEY.planche, borderRadius: 14, padding: 18, paddingTop: 14 },
  boardHead: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 10 },
  boardTitle: { fontFamily: CAL.fontBold, fontSize: 17, color: CAL.texte },
  boardMeta: { fontFamily: CAL.font, fontSize: 13, color: '#5C6B61' },
  rail: { height: 3, borderRadius: 2, backgroundColor: KEY.trait, marginBottom: -2, marginHorizontal: 4 },
  hooks: { flexDirection: 'row', flexWrap: 'wrap', gap: 14 },
  tile: { width: 188, height: 188, backgroundColor: KEY.tuile, borderRadius: 10, padding: 12, paddingTop: 0, cursor: 'pointer' as any, borderWidth: 1, borderColor: 'transparent' },
  tileHover: { borderColor: KEY.trait },
  tileSel: { borderColor: CAL.or, borderWidth: 2 },
  hookZone: { height: 78, alignItems: 'center' },
  hook: { width: 12, height: 12, borderRadius: 6, borderWidth: 2, borderColor: KEY.sauge, backgroundColor: KEY.fond, marginTop: 8 },
  keyWrap: { alignItems: 'center' },
  string: { width: 1.5, height: 10, backgroundColor: KEY.sauge },
  tag: { width: 46, height: 40, borderRadius: 8, alignItems: 'center', justifyContent: 'flex-end', paddingBottom: 5 },
  tagHole: { position: 'absolute', top: 5, width: 7, height: 7, borderRadius: 4, backgroundColor: KEY.tuile },
  tagText: { fontFamily: CAL.fontBold, fontSize: 13, color: CAL.texte },
  away: { alignItems: 'center', marginTop: 10, paddingHorizontal: 4 },
  awayText: { fontFamily: CAL.fontBold, fontSize: 12, color: '#5C6B61' },
  awaySub: { fontFamily: CAL.font, fontSize: 11, color: '#7A877E', marginTop: 1 },
  name: { fontFamily: CAL.fontBold, fontSize: 15, color: CAL.texte, marginBottom: 4 },
  line: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 3 },
  dot: { width: 7, height: 7, borderRadius: 4 },
  small: { fontFamily: CAL.font, fontSize: 12, color: CAL.texteDoux, flexShrink: 1 },
  pct: { fontFamily: CAL.fontBold, fontSize: 12, color: CAL.texte, width: 36, textAlign: 'right' },
});

const BR = { fond: '#F6F7F5', encre: '#1E2A38' };

export function BristolView({ sections, selectedId, resaLoading, onSelect, onOpen }: ViewProps) {
  return (
    <ScrollView style={{ flex: 1, backgroundColor: BR.fond }} contentContainerStyle={b.wrap}>
      {sections.map((section) => (
        <View key={section.title}>
          <View style={b.head}>
            <Text style={b.title}>{section.title}</Text>
            <View style={b.headRule} />
          </View>
          <View style={b.grid}>
            {section.rows.map((row) => {
              const p = row.property;
              const c = CLEANING[p.cleaning_status] ?? CLEANING.to_do;
              const sel = p.id === selectedId;
              return (
                <Pressable
                  key={p.id}
                  onPress={() => onSelect(p.id)}
                  {...dbl(() => onOpen(p.id))}
                  style={({ hovered }: any) => [b.card, { backgroundColor: `${p.color}1F` }, hovered && b.cardHover, sel && b.cardSel, !p.is_active && { opacity: 0.5 }]}
                >
                  {c.strong && <View style={b.fold} />}
                  <View style={b.top}>
                    <Thumb property={p} size={52} />
                    <View style={{ flex: 1 }}>
                      <Text style={b.name} numberOfLines={2}>{p.name}</Text>
                      <Text style={b.meta}>{p.max_guests} pers.</Text>
                    </View>
                  </View>
                  <View style={b.rule} />
                  <Text style={[b.status, c.strong && { color: CAL.changement }]}>{c.label}</Text>
                  <Text style={b.line} numberOfLines={1}>
                    {resaLoading ? '…' : row.current ? `${row.current.guest_name} jusqu'au ${dayMonth(row.current.check_out)}` : 'Libre ce soir'}
                  </Text>
                  <View style={b.nextRow}>
                    {row.next ? <ChannelBadge channel={channelOf(row.next)} size={14} /> : null}
                    <Text style={b.line} numberOfLines={1}>{row.next ? `Prochaine : ${dayMonth(row.next.check_in)}` : 'Pas d’arrivée prévue'}</Text>
                  </View>
                  <View style={{ flex: 1 }} />
                  <View style={b.nextRow}>
                    <Meter value={row.occupancy} color={p.color} track="rgba(30,42,56,0.08)" />
                    <Text style={b.pct}>{pct(row)}</Text>
                  </View>
                </Pressable>
              );
            })}
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

const b = StyleSheet.create({
  wrap: { padding: 28, gap: 26 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  title: { fontFamily: CAL.fontBold, fontSize: 16, color: BR.encre },
  headRule: { flex: 1, height: 1, backgroundColor: 'rgba(30,42,56,0.12)' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
  card: { width: 200, height: 200, borderRadius: 4, padding: 14, cursor: 'pointer' as any, borderWidth: 1, borderColor: 'rgba(30,42,56,0.06)', overflow: 'hidden' },
  cardHover: { borderColor: 'rgba(30,42,56,0.22)' },
  cardSel: { borderColor: CAL.or, borderWidth: 2 },
  fold: { position: 'absolute', top: 0, right: 0, width: 0, height: 0, borderTopWidth: 26, borderLeftWidth: 26, borderTopColor: BR.fond, borderLeftColor: CAL.changement },
  top: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  name: { fontFamily: CAL.fontBold, fontSize: 15, color: BR.encre },
  meta: { fontFamily: CAL.font, fontSize: 12, color: CAL.texteDoux, marginTop: 2 },
  rule: { height: 1, backgroundColor: 'rgba(30,42,56,0.1)', marginVertical: 10 },
  status: { fontFamily: CAL.fontBold, fontSize: 13, color: BR.encre, marginBottom: 3 },
  line: { fontFamily: CAL.font, fontSize: 12, color: CAL.texteDoux, flexShrink: 1 },
  nextRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 3 },
  pct: { fontFamily: CAL.fontBold, fontSize: 12, color: BR.encre, width: 36, textAlign: 'right' },
});

const PL = { fond: '#EEF0EE', olive: '#8A9A84', mur: '#FFFFFF', bord: '#D5DBD3' };

export function VillageMapView({ sections, selectedId, onSelect, onOpen }: ViewProps) {
  return (
    <ScrollView style={{ flex: 1, backgroundColor: PL.fond }} contentContainerStyle={m.wrap}>
      <View style={m.legend}>
        <LegendHouse filled label="occupé ce soir" />
        <LegendHouse label="libre" />
        <View style={m.legendItem}>
          <View style={[m.flag, { position: 'relative', top: 0, right: 0 }]} />
          <Text style={m.legendText}>ménage à faire</Text>
        </View>
        <Text style={m.legendText}>Double-clic : ouvrir la fiche</Text>
      </View>
      <View style={m.map}>
        {sections.map((section) => (
          <View key={section.title} style={m.quarter}>
            <Text style={m.quarterTitle}>{section.title}</Text>
            <View style={m.houses}>
              {section.rows.map((row) => {
                const p = row.property;
                const sel = p.id === selectedId;
                const occupied = !!row.current;
                const todo = p.cleaning_status === 'to_do';
                return (
                  <Pressable
                    key={p.id}
                    onPress={() => onSelect(p.id)}
                    {...dbl(() => onOpen(p.id))}
                    style={({ hovered }: any) => [m.house, hovered && { transform: [{ translateY: -2 }] }, !p.is_active && { opacity: 0.45 }]}
                  >
                    <View style={[m.roof, { borderBottomColor: `${p.color}B3` }]} />
                    <View
                      style={[
                        m.body,
                        { borderColor: `${p.color}B3`, backgroundColor: occupied ? `${p.color}4D` : PL.mur },
                        sel && m.bodySel,
                      ]}
                    >
                      <Text style={m.houseName} numberOfLines={2}>{p.name}</Text>
                      <Text style={m.houseSub} numberOfLines={1}>
                        {occupied ? `jusqu'au ${dayMonth(row.current!.check_out)}` : row.next ? `→ ${dayMonth(row.next.check_in)}` : 'libre'}
                      </Text>
                      {todo && <View style={m.flag} />}
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

function LegendHouse({ filled, label }: { filled?: boolean; label: string }) {
  return (
    <View style={m.legendItem}>
      <View style={{ alignItems: 'center' }}>
        <View style={[m.roof, { borderBottomColor: PL.olive, borderLeftWidth: 9, borderRightWidth: 9, borderBottomWidth: 7 }]} />
        <View style={{ width: 16, height: 12, borderWidth: 1.5, borderColor: PL.olive, backgroundColor: filled ? PL.olive : PL.mur }} />
      </View>
      <Text style={m.legendText}>{label}</Text>
    </View>
  );
}

const m = StyleSheet.create({
  wrap: { padding: 24 },
  legend: { flexDirection: 'row', alignItems: 'center', gap: 20, marginBottom: 18 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  legendText: { fontFamily: CAL.font, fontSize: 13, color: CAL.texteDoux },
  map: { flexDirection: 'row', flexWrap: 'wrap', gap: 18, alignItems: 'flex-start' },
  quarter: { borderWidth: 1.5, borderColor: PL.bord, borderStyle: 'dashed', borderRadius: 18, padding: 16, paddingTop: 12, backgroundColor: 'rgba(255,255,255,0.35)' },
  quarterTitle: { fontFamily: CAL.fontBold, fontSize: 14, color: '#4E5C4B', marginBottom: 10 },
  houses: { flexDirection: 'row', flexWrap: 'wrap', gap: 14 },
  house: { width: 112, alignItems: 'center', cursor: 'pointer' as any },
  roof: { width: 0, height: 0, borderLeftWidth: 60, borderRightWidth: 60, borderBottomWidth: 26, borderLeftColor: 'transparent', borderRightColor: 'transparent' },
  body: { width: 104, height: 92, borderWidth: 2, borderTopWidth: 0, padding: 8, justifyContent: 'space-between' },
  bodySel: { outlineWidth: 2, outlineStyle: 'solid', outlineColor: CAL.or, outlineOffset: 2 } as any,
  houseName: { fontFamily: CAL.fontBold, fontSize: 13, color: CAL.texte },
  houseSub: { fontFamily: CAL.font, fontSize: 11, color: CAL.texte },
  flag: { position: 'absolute', top: 6, right: 6, width: 10, height: 10, borderRadius: 5, backgroundColor: CAL.changement, borderWidth: 2, borderColor: '#FFFFFF' },
});
