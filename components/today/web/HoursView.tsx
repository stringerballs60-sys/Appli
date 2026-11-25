import { useEffect, useState } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { CAL } from '@/components/calendar/web/tokens';
import { ViewProps, DEFAULT_CHECKOUT } from './model';
import { Thumb, CheckBox } from './SheetView';

/** Direction C « Fil des heures » : la journée posée sur une règle de 8 h à 20 h, une ligne par logement. */
const START = 8;
const END = 20;
const NAME_W = 230;
const ROW_H = 60;

const HO = {
  fond: '#FFFFFF',
  grille: '#EEF0F3',
  encre: '#0F2240',
  doux: '#6B7280',
  depart: '#E6E9EE',
  menage: '#FCE9E7',
  menageBord: '#D64545',
  menageCalme: '#EEF2EA',
  menageCalmeBord: '#7C8F6A',
  fait: '#4F7A5A',
  arrivee: '#F7EDCB',
  arriveeBord: '#C9A227',
};

const toMin = (t: string) => {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + (m || 0);
};
const pct = (t: string) => `${Math.min(100, Math.max(0, ((toMin(t) - START * 60) / ((END - START) * 60)) * 100))}%`;
const span = (a: string, b: string) => ({ left: pct(a), width: `${Math.max(2, parseFloat(pct(b)) - parseFloat(pct(a)))}%` }) as any;
const minus = (t: string, min: number) => {
  const v = Math.max(START * 60, toMin(t) - min);
  return `${String(Math.floor(v / 60)).padStart(2, '0')}:${String(v % 60).padStart(2, '0')}`;
};

function useNow(enabled: boolean) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    if (!enabled) return;
    const id = setInterval(() => setNow(new Date()), 60 * 1000);
    return () => clearInterval(id);
  }, [enabled]);
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
}

export function HoursView({ model, isToday, onOpen, onToggleCleaning }: ViewProps) {
  const now = useNow(isToday);
  const showNow = isToday && toMin(now) >= START * 60 && toMin(now) <= END * 60;
  const hours = Array.from({ length: END - START + 1 }, (_, i) => START + i);

  return (
    <ScrollView style={{ flex: 1, backgroundColor: HO.fond }} contentContainerStyle={{ paddingBottom: 90 }}>
      <View style={ho.ruler}>
        <View style={{ width: NAME_W }} />
        <View style={ho.track}>
          {hours.map((h) => (
            <Text key={h} style={[ho.hour, { left: pct(`${String(h).padStart(2, '0')}:00`) } as any]}>{h} h</Text>
          ))}
        </View>
      </View>

      {model.rows.map((row) => {
        const p = row.property;
        const cleanEnd = row.turnover ? minus(row.arrivalTime, 30) : row.arrival ? minus(row.arrivalTime, 30) : '13:30';
        const calm = !row.turnover && row.cleaning !== 'late';
        return (
          <View key={p.id} style={ho.row}>
            <View style={ho.name}>
              <Thumb p={p} size={32} />
              <View style={{ flex: 1 }}>
                <Text style={ho.nameText} numberOfLines={1}>{p.name}</Text>
                <Text style={ho.nameSub} numberOfLines={1}>{p.group_name ?? ''}</Text>
              </View>
              {row.cleaning ? (
                <CheckBox checked={row.cleaningDone} disabled={!isToday || !row.task} onToggle={() => onToggleCleaning(p, !row.cleaningDone)} label={`Ménage fait à ${p.name}`} />
              ) : null}
            </View>
            <View style={ho.track}>
              {hours.slice(1).map((h) => <View key={h} style={[ho.gridLine, { left: pct(`${String(h).padStart(2, '0')}:00`) } as any]} />)}

              {row.staying ? (
                <Pressable onPress={() => onOpen(row.staying!)} style={[ho.block, ho.stay, span('08:00', '20:00')]}>
                  <Text style={ho.stayText} numberOfLines={1}>{row.staying.guest_name} en séjour</Text>
                </Pressable>
              ) : null}

              {row.departure ? (
                <Pressable onPress={() => onOpen(row.departure!)} style={[ho.block, { backgroundColor: HO.depart }, span('08:00', DEFAULT_CHECKOUT)]}>
                  <MaterialCommunityIcons name="logout" size={13} color={HO.doux} />
                  <Text style={ho.blockText} numberOfLines={1}>{row.departure.guest_name}</Text>
                </Pressable>
              ) : null}

              {row.cleaning ? (
                <View
                  style={[
                    ho.block,
                    span('10:30', cleanEnd),
                    row.cleaningDone
                      ? { backgroundColor: HO.fait, borderColor: HO.fait }
                      : calm
                        ? { backgroundColor: HO.menageCalme, borderColor: HO.menageCalmeBord }
                        : { backgroundColor: HO.menage, borderColor: HO.menageBord },
                    { borderWidth: 1 },
                  ]}
                >
                  <MaterialCommunityIcons name={row.cleaningDone ? 'check' : 'broom'} size={13} color={row.cleaningDone ? '#FFFFFF' : calm ? HO.menageCalmeBord : HO.menageBord} />
                  <Text style={[ho.blockText, { color: row.cleaningDone ? '#FFFFFF' : calm ? '#4E5E40' : '#A23232' }]} numberOfLines={1}>
                    {row.cleaningDone ? 'Ménage fait' : row.cleaning === 'late' ? 'Ménage en retard' : row.turnover ? `Ménage avant ${row.arrivalTime}` : 'Ménage'}
                  </Text>
                </View>
              ) : null}

              {row.arrival ? (
                <Pressable
                  onPress={() => onOpen(row.arrival!)}
                  style={[ho.block, span(row.arrivalTime, '20:00'), { backgroundColor: HO.arrivee, borderColor: HO.arriveeBord, borderWidth: 1, borderStyle: row.arrivalTimeConfirmed ? 'solid' : 'dashed' }]}
                >
                  <MaterialCommunityIcons name="login" size={13} color="#8A6D12" />
                  <Text style={[ho.blockText, { color: '#6E570E' }]} numberOfLines={1}>
                    {row.arrivalTime}{row.arrivalTimeConfirmed ? '' : ' ?'} · {row.arrival.guest_name}
                  </Text>
                </Pressable>
              ) : null}

              {showNow ? <View style={[ho.now, { left: pct(now) } as any]} /> : null}
            </View>
          </View>
        );
      })}

      <View style={ho.legend}>
        <Legend color={HO.depart} label="départ (avant 10 h)" />
        <Legend color={HO.menage} border={HO.menageBord} label="ménage entre deux séjours" />
        <Legend color={HO.menageCalme} border={HO.menageCalmeBord} label="ménage sans arrivée derrière" />
        <Legend color={HO.arrivee} border={HO.arriveeBord} label="arrivée (pointillés = heure à confirmer)" />
        {showNow ? <Legend color={CAL.or} label="maintenant" /> : null}
      </View>
    </ScrollView>
  );
}

