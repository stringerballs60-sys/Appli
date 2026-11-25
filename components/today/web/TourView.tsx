import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { CAL } from '@/components/calendar/web/tokens';
import { ViewProps, PropertyDay, shortDay } from './model';
import { Thumb, CheckBox } from './SheetView';

/** Direction B « Tournée » : la journée rangée par site, comme le trajet de la voiture. */
const TO = {
  fond: '#E9E6DE',
  carte: '#FBFAF6',
  encre: '#0F2240',
  doux: '#6B6F66',
  olive: '#5E6B4E',
  filet: '#E3DED3',
  rouge: '#D64545',
  or: '#C9A227',
};

function Step({ icon, text, tone }: { icon: string; text: string; tone?: 'red' | 'gold' | 'done' | 'mute' }) {
  const color = tone === 'red' ? TO.rouge : tone === 'gold' ? '#8A6D12' : tone === 'done' ? TO.olive : TO.doux;
  return (
    <View style={[st.step, tone === 'red' && { backgroundColor: '#FBEDEC' }, tone === 'gold' && { backgroundColor: '#F8F0D6' }, tone === 'done' && { backgroundColor: '#EBEFE6' }]}>
      <MaterialCommunityIcons name={icon as any} size={14} color={color} />
      <Text style={[st.stepText, { color }]} numberOfLines={1}>{text}</Text>
    </View>
  );
}

function Stop({ row, isToday, onOpen, onToggle }: { row: PropertyDay; isToday: boolean; onOpen: ViewProps['onOpen']; onToggle: () => void }) {
  const p = row.property;
  return (
    <View style={st.stop}>
      <Thumb p={p} size={40} />
      <View style={{ flex: 1, gap: 6 }}>
        <Text style={st.name} numberOfLines={1}>{p.name}</Text>
        <View style={st.steps}>
          {row.departure ? (
            <Pressable onPress={() => onOpen(row.departure!)}>
              <Step icon="logout" text={`${row.departure.guest_name} part`} />
            </Pressable>
          ) : null}
          {row.cleaning ? (
            <Step
              icon="broom"
              text={row.cleaningDone ? 'Ménage fait' : row.cleaning === 'late' && row.task ? `Ménage en retard (${shortDay(row.task.scheduled_date)})` : row.turnover ? `Ménage avant ${row.arrivalTime}` : 'Ménage'}
              tone={row.cleaningDone ? 'done' : row.turnover || row.cleaning === 'late' ? 'red' : undefined}
            />
          ) : null}
          {row.arrival ? (
            <Pressable onPress={() => onOpen(row.arrival!)}>
              <Step icon="login" text={`${row.arrival.guest_name} · ${row.arrivalTime}${row.arrivalTimeConfirmed ? '' : ' ?'}`} tone="gold" />
            </Pressable>
          ) : null}
          {row.staying ? (
            <Pressable onPress={() => onOpen(row.staying!)}>
              <Step icon="bed-outline" text={`En séjour jusqu’au ${shortDay(row.staying.check_out)}`} tone="mute" />
            </Pressable>
          ) : null}
        </View>
      </View>
      {row.cleaning ? (
        <CheckBox checked={row.cleaningDone} disabled={!isToday || !row.task} onToggle={onToggle} label={`Ménage fait à ${p.name}`} />
      ) : <View style={{ width: 40 }} />}
    </View>
  );
}

export function TourView({ model, isToday, onOpen, onToggleCleaning }: ViewProps) {
  const sites = new Map<string, PropertyDay[]>();
  model.rows.forEach((r) => {
    const g = r.property.group_name?.trim() || 'Autres logements';
    sites.set(g, [...(sites.get(g) ?? []), r]);
  });
  const ordered = Array.from(sites.entries()).sort(([, a], [, b]) => {
    const work = (rows: PropertyDay[]) => rows.filter((r) => r.cleaning || r.arrival || r.departure).length;
    return work(b) - work(a);
  });

  return (
    <ScrollView style={{ flex: 1, backgroundColor: TO.fond }} contentContainerStyle={st.wrap}>
      <Text style={st.lead}>{ordered.length} site{ordered.length > 1 ? 's' : ''} à passer, du plus chargé au plus calme.</Text>
      <View style={st.grid}>
        {ordered.map(([site, rows], i) => {
          const work = rows.filter((r) => r.cleaning && !r.cleaningDone).length;
          return (
            <View key={site} style={st.card}>
              <View style={st.cardHead}>
                <View style={st.stopNum}><Text style={st.stopNumText}>{i + 1}</Text></View>
                <Text style={st.site}>{site}</Text>
                <View style={{ flex: 1 }} />
                <Text style={st.cardHint}>{work ? `${work} ménage${work > 1 ? 's' : ''}` : 'rien à nettoyer'}</Text>
              </View>
              {rows.map((row) => (
                <Stop key={row.property.id} row={row} isToday={isToday} onOpen={onOpen} onToggle={() => onToggleCleaning(row.property, !row.cleaningDone)} />
              ))}
            </View>
          );
        })}
      </View>
    </ScrollView>
  );
}

const st = StyleSheet.create({
  wrap: { padding: 24, paddingBottom: 90, gap: 14 },
  lead: { fontFamily: CAL.font, fontSize: 14, color: TO.doux },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 16, alignItems: 'flex-start' },
  card: {
    width: 440, maxWidth: '100%', backgroundColor: TO.carte, borderRadius: 12, padding: 6,
    boxShadow: '0 0 0 1px rgba(60,55,40,0.06), 0 1px 2px rgba(60,55,40,0.06), 0 8px 22px rgba(60,55,40,0.06)',
  } as any,
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 10, paddingTop: 10, paddingBottom: 8 },
  stopNum: { width: 26, height: 26, borderRadius: 13, backgroundColor: TO.olive, alignItems: 'center', justifyContent: 'center' },
  stopNumText: { fontFamily: CAL.fontBold, fontSize: 13, color: '#FFFFFF', fontVariant: ['tabular-nums'] },
  site: { fontFamily: CAL.fontBold, fontSize: 17, color: TO.encre },
  cardHint: { fontFamily: CAL.font, fontSize: 13, color: TO.doux },
  stop: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 10, borderRadius: 6, borderTopWidth: 1, borderTopColor: TO.filet },
  name: { fontFamily: CAL.fontBold, fontSize: 15, color: TO.encre },
  steps: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  step: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#F1EEE7', borderRadius: 6, paddingVertical: 4, paddingHorizontal: 8, maxWidth: 260 },
  stepText: { fontFamily: CAL.fontBold, fontSize: 12.5, fontVariant: ['tabular-nums'] },
});
