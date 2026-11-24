import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, Pressable, StyleSheet, ActivityIndicator, Image } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { addDays, differenceInDays, format, getDay, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useReservationsForMonth } from '@/hooks/useReservations';
import { useActiveProperties } from '@/hooks/useProperties';
import { Property, Reservation } from '@/types';
import { getCurrentSeason, getSeason, SEASON_YEARS } from '@/constants/season';
import { CAL, NAME_WIDTH, ROW_HEIGHT, GROUP_HEIGHT, HEADER_HEIGHT, ZOOM_LEVELS } from './tokens';
import { buildDayModel } from './dayModel';
import { DayPanel } from './DayPanel';
import { ChannelBadge } from '@/components/ui/ChannelBadge';
import { channelOf } from '@/constants/channels';

const sticky = (extra: object) => ({ position: 'sticky', ...extra }) as any;

const toISO = (d: Date) => format(d, 'yyyy-MM-dd');
const todayISO = () => toISO(new Date());

interface Group {
  name: string;
  properties: Property[];
}

function groupProperties(properties: Property[]): Group[] {
  const map = new Map<string, Property[]>();
  properties.forEach((p) => {
    const key = p.group_name?.trim() || 'Autres logements';
    map.set(key, [...(map.get(key) ?? []), p]);
  });
  return Array.from(map.entries())
    .sort(([a], [b]) => (a === 'Autres logements' ? 1 : b === 'Autres logements' ? -1 : a.localeCompare(b, 'fr')))
    .map(([name, props]) => ({ name, properties: props.sort((a, b) => a.name.localeCompare(b.name, 'fr', { numeric: true })) }));
}

