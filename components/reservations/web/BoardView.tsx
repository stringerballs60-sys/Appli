import { useMemo } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import { FONTS } from '@/constants/typography';
import { channelOf, CHANNEL_LABELS } from '@/constants/channels';
import { ChannelBadge } from '@/components/ui/ChannelBadge';
import { blockReasonLabel } from '@/constants/blocks';
import { ViewProps, keyDate, bucketOf, guestsOf, isBlockRow, isCancelled, timeLabel } from './model';
import { Reservation } from '@/types';

/** Direction C « Quai des arrivées » : le tableau du port, qui répond d'abord à « qui arrive quand ? ». */
export const BOARD = {
  nuit: '#0F2240',
  nuitSoft: '#1B2F52',
  ambre: '#F2B33D',
  blanc: '#FFFFFF',
  brume: '#F4F5F7',
  trait: '#E3E6EA',
  texte: '#0F2240',
  doux: '#5B6472',
  rouge: '#D64545',
  cadenas: '#6E6457',
  or: 'rgba(201,162,39,0.14)',
};

const dbl = (fn: () => void) => ({ onDoubleClick: fn }) as any;

type State = { label: string; tone: 'ok' | 'wait' | 'mute' | 'stay' };

function stateOf(r: Reservation, tab: ViewProps['tab'], today: string): State {
  if (isCancelled(r)) return { label: 'ANNULÉE', tone: 'mute' };
  if (isBlockRow(r)) return { label: 'BLOQUÉ', tone: 'mute' };
  if (tab === 'past') return { label: 'PARTI', tone: 'mute' };
  if (tab === 'current') return r.check_out === today ? { label: 'DÉPART', tone: 'ok' } : { label: 'EN SÉJOUR', tone: 'stay' };
  if (!r.check_in_time || !r.check_in_time_confirmed) return { label: 'À CONFIRMER', tone: 'wait' };
  return { label: 'CONFIRMÉ', tone: 'ok' };
}

