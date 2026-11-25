import { addDays, differenceInCalendarDays, format, parseISO, startOfWeek } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Property, Reservation } from '@/types';

export type TabKey = 'upcoming' | 'current' | 'past' | 'blocks' | 'cancelled';
export type ViewKey = 'register' | 'stubs' | 'board';

export const TABS: { key: TabKey; label: string }[] = [
  { key: 'upcoming', label: 'À venir' },
  { key: 'current', label: 'En cours' },
  { key: 'past', label: 'Passées' },
  { key: 'blocks', label: 'Blocages' },
  { key: 'cancelled', label: 'Annulées' },
];

export const VIEWS: { key: ViewKey; label: string }[] = [
  { key: 'register', label: 'Main courante' },
  { key: 'stubs', label: 'Souches' },
  { key: 'board', label: 'Quai' },
];

export const toISO = (d: Date) => format(d, 'yyyy-MM-dd');
export const todayISO = () => toISO(new Date());

export const isBlockRow = (r: Reservation) => r.kind === 'block';
export const isCancelled = (r: Reservation) => r.status === 'cancelled';

export function tabOf(r: Reservation, today: string): TabKey {
  if (isCancelled(r)) return 'cancelled';
  if (isBlockRow(r)) return 'blocks';
  if (r.check_out <= today) return 'past';
  if (r.check_in <= today) return 'current';
  return 'upcoming';
}

/** Date qui sert à classer la ligne : départ pour les séjours en cours, arrivée sinon. */
export const keyDate = (r: Reservation, tab: TabKey) => (tab === 'current' ? r.check_out : r.check_in);

export function sortForTab(list: Reservation[], tab: TabKey) {
  const desc = tab === 'past' || tab === 'cancelled';
  return [...list].sort((a, b) => {
    const c = keyDate(a, tab).localeCompare(keyDate(b, tab));
    if (c !== 0) return desc ? -c : c;
    return (a.check_in_time ?? '99').localeCompare(b.check_in_time ?? '99');
  });
}

export interface Group {
  key: string;
  title: string;
  rows: Reservation[];
}

export function groupBy(list: Reservation[], keyFn: (r: Reservation) => string, titleFn: (key: string) => string): Group[] {
  const map = new Map<string, Reservation[]>();
  list.forEach((r) => {
    const k = keyFn(r);
    map.set(k, [...(map.get(k) ?? []), r]);
  });
  return Array.from(map.entries()).map(([key, rows]) => ({ key, title: titleFn(key), rows }));
}

export const weekKey = (iso: string) => toISO(startOfWeek(parseISO(iso), { weekStartsOn: 1 }));
export const monthKey = (iso: string) => iso.slice(0, 7);

export function weekTitle(weekStart: string) {
  const d = parseISO(weekStart);
  const end = addDays(d, 6);
  const sameMonth = d.getMonth() === end.getMonth();
  return `Semaine du ${format(d, sameMonth ? 'd' : 'd MMMM', { locale: fr })} au ${format(end, 'd MMMM yyyy', { locale: fr })}`;
}

export const monthTitle = (key: string) => {
  const s = format(parseISO(`${key}-01`), 'MMMM yyyy', { locale: fr });
  return s.charAt(0).toUpperCase() + s.slice(1);
};

/** Tranches façon tableau d'arrivées : aujourd'hui, demain, cette semaine… */
export function bucketOf(iso: string, today: string): { key: string; order: number; label: string } {
  const diff = differenceInCalendarDays(parseISO(iso), parseISO(today));
  if (diff === 0) return { key: 'd0', order: 0, label: 'Aujourd’hui' };
  if (diff === 1) return { key: 'd1', order: 1, label: 'Demain' };
  if (diff === -1) return { key: 'm1', order: -1, label: 'Hier' };
  if (diff > 1 && diff <= 7) return { key: 'w1', order: 2, label: '7 prochains jours' };
  if (diff > 7 && diff <= 31) return { key: 'm', order: 3, label: 'Dans le mois' };
  if (diff > 31) return { key: 'later', order: 4, label: 'Plus tard' };
  if (diff < -1 && diff >= -7) return { key: 'pw', order: -2, label: '7 derniers jours' };
  if (diff < -7 && diff >= -31) return { key: 'pm', order: -3, label: 'Le mois dernier' };
  return { key: 'old', order: -4, label: 'Plus ancien' };
}

export const shortDay = (iso: string) => format(parseISO(iso), 'EEE d MMM', { locale: fr }).replace(/\./g, '');
export const numericDay = (iso: string) => format(parseISO(iso), 'EEE dd/MM', { locale: fr }).replace('.', '');
export const timeLabel = (t: string | null | undefined) => (t ? t.slice(0, 5) : null);

export function guestsOf(r: Reservation) {
  return r.nb_couples * 2 + r.nb_solo_adults + r.nb_children + r.nb_babies;
}

export function guestsDetail(r: Reservation) {
  const adults = r.nb_couples * 2 + r.nb_solo_adults;
  return [
    adults > 0 && `${adults} adulte${adults > 1 ? 's' : ''}`,
    r.nb_children > 0 && `${r.nb_children} enfant${r.nb_children > 1 ? 's' : ''}`,
    r.nb_babies > 0 && `${r.nb_babies} bébé${r.nb_babies > 1 ? 's' : ''}`,
  ].filter(Boolean).join(', ');
}

/** Clés « logement|date » des jours où un voyageur part et un autre arrive dans le même logement. */
export function turnoverKeys(all: Reservation[]) {
  const stays = all.filter((r) => !isBlockRow(r) && !isCancelled(r));
  const arrivals = new Set(stays.map((r) => `${r.property_id}|${r.check_in}`));
  const keys = new Set<string>();
  stays.forEach((r) => {
    const k = `${r.property_id}|${r.check_out}`;
    if (arrivals.has(k)) keys.add(k);
  });
  return keys;
}

export interface ViewProps {
  rows: Reservation[];
  tab: TabKey;
  today: string;
  selectedId: string | null;
  propertiesById: Map<string, Property>;
  turnovers: Set<string>;
  onSelect: (id: string) => void;
  onOpen: (r: Reservation) => void;
}
