import { View, Text, Pressable, ScrollView, StyleSheet, Image } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { blockReasonLabel } from '@/constants/blocks';
import { channelOf } from '@/constants/channels';
import { ChannelBadge } from '@/components/ui/ChannelBadge';
import { CAL } from '@/components/calendar/web/tokens';
import { CLEANING, Row, TodayTag, dayMonth, hourLabel, initials } from './shared';

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
  cadenas: '#6E6457',
  verrou: '#F3F0EA',
  ficelle: '#B9A98C',
};

const TAG_TEXT: Record<TodayTag['kind'], string> = {
  turnover: 'Ménage entre deux séjours',
  departure: 'Part aujourd’hui',
  arrival: 'Arrive aujourd’hui',
};

function DayTag({ tag }: { tag: TodayTag }) {
  const time = tag.kind !== 'departure' ? hourLabel(tag.time) : null;
  const strong = tag.kind === 'turnover';
  return (
    <View style={k.dayTagWrap} pointerEvents="none">
      <View style={[k.dayTag, strong && k.dayTagStrong, tag.kind === 'departure' && k.dayTagDeparture]}>
        <View style={[k.dayTagHole, strong && { backgroundColor: CAL.changement }]} />
        <Text style={[k.dayTagText, strong && { color: CAL.blanc }]} numberOfLines={1}>
          {TAG_TEXT[tag.kind]}{time ? ` · ${time}` : ''}
        </Text>
      </View>
    </View>
  );
}

export function KeyBoardView({ sections, selectedId, resaLoading, onSelect, onOpen }: ViewProps) {
  return (
    <ScrollView style={{ flex: 1, backgroundColor: KEY.fond }} contentContainerStyle={k.wrap}>
      {sections.map((section) => (
        <View key={section.title} style={k.board}>
          <View style={k.boardHead}>
            <Text style={[k.boardTitle, { marginRight: 24 }]}>{section.title}</Text>
            <Text style={k.boardMeta}>
              {(() => {
                const onBoard = section.rows.filter((r) => !r.current).length;
                const locked = section.rows.filter((r) => r.currentBlock).length;
                return `${onBoard} clé${onBoard > 1 ? 's' : ''} au tableau sur ${section.rows.length}${locked ? ` · ${locked} sous cadenas` : ''}`;
              })()}
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
                  style={({ hovered }: any) => [k.tile, row.currentBlock && k.tileLocked, hovered && k.tileHover, sel && k.tileSel, !p.is_active && { opacity: 0.5 }]}
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
                        {row.currentBlock ? (
                          <View style={k.padlock}>
                            <MaterialCommunityIcons name="lock" size={13} color={CAL.blanc} />
                          </View>
                        ) : null}
                        {p.photo_url ? (
                          <View style={[k.tagPhotoWrap, { borderColor: p.color }]}>
                            <Image source={{ uri: p.photo_url }} style={k.tagPhoto} />
                          </View>
                        ) : (
                          <View style={[k.tag, { backgroundColor: p.color }]}>
                            <View style={k.tagHole} />
                            <Text style={k.tagText}>{initials(p.name)}</Text>
                          </View>
                        )}
                      </View>
                    )}
                  </View>
                  {row.today ? <DayTag tag={row.today} /> : null}
                  <Text style={k.name} numberOfLines={1}>{p.name}</Text>
                  {row.currentBlock ? (
                    <View style={k.line}>
                      <MaterialCommunityIcons name="lock-outline" size={13} color={KEY.cadenas} />
                      <Text style={[k.small, { color: KEY.cadenas, fontFamily: CAL.fontBold }]} numberOfLines={1}>
                        {blockReasonLabel(row.currentBlock.block_reason)} · jusqu’au {dayMonth(row.currentBlock.check_out)}
                      </Text>
                    </View>
                  ) : null}
                  <View style={[k.line, row.currentBlock && { display: 'none' }]}>
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
  tile: { width: 188, minHeight: 188, backgroundColor: KEY.tuile, borderRadius: 10, padding: 12, paddingTop: 0, cursor: 'pointer' as any, borderWidth: 1, borderColor: 'transparent' },
  tileHover: { borderColor: KEY.trait },
  tileSel: { borderColor: CAL.or, borderWidth: 2 },
  tileLocked: { backgroundColor: KEY.verrou, backgroundImage: 'repeating-linear-gradient(135deg, rgba(110,100,87,0.07) 0 6px, transparent 6px 12px)' } as any,
  padlock: { position: 'absolute', top: 2, right: -18, zIndex: 2, width: 22, height: 22, borderRadius: 11, backgroundColor: KEY.cadenas, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: KEY.tuile },
  dayTagWrap: { alignSelf: 'flex-start', marginTop: -2, marginBottom: 5 },
  dayTag: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#FBF6E9', borderWidth: 1, borderColor: '#E4D8B8', borderRadius: 3, paddingVertical: 2, paddingLeft: 5, paddingRight: 7, maxWidth: 164, transform: [{ rotate: '-1.5deg' }] },
  dayTagStrong: { backgroundColor: CAL.changement, borderColor: CAL.changement },
  dayTagDeparture: { backgroundColor: '#EEF1F4', borderColor: '#D5DCE3' },
  dayTagHole: { width: 4, height: 4, borderRadius: 2, backgroundColor: KEY.ficelle },
  dayTagText: { fontFamily: CAL.fontBold, fontSize: 10.5, color: CAL.texte },
  hookZone: { height: 78, alignItems: 'center' },
  hook: { width: 12, height: 12, borderRadius: 6, borderWidth: 2, borderColor: KEY.sauge, backgroundColor: KEY.fond, marginTop: 8 },
  keyWrap: { alignItems: 'center' },
  string: { width: 1.5, height: 10, backgroundColor: KEY.sauge },
  tag: { width: 46, height: 40, borderRadius: 8, alignItems: 'center', justifyContent: 'flex-end', paddingBottom: 5 },
  tagHole: { position: 'absolute', top: 5, width: 7, height: 7, borderRadius: 4, backgroundColor: KEY.tuile },
  tagPhotoWrap: { width: 52, height: 52, borderRadius: 26, borderWidth: 3, overflow: 'hidden', backgroundColor: KEY.planche },
  tagPhoto: { width: '100%', height: '100%' },
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
