import { useMemo } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { FONTS } from '@/constants/typography';
import { channelOf, CHANNEL_LABELS } from '@/constants/channels';
import { ChannelBadge } from '@/components/ui/ChannelBadge';
import { blockReasonLabel } from '@/constants/blocks';
import { ViewProps, groupBy, keyDate, weekKey, weekTitle, numericDay, guestsDetail, isBlockRow, isCancelled, timeLabel } from './model';

/** Direction A « Main courante » : le registre des arrivées de la réception. */
export const REG = {
  papier: '#FBFAF6',
  ligne: '#E7E2D7',
  encre: '#0F2240',
  crayon: '#7D7869',
  marge: '#D64545',
  or: 'rgba(201,162,39,0.14)',
  orTrait: '#C9A227',
  cadenas: '#6E6457',
};

const dbl = (fn: () => void) => ({ onDoubleClick: fn }) as any;

export function RegisterView({ rows, tab, today, selectedId, propertiesById, turnovers, onSelect, onOpen }: ViewProps) {
  const groups = useMemo(() => groupBy(rows, (r) => weekKey(keyDate(r, tab)), weekTitle), [rows, tab]);
  let lineNo = 0;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: REG.papier }} contentContainerStyle={s.wrap} stickyHeaderIndices={[0]}>
      <View style={s.head}>
        <Text style={[s.hCell, { width: 34 }]}>N°</Text>
        <Text style={[s.hCell, { width: 104 }]}>{tab === 'current' ? 'Départ' : 'Arrivée'}</Text>
        <Text style={[s.hCell, { width: 180 }]}>Logement</Text>
        <Text style={[s.hCell, { flex: 1 }]}>{tab === 'blocks' ? 'Motif' : 'Voyageur'}</Text>
        <Text style={[s.hCell, { width: 58, textAlign: 'right' }]}>Nuits</Text>
        <Text style={[s.hCell, { width: 116, paddingLeft: 18 }]}>{tab === 'current' ? 'Arrivé le' : 'Départ'}</Text>
        <Text style={[s.hCell, { width: 110 }]}>Provenance</Text>
      </View>
      {groups.map((g) => (
        <View key={g.key}>
          <View style={s.week}>
            <Text style={s.weekText}>{g.title.toUpperCase()}</Text>
            <View style={s.weekRule} />
            <Text style={s.weekCount}>{g.rows.length} ligne{g.rows.length > 1 ? 's' : ''}</Text>
          </View>
          {g.rows.map((r) => {
            lineNo += 1;
            const p = propertiesById.get(r.property_id);
            const block = isBlockRow(r);
            const cancelled = isCancelled(r);
            const arrivesToday = !block && r.check_in === today;
            const leavesToday = !block && r.check_out === today;
            const turnover = !block && turnovers.has(`${r.property_id}|${r.check_in}`);
            const sel = r.id === selectedId;
            const main = tab === 'current' ? r.check_out : r.check_in;
            const other = tab === 'current' ? r.check_in : r.check_out;
            const time = timeLabel(r.check_in_time);
            return (
              <Pressable
                key={r.id}
                onPress={() => onSelect(r.id)}
                {...dbl(() => onOpen(r))}
                style={({ hovered }: any) => [s.row, block && s.rowBlock, hovered && !sel && s.rowHover, sel && s.rowSel]}
              >
                <Text style={[s.num, { width: 34 }]}>{String(lineNo).padStart(3, '0')}</Text>
                <View style={{ width: 104 }}>
                  <Text style={[s.mono, (arrivesToday || (tab === 'current' && leavesToday)) && s.today, cancelled && s.strike]}>{numericDay(main)}</Text>
                  {arrivesToday ? <Text style={s.todayHint}>aujourd’hui{time ? ` · ${time}` : ''}</Text>
                    : tab === 'current' && leavesToday ? <Text style={s.todayHint}>part aujourd’hui</Text>
                    : !block && tab !== 'current' && time ? <Text style={s.sub}>{time}</Text> : null}
                </View>
                <View style={[s.inline, { width: 180, paddingRight: 10 }]}>
                  <View style={[s.dot, { backgroundColor: p?.color ?? REG.ligne }]} />
                  <Text style={[s.text, cancelled && s.strike]} numberOfLines={1}>{p?.name ?? 'Logement'}</Text>
                </View>
                <View style={{ flex: 1, paddingRight: 10 }}>
                  {block ? (
                    <View style={s.inline}>
                      <MaterialCommunityIcons name="lock-outline" size={14} color={REG.cadenas} />
                      <Text style={[s.text, { color: REG.cadenas, fontFamily: FONTS.readableBold }]} numberOfLines={1}>
                        {blockReasonLabel(r.block_reason)}{r.notes ? ` — ${r.notes}` : ''}
                      </Text>
                    </View>
                  ) : (
                    <>
                      <Text style={[s.guest, cancelled && s.strike]} numberOfLines={1}>{r.guest_name}</Text>
                      <Text style={s.sub} numberOfLines={1}>
                        {guestsDetail(r) || '—'}{turnover ? '  ·  ménage juste avant' : ''}
                      </Text>
                    </>
                  )}
                </View>
                <Text style={[s.mono, { width: 58, textAlign: 'right' }]}>{r.nb_nights} n.</Text>
                <Text style={[s.mono, s.monoSoft, { width: 116, paddingLeft: 18 }]}>{numericDay(other)}</Text>
                <View style={[s.inline, { width: 110 }]}>
                  {block ? <Text style={s.sub}>—</Text> : (
                    <>
                      <ChannelBadge channel={channelOf(r)} size={16} />
                      <Text style={s.sub}>{CHANNEL_LABELS[channelOf(r)]}</Text>
                    </>
                  )}
                </View>
              </Pressable>
            );
          })}
        </View>
      ))}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  wrap: { paddingBottom: 40 },
  head: { flexDirection: 'row', alignItems: 'center', paddingLeft: 26, paddingRight: 20, paddingVertical: 8, backgroundColor: REG.papier, borderBottomWidth: 2, borderBottomColor: REG.encre },
  hCell: { fontFamily: FONTS.typewriterBold, fontSize: 12, color: REG.encre, textTransform: 'uppercase', letterSpacing: 0.4 },
  week: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingLeft: 60, paddingRight: 20, paddingTop: 18, paddingBottom: 6 },
  weekText: { fontFamily: FONTS.typewriterBold, fontSize: 13, color: REG.encre, letterSpacing: 0.6 },
  weekRule: { flex: 1, height: 1, backgroundColor: REG.ligne },
  weekCount: { fontFamily: FONTS.typewriter, fontSize: 12, color: REG.crayon },
  row: {
    flexDirection: 'row', alignItems: 'center', minHeight: 46, paddingLeft: 26, paddingRight: 20, paddingVertical: 5,
    borderBottomWidth: 1, borderBottomColor: REG.ligne, cursor: 'pointer' as any,
    borderLeftWidth: 0,
    backgroundImage: `linear-gradient(to right, transparent 54px, ${REG.marge}55 54px, ${REG.marge}55 55px, transparent 55px)`,
  } as any,
  rowBlock: { backgroundColor: '#F4F1EA' },
  rowHover: { backgroundColor: '#F3F0E8' },
  rowSel: { backgroundColor: REG.or },
  num: { fontFamily: FONTS.typewriter, fontSize: 11, color: REG.crayon },
  mono: { fontFamily: FONTS.typewriterBold, fontSize: 14, color: REG.encre },
  monoSoft: { fontFamily: FONTS.typewriter, color: REG.crayon },
  today: { color: REG.marge },
  todayHint: { fontFamily: FONTS.readableBold, fontSize: 11, color: REG.marge, marginTop: 1 },
  text: { fontFamily: FONTS.readable, fontSize: 14, color: REG.encre, flexShrink: 1 },
  guest: { fontFamily: FONTS.readableBold, fontSize: 14, color: REG.encre },
  sub: { fontFamily: FONTS.readable, fontSize: 12, color: REG.crayon, marginTop: 1 },
  inline: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  strike: { textDecorationLine: 'line-through', color: REG.crayon },
});
