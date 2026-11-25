import { useEffect, useMemo, useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import { FONTS } from '@/constants/typography';
import { channelOf, CHANNEL_LABELS } from '@/constants/channels';
import { ChannelBadge } from '@/components/ui/ChannelBadge';
import { formatPrice } from '@/utils/price';
import { Property, Reservation, ReservationSource } from '@/types';
import { payerFor, splitByPayer } from '@/constants/tariffs';
import { isBlockRow, isCancelled } from './model';
import { STUB } from './StubsView';

const COMMISSION_CHANNELS: ReservationSource[] = ['airbnb', 'manual', 'booking', 'abritel'];

/** Récap des gains en bas de la page Réservations, par saison, avec les mêmes tampons que les tickets. */
export function RevenueFooter({ reservations, filtered, propertiesById }: { reservations: Reservation[]; filtered: boolean; propertiesById: Map<string, Property> }) {
  const stays = useMemo(() => reservations.filter((r) => !isBlockRow(r) && !isCancelled(r)), [reservations]);
  const years = useMemo(() => Array.from(new Set(stays.map((r) => Number(r.check_in.slice(0, 4))))).sort((a, b) => b - a), [stays]);
  const defaultYear = useMemo(() => {
    const withGains = stays.filter((r) => r.price != null).map((r) => Number(r.check_in.slice(0, 4)));
    return withGains.length ? Math.max(...withGains) : years[0];
  }, [stays, years]);
  const [year, setYear] = useState<number | undefined>(defaultYear);
  useEffect(() => {
    if (year === undefined || !years.includes(year)) setYear(defaultYear);
  }, [years, year, defaultYear]);
  const [month, setMonth] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  useEffect(() => { setMonth(null); setMenuOpen(false); }, [year]);

  const months = useMemo(
    () => Array.from(new Set(stays.filter((r) => Number(r.check_in.slice(0, 4)) === year).map((r) => r.check_in.slice(0, 7)))).sort(),
    [stays, year]
  );
  const monthLabel = (key: string) => {
    const t = format(parseISO(`${key}-01`), 'MMMM yyyy', { locale: fr });
    return t.charAt(0).toUpperCase() + t.slice(1);
  };

  const t = useMemo(() => {
    const list = stays.filter((r) => Number(r.check_in.slice(0, 4)) === year && (!month || r.check_in.startsWith(month)));
    const n = (v: number | null | undefined) => (v == null ? 0 : Number(v));
    const byChannel = COMMISSION_CHANNELS.map((c) => {
      const rows = list.filter((r) => channelOf(r) === c);
      const total = rows.reduce((sum, r) => sum + splitByPayer(r, propertiesById.get(r.property_id), c).platform, 0);
      return { c, total };
    }).filter((x) => x.total > 0);
    const payers = { platform: 0, owner: 0, onsite: 0 };
    let commission = 0;
    let cleaning = 0;
    let cleaningCount = 0;
    list.forEach((r) => {
      const p = propertiesById.get(r.property_id);
      const ch = channelOf(r);
      commission += n(r.commission_amount);
      if (r.commission_amount != null) payers[payerFor('platform', ch)] += n(r.commission_amount);
      if (r.cleaning_amount != null || r.beds_amount != null) cleaningCount += 1;
      cleaning += n(r.cleaning_amount) + n(r.beds_amount);
      payers[payerFor(p?.cleaning_payer, ch)] += n(r.cleaning_amount);
      payers[payerFor(p?.beds_payer, ch)] += n(r.beds_amount);
    });
    return {
      commission,
      cleaning,
      cleaningCount,
      byChannel,
      payers,
      missing: list.filter((r) => r.price == null).length,
      count: list.length,
    };
  }, [stays, year, month, propertiesById]);

  if (years.length === 0) return null;

  return (
    <View style={s.bar}>
      <View style={s.years}>
        {years.map((y) => (
          <Pressable key={y} onPress={() => setYear(y)} style={({ hovered }: any) => [s.year, y === year && s.yearOn, hovered && y !== year && { backgroundColor: '#EDE5D6' }]}>
            <Text style={[s.yearText, y === year && s.yearTextOn]}>{y}</Text>
          </Pressable>
        ))}
      </View>

      <View style={{ position: 'relative', zIndex: 20 }}>
        <Pressable onPress={() => setMenuOpen((v) => !v)} style={({ hovered }: any) => [s.select, hovered && { borderColor: STUB.carbone }]} accessibilityLabel="Choisir la période">
          <Text style={s.selectText}>{month ? monthLabel(month) : `Toute la saison ${year}`}</Text>
          <MaterialCommunityIcons name={menuOpen ? 'chevron-down' : 'chevron-up'} size={16} color={STUB.carbone} />
        </Pressable>
        {menuOpen && (
          <View style={s.menu}>
            {[null, ...months].map((m) => (
              <Pressable
                key={m ?? 'all'}
                onPress={() => { setMonth(m); setMenuOpen(false); }}
                style={({ hovered }: any) => [s.menuItem, m === month && s.menuItemOn, hovered && m !== month && { backgroundColor: '#F3EDE2' }]}
              >
                <Text style={[s.menuText, m === month && { fontFamily: FONTS.readableBold }]}>{m ? monthLabel(m) : `Toute la saison ${year}`}</Text>
              </Pressable>
            ))}
          </View>
        )}
      </View>

      <View style={s.block}>
        <Text style={s.label}>Via plateformes</Text>
        <View style={[s.stamp, { borderColor: STUB.tampon, transform: [{ rotate: '-4deg' }] }]}>
          <Text style={[s.stampText, { color: STUB.tampon }]}>{formatPrice(t.payers.platform)}</Text>
        </View>
        <View style={s.channels}>
          {t.byChannel.map(({ c, total }) => (
            <View key={c} style={s.channel} accessibilityLabel={`${CHANNEL_LABELS[c]} ${formatPrice(total)}`}>
              <ChannelBadge channel={c} size={14} />
              <Text style={s.small}>{formatPrice(total)}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={s.block}>
        <Text style={s.label}>Propriétaires</Text>
        <View style={[s.stamp, { borderColor: STUB.presta, transform: [{ rotate: '3deg' }] }]}>
          <Text style={[s.stampText, { color: STUB.presta }]}>{formatPrice(t.payers.owner)}</Text>
        </View>
      </View>

      <View style={s.block}>
        <Text style={s.label}>Sur place</Text>
        <View style={[s.stamp, { borderColor: STUB.surPlace, transform: [{ rotate: '-2deg' }] }]}>
          <Text style={[s.stampText, { color: STUB.surPlace }]}>{formatPrice(t.payers.onsite)}</Text>
        </View>
      </View>

      <View style={{ flex: 1 }} />

      <View style={s.totalBlock}>
        <Text style={s.label}>Total gagné · {month ? monthLabel(month).toLowerCase() : `saison ${year}`}</Text>
        <Text style={s.total}>{formatPrice(t.commission + t.cleaning)}</Text>
        <Text style={s.small}>Commissions {formatPrice(t.commission)} · ménages {formatPrice(t.cleaning)}</Text>
        <Text style={s.small}>
          {t.missing > 0 ? `${t.missing} résa${t.missing > 1 ? 's' : ''} sur ${t.count} sans montant` : `${t.count} résa${t.count > 1 ? 's' : ''}, toutes renseignées`}
          {filtered ? ' · filtres appliqués' : ''}
        </Text>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  bar: { zIndex: 10, flexDirection: 'row', alignItems: 'center', gap: 28, paddingHorizontal: 20, paddingVertical: 10, backgroundColor: STUB.kraft, borderTopWidth: 1, borderTopColor: STUB.trait },
  years: { gap: 4 },
  year: { paddingVertical: 2, paddingHorizontal: 8, borderRadius: 4 },
  yearOn: { backgroundColor: STUB.nuit },
  yearText: { fontFamily: FONTS.readableBold, fontSize: 12, color: STUB.carbone },
  yearTextOn: { color: '#FFFFFF' },
  select: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderColor: STUB.trait, backgroundColor: STUB.papier, borderRadius: 5, paddingVertical: 6, paddingHorizontal: 10, minWidth: 170 },
  selectText: { fontFamily: FONTS.readableBold, fontSize: 13, color: STUB.nuit, flex: 1 },
  menu: { position: 'absolute', bottom: '100%', left: 0, marginBottom: 6, minWidth: 190, backgroundColor: STUB.papier, borderWidth: 1, borderColor: STUB.trait, borderRadius: 6, paddingVertical: 4, boxShadow: '0 6px 18px rgba(15,34,64,0.15)' } as any,
  menuItem: { paddingVertical: 7, paddingHorizontal: 12 },
  menuItemOn: { backgroundColor: '#EDE5D6' },
  menuText: { fontFamily: FONTS.readable, fontSize: 13, color: STUB.nuit },
  block: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  label: { fontFamily: FONTS.readable, fontSize: 11, color: STUB.carbone, textTransform: 'uppercase', letterSpacing: 0.8 },
  stamp: { borderWidth: 2, borderRadius: 3, paddingVertical: 2, paddingHorizontal: 10, opacity: 0.9, backgroundColor: STUB.papier },
  stampText: { fontFamily: FONTS.readableBold, fontSize: 18, letterSpacing: 0.6 },
  channels: { flexDirection: 'row', gap: 10 },
  channel: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  small: { fontFamily: FONTS.readable, fontSize: 12, color: STUB.carbone },
  payers: { gap: 1, borderLeftWidth: 1, borderLeftColor: STUB.trait, paddingLeft: 14 },
  payerValue: { fontFamily: FONTS.readableBold, color: STUB.nuit },
  totalBlock: { alignItems: 'flex-end' },
  total: { fontFamily: FONTS.stubSerif, fontSize: 30, lineHeight: 32, color: STUB.nuit },
});
