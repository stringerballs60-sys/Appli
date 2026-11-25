import { View, Text, Pressable, ScrollView, StyleSheet, Image } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { CAL } from '@/components/calendar/web/tokens';
import { channelOf } from '@/constants/channels';
import { ChannelBadge } from '@/components/ui/ChannelBadge';
import { initials } from '@/components/properties/web/shared';
import { Property } from '@/types';
import { ViewProps, PropertyDay, guestsOf, shortDay } from './model';

/** Direction A « Feuille de route » : la journée comme une feuille posée sur le bureau, à cocher. */
const SH = {
  fond: '#EFEEE9',
  feuille: '#FFFFFF',
  encre: '#0F2240',
  crayon: '#6B7280',
  filet: '#ECEAE4',
  rouge: '#D64545',
  or: '#C9A227',
  fait: '#4F7A5A',
};

export function Thumb({ p, size = 34 }: { p: Property; size?: number }) {
  return p.photo_url ? (
    <Image source={{ uri: p.photo_url }} style={{ width: size, height: size, borderRadius: 6, outlineWidth: 1, outlineStyle: 'solid', outlineColor: 'rgba(0,0,0,0.08)', outlineOffset: -1 } as any} />
  ) : (
    <View style={{ width: size, height: size, borderRadius: 6, backgroundColor: `${p.color}40`, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ fontFamily: CAL.fontBold, fontSize: size * 0.36, color: SH.encre }}>{initials(p.name)}</Text>
    </View>
  );
}

export function CheckBox({ checked, disabled, onToggle, label }: { checked: boolean; disabled?: boolean; onToggle: () => void; label: string }) {
  return (
    <Pressable
      onPress={onToggle}
      disabled={disabled}
      accessibilityRole="checkbox"
      accessibilityState={{ checked, disabled }}
      accessibilityLabel={label}
      style={({ pressed }: any) => [sh.checkHit, pressed && { transform: [{ scale: 0.94 }] }, { transitionProperty: 'transform', transitionDuration: '120ms' } as any]}
    >
      <View style={[sh.check, checked && sh.checkOn, disabled && { opacity: 0.35 }, { transitionProperty: 'background-color, border-color', transitionDuration: '150ms' } as any]}>
        {checked ? <MaterialCommunityIcons name="check" size={17} color="#FFFFFF" /> : null}
      </View>
    </Pressable>
  );
}

function CleaningRow({ row, isToday, onToggle, onOpen }: { row: PropertyDay; isToday: boolean; onToggle: () => void; onOpen: () => void }) {
  const p = row.property;
  return (
    <View style={[sh.row, row.cleaningDone && { opacity: 0.6 }]}>
      <CheckBox checked={row.cleaningDone} disabled={!isToday || !row.task} onToggle={onToggle} label={`Ménage fait à ${p.name}`} />
      <Thumb p={p} />
      <Pressable onPress={onOpen} style={{ flex: 1 }}>
        <Text style={[sh.main, row.cleaningDone && sh.strike]} numberOfLines={1}>{p.name}</Text>
        <Text style={sh.sub} numberOfLines={1}>
          {row.cleaning === 'late' && row.task ? `Ménage resté à faire depuis ${shortDay(row.task.scheduled_date)}` : row.departure ? `${row.departure.guest_name} part ce matin` : 'Ménage à faire'}
        </Text>
      </Pressable>
      {row.turnover ? (
        <View style={sh.deadline}>
          <Text style={sh.deadlineText}>avant {row.arrivalTime}</Text>
          <Text style={sh.deadlineSub}>{row.arrival?.guest_name} arrive</Text>
        </View>
      ) : (
        <Text style={sh.free}>{row.arrival ? `avant ${row.arrivalTime}` : 'pas d’arrivée'}</Text>
      )}
    </View>
  );
}