function Legend({ color, border, label }: { color: string; border?: string; label: string }) {
  return (
    <View style={ho.legendItem}>
      <View style={[ho.legendSwatch, { backgroundColor: color, borderColor: border ?? color }]} />
      <Text style={ho.legendText}>{label}</Text>
    </View>
  );
}

const ho = StyleSheet.create({
  ruler: { flexDirection: 'row', height: 34, alignItems: 'flex-end', borderBottomWidth: 1, borderBottomColor: HO.grille, backgroundColor: HO.fond, position: 'sticky' as any, top: 0, zIndex: 5 },
  track: { flex: 1, position: 'relative', height: '100%', marginRight: 24 },
  hour: { position: 'absolute', bottom: 6, width: 40, marginLeft: -20, textAlign: 'center', fontFamily: CAL.font, fontSize: 11.5, color: HO.doux, fontVariant: ['tabular-nums'] },
  row: { flexDirection: 'row', height: ROW_H, alignItems: 'center', borderBottomWidth: 1, borderBottomColor: HO.grille },
  name: { width: NAME_W, flexDirection: 'row', alignItems: 'center', gap: 10, paddingLeft: 16, paddingRight: 6 },
  nameText: { fontFamily: CAL.fontBold, fontSize: 14, color: HO.encre },
  nameSub: { fontFamily: CAL.font, fontSize: 12, color: HO.doux },
  gridLine: { position: 'absolute', top: 0, bottom: 0, width: 1, backgroundColor: HO.grille },
  block: { position: 'absolute', top: 12, height: ROW_H - 24, borderRadius: 6, flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 8, overflow: 'hidden', cursor: 'pointer' as any },
  blockText: { fontFamily: CAL.fontBold, fontSize: 12, color: HO.encre, flexShrink: 1, fontVariant: ['tabular-nums'] },
  stay: { top: 26, height: 8, borderRadius: 4, backgroundColor: '#E8EBF0', paddingHorizontal: 0 },
  stayText: { position: 'absolute', left: 6, top: -16, fontFamily: CAL.font, fontSize: 11, color: HO.doux },
  now: { position: 'absolute', top: -2, bottom: -2, width: 2, backgroundColor: CAL.or, borderRadius: 1 },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: 16, paddingHorizontal: 16, paddingTop: 16 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendSwatch: { width: 14, height: 10, borderRadius: 3, borderWidth: 1 },
  legendText: { fontFamily: CAL.font, fontSize: 12, color: HO.doux },
});
