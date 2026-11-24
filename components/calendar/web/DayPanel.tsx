import { ReactNode } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Property, Reservation } from '@/types';
import { CAL, PANEL_WIDTH } from './tokens';
import { DayModel, guestCount, linenFor } from './dayModel';
import { ChannelBadge } from '@/components/ui/ChannelBadge';
import { channelOf } from '@/constants/channels';

interface DayPanelProps {
  model: DayModel;
  propertiesById: Map<string, Property>;
  selectedResa: Reservation | null;
  emptySlotProperty: Property | null;
  canGoBack: boolean;
  canGoForward: boolean;
  onPrevDay: () => void;
  onNextDay: () => void;
  onSelectResa: (resa: Reservation) => void;
  onCloseResa: () => void;
  onOpenResa: (resa: Reservation) => void;
  onEditResa: (resa: Reservation) => void;
  onNewResa: (property: Property, date: string) => void;
}

const longDate = (iso: string) => format(parseISO(iso), 'EEEE d MMMM yyyy', { locale: fr });
const shortDate = (iso: string) => format(parseISO(iso), 'EEE d MMM', { locale: fr });

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function Section({ title, count, tone, children }: { title: string; count: number; tone?: 'alert'; children: ReactNode }) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHead}>
        <Text style={[styles.sectionTitle, tone === 'alert' && { color: CAL.changement }]}>{title}</Text>
        <Text style={[styles.sectionCount, tone === 'alert' && { color: CAL.changement }]}>{count}</Text>
      </View>
      {children}
    </View>
  );
}

function ResaLine({
  resa,
  property,
  detail,
  onPress,
}: {
  resa: Reservation;
  property?: Property;
  detail: string;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={({ hovered }: any) => [styles.line, hovered && styles.lineHover]}>
      <View style={[styles.tab, { backgroundColor: property?.color ?? CAL.brume }]} />
      <ChannelBadge channel={channelOf(resa)} size={18} />
      <View style={{ flex: 1 }}>
        <Text style={styles.lineTitle} numberOfLines={1}>
          {property?.name ?? 'Logement'} · {resa.guest_name}
        </Text>
        <Text style={styles.lineDetail} numberOfLines={1}>{detail}</Text>
      </View>
    </Pressable>
  );
}

function arrivalDetail(resa: Reservation) {
  const time = resa.check_in_time ? resa.check_in_time.slice(0, 5) : null;
  const timePart = time ? (resa.check_in_time_confirmed ? `arrivée ${time}` : `arrivée ${time} à confirmer`) : 'heure à confirmer';
  return `${timePart} · ${guestCount(resa)} voy. · ${resa.nb_nights} n.`;
}

function LinenSummary({ linen }: { linen: DayModel['linen'] }) {
  const items = [
    { n: linen.double_sheets, one: 'parure double', many: 'parures doubles' },
    { n: linen.single_sheets, one: 'parure simple', many: 'parures simples' },
    { n: linen.baby_sheets, one: 'drap bébé', many: 'draps bébé' },
    { n: linen.bath_towels, one: 'serviette de bain', many: 'serviettes de bain' },
    { n: linen.hand_towels, one: 'serviette de toilette', many: 'serviettes de toilette' },
    { n: linen.bath_mats, one: 'tapis de bain', many: 'tapis de bain' },
    { n: linen.kitchen_towels, one: 'torchon', many: 'torchons' },
  ]
    .filter((i) => i.n > 0)
    .map((i) => ({ n: i.n, label: i.n > 1 ? i.many : i.one }));
  if (items.length === 0) return null;
  return (
    <View style={styles.linen}>
      {items.map((i) => (
        <View key={i.label} style={styles.linenRow}>
          <Text style={styles.linenNum}>{i.n}</Text>
          <Text style={styles.linenLabel}>{i.label}</Text>
        </View>
      ))}
    </View>
  );
}