export function BoardView({ rows, tab, today, selectedId, propertiesById, turnovers, onSelect, onOpen }: ViewProps) {
  const buckets = useMemo(() => {
    const map = new Map<string, { label: string; order: number; rows: Reservation[] }>();
    rows.forEach((r) => {
      const b = bucketOf(keyDate(r, tab), today);
      const cur = map.get(b.key) ?? { label: b.label, order: b.order, rows: [] };
      cur.rows.push(r);
      map.set(b.key, cur);
    });
    const desc = tab === 'past' || tab === 'cancelled';
    return Array.from(map.entries()).sort(([, a], [, b]) => (desc ? b.order - a.order : a.order - b.order));
  }, [rows, tab, today]);

  const timeHead = tab === 'current' ? 'Départ' : tab === 'blocks' ? 'Du' : 'Heure';

  return (
    <ScrollView style={{ flex: 1, backgroundColor: BOARD.brume }} contentContainerStyle={s.wrap}>
      {buckets.map(([key, b]) => (
        <View key={key} style={s.panel}>
          <View style={s.band}>
            <Text style={s.bandText}>{b.label.toUpperCase()}</Text>
            {key === 'd0' ? <Text style={s.bandDate}>{format(parseISO(today), 'EEE d MMM', { locale: fr }).replace(/\./g, '').toUpperCase()}</Text> : null}
            <View style={{ flex: 1 }} />
            <Text style={s.bandCount}>{String(b.rows.length).padStart(2, '0')}</Text>
          </View>
          <View style={s.cols}>
            <Text style={[s.col, { width: 92 }]}>{timeHead}</Text>
            <Text style={[s.col, { width: 170 }]}>Logement</Text>
            <Text style={[s.col, { flex: 1 }]}>{tab === 'blocks' ? 'Motif' : 'Voyageur'}</Text>
            <Text style={[s.col, { width: 70 }]}>Voy.</Text>
            <Text style={[s.col, { width: 110 }]}>Provenance</Text>
            <Text style={[s.col, { width: 128, textAlign: 'right' }]}>État</Text>
          </View>
          {b.rows.map((r) => {
            const p = propertiesById.get(r.property_id);
            const block = isBlockRow(r);
            const st = stateOf(r, tab, today);
            const sel = r.id === selectedId;
            const main = keyDate(r, tab);
            const sameDay = key === 'd0' || key === 'd1' || key === 'm1';
            const time = timeLabel(r.check_in_time);
            const turnover = !block && !isCancelled(r) && tab !== 'current' && turnovers.has(`${r.property_id}|${r.check_in}`);
            return (
              <Pressable
                key={r.id}
                onPress={() => onSelect(r.id)}
                {...dbl(() => onOpen(r))}
                style={({ hovered }: any) => [s.row, hovered && !sel && { backgroundColor: '#F8F9FB' }, sel && { backgroundColor: BOARD.or }]}
              >
                <View style={{ width: 92 }}>
                  {tab === 'upcoming' && sameDay ? (
                    <Text style={[s.big, !time && { color: BOARD.doux }]}>{time ?? '--:--'}</Text>
                  ) : (
                    <>
                      <Text style={s.big}>{format(parseISO(main), 'dd/MM')}</Text>
                      <Text style={s.small}>{format(parseISO(main), 'EEE', { locale: fr }).replace('.', '')}{tab === 'upcoming' && time ? ` · ${time}` : ''}</Text>
                    </>
                  )}
                </View>
                <View style={[s.inline, { width: 170, paddingRight: 10 }]}>
                  <View style={[s.tab, { backgroundColor: p?.color ?? BOARD.trait }]} />
                  <Text style={s.prop} numberOfLines={1}>{p?.name ?? 'Logement'}</Text>
                </View>
                <View style={{ flex: 1, paddingRight: 10 }}>
                  <Text style={[s.guest, (block || isCancelled(r)) && { color: BOARD.cadenas }]} numberOfLines={1}>
                    {block ? blockReasonLabel(r.block_reason) : r.guest_name}
                  </Text>
                  {turnover ? <Text style={s.turn}>Ménage entre deux séjours</Text>
                    : <Text style={s.small} numberOfLines={1}>{r.nb_nights} nuit{r.nb_nights > 1 ? 's' : ''} · jusqu’au {format(parseISO(r.check_out), 'd MMM', { locale: fr })}</Text>}
                </View>
                <Text style={[s.mono, { width: 70 }]}>{block ? '—' : String(guestsOf(r)).padStart(2, '0')}</Text>
                <View style={[s.inline, { width: 110 }]}>
                  {block ? <Text style={s.small}>—</Text> : (
                    <>
                      <ChannelBadge channel={channelOf(r)} size={16} />
                      <Text style={s.small}>{CHANNEL_LABELS[channelOf(r)]}</Text>
                    </>
                  )}
                </View>
                <View style={{ width: 128, alignItems: 'flex-end' }}>
                  <Text style={[s.state, st.tone === 'wait' && s.stateWait, st.tone === 'mute' && s.stateMute, st.tone === 'stay' && s.stateStay]}>{st.label}</Text>
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
  wrap: { padding: 20, gap: 18, paddingBottom: 48 },
  panel: { backgroundColor: BOARD.blanc, borderRadius: 8, overflow: 'hidden', borderWidth: 1, borderColor: BOARD.trait },
  band: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: BOARD.nuit, paddingHorizontal: 16, paddingVertical: 10 },
  bandText: { fontFamily: FONTS.boardBold, fontSize: 15, color: BOARD.ambre, letterSpacing: 2 },
  bandDate: { fontFamily: FONTS.board, fontSize: 12, color: 'rgba(255,255,255,0.65)', letterSpacing: 1.5 },
  bandCount: { fontFamily: FONTS.boardBold, fontSize: 15, color: BOARD.blanc, backgroundColor: BOARD.nuitSoft, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 3 },
  cols: { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: BOARD.trait, backgroundColor: '#FAFBFC' },
  col: { fontFamily: FONTS.board, fontSize: 10.5, color: BOARD.doux, textTransform: 'uppercase', letterSpacing: 1.2 },
  row: { flexDirection: 'row', alignItems: 'center', minHeight: 54, paddingHorizontal: 16, paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: BOARD.trait, cursor: 'pointer' as any },
  big: { fontFamily: FONTS.boardBold, fontSize: 18, color: BOARD.texte, letterSpacing: 0.5 },
  small: { fontFamily: FONTS.readable, fontSize: 12, color: BOARD.doux, marginTop: 1 },
  inline: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  tab: { width: 4, height: 26, borderRadius: 2 },
  prop: { fontFamily: FONTS.readableBold, fontSize: 14, color: BOARD.texte, flexShrink: 1 },
  guest: { fontFamily: FONTS.readableBold, fontSize: 15, color: BOARD.texte },
  turn: { fontFamily: FONTS.readableBold, fontSize: 12, color: BOARD.rouge, marginTop: 1 },
  mono: { fontFamily: FONTS.board, fontSize: 14, color: BOARD.texte },
  state: { fontFamily: FONTS.boardBold, fontSize: 11.5, letterSpacing: 1.2, color: BOARD.texte, paddingVertical: 4, paddingHorizontal: 8, borderRadius: 3, borderWidth: 1, borderColor: BOARD.trait, overflow: 'hidden' },
  stateWait: { backgroundColor: BOARD.ambre, borderColor: BOARD.ambre, color: BOARD.nuit },
  stateMute: { color: BOARD.cadenas, borderColor: 'transparent' },
  stateStay: { backgroundColor: BOARD.nuit, borderColor: BOARD.nuit, color: BOARD.blanc },
});
