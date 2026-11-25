import { useEffect, useMemo, useState } from 'react';
import { View, Text, Pressable, ScrollView, TextInput, StyleSheet, ActivityIndicator, useWindowDimensions } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Calendar } from 'react-native-calendars';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { differenceInDays, eachDayOfInterval, format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useActiveProperties } from '@/hooks/useProperties';
import { useReservations, useCreateBlocks, useUpdateBlock, useDeleteReservation } from '@/hooks/useReservations';
import { reservationsService } from '@/services/reservations';
import { BLOCK_REASONS } from '@/constants/blocks';
import { BlockReason, Property } from '@/types';
import { CAL } from '@/components/calendar/web/tokens';
import { Alert } from '@/utils/alert';

const LOCK = '#6E6457';
const LOCK_BG = '#EFEBE4';
const longDate = (iso: string, withYear = false) => format(parseISO(iso), withYear ? 'EEEE d MMMM yyyy' : 'EEEE d MMMM', { locale: fr });
const groupOf = (p: Property) => p.group_name?.trim() || 'Autres logements';

type Conflict = { propertyName: string; label: string; from: string; to: string };

export default function BlockDatesScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const wide = width >= 900;
  const params = useLocalSearchParams<{ propertyId?: string; checkIn?: string; id?: string }>();
  const editId = typeof params.id === 'string' ? params.id : undefined;

  const { data: properties, isLoading: propLoading } = useActiveProperties();
  const { data: blocks, isLoading: blocksLoading } = useReservations(editId ? { kind: 'block' } : undefined);
  const editing = useMemo(() => (editId ? (blocks ?? []).find((b) => b.id === editId) ?? null : null), [blocks, editId]);

  const createBlocks = useCreateBlocks();
  const updateBlock = useUpdateBlock();
  const deleteResa = useDeleteReservation();

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [start, setStart] = useState<string>('');
  const [end, setEnd] = useState<string>('');
  const [reason, setReason] = useState<BlockReason>('personal');
  const [notes, setNotes] = useState('');
  const [conflicts, setConflicts] = useState<Conflict[]>([]);
  const [error, setError] = useState('');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (ready) return;
    if (editId) {
      if (!editing) return;
      setSelected(new Set([editing.property_id]));
      setStart(editing.check_in);
      setEnd(editing.check_out);
      setReason(editing.block_reason ?? 'other');
      setNotes(editing.notes ?? '');
      setReady(true);
      return;
    }
    if (typeof params.propertyId === 'string') setSelected(new Set([params.propertyId]));
    if (typeof params.checkIn === 'string') setStart(params.checkIn);
    setReady(true);
  }, [editId, editing, params.propertyId, params.checkIn, ready]);

  const groups = useMemo(() => {
    const map = new Map<string, Property[]>();
    (properties ?? []).forEach((p) => map.set(groupOf(p), [...(map.get(groupOf(p)) ?? []), p]));
    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b, 'fr'))
      .map(([name, list]) => ({ name, list: list.sort((a, b) => a.name.localeCompare(b.name, 'fr', { numeric: true })) }));
  }, [properties]);

  const nights = start && end ? differenceInDays(parseISO(end), parseISO(start)) : 0;

  const marked = useMemo(() => {
    if (!start) return {};
    if (!end) return { [start]: { startingDay: true, endingDay: true, color: LOCK, textColor: CAL.blanc } };
    const days = eachDayOfInterval({ start: parseISO(start), end: parseISO(end) });
    const out: Record<string, object> = {};
    days.forEach((d, i) => {
      const iso = format(d, 'yyyy-MM-dd');
      const edge = i === 0 || i === days.length - 1;
      out[iso] = {
        startingDay: i === 0,
        endingDay: i === days.length - 1,
        color: edge ? LOCK : LOCK_BG,
        textColor: edge ? CAL.blanc : CAL.texte,
      };
    });
    return out;
  }, [start, end]);

  const onDay = (iso: string) => {
    setConflicts([]);
    setError('');
    if (!start || (start && end)) { setStart(iso); setEnd(''); return; }
    if (iso <= start) { setStart(iso); return; }
    setEnd(iso);
  };

  const toggle = (id: string) => {
    if (editId) return;
    setConflicts([]);
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleGroup = (list: Property[]) => {
    if (editId) return;
    setConflicts([]);
    setSelected((prev) => {
      const next = new Set(prev);
      const all = list.every((p) => next.has(p.id));
      list.forEach((p) => (all ? next.delete(p.id) : next.add(p.id)));
      return next;
    });
  };

  const canSave = selected.size > 0 && !!start && !!end && nights > 0;
  const saving = createBlocks.isPending || updateBlock.isPending;

  const save = async () => {
    if (!canSave || saving) return;
    setError('');
    try {
      const ids = Array.from(selected);
      const overlaps = await reservationsService.findOverlaps(ids, start, end, editId);
      if (overlaps.length > 0) {
        const byId = new Map((properties ?? []).map((p) => [p.id, p.name]));
        setConflicts(overlaps.map((o) => ({
          propertyName: byId.get(o.property_id) ?? 'Logement',
          label: o.kind === 'block' ? 'déjà bloqué' : `réservé par ${o.guest_name}`,
          from: o.check_in,
          to: o.check_out,
        })));
        return;
      }
      if (editId) await updateBlock.mutateAsync({ id: editId, checkIn: start, checkOut: end, reason, notes });
      else await createBlocks.mutateAsync({ propertyIds: ids, checkIn: start, checkOut: end, reason, notes });
      if (router.canGoBack()) router.back(); else router.replace('/(app)/(tabs)/properties');
    } catch (e: any) {
      setError(e?.message ? `L’enregistrement a échoué : ${e.message}` : 'L’enregistrement a échoué. Vérifie ta connexion et réessaie.');
    }
  };

  const remove = () => {
    if (!editId) return;
    Alert.alert('Supprimer ce blocage ?', 'Les dates redeviennent libres. Cette action est définitive.', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Supprimer',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteResa.mutateAsync(editId);
            router.back();
          } catch {
            setError('La suppression a échoué. Réessaie.');
          }
        },
      },
    ]);
  };

  const loading = propLoading || (!!editId && blocksLoading);
  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={CAL.nuit} />
      </View>
    );
  }
  if (editId && !editing) {
    return (
      <View style={styles.center}>
        <Text style={styles.centerTitle}>Ce blocage n’existe plus.</Text>
        <Pressable onPress={() => router.back()} style={styles.ghostBtn}><Text style={styles.ghostText}>Retour</Text></Pressable>
      </View>
    );
  }

  const selectedNames = (properties ?? []).filter((p) => selected.has(p.id)).map((p) => p.name);

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <View style={styles.topBar}>
        <Pressable onPress={() => (router.canGoBack() ? router.back() : router.replace('/(app)/(tabs)/properties'))} style={({ hovered }: any) => [styles.back, hovered && { backgroundColor: CAL.nuitSoft }]} accessibilityLabel="Retour">
          <Text style={styles.backText}>‹ Retour</Text>
        </Pressable>
        <MaterialCommunityIcons name="lock" size={18} color={CAL.or} />
        <Text style={styles.title}>{editId ? 'Modifier le blocage' : 'Bloquer des dates'}</Text>
      </View>

      <ScrollView contentContainerStyle={[styles.body, wide && styles.bodyWide]}>
        <View style={[styles.col, wide && { flex: 1 }]}>
          <Text style={styles.step}>{editId ? 'Logement' : 'Logements'}</Text>
          {editId ? null : <Text style={styles.hint}>Tu peux en choisir plusieurs. Clique sur un site pour tout cocher.</Text>}
          {groups.map((g) => {
            const all = g.list.every((p) => selected.has(p.id));
            return (
              <View key={g.name} style={styles.group}>
                <Pressable onPress={() => toggleGroup(g.list)} disabled={!!editId} style={styles.groupHead}>
                  <Text style={styles.groupName}>{g.name}</Text>
                  {!editId && <Text style={styles.groupAll}>{all ? 'tout décocher' : 'tout cocher'}</Text>}
                </Pressable>
                <View style={styles.chips}>
                  {g.list.map((p) => {
                    const on = selected.has(p.id);
                    if (editId && !on) return null;
                    return (
                      <Pressable
                        key={p.id}
                        onPress={() => toggle(p.id)}
                        accessibilityRole="checkbox"
                        accessibilityState={{ checked: on }}
                        style={({ hovered }: any) => [styles.chip, on && styles.chipOn, hovered && !on && { backgroundColor: CAL.brumeClair }]}
                      >
                        <View style={[styles.swatch, { backgroundColor: p.color }]} />
                        <Text style={[styles.chipText, on && styles.chipTextOn]}>{p.name}</Text>
                        {on && <MaterialCommunityIcons name="lock" size={12} color={CAL.blanc} />}
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            );
          })}

          <Text style={[styles.step, { marginTop: 20 }]}>Motif</Text>
          <View style={styles.chips}>
            {BLOCK_REASONS.map((r) => (
              <Pressable
                key={r.value}
                onPress={() => setReason(r.value)}
                style={({ hovered }: any) => [styles.chip, reason === r.value && styles.chipOn, hovered && reason !== r.value && { backgroundColor: CAL.brumeClair }]}
              >
                <Text style={[styles.chipText, reason === r.value && styles.chipTextOn]}>{r.label}</Text>
              </Pressable>
            ))}
          </View>
          <TextInput
            value={notes}
            onChangeText={setNotes}
            placeholder="Note (facultatif) : ex. peinture de la chambre"
            placeholderTextColor={CAL.texteDoux}
            style={styles.notes as any}
            multiline
          />
        </View>

        <View style={[styles.col, wide && { width: 380 }]}>
          <Text style={styles.step}>Dates</Text>
          <Text style={styles.hint}>Clique sur le premier jour, puis sur le jour où le logement redevient libre.</Text>
          <View style={styles.calendarBox}>
            <Calendar
              key={editId ?? 'new'}
              current={start || undefined}
              markingType="period"
              markedDates={marked}
              onDayPress={(d) => onDay(d.dateString)}
              firstDay={1}
              theme={{
                todayTextColor: CAL.or,
                arrowColor: CAL.nuit,
                textDayFontFamily: CAL.font,
                textMonthFontFamily: CAL.fontBold,
                textDayHeaderFontFamily: CAL.fontBold,
                monthTextColor: CAL.texte,
              }}
            />
          </View>

          <View style={styles.summary}>
            {start && end ? (
              <>
                <Text style={styles.summaryMain}>{nights} nuit{nights > 1 ? 's' : ''} bloquée{nights > 1 ? 's' : ''}</Text>
                <Text style={styles.summarySub}>du {longDate(start, start.slice(0, 4) !== end.slice(0, 4))} au {longDate(end, start.slice(0, 4) !== end.slice(0, 4))}</Text>
                {selectedNames.length > 0 && (
                  <Text style={styles.summarySub} numberOfLines={2}>
                    {selectedNames.length === 1 ? selectedNames[0] : `${selectedNames.length} logements : ${selectedNames.join(', ')}`}
                  </Text>
                )}
                <Text style={styles.summaryNote}>Ces nuits ne comptent pas dans le taux de remplissage, et aucun ménage n’est prévu.</Text>
              </>
            ) : start ? (
              <Text style={styles.summarySub}>Début : {longDate(start)}. Choisis maintenant le jour de fin.</Text>
            ) : (
              <Text style={styles.summarySub}>Aucune date choisie.</Text>
            )}
          </View>

          {conflicts.length > 0 && (
            <View style={styles.conflict}>
              <Text style={styles.conflictTitle}>Impossible de bloquer ces dates :</Text>
              {conflicts.map((c, i) => (
                <Text key={i} style={styles.conflictLine}>
                  · {c.propertyName} est {c.label} du {format(parseISO(c.from), 'd MMM', { locale: fr })} au {format(parseISO(c.to), 'd MMM', { locale: fr })}
                </Text>
              ))}
              <Text style={styles.conflictHint}>Décoche ce logement ou change les dates.</Text>
            </View>
          )}
          {error ? <Text style={styles.error}>{error}</Text> : null}

          <Pressable
            onPress={save}
            disabled={!canSave || saving}
            style={({ hovered }: any) => [styles.primaryBtn, (!canSave || saving) && { opacity: 0.45 }, hovered && canSave && { backgroundColor: CAL.nuitSoft }]}
          >
            <Text style={styles.primaryText}>
              {saving ? 'Enregistrement…' : editId ? 'Enregistrer' : selected.size > 1 ? `Bloquer ${selected.size} logements` : 'Bloquer ces dates'}
            </Text>
          </Pressable>
          {editId && (
            <Pressable onPress={remove} style={({ hovered }: any) => [styles.dangerBtn, hovered && { backgroundColor: '#FBECEC' }]}>
              <Text style={styles.dangerText}>Supprimer le blocage</Text>
            </Pressable>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: CAL.blanc },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 24 },
  centerTitle: { fontFamily: CAL.fontBold, fontSize: 16, color: CAL.texte },
  topBar: { height: 56, backgroundColor: CAL.nuit, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, gap: 10 },
  back: { paddingVertical: 6, paddingHorizontal: 10, marginRight: 6, borderRadius: 5, borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)' },
  backText: { fontFamily: CAL.fontBold, fontSize: 14, color: CAL.blanc },
  title: { fontFamily: CAL.fontBold, fontSize: 19, color: CAL.blanc },
  body: { padding: 20, gap: 24 },
  bodyWide: { flexDirection: 'row', alignItems: 'flex-start', gap: 40, maxWidth: 1100, width: '100%', alignSelf: 'center', paddingTop: 28 },
  col: { gap: 6 },
  step: { fontFamily: CAL.fontBold, fontSize: 15, color: CAL.texte },
  hint: { fontFamily: CAL.font, fontSize: 13, color: CAL.texteDoux, marginBottom: 6 },
  group: { marginTop: 8 },
  groupHead: { flexDirection: 'row', alignItems: 'baseline', gap: 10, marginBottom: 6 },
  groupName: { fontFamily: CAL.fontBold, fontSize: 13, color: CAL.texteDoux, textTransform: 'uppercase', letterSpacing: 0.6 },
  groupAll: { fontFamily: CAL.font, fontSize: 12, color: CAL.texteDoux, textDecorationLine: 'underline' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 7, paddingVertical: 7, paddingHorizontal: 12, borderRadius: 18, borderWidth: 1, borderColor: CAL.brume, backgroundColor: CAL.blanc },
  chipOn: { backgroundColor: LOCK, borderColor: LOCK },
  chipText: { fontFamily: CAL.font, fontSize: 14, color: CAL.texte },
  chipTextOn: { fontFamily: CAL.fontBold, color: CAL.blanc },
  swatch: { width: 9, height: 9, borderRadius: 5 },
  notes: { marginTop: 10, minHeight: 64, borderWidth: 1, borderColor: CAL.brume, borderRadius: 6, padding: 10, fontFamily: CAL.font, fontSize: 14, color: CAL.texte, outlineStyle: 'none' } as any,
  calendarBox: { borderWidth: 1, borderColor: CAL.brume, borderRadius: 8, overflow: 'hidden' },
  summary: { marginTop: 12, backgroundColor: LOCK_BG, borderRadius: 6, padding: 12, gap: 3 },
  summaryMain: { fontFamily: CAL.fontBold, fontSize: 16, color: LOCK },
  summarySub: { fontFamily: CAL.font, fontSize: 14, color: CAL.texte },
  summaryNote: { fontFamily: CAL.font, fontSize: 12, color: CAL.texteDoux, marginTop: 4 },
  conflict: { marginTop: 10, borderLeftWidth: 3, borderLeftColor: CAL.changement, backgroundColor: '#FBECEC', padding: 10, borderRadius: 4, gap: 2 },
  conflictTitle: { fontFamily: CAL.fontBold, fontSize: 14, color: CAL.changement },
  conflictLine: { fontFamily: CAL.font, fontSize: 13, color: CAL.texte },
  conflictHint: { fontFamily: CAL.font, fontSize: 12, color: CAL.texteDoux, marginTop: 4 },
  error: { fontFamily: CAL.fontBold, fontSize: 13, color: CAL.changement, marginTop: 8 },
  primaryBtn: { marginTop: 14, backgroundColor: CAL.nuit, borderRadius: 6, paddingVertical: 12, alignItems: 'center' },
  primaryText: { fontFamily: CAL.fontBold, fontSize: 15, color: CAL.blanc },
  ghostBtn: { borderWidth: 1, borderColor: CAL.brume, borderRadius: 6, paddingVertical: 10, paddingHorizontal: 18 },
  ghostText: { fontFamily: CAL.fontBold, fontSize: 14, color: CAL.texte },
  dangerBtn: { marginTop: 8, borderWidth: 1, borderColor: '#EBC3C3', borderRadius: 6, paddingVertical: 10, alignItems: 'center' },
  dangerText: { fontFamily: CAL.fontBold, fontSize: 14, color: CAL.changement },
});
