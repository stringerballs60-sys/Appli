import { useMemo } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet, Image } from 'react-native';
import { initials } from '@/components/properties/web/shared';
import { Property } from '@/types';
import { formatPrice } from '@/utils/price';
import { isPrestaProperty } from '@/constants/tariffs';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import { FONTS } from '@/constants/typography';
import { channelOf, CHANNEL_LABELS } from '@/constants/channels';
import { ChannelBadge } from '@/components/ui/ChannelBadge';
import { blockReasonLabel } from '@/constants/blocks';
import { ViewProps, groupBy, keyDate, monthKey, monthTitle, guestsDetail, isBlockRow, isCancelled, timeLabel, shortDay } from './model';

/** Direction B « Carnet à souches » : chaque séjour est un ticket avec son talon daté. */
export const STUB = {
  kraft: '#F3EDE2',
  papier: '#FFFDF8',
  carbone: '#2F4A78',
  nuit: '#0F2240',
  tampon: '#B4453A',
  presta: '#1E7A78',
  cadenas: '#6E6457',
  trait: '#DCD2C0',
  or: '#C9A227',
};

const dbl = (fn: () => void) => ({ onDoubleClick: fn }) as any;

export function StubsView({ rows, tab, today, selectedId, propertiesById, turnovers, onSelect, onOpen }: ViewProps) {
  const groups = useMemo(() => groupBy(rows, (r) => monthKey(keyDate(r, tab)), monthTitle), [rows, tab]);

  return (
    <ScrollView style={{ flex: 1, backgroundColor: STUB.kraft }} contentContainerStyle={s.wrap}>
      {groups.map((g) => (
        <View key={g.key} style={{ marginBottom: 26 }}>
          <View style={s.monthRow}>
            <Text style={s.month}>{g.title}</Text>
            <Text style={s.monthCount}>{g.rows.length} talon{g.rows.length > 1 ? 's' : ''}</Text>
          </View>
          <View style={s.grid}>
            {g.rows.map((r) => {
              const p = propertiesById.get(r.property_id);
              const block = isBlockRow(r);
              const cancelled = isCancelled(r);
              const main = keyDate(r, tab);
              const d = parseISO(main);
              const sel = r.id === selectedId;
              const todayStub = !block && (tab === 'current' ? r.check_out === today : r.check_in === today);
              const turnover = !block && turnovers.has(`${r.property_id}|${r.check_in}`);
              const time = timeLabel(r.check_in_time);
              return (
                <Pressable
                  key={r.id}
                  onPress={() => onSelect(r.id)}
                  {...dbl(() => onOpen(r))}
                  style={({ hovered }: any) => [s.ticket, hovered && s.ticketHover, sel && s.ticketSel]}
                >
                  <View style={[s.stub, todayStub && s.stubToday, block && s.stubBlock]}>
                    <Text style={[s.stubLabel, todayStub && { color: '#DCE4F2' }]}>{tab === 'current' ? 'départ' : block ? 'du' : 'arrivée'}</Text>
                    <Text style={[s.stubDay, todayStub && { color: '#FFFFFF' }]}>{format(d, 'd')}</Text>
                    <Text style={[s.stubMonth, todayStub && { color: '#FFFFFF' }]}>{format(d, 'MMM', { locale: fr }).replace('.', '').toUpperCase()}</Text>
                    <Text style={[s.stubWeek, todayStub && { color: '#DCE4F2' }]}>{todayStub ? 'aujourd’hui' : format(d, 'EEEE', { locale: fr })}</Text>
                  </View>
                  <View style={s.perf}>
                    <View style={[s.notch, { top: -7 }]} />
                    <View style={s.dash} />
                    <View style={[s.notch, { bottom: -7 }]} />
                  </View>
                  <View style={s.body}>
                    <Stamp property={p} dim={block || cancelled} />
                    {!block && !cancelled && r.price != null ? (
                      <View style={[s.price, isPrestaProperty(p) && s.pricePresta]} pointerEvents="none">
                        <Text style={[s.priceText, isPrestaProperty(p) && { color: STUB.presta }]}>{formatPrice(r.price)}</Text>
                      </View>
                    ) : null}
                    <View style={[s.inline, { paddingRight: 70 }]}>
                      <View style={[s.dot, { backgroundColor: p?.color ?? STUB.trait }]} />
                      <Text style={s.property} numberOfLines={1}>{p?.name ?? 'Logement'}</Text>
                    </View>
                    {block ? (
                      <Text style={[s.guest, { color: STUB.cadenas, paddingRight: 64 }]} numberOfLines={1}>{blockReasonLabel(r.block_reason)}</Text>
                    ) : (
                      <Text style={[s.guest, { paddingRight: 64 }, cancelled && { color: STUB.cadenas }]} numberOfLines={1}>{r.guest_name}</Text>
                    )}
                    <Text style={[s.meta, { paddingRight: 64 }]} numberOfLines={1}>
                      {r.nb_nights} nuit{r.nb_nights > 1 ? 's' : ''}{!block && guestsDetail(r) ? ` · ${guestsDetail(r)}` : ''}
                    </Text>
                    <View style={[s.inline, { marginTop: 'auto', paddingTop: 10, justifyContent: 'space-between' }]}>
                      {block ? (
                        <Text style={s.carbone} numberOfLines={1}>jusqu’au {shortDay(r.check_out)}</Text>
                      ) : (
                        <View style={s.inline}>
                          <ChannelBadge channel={channelOf(r)} size={15} />
                          <Text style={s.carbone}>{CHANNEL_LABELS[channelOf(r)]}</Text>
                          {isPrestaProperty(p) ? (
                            <>
                              <ChannelBadge channel="presta" size={15} />
                              <Text style={s.carbone}>Presta</Text>
                            </>
                          ) : null}
                        </View>
                      )}
                      {!block && (
                        <Text style={s.carbone}>
                          {tab === 'current' ? `arrivé ${shortDay(r.check_in)}` : `${time ? time + ' · ' : ''}départ ${shortDay(r.check_out)}`}
                        </Text>
                      )}
                    </View>
                    {turnover && !cancelled ? <Text style={s.turn}>Ménage juste avant l’arrivée</Text> : null}
                    {block ? (
                      <View style={[s.stamp, { borderColor: STUB.cadenas }]} pointerEvents="none">
                        <Text style={[s.stampText, { color: STUB.cadenas }]}>BLOQUÉ</Text>
                      </View>
                    ) : cancelled ? (
                      <View style={[s.stamp, { borderColor: STUB.tampon }]} pointerEvents="none">
                        <Text style={[s.stampText, { color: STUB.tampon }]}>ANNULÉE</Text>
                      </View>
                    ) : null}
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

/** Photo du logement collée en coin du ticket, comme un timbre. */
function Stamp({ property, dim }: { property?: Property; dim?: boolean }) {
  return (
    <View style={[s.timbre, dim && { opacity: 0.55 }]} pointerEvents="none">
      {property?.photo_url ? (
        <Image source={{ uri: property.photo_url }} style={s.timbreImg} />
      ) : (
        <View style={[s.timbreImg, { backgroundColor: property ? `${property.color}55` : STUB.trait, alignItems: 'center', justifyContent: 'center' }]}>
          <Text style={s.timbreInit}>{property ? initials(property.name) : '?'}</Text>
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { padding: 24, paddingBottom: 48 },
  monthRow: { flexDirection: 'row', alignItems: 'baseline', gap: 12, marginBottom: 12 },
  month: { fontFamily: FONTS.stubSerif, fontSize: 30, color: STUB.nuit },
  monthCount: { fontFamily: FONTS.readable, fontSize: 13, color: STUB.carbone },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 14 },
  ticket: {
    width: 440, minHeight: 142, flexDirection: 'row', backgroundColor: STUB.papier, borderRadius: 6, cursor: 'pointer' as any,
    borderWidth: 1, borderColor: STUB.trait, boxShadow: '0 1px 0 rgba(47,74,120,0.10)',
  } as any,
  ticketHover: { borderColor: '#C9BCA4' },
  ticketSel: { borderColor: STUB.or, borderWidth: 2 },
  stub: { width: 92, alignItems: 'center', justifyContent: 'center', paddingVertical: 10, borderTopLeftRadius: 5, borderBottomLeftRadius: 5 },
  stubToday: { backgroundColor: STUB.carbone },
  stubBlock: { backgroundImage: 'repeating-linear-gradient(135deg, rgba(110,100,87,0.12) 0 5px, transparent 5px 10px)' } as any,
  stubLabel: { fontFamily: FONTS.readable, fontSize: 10, color: STUB.carbone, textTransform: 'uppercase', letterSpacing: 0.8 },
  stubDay: { fontFamily: FONTS.stubSerif, fontSize: 44, lineHeight: 46, color: STUB.nuit },
  stubMonth: { fontFamily: FONTS.readableBold, fontSize: 12, color: STUB.nuit, letterSpacing: 1.2 },
  stubWeek: { fontFamily: FONTS.readable, fontSize: 11, color: STUB.carbone, marginTop: 2 },
  perf: { width: 14, alignItems: 'center', position: 'relative' },
  dash: { flex: 1, width: 0, borderLeftWidth: 2, borderStyle: 'dashed', borderColor: STUB.trait, marginVertical: 8 },
  notch: { position: 'absolute', width: 14, height: 14, borderRadius: 7, backgroundColor: STUB.kraft, borderWidth: 1, borderColor: STUB.trait },
  body: { flex: 1, padding: 12, paddingLeft: 8, position: 'relative', overflow: 'hidden', flexDirection: 'column' },
  inline: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  property: { fontFamily: FONTS.readableBold, fontSize: 12, color: STUB.carbone, textTransform: 'uppercase', letterSpacing: 0.5, flexShrink: 1 },
  guest: { fontFamily: FONTS.readableBold, fontSize: 18, color: STUB.nuit, marginTop: 4 },
  meta: { fontFamily: FONTS.readable, fontSize: 13, color: '#4A5568', marginTop: 2 },
  carbone: { fontFamily: FONTS.readable, fontSize: 12, color: STUB.carbone },
  turn: { fontFamily: FONTS.readableBold, fontSize: 11, color: STUB.carbone, marginTop: 6, textDecorationLine: 'underline' },
  timbre: { position: 'absolute', top: 10, right: 10, padding: 3, backgroundColor: '#FFFFFF', borderWidth: 1, borderStyle: 'dashed', borderColor: STUB.trait, transform: [{ rotate: '2.5deg' }], boxShadow: '0 1px 2px rgba(47,74,120,0.18)' } as any,
  timbreImg: { width: 54, height: 54 },
  price: {
    position: 'absolute', top: 78, right: 8, borderWidth: 2, borderColor: STUB.tampon, borderRadius: 3, paddingVertical: 1, paddingHorizontal: 6,
    transform: [{ rotate: '-7deg' }], opacity: 0.88, boxShadow: `inset 0 0 0 1px ${STUB.papier}, inset 0 0 0 2px ${STUB.tampon}55`,
  } as any,
  pricePresta: { borderColor: STUB.presta, boxShadow: `inset 0 0 0 1px ${STUB.papier}, inset 0 0 0 2px ${STUB.presta}55` } as any,
  priceText: { fontFamily: FONTS.readableBold, fontSize: 14, color: STUB.tampon, letterSpacing: 0.6 },
  timbreInit: { fontFamily: FONTS.readableBold, fontSize: 16, color: STUB.nuit },
  stamp: { position: 'absolute', right: 78, top: 34, borderWidth: 2, borderRadius: 4, paddingVertical: 2, paddingHorizontal: 8, transform: [{ rotate: '-9deg' }], opacity: 0.85 },
  stampText: { fontFamily: FONTS.readableBold, fontSize: 13, letterSpacing: 2 },
});