function ResaDetail({
  resa,
  property,
  onBack,
  onOpen,
  onEdit,
  backLabel,
}: {
  resa: Reservation;
  property?: Property;
  onBack: () => void;
  onOpen: () => void;
  onEdit: () => void;
  backLabel: string;
}) {
  const guests = [
    resa.nb_couples > 0 && `${resa.nb_couples} couple${resa.nb_couples > 1 ? 's' : ''}`,
    resa.nb_solo_adults > 0 && `${resa.nb_solo_adults} adulte${resa.nb_solo_adults > 1 ? 's' : ''} seul${resa.nb_solo_adults > 1 ? 's' : ''}`,
    resa.nb_children > 0 && `${resa.nb_children} enfant${resa.nb_children > 1 ? 's' : ''}`,
    resa.nb_babies > 0 && `${resa.nb_babies} bébé${resa.nb_babies > 1 ? 's' : ''}`,
  ].filter(Boolean).join(', ');
  const time = resa.check_in_time ? resa.check_in_time.slice(0, 5) : null;

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.body}>
      <Pressable onPress={onBack} style={({ hovered }: any) => [styles.back, hovered && { opacity: 0.7 }]}>
        <Text style={styles.backText}>‹ {backLabel}</Text>
      </Pressable>

      <View style={styles.resaHead}>
        <View style={[styles.tabTall, { backgroundColor: property?.color ?? CAL.brume }]} />
        <View style={{ flex: 1 }}>
          <Text style={styles.resaGuest}>{resa.guest_name}</Text>
          <Text style={styles.resaProperty}>{property?.name}</Text>
        </View>
      </View>

      <View style={styles.stay}>
        <View style={{ flex: 1 }}>
          <Text style={styles.stayLabel}>Arrivée</Text>
          <Text style={styles.stayValue}>{capitalize(shortDate(resa.check_in))}</Text>
          <Text style={styles.stayHint}>{time ? `${time}${resa.check_in_time_confirmed ? '' : ' · à confirmer'}` : 'Heure à confirmer'}</Text>
        </View>
        <View style={styles.nights}>
          <Text style={styles.nightsNum}>{resa.nb_nights}</Text>
          <Text style={styles.nightsLabel}>nuit{resa.nb_nights > 1 ? 's' : ''}</Text>
        </View>
        <View style={{ flex: 1, alignItems: 'flex-end' }}>
          <Text style={styles.stayLabel}>Départ</Text>
          <Text style={styles.stayValue}>{capitalize(shortDate(resa.check_out))}</Text>
        </View>
      </View>

      <View style={styles.facts}>
        <Fact label="Voyageurs" value={guests || '—'} />
        <View style={styles.fact}>
          <Text style={styles.factLabel}>Provenance</Text>
          <ChannelBadge channel={channelOf(resa)} size={18} withLabel labelColor={CAL.texte} />
        </View>
        <Fact label="Statut" value={resa.status === 'pending' ? 'En attente' : resa.status === 'completed' ? 'Terminée' : 'Confirmée'} />
        {resa.guest_phone ? <Fact label="Téléphone" value={resa.guest_phone} /> : null}
        {resa.notes ? <Fact label="Notes" value={resa.notes} /> : null}
      </View>

      <Text style={styles.subTitle}>Linge pour ce séjour</Text>
      <LinenSummary linen={linenFor(resa, property)} />

      <View style={styles.actions}>
        <Pressable onPress={onOpen} style={({ hovered }: any) => [styles.btnPrimary, hovered && { backgroundColor: CAL.nuitSoft }]}>
          <Text style={styles.btnPrimaryText}>Ouvrir la fiche</Text>
        </Pressable>
        <Pressable onPress={onEdit} style={({ hovered }: any) => [styles.btnGhost, hovered && { backgroundColor: CAL.brumeClair }]}>
          <Text style={styles.btnGhostText}>Modifier</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.fact}>
      <Text style={styles.factLabel}>{label}</Text>
      <Text style={styles.factValue}>{value}</Text>
    </View>
  );
}

