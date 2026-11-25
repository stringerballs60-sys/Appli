import { useEffect, useMemo, useState } from 'react';
import { View, Text, Pressable, ScrollView, TextInput, StyleSheet, Modal } from 'react-native';
import { Calendar } from 'react-native-calendars';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { eachDayOfInterval, format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import { CalendarMark, CalendarMarkColor } from '@/types';
import { MARK_COLORS, markColor } from '@/constants/calendarMarks';
import { useCalendarMarks, useSaveCalendarMark, useDeleteCalendarMark } from '@/hooks/useCalendarMarks';
import { Alert } from '@/utils/alert';
import { CAL } from './tokens';

const longDay = (iso: string) => format(parseISO(iso), 'EEEE d MMMM yyyy', { locale: fr });
const shortDay = (iso: string) => format(parseISO(iso), 'd MMM', { locale: fr }).replace('.', '');

interface Props {
  visible: boolean;
  initialId?: string | null;
  initialDate?: string;
  onClose: () => void;
}

export function MarksEditor({ visible, initialId, initialDate, onClose }: Props) {
  const { data: marks } = useCalendarMarks();
  const save = useSaveCalendarMark();
  const remove = useDeleteCalendarMark();

  const [editId, setEditId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [color, setColor] = useState<CalendarMarkColor>('sable');
  const [yearly, setYearly] = useState(false);
  const [error, setError] = useState('');

  const load = (m: CalendarMark | null) => {
    setError('');
    setEditId(m?.id ?? null);
    setTitle(m?.title ?? '');
    setStart(m?.start_date ?? initialDate ?? '');
    setEnd(m?.end_date ?? '');
    setColor(m?.color ?? 'sable');
    setYearly(m?.yearly ?? false);
  };

  useEffect(() => {
    if (!visible) return;
    load((marks ?? []).find((m) => m.id === initialId) ?? null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, initialId]);

  const tint = markColor(color);
  const marked = useMemo(() => {
    if (!start) return {};
    const last = end || start;
    const out: Record<string, object> = {};
    eachDayOfInterval({ start: parseISO(start), end: parseISO(last) }).forEach((d, i, arr) => {
      out[format(d, 'yyyy-MM-dd')] = { startingDay: i === 0, endingDay: i === arr.length - 1, color: tint.fond, textColor: tint.texte };
    });
    return out;
  }, [start, end, tint]);

  const onDay = (iso: string) => {
    setError('');
    if (!start || (start && end)) { setStart(iso); setEnd(''); return; }
    if (iso < start) { setStart(iso); return; }
    setEnd(iso);
  };

  const canSave = title.trim().length > 0 && !!start;

  const submit = async () => {
    if (!canSave || save.isPending) return;
    try {
      await save.mutateAsync({ id: editId ?? undefined, input: { title, start_date: start, end_date: end || start, color, yearly } });
      load(null);
    } catch (e: any) {
      setError(`L’enregistrement a échoué${e?.message ? ` : ${e.message}` : ''}.`);
    }
  };

  const askDelete = () => {
    if (!editId) return;
    Alert.alert('Supprimer cette date marquée ?', 'Le fond coloré disparaîtra du calendrier.', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Supprimer',
        style: 'destructive',
        onPress: async () => {
          try { await remove.mutateAsync(editId); load(null); } catch { setError('La suppression a échoué.'); }
        },
      },
    ]);
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={s.backdrop} onPress={onClose}>
        <Pressable style={s.sheet} onPress={() => {}}>
          <View style={s.head}>
            <Text style={s.title}>Dates marquées</Text>
            <Text style={s.sub}>Un fond léger sur le calendrier pour les festivals, ponts, jours fériés…</Text>
            <View style={{ flex: 1 }} />
            <Pressable onPress={onClose} style={({ hovered }: any) => [s.close, hovered && { backgroundColor: CAL.brumeClair }]} accessibilityLabel="Fermer">
              <MaterialCommunityIcons name="close" size={20} color={CAL.texte} />
            </Pressable>
          </View>

          <View style={s.body}>
            <View style={s.list}>
              <Pressable onPress={() => load(null)} style={({ hovered }: any) => [s.newBtn, !editId && s.newBtnOn, hovered && editId && { backgroundColor: CAL.brumeClair }]}>
                <Text style={[s.newText, !editId && { color: CAL.blanc }]}>+ Nouvelle date marquée</Text>
              </Pressable>
              <ScrollView style={{ flex: 1 }} contentContainerStyle={{ gap: 4, paddingTop: 8 }}>
                {(marks ?? []).length === 0 && <Text style={s.empty}>Aucune date marquée pour l’instant.</Text>}
                {(marks ?? []).map((m) => {
                  const c = markColor(m.color);
                  return (
                    <Pressable key={m.id} onPress={() => load(m)} style={({ hovered }: any) => [s.item, m.id === editId && s.itemOn, hovered && m.id !== editId && { backgroundColor: CAL.brumeClair }]}>
                      <View style={[s.swatch, { backgroundColor: c.fond, borderColor: c.texte }]} />
                      <View style={{ flex: 1 }}>
                        <Text style={s.itemTitle} numberOfLines={1}>{m.title}</Text>
                        <Text style={s.itemSub}>
                          {m.start_date === m.end_date ? shortDay(m.start_date) : `${shortDay(m.start_date)} → ${shortDay(m.end_date)}`}
                          {m.yearly ? ' · chaque année' : ` ${m.start_date.slice(0, 4)}`}
                        </Text>
                      </View>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>

            <ScrollView style={{ flex: 1 }} contentContainerStyle={s.form}>
              <Text style={s.label}>Nom</Text>
              <TextInput value={title} onChangeText={setTitle} placeholder="ex. Festival du film de Lama" placeholderTextColor={CAL.texteDoux} style={s.input as any} />

              <Text style={s.label}>Dates</Text>
              <Text style={s.hint}>Clique sur le premier jour puis sur le dernier. Un seul clic = un seul jour.</Text>
              <View style={s.calendar}>
                <Calendar
                  key={`${editId ?? 'new'}-${visible}`}
                  current={start || initialDate || undefined}
                  markingType="period"
                  markedDates={marked}
                  onDayPress={(d) => onDay(d.dateString)}
                  firstDay={1}
                  theme={{ todayTextColor: CAL.or, arrowColor: CAL.nuit, textDayFontFamily: CAL.font, textMonthFontFamily: CAL.fontBold, textDayHeaderFontFamily: CAL.fontBold, monthTextColor: CAL.texte }}
                />
              </View>
              <Text style={s.summary}>
                {start ? (end && end !== start ? `Du ${longDay(start)} au ${longDay(end)}` : `Le ${longDay(start)}`) : 'Aucune date choisie.'}
              </Text>

              <Text style={s.label}>Couleur du fond</Text>
              <View style={s.colors}>
                {MARK_COLORS.map((c) => (
                  <Pressable key={c.value} onPress={() => setColor(c.value)} style={[s.colorBtn, { backgroundColor: c.fond }, color === c.value && { borderColor: c.texte, borderWidth: 2 }]}>
                    <Text style={[s.colorText, { color: c.texte }]}>{c.label}</Text>
                  </Pressable>
                ))}
              </View>

              <Pressable onPress={() => setYearly((v) => !v)} style={s.check} accessibilityRole="checkbox" accessibilityState={{ checked: yearly }}>
                <MaterialCommunityIcons name={yearly ? 'checkbox-marked' : 'checkbox-blank-outline'} size={20} color={CAL.nuit} />
                <Text style={s.checkText}>Revient chaque année aux mêmes dates</Text>
              </Pressable>

              {error ? <Text style={s.error}>{error}</Text> : null}

              <View style={s.actions}>
                <Pressable onPress={submit} disabled={!canSave || save.isPending} style={({ hovered }: any) => [s.primary, (!canSave || save.isPending) && { opacity: 0.45 }, hovered && canSave && { backgroundColor: CAL.nuitSoft }]}>
                  <Text style={s.primaryText}>{save.isPending ? 'Enregistrement…' : editId ? 'Enregistrer' : 'Ajouter au calendrier'}</Text>
                </Pressable>
                {editId && (
                  <Pressable onPress={askDelete} style={({ hovered }: any) => [s.danger, hovered && { backgroundColor: '#FBECEC' }]}>
                    <Text style={s.dangerText}>Supprimer</Text>
                  </Pressable>
                )}
              </View>
            </ScrollView>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const s = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(15,34,64,0.35)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  sheet: { width: 860, maxWidth: '100%', height: 740, maxHeight: '100%', backgroundColor: CAL.blanc, borderRadius: 10, overflow: 'hidden', cursor: 'auto' as any },
  head: { flexDirection: 'row', alignItems: 'baseline', gap: 12, paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: CAL.brume },
  title: { fontFamily: CAL.fontBold, fontSize: 19, color: CAL.texte },
  sub: { fontFamily: CAL.font, fontSize: 13, color: CAL.texteDoux },
  close: { padding: 6, borderRadius: 5, alignSelf: 'center' },
  body: { flex: 1, flexDirection: 'row', minHeight: 0 },
  list: { width: 280, borderRightWidth: 1, borderRightColor: CAL.brume, padding: 14 },
  newBtn: { borderWidth: 1, borderColor: CAL.brume, borderRadius: 6, paddingVertical: 9, alignItems: 'center' },
  newBtnOn: { backgroundColor: CAL.nuit, borderColor: CAL.nuit },
  newText: { fontFamily: CAL.fontBold, fontSize: 14, color: CAL.texte },
  empty: { fontFamily: CAL.font, fontSize: 13, color: CAL.texteDoux, padding: 8 },
  item: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 8, borderRadius: 6 },
  itemOn: { backgroundColor: CAL.orClair },
  swatch: { width: 16, height: 16, borderRadius: 4, borderWidth: 1 },
  itemTitle: { fontFamily: CAL.fontBold, fontSize: 14, color: CAL.texte },
  itemSub: { fontFamily: CAL.font, fontSize: 12, color: CAL.texteDoux },
  form: { padding: 20, gap: 6 },
  label: { fontFamily: CAL.fontBold, fontSize: 14, color: CAL.texte, marginTop: 8 },
  hint: { fontFamily: CAL.font, fontSize: 12, color: CAL.texteDoux },
  input: { borderWidth: 1, borderColor: CAL.brume, borderRadius: 6, paddingHorizontal: 10, height: 38, fontFamily: CAL.font, fontSize: 14, color: CAL.texte, outlineStyle: 'none' } as any,
  calendar: { borderWidth: 1, borderColor: CAL.brume, borderRadius: 8, overflow: 'hidden', marginTop: 4 },
  summary: { fontFamily: CAL.font, fontSize: 13, color: CAL.texte, marginTop: 4 },
  colors: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  colorBtn: { paddingVertical: 7, paddingHorizontal: 14, borderRadius: 16, borderWidth: 1, borderColor: 'transparent' },
  colorText: { fontFamily: CAL.fontBold, fontSize: 13 },
  check: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12 },
  checkText: { fontFamily: CAL.font, fontSize: 14, color: CAL.texte },
  error: { fontFamily: CAL.fontBold, fontSize: 13, color: CAL.changement, marginTop: 8 },
  actions: { flexDirection: 'row', gap: 10, marginTop: 16 },
  primary: { flex: 1, backgroundColor: CAL.nuit, borderRadius: 6, paddingVertical: 11, alignItems: 'center' },
  primaryText: { fontFamily: CAL.fontBold, fontSize: 14, color: CAL.blanc },
  danger: { borderWidth: 1, borderColor: '#EBC3C3', borderRadius: 6, paddingVertical: 11, paddingHorizontal: 18, alignItems: 'center' },
  dangerText: { fontFamily: CAL.fontBold, fontSize: 14, color: CAL.changement },
});