export function SheetView({ model, isToday, onOpen, onToggleCleaning }: ViewProps) {
  const staying = model.rows.filter((r) => r.staying);
  return (
    <ScrollView style={{ flex: 1, backgroundColor: SH.fond }} contentContainerStyle={sh.wrap}>
      <View style={sh.sheet}>
        <Section title="Départs et ménages" hint={model.cleanings.length ? `${model.cleanings.filter((c) => c.cleaningDone).length} / ${model.cleanings.length} faits` : undefined}>
          {model.cleanings.length === 0 ? <Text style={sh.empty}>Aucun ménage ce jour-là.</Text> : model.cleanings.map((row) => (
            <CleaningRow
              key={row.property.id}
              row={row}
              isToday={isToday}
              onToggle={() => onToggleCleaning(row.property, !row.cleaningDone)}
              onOpen={() => row.departure && onOpen(row.departure)}
            />
          ))}
          {!isToday && model.cleanings.length > 0 ? <Text style={sh.note}>Les ménages se cochent le jour même.</Text> : null}
        </Section>

        <Section title="Arrivées" hint={model.arrivals.length ? `${model.arrivals.reduce((n, r) => n + (r.arrival ? guestsOf(r.arrival) : 0), 0)} voyageurs` : undefined}>
          {model.arrivals.length === 0 ? <Text style={sh.empty}>Personne n’arrive ce jour-là.</Text> : model.arrivals.map((row) => {
            const r = row.arrival!;
            return (
              <Pressable key={r.id} onPress={() => onOpen(r)} style={({ hovered }: any) => [sh.row, hovered && { backgroundColor: '#FAFAF7' }]}>
                <View style={sh.timeCol}>
                  <Text style={[sh.time, !row.arrivalTimeConfirmed && { color: SH.crayon }]}>{row.arrivalTime}</Text>
                  {!row.arrivalTimeConfirmed ? <Text style={sh.toConfirm}>à confirmer</Text> : null}
                </View>
                <Thumb p={row.property} />
                <View style={{ flex: 1 }}>
                  <Text style={sh.main} numberOfLines={1}>{r.guest_name}</Text>
                  <Text style={sh.sub} numberOfLines={1}>{row.property.name} · {guestsOf(r)} pers. · {r.nb_nights} nuit{r.nb_nights > 1 ? 's' : ''}</Text>
                </View>
                {row.turnover && !row.cleaningDone ? <Text style={sh.warn}>ménage pas encore fait</Text> : null}
                <ChannelBadge channel={channelOf(r)} size={18} />
              </Pressable>
            );
          })}
        </Section>

        {staying.length > 0 ? (
          <Section title="Ils restent">
            <View style={sh.chips}>
              {staying.map((row) => (
                <Pressable key={row.property.id} onPress={() => onOpen(row.staying!)} style={({ hovered }: any) => [sh.chip, hovered && { backgroundColor: '#F4F3EF' }]}>
                  <View style={[sh.dot, { backgroundColor: row.property.color }]} />
                  <Text style={sh.chipText}>{row.property.name}</Text>
                  <Text style={sh.chipSub}>jusqu’au {shortDay(row.staying!.check_out)}</Text>
                </Pressable>
              ))}
            </View>
          </Section>
        ) : null}
      </View>
    </ScrollView>
  );
}

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <View style={sh.section}>
      <View style={sh.sectionHead}>
        <Text style={sh.sectionTitle}>{title}</Text>
        {hint ? <Text style={sh.sectionHint}>{hint}</Text> : null}
      </View>
      {children}
    </View>
  );
}

const sh = StyleSheet.create({
  wrap: { padding: 28, paddingBottom: 90, alignItems: 'center' },
  sheet: {
    width: '100%', maxWidth: 860, backgroundColor: SH.feuille, borderRadius: 10, paddingVertical: 12, paddingHorizontal: 28,
    boxShadow: '0 0 0 1px rgba(15,34,64,0.05), 0 1px 2px rgba(15,34,64,0.06), 0 10px 30px rgba(15,34,64,0.07)',
  } as any,
  section: { paddingVertical: 14 },
  sectionHead: { flexDirection: 'row', alignItems: 'baseline', gap: 10, marginBottom: 6 },
  sectionTitle: { fontFamily: CAL.fontBold, fontSize: 18, color: SH.encre },
  sectionHint: { fontFamily: CAL.font, fontSize: 13, color: SH.crayon, fontVariant: ['tabular-nums'] },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 56, paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: SH.filet, borderRadius: 4, cursor: 'pointer' as any },
  main: { fontFamily: CAL.fontBold, fontSize: 15, color: SH.encre },
  sub: { fontFamily: CAL.font, fontSize: 13, color: SH.crayon, marginTop: 1 },
  strike: { textDecorationLine: 'line-through' },
  checkHit: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  check: { width: 24, height: 24, borderRadius: 6, borderWidth: 2, borderColor: '#B9BEC6', alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF' },
  checkOn: { backgroundColor: SH.fait, borderColor: SH.fait },
  deadline: { alignItems: 'flex-end' },
  deadlineText: { fontFamily: CAL.fontBold, fontSize: 14, color: SH.rouge, fontVariant: ['tabular-nums'] },
  deadlineSub: { fontFamily: CAL.font, fontSize: 12, color: SH.crayon },
  free: { fontFamily: CAL.font, fontSize: 13, color: SH.crayon, fontVariant: ['tabular-nums'] },
  timeCol: { width: 74 },
  time: { fontFamily: CAL.fontBold, fontSize: 22, color: SH.encre, fontVariant: ['tabular-nums'] },
  toConfirm: { fontFamily: CAL.fontBold, fontSize: 11, color: '#8A6D12', marginTop: -2 },
  warn: { fontFamily: CAL.fontBold, fontSize: 12, color: SH.rouge },
  empty: { fontFamily: CAL.font, fontSize: 14, color: SH.crayon, paddingVertical: 8 },
  note: { fontFamily: CAL.font, fontSize: 12, color: SH.crayon, marginTop: 8 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 7, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8, backgroundColor: '#FAFAF7', minHeight: 40 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  chipText: { fontFamily: CAL.fontBold, fontSize: 13, color: SH.encre },
  chipSub: { fontFamily: CAL.font, fontSize: 12, color: SH.crayon },
});