export function DayPanel(props: DayPanelProps) {
  const { model, propertiesById, selectedResa } = props;
  const prop = (r: Reservation) => propertiesById.get(r.property_id);

  if (selectedResa) {
    return (
      <View style={styles.panel}>
        <ResaDetail
          resa={selectedResa}
          property={prop(selectedResa)}
          backLabel={capitalize(format(parseISO(model.date), 'EEEE d MMMM', { locale: fr }))}
          onBack={props.onCloseResa}
          onOpen={() => props.onOpenResa(selectedResa)}
          onEdit={() => props.onEditResa(selectedResa)}
        />
      </View>
    );
  }

  const turnoverIds = new Set(model.turnovers.flatMap((t) => [t.departure.id, t.arrival.id]));
  const departures = model.departures.filter((r) => !turnoverIds.has(r.id));
  const arrivals = model.arrivals.filter((r) => !turnoverIds.has(r.id));
  const nothing = model.departures.length === 0 && model.arrivals.length === 0;

  return (
    <View style={styles.panel}>
      <View style={styles.dayHead}>
        <Pressable onPress={props.onPrevDay} disabled={!props.canGoBack} style={({ hovered }: any) => [styles.dayNav, hovered && styles.dayNavHover, !props.canGoBack && { opacity: 0.3 }]} accessibilityLabel="Jour précédent">
          <Text style={styles.dayNavText}>‹</Text>
        </Pressable>
        <Text style={styles.dayTitle}>{capitalize(longDate(model.date))}</Text>
        <Pressable onPress={props.onNextDay} disabled={!props.canGoForward} style={({ hovered }: any) => [styles.dayNav, hovered && styles.dayNavHover, !props.canGoForward && { opacity: 0.3 }]} accessibilityLabel="Jour suivant">
          <Text style={styles.dayNavText}>›</Text>
        </Pressable>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.body}>
        {props.emptySlotProperty && (
          <Pressable
            onPress={() => props.onNewResa(props.emptySlotProperty!, model.date)}
            style={({ hovered }: any) => [styles.newResa, hovered && { backgroundColor: CAL.orClair }]}
          >
            <Text style={styles.newResaText}>+ Nouvelle réservation</Text>
            <Text style={styles.newResaHint}>{props.emptySlotProperty.name}, arrivée le {format(parseISO(model.date), 'd MMMM', { locale: fr })}</Text>
          </Pressable>
        )}

        {model.turnovers.length > 0 && (
          <Section title="Ménages entre deux séjours" count={model.turnovers.length} tone="alert">
            {model.turnovers.map((t) => (
              <View key={t.property.id} style={styles.turnover}>
                <View style={[styles.tab, { backgroundColor: t.property.color }]} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.lineTitle}>{t.property.name}</Text>
                  <Pressable onPress={() => props.onSelectResa(t.departure)}>
                    <Text style={styles.turnoverLink}>Départ : {t.departure.guest_name}</Text>
                  </Pressable>
                  <Pressable onPress={() => props.onSelectResa(t.arrival)}>
                    <Text style={styles.turnoverLink}>Arrivée : {t.arrival.guest_name}{t.arrival.check_in_time ? ` à ${t.arrival.check_in_time.slice(0, 5)}` : ''}</Text>
                  </Pressable>
                </View>
              </View>
            ))}
          </Section>
        )}

        {departures.length > 0 && (
          <Section title="Départs" count={departures.length}>
            {departures.map((r) => (
              <ResaLine key={r.id} resa={r} property={prop(r)} detail={`${r.nb_nights} n. · ménage à prévoir`} onPress={() => props.onSelectResa(r)} />
            ))}
          </Section>
        )}

        {arrivals.length > 0 && (
          <Section title="Arrivées" count={arrivals.length}>
            {arrivals.map((r) => (
              <ResaLine key={r.id} resa={r} property={prop(r)} detail={arrivalDetail(r)} onPress={() => props.onSelectResa(r)} />
            ))}
          </Section>
        )}

        {model.arrivals.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.subTitle, { marginTop: 0 }]}>Linge à préparer pour les arrivées</Text>
            <LinenSummary linen={model.linen} />
          </View>
        )}

        {nothing && (
          <Text style={styles.empty}>Aucun départ ni arrivée ce jour-là.</Text>
        )}

        <Section title="En séjour" count={model.staying.length}>
          {model.staying.length === 0 ? (
            <Text style={styles.lineDetail}>Tous les logements sont libres.</Text>
          ) : (
            model.staying.map((r) => (
              <ResaLine key={r.id} resa={r} property={prop(r)} detail={`jusqu'au ${format(parseISO(r.check_out), 'd MMM', { locale: fr })}`} onPress={() => props.onSelectResa(r)} />
            ))
          )}
        </Section>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: { width: PANEL_WIDTH, borderLeftWidth: 1, borderLeftColor: CAL.brume, backgroundColor: CAL.blanc },
  body: { padding: 20, paddingTop: 12, gap: 4 },
  dayHead: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, height: 56, borderBottomWidth: 1, borderBottomColor: CAL.brume, gap: 4 },
  dayTitle: { flex: 1, textAlign: 'center', fontFamily: CAL.fontBold, fontSize: 17, color: CAL.texte },
  dayNav: { width: 32, height: 32, borderRadius: 4, alignItems: 'center', justifyContent: 'center' },
  dayNavHover: { backgroundColor: CAL.brumeClair },
  dayNavText: { fontFamily: CAL.fontBold, fontSize: 22, color: CAL.texte, lineHeight: 24 },
  section: { marginTop: 14 },
  sectionHead: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 6 },
  sectionTitle: { fontFamily: CAL.fontBold, fontSize: 14, color: CAL.texte },
  sectionCount: { fontFamily: CAL.fontBold, fontSize: 14, color: CAL.texteDoux },
  line: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 7, paddingHorizontal: 6, marginHorizontal: -6, borderRadius: 4 },
  lineHover: { backgroundColor: CAL.brumeClair },
  tab: { width: 4, alignSelf: 'stretch', borderRadius: 2 },
  tabTall: { width: 5, alignSelf: 'stretch', borderRadius: 2 },
  lineTitle: { fontFamily: CAL.fontBold, fontSize: 14, color: CAL.texte },
  lineDetail: { fontFamily: CAL.font, fontSize: 13, color: CAL.texteDoux, marginTop: 1 },
  turnover: { flexDirection: 'row', gap: 10, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: CAL.brumeClair },
  turnoverLink: { fontFamily: CAL.font, fontSize: 13, color: CAL.texte, marginTop: 2, textDecorationLine: 'underline', textDecorationColor: CAL.brume },
  subTitle: { fontFamily: CAL.fontBold, fontSize: 14, color: CAL.texte, marginTop: 18, marginBottom: 6 },
  linen: { gap: 3 },
  linenRow: { flexDirection: 'row', alignItems: 'baseline', gap: 8 },
  linenNum: { fontFamily: CAL.fontBold, fontSize: 15, color: CAL.texte, width: 24, textAlign: 'right', fontVariant: ['tabular-nums'] },
  linenLabel: { fontFamily: CAL.font, fontSize: 14, color: CAL.texte },
  empty: { fontFamily: CAL.font, fontSize: 14, color: CAL.texteDoux, marginTop: 16 },
  newResa: { borderWidth: 1, borderColor: CAL.or, borderStyle: 'dashed', borderRadius: 6, padding: 12, marginTop: 8 },
  newResaText: { fontFamily: CAL.fontBold, fontSize: 14, color: CAL.texte },
  newResaHint: { fontFamily: CAL.font, fontSize: 13, color: CAL.texteDoux, marginTop: 2 },
  back: { paddingVertical: 6, alignSelf: 'flex-start' },
  backText: { fontFamily: CAL.fontBold, fontSize: 14, color: CAL.texteDoux },
  resaHead: { flexDirection: 'row', gap: 12, marginTop: 10 },
  resaGuest: { fontFamily: CAL.fontBold, fontSize: 22, color: CAL.texte },
  resaProperty: { fontFamily: CAL.font, fontSize: 15, color: CAL.texteDoux, marginTop: 2 },
  stay: { flexDirection: 'row', alignItems: 'center', marginTop: 20, paddingVertical: 14, borderTopWidth: 1, borderBottomWidth: 1, borderColor: CAL.brume },
  stayLabel: { fontFamily: CAL.font, fontSize: 12, color: CAL.texteDoux },
  stayValue: { fontFamily: CAL.fontBold, fontSize: 16, color: CAL.texte, marginTop: 2 },
  stayHint: { fontFamily: CAL.font, fontSize: 12, color: CAL.texteDoux, marginTop: 2 },
  nights: { alignItems: 'center', paddingHorizontal: 12 },
  nightsNum: { fontFamily: CAL.fontBold, fontSize: 22, color: CAL.texte },
  nightsLabel: { fontFamily: CAL.font, fontSize: 12, color: CAL.texteDoux },
  facts: { marginTop: 14, gap: 10 },
  fact: { flexDirection: 'row', gap: 12 },
  factLabel: { fontFamily: CAL.font, fontSize: 13, color: CAL.texteDoux, width: 92 },
  factValue: { fontFamily: CAL.font, fontSize: 14, color: CAL.texte, flex: 1 },
  actions: { flexDirection: 'row', gap: 10, marginTop: 24 },
  btnPrimary: { backgroundColor: CAL.nuit, borderRadius: 5, paddingVertical: 10, paddingHorizontal: 16 },
  btnPrimaryText: { fontFamily: CAL.fontBold, fontSize: 14, color: CAL.blanc },
  btnGhost: { borderWidth: 1, borderColor: CAL.brume, borderRadius: 5, paddingVertical: 10, paddingHorizontal: 16 },
  btnGhostText: { fontFamily: CAL.fontBold, fontSize: 14, color: CAL.texte },
});