export function WebCalendar() {
  const router = useRouter();
  const scrollRef = useRef<any>(null);

  const [seasonYear, setSeasonYear] = useState(() => getCurrentSeason().year);
  const season = useMemo(() => getSeason(seasonYear), [seasonYear]);
  const [zoom, setZoom] = useState(1);
  const dayWidth = ZOOM_LEVELS[zoom];
  const params = useLocalSearchParams<{ site?: string }>();
  const [groupFilter, setGroupFilter] = useState<string | null>(params.site ?? null);
  useEffect(() => {
    if (params.site) setGroupFilter(params.site);
  }, [params.site]);

  const days = useMemo(() => {
    const start = parseISO(season.start);
    const total = differenceInDays(parseISO(season.end), start) + 1;
    return Array.from({ length: total }, (_, i) => toISO(addDays(start, i)));
  }, [season]);

  const initialDay = useCallback(() => {
    const t = todayISO();
    return t >= season.start && t <= season.end ? t : season.start;
  }, [season]);

  const [selectedDay, setSelectedDay] = useState(initialDay);
  const [selectedResa, setSelectedResa] = useState<Reservation | null>(null);
  const [emptySlotProperty, setEmptySlotProperty] = useState<Property | null>(null);

  useEffect(() => {
    userPicked.current = false;
    setSelectedDay(initialDay());
    setSelectedResa(null);
    setEmptySlotProperty(null);
  }, [initialDay]);

  const { data: reservationsData, isLoading: resaLoading, isError, refetch } = useReservationsForMonth(
    season.start,
    toISO(addDays(parseISO(season.end), 1))
  );
  const { data: propertiesData, isLoading: propLoading } = useActiveProperties();
  const userPicked = useRef(false);

  const reservations = useMemo(
    () => (reservationsData ?? []).filter((r) => r.status !== 'cancelled'),
    [reservationsData]
  );
  const propertiesById = useMemo(() => new Map((propertiesData ?? []).map((p) => [p.id, p])), [propertiesData]);
  const groups = useMemo(() => groupProperties(propertiesData ?? []), [propertiesData]);
  const visibleGroups = groupFilter ? groups.filter((g) => g.name === groupFilter) : groups;

  const byProperty = useMemo(() => {
    const map = new Map<string, Reservation[]>();
    reservations.forEach((r) => map.set(r.property_id, [...(map.get(r.property_id) ?? []), r]));
    return map;
  }, [reservations]);

  const turnoverCountByDay = useMemo(() => {
    const counts = new Map<string, number>();
    const arrivals = new Set(reservations.map((r) => `${r.property_id}|${r.check_in}`));
    reservations.forEach((r) => {
      if (arrivals.has(`${r.property_id}|${r.check_out}`)) {
        counts.set(r.check_out, (counts.get(r.check_out) ?? 0) + 1);
      }
    });
    return counts;
  }, [reservations]);

  useEffect(() => {
    if (userPicked.current || !reservationsData) return;
    const t = todayISO();
    if (t >= season.start && t <= season.end) return;
    const firstArrival = reservationsData
      .map((r) => r.check_in)
      .filter((d) => d >= season.start && d <= season.end)
      .sort()[0];
    if (firstArrival) {
      setSelectedDay(firstArrival);
      setTimeout(() => scrollToDayRef.current(firstArrival, false), 60);
    }
  }, [reservationsData, season]);

  const dayModel = useMemo(
    () => buildDayModel(selectedDay, reservations, propertiesById),
    [selectedDay, reservations, propertiesById]
  );

  const dayIndex = (iso: string) => differenceInDays(parseISO(iso), parseISO(season.start));

  const scrollToDay = useCallback(
    (iso: string, smooth = true) => {
      const node = scrollRef.current;
      if (!node || typeof node.scrollTo !== 'function') return;
      const i = differenceInDays(parseISO(iso), parseISO(season.start));
      node.scrollTo({ left: Math.max(0, (i - 3) * dayWidth), behavior: smooth ? 'smooth' : 'auto' });
    },
    [season, dayWidth]
  );

  const scrollToDayRef = useRef(scrollToDay);
  scrollToDayRef.current = scrollToDay;

  useEffect(() => {
    const id = setTimeout(() => scrollToDay(selectedDay, false), 50);
    return () => clearTimeout(id);
  }, [season, dayWidth, propLoading, resaLoading]);

  const selectDay = useCallback(
    (iso: string, property: Property | null = null) => {
      if (iso < season.start || iso > season.end) return;
      userPicked.current = true;
      setSelectedDay(iso);
      setSelectedResa(null);
      setEmptySlotProperty(property);
    },
    [season]
  );

  const shiftDay = useCallback(
    (delta: number) => {
      const next = toISO(addDays(parseISO(selectedDay), delta));
      if (next < season.start || next > season.end) return;
      selectDay(next);
      const node = scrollRef.current;
      if (node) {
        const i = differenceInDays(parseISO(next), parseISO(season.start));
        const left = i * dayWidth;
        const visibleWidth = node.clientWidth - NAME_WIDTH;
        if (left < node.scrollLeft || left + dayWidth > node.scrollLeft + visibleWidth) {
          node.scrollTo({ left: Math.max(0, left - visibleWidth / 2), behavior: 'smooth' });
        }
      }
    },
    [selectedDay, season, selectDay, dayWidth]
  );

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return;
      if (e.key === 'ArrowLeft') { e.preventDefault(); shiftDay(-1); }
      else if (e.key === 'ArrowRight') { e.preventDefault(); shiftDay(1); }
      else if (e.key === 'Escape') { setSelectedResa(null); setEmptySlotProperty(null); }
      else if (e.key === 't' || e.key === 'T') {
        const t = todayISO();
        if (t >= season.start && t <= season.end) { selectDay(t); scrollToDay(t); }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [shiftDay, selectDay, scrollToDay, season]);

  const months = useMemo(() => {
    const seen = new Set<string>();
    const list: { key: string; label: string; first: string }[] = [];
    days.forEach((d) => {
      const key = d.slice(0, 7);
      if (!seen.has(key)) {
        seen.add(key);
        list.push({ key, label: format(parseISO(d), 'MMM', { locale: fr }).replace('.', ''), first: d });
      }
    });
    return list;
  }, [days]);

  const [visibleMonth, setVisibleMonth] = useState<string | null>(null);
  const shownMonth = visibleMonth ?? selectedDay.slice(0, 7);
  const today = todayISO();
  const todayInSeason = today >= season.start && today <= season.end;
  const totalWidth = days.length * dayWidth;
  const loading = resaLoading || propLoading;

  useEffect(() => {
    const node = scrollRef.current;
    if (!node || typeof node.addEventListener !== 'function') return;
    let frame = 0;
    const update = () => {
      frame = 0;
      const atEnd = node.scrollLeft + node.clientWidth >= node.scrollWidth - 2;
      const offset = atEnd ? node.clientWidth - NAME_WIDTH - dayWidth : 3 * dayWidth;
      const i = Math.min(days.length - 1, Math.max(0, Math.floor((node.scrollLeft + offset) / dayWidth)));
      const month = days[i].slice(0, 7);
      setVisibleMonth((prev) => (prev === month ? prev : month));
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    node.addEventListener('scroll', onScroll, { passive: true });
    update();
    return () => {
      node.removeEventListener('scroll', onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [loading, isError, days, dayWidth, groups.length]);

  const gridLines = {
    backgroundImage: `repeating-linear-gradient(to right, transparent 0, transparent ${dayWidth - 1}px, ${CAL.brumeClair} ${dayWidth - 1}px, ${CAL.brumeClair} ${dayWidth}px)`,
  } as any;

  const renderBars = (property: Property) => {
    const resas = byProperty.get(property.id) ?? [];
    const arrivalDates = new Set(resas.map((r) => r.check_in));
    return resas.map((r) => {
      const startI = dayIndex(r.check_in);
      const endI = dayIndex(r.check_out);
      const left = startI < 0 ? 0 : startI * dayWidth + dayWidth / 2 + 1;
      const right = endI >= days.length ? totalWidth : endI * dayWidth + dayWidth / 2 - 1;
      const width = right - left;
      if (width <= 2) return null;
      const isSelected = selectedResa?.id === r.id;
      const isPast = r.check_out < today;
      const turnoverAfter = arrivalDates.has(r.check_out);
      const showText = width > 64;
      return (
        <Pressable
          key={r.id}
          onPress={() => {
            userPicked.current = true;
            if (r.check_in >= season.start && r.check_in <= season.end) setSelectedDay(r.check_in);
            setSelectedResa(r);
            setEmptySlotProperty(null);
          }}
          accessibilityLabel={`${r.guest_name}, ${property.name}, du ${r.check_in} au ${r.check_out}`}
          style={({ hovered }: any) => [
            styles.bar,
            {
              left,
              width,
              backgroundColor: hovered || isSelected ? `${property.color}70` : `${property.color}45`,
              borderLeftColor: property.color,
              opacity: isPast && !isSelected ? 0.7 : 1,
            },
            r.status === 'pending' && styles.barPending,
            isSelected && styles.barSelected,
          ]}
        >
          {width > 22 && <ChannelBadge channel={channelOf(r)} size={14} />}
          {showText && (
            <Text style={styles.barText} numberOfLines={1}>
              {r.guest_name}
              <Text style={styles.barNights}>  {r.nb_nights} n.</Text>
            </Text>
          )}
          {turnoverAfter && <View style={styles.turnoverMark} />}
        </Pressable>
      );
    });
  };

  return (
    <View style={styles.root}>
      <View style={styles.topBar}>
        <Text style={styles.title}>Calendrier</Text>

        <View style={styles.segment}>
          {SEASON_YEARS.map((y) => (
            <Pressable
              key={y}
              onPress={() => setSeasonYear(y)}
              style={({ hovered }: any) => [styles.segmentItem, y === seasonYear && styles.segmentItemOn, hovered && y !== seasonYear && styles.segmentHover]}
            >
              <Text style={[styles.segmentText, y === seasonYear && styles.segmentTextOn]}>Saison {y}</Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.months}>
          {months.map((m) => (
            <Pressable
              key={m.key}
              onPress={() => {
                const target = m.key === today.slice(0, 7) && todayInSeason ? today : m.first;
                selectDay(target);
                scrollToDay(m.first);
              }}
              style={({ hovered }: any) => [styles.month, hovered && styles.monthHover]}
            >
              <Text style={[styles.monthText, m.key === shownMonth && styles.monthTextOn]}>{m.label}</Text>
              {m.key === shownMonth && <View style={styles.monthMark} />}
            </Pressable>
          ))}
        </View>

        <View style={{ flex: 1 }} />

        {todayInSeason && (
          <Pressable onPress={() => { selectDay(today); scrollToDay(today); }} style={({ hovered }: any) => [styles.toolBtn, hovered && styles.toolBtnHover]}>
            <Text style={styles.toolText}>Aujourd'hui</Text>
          </Pressable>
        )}

        <View style={styles.zoom}>
          <Pressable onPress={() => setZoom((z) => Math.max(0, z - 1))} disabled={zoom === 0} style={({ hovered }: any) => [styles.zoomBtn, hovered && styles.toolBtnHover, zoom === 0 && { opacity: 0.35 }]} accessibilityLabel="Dézoomer">
            <Text style={styles.toolText}>−</Text>
          </Pressable>
          <Pressable onPress={() => setZoom((z) => Math.min(ZOOM_LEVELS.length - 1, z + 1))} disabled={zoom === ZOOM_LEVELS.length - 1} style={({ hovered }: any) => [styles.zoomBtn, hovered && styles.toolBtnHover, zoom === ZOOM_LEVELS.length - 1 && { opacity: 0.35 }]} accessibilityLabel="Zoomer">
            <Text style={styles.toolText}>+</Text>
          </Pressable>
        </View>
      </View>

      {groups.length > 1 && (
        <View style={styles.filters}>
          <FilterChip label="Tous les sites" on={groupFilter === null} onPress={() => setGroupFilter(null)} />
          {groups.map((g) => (
            <FilterChip key={g.name} label={g.name} on={groupFilter === g.name} onPress={() => setGroupFilter(g.name === groupFilter ? null : g.name)} />
          ))}
          <View style={{ flex: 1 }} />
          <View style={styles.legend}>
            <View style={[styles.legendMark, { backgroundColor: CAL.changement }]} />
            <Text style={styles.legendText}>ménage entre deux séjours</Text>
            <Text style={[styles.legendText, { marginLeft: 14 }]}>← → pour changer de jour</Text>
          </View>
        </View>
      )}

      <View style={styles.main}>
        <View style={{ flex: 1 }}>
          {loading ? (
            <View style={styles.center}>
              <ActivityIndicator color={CAL.nuit} />
              <Text style={styles.centerText}>Chargement de la saison {season.year}…</Text>
            </View>
          ) : isError ? (
            <View style={styles.center}>
              <Text style={styles.centerTitle}>Impossible de charger les réservations.</Text>
              <Text style={styles.centerText}>Vérifie ta connexion internet, puis réessaie.</Text>
              <Pressable onPress={() => refetch()} style={({ hovered }: any) => [styles.retry, hovered && { backgroundColor: CAL.nuitSoft }]}>
                <Text style={styles.retryText}>Réessayer</Text>
              </Pressable>
            </View>
          ) : groups.length === 0 ? (
            <View style={styles.center}>
              <Text style={styles.centerTitle}>Aucun logement actif.</Text>
              <Text style={styles.centerText}>Ajoute un logement pour voir son calendrier.</Text>
              <Pressable onPress={() => router.push('/(app)/properties/new')} style={({ hovered }: any) => [styles.retry, hovered && { backgroundColor: CAL.nuitSoft }]}>
                <Text style={styles.retryText}>Ajouter un logement</Text>
              </Pressable>
            </View>
          ) : (
            <View ref={scrollRef} style={styles.scroller}>
              <View style={{ width: NAME_WIDTH + totalWidth }}>
                <View style={[styles.headerRow, sticky({ top: 0, zIndex: 3 })]}>
                  <View style={[styles.corner, sticky({ left: 0, zIndex: 4 })]}>
                  </View>
                  {days.map((d) => {
                    const date = parseISO(d);
                    const weekend = getDay(date) === 0 || getDay(date) === 6;
                    const isFirst = date.getDate() === 1 || d === season.start;
                    const isSel = d === selectedDay;
                    const isToday = d === today;
                    const turnovers = turnoverCountByDay.get(d) ?? 0;
                    return (
                      <Pressable
                        key={d}
                        onPress={() => selectDay(d)}
                        style={({ hovered }: any) => [
                          styles.dayCell,
                          { width: dayWidth },
                          weekend && styles.dayWeekend,
                          isFirst && styles.dayFirst,
                          hovered && !isSel && styles.dayHover,
                        ]}
                      >
                        <Text style={styles.dayMonth} numberOfLines={1}>
                          {isFirst ? format(date, 'MMM', { locale: fr }).replace('.', '') : ' '}
                        </Text>
                        <View style={[styles.dayNumWrap, isSel && styles.dayNumSel]}>
                          <Text style={[styles.dayNum, isSel && styles.dayNumSelText]}>{format(date, 'd')}</Text>
                        </View>
                        {dayWidth >= 40 ? (
                          <Text style={styles.dayLetter}>{format(date, 'EEEEE', { locale: fr })}</Text>
                        ) : null}
                        {isToday && <View style={styles.todayMark} />}
                        {turnovers > 0 && (
                          <View style={styles.turnoverDot}>
                            <Text style={styles.turnoverDotText}>{turnovers}</Text>
                          </View>
                        )}
                      </Pressable>
                    );
                  })}
                </View>

                <View style={{ position: 'relative' }}>
                  {visibleGroups.map((g) => (
                    <View key={g.name}>
                      <View style={styles.groupRow}>
                        <View style={[styles.groupLabel, sticky({ left: 0, zIndex: 2 })]}>
                          <Text style={styles.groupText} numberOfLines={1}>{g.name}</Text>
                        </View>
                      </View>
                      {g.properties.map((p) => (
                        <View key={p.id} style={styles.propRow}>
                          <View style={[styles.propName, sticky({ left: 0, zIndex: 2 })]}>
                            <View style={[styles.propTab, { backgroundColor: p.color }]} />
                            {p.photo_url ? <Image source={{ uri: p.photo_url }} style={styles.propPhoto} /> : null}
                            <Text style={styles.propText} numberOfLines={1}>{p.name}</Text>
                          </View>
                          <Pressable
                            style={[styles.track, { width: totalWidth }, gridLines]}
                            onPress={(e: any) => {
                              const x = e.nativeEvent.locationX ?? e.nativeEvent.offsetX ?? 0;
                              const i = Math.min(days.length - 1, Math.max(0, Math.floor(x / dayWidth)));
                              selectDay(days[i], p);
                            }}
                            accessibilityLabel={`Choisir un jour pour ${p.name}`}
                          >
                            <View
                              pointerEvents="none"
                              style={[styles.selColumn, { left: dayIndex(selectedDay) * dayWidth, width: dayWidth }]}
                            />
                            {todayInSeason && (
                              <View pointerEvents="none" style={[styles.todayLine, { left: dayIndex(today) * dayWidth + dayWidth / 2 }]} />
                            )}
                            {renderBars(p)}
                          </Pressable>
                        </View>
                      ))}
                    </View>
                  ))}
                </View>
              </View>
            </View>
          )}
        </View>

        {!loading && !isError && groups.length > 0 && (
          <DayPanel
            model={dayModel}
            propertiesById={propertiesById}
            selectedResa={selectedResa}
            emptySlotProperty={emptySlotProperty}
            canGoBack={selectedDay > season.start}
            canGoForward={selectedDay < season.end}
            onPrevDay={() => shiftDay(-1)}
            onNextDay={() => shiftDay(1)}
            onSelectResa={(r) => setSelectedResa(r)}
            onCloseResa={() => setSelectedResa(null)}
            onOpenResa={(r) => router.push(`/(app)/reservations/${r.id}`)}
            onEditResa={(r) => router.push(`/(app)/reservations/edit/${r.id}`)}
            onNewResa={(p, date) => router.push({ pathname: '/(app)/reservations/new', params: { propertyId: p.id, checkIn: date } })}
          />
        )}
      </View>
    </View>
  );
}

function FilterChip({ label, on, onPress }: { label: string; on: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ hovered }: any) => [styles.chip, on && styles.chipOn, hovered && !on && styles.chipHover]}>
      <Text style={[styles.chipText, on && styles.chipTextOn]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: CAL.blanc },
  topBar: { height: 56, backgroundColor: CAL.nuit, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, gap: 18 },
  title: { fontFamily: CAL.fontBold, fontSize: 20, color: CAL.blanc, marginRight: 4 },
  segment: { flexDirection: 'row', backgroundColor: CAL.nuitSoft, borderRadius: 6, padding: 3 },
  segmentItem: { paddingVertical: 5, paddingHorizontal: 10, borderRadius: 4 },
  segmentItemOn: { backgroundColor: CAL.blanc },
  segmentHover: { backgroundColor: 'rgba(255,255,255,0.08)' },
  segmentText: { fontFamily: CAL.fontBold, fontSize: 13, color: 'rgba(255,255,255,0.75)' },
  segmentTextOn: { color: CAL.nuit },
  months: { flexDirection: 'row', gap: 2 },
  month: { paddingVertical: 6, paddingHorizontal: 9, borderRadius: 4, alignItems: 'center' },
  monthHover: { backgroundColor: 'rgba(255,255,255,0.08)' },
  monthText: { fontFamily: CAL.font, fontSize: 14, color: 'rgba(255,255,255,0.7)', textTransform: 'capitalize' },
  monthTextOn: { fontFamily: CAL.fontBold, color: CAL.blanc },
  monthMark: { position: 'absolute', bottom: 1, height: 2, left: 9, right: 9, backgroundColor: CAL.or, borderRadius: 1 },
  toolBtn: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 4, borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)' },
  toolBtnHover: { backgroundColor: 'rgba(255,255,255,0.1)' },
  toolText: { fontFamily: CAL.fontBold, fontSize: 14, color: CAL.blanc },
  zoom: { flexDirection: 'row', gap: 4 },
  zoomBtn: { width: 30, height: 30, borderRadius: 4, borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)', alignItems: 'center', justifyContent: 'center' },
  filters: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 20, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: CAL.brume, flexWrap: 'wrap' },
  chip: { paddingVertical: 4, paddingHorizontal: 10, borderRadius: 14, borderWidth: 1, borderColor: CAL.brume },
  chipOn: { backgroundColor: CAL.nuit, borderColor: CAL.nuit },
  chipHover: { backgroundColor: CAL.brumeClair },
  chipText: { fontFamily: CAL.font, fontSize: 13, color: CAL.texte },
  chipTextOn: { color: CAL.blanc, fontFamily: CAL.fontBold },
  legend: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendMark: { width: 3, height: 14, borderRadius: 1 },
  legendText: { fontFamily: CAL.font, fontSize: 12, color: CAL.texteDoux },
  main: { flex: 1, flexDirection: 'row', minHeight: 0 },
  scroller: { flex: 1, overflow: 'scroll' as any },
  headerRow: { flexDirection: 'row', height: HEADER_HEIGHT, backgroundColor: CAL.blanc, borderBottomWidth: 1, borderBottomColor: CAL.brume },
  corner: { width: NAME_WIDTH, height: HEADER_HEIGHT - 1, backgroundColor: CAL.blanc, justifyContent: 'flex-end', paddingHorizontal: 14, paddingBottom: 8, borderRightWidth: 1, borderRightColor: CAL.brume },
  dayCell: { height: HEADER_HEIGHT - 1, alignItems: 'center', paddingTop: 4, backgroundColor: CAL.blanc },
  dayWeekend: { backgroundColor: CAL.brumeClair },
  dayFirst: { borderLeftWidth: 1, borderLeftColor: CAL.texteDoux },
  dayHover: { backgroundColor: CAL.orClair },
  dayMonth: { fontFamily: CAL.fontBold, fontSize: 11, color: CAL.texte, textTransform: 'capitalize', height: 14 },
  dayNumWrap: { minWidth: 24, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3 },
  dayNumSel: { backgroundColor: CAL.nuit },
  dayNum: { fontFamily: CAL.fontBold, fontSize: 13, color: CAL.texte, fontVariant: ['tabular-nums'] },
  dayNumSelText: { color: CAL.blanc },
  dayLetter: { fontFamily: CAL.font, fontSize: 11, color: CAL.texteDoux, textTransform: 'uppercase' },
  todayMark: { position: 'absolute', bottom: 0, left: 4, right: 4, height: 3, backgroundColor: CAL.or, borderRadius: 1 },
  turnoverDot: { position: 'absolute', top: 3, right: 2, minWidth: 13, height: 13, borderRadius: 7, backgroundColor: CAL.changement, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 2 },
  turnoverDotText: { fontFamily: CAL.fontBold, fontSize: 9, color: CAL.blanc, lineHeight: 11 },
  selColumn: { position: 'absolute', top: 0, bottom: 0, backgroundColor: CAL.orClair, zIndex: 0 },
  todayLine: { position: 'absolute', top: 0, bottom: 0, width: 1, backgroundColor: CAL.or, zIndex: 3 },
  groupRow: { height: GROUP_HEIGHT, backgroundColor: CAL.brumeClair, borderBottomWidth: 1, borderBottomColor: CAL.brume, flexDirection: 'row' },
  groupLabel: { width: NAME_WIDTH, height: GROUP_HEIGHT - 1, justifyContent: 'center', paddingHorizontal: 14, backgroundColor: CAL.brumeClair },
  groupText: { fontFamily: CAL.fontBold, fontSize: 12, color: CAL.texteDoux },
  propRow: { flexDirection: 'row', height: ROW_HEIGHT, borderBottomWidth: 1, borderBottomColor: CAL.brume },
  propName: { width: NAME_WIDTH, height: ROW_HEIGHT - 1, flexDirection: 'row', alignItems: 'center', gap: 10, paddingLeft: 10, paddingRight: 8, backgroundColor: CAL.blanc, borderRightWidth: 1, borderRightColor: CAL.brume },
  propTab: { width: 4, height: 24, borderRadius: 2 },
  propPhoto: { width: 28, height: 28, borderRadius: 5, marginLeft: -4, backgroundColor: CAL.brumeClair },
  propText: { fontFamily: CAL.fontBold, fontSize: 14, color: CAL.texte, flex: 1 },
  track: { height: ROW_HEIGHT - 1, position: 'relative', cursor: 'pointer' as any },
  bar: { position: 'absolute', top: 7, height: ROW_HEIGHT - 15, borderLeftWidth: 3, borderRadius: 3, flexDirection: 'row', alignItems: 'center', gap: 5, paddingLeft: 4, paddingRight: 4, overflow: 'hidden', zIndex: 2 },
  barPending: { borderStyle: 'dashed', borderWidth: 1, borderColor: CAL.texteDoux },
  barSelected: { outlineWidth: 2, outlineStyle: 'solid', outlineColor: CAL.or, outlineOffset: 1 } as any,
  barText: { fontFamily: CAL.fontBold, fontSize: 12, color: CAL.texte, flexShrink: 1 },
  barNights: { fontFamily: CAL.font, fontSize: 11, color: CAL.texteDoux },
  turnoverMark: { position: 'absolute', right: 0, top: 0, bottom: 0, width: 3, backgroundColor: CAL.changement },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8, padding: 24 },
  centerTitle: { fontFamily: CAL.fontBold, fontSize: 16, color: CAL.texte },
  centerText: { fontFamily: CAL.font, fontSize: 14, color: CAL.texteDoux },
  retry: { marginTop: 8, backgroundColor: CAL.nuit, borderRadius: 5, paddingVertical: 9, paddingHorizontal: 16 },
  retryText: { fontFamily: CAL.fontBold, fontSize: 14, color: CAL.blanc },
});
