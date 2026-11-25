import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Property, Reservation } from '@/types';

export type TabKey = 'upcoming' | 'current' | 'past' | 'blocks' | 'cancelled';

export const TABS: { key: TabKey; label: string }[] = [
  { key: 'upcoming', label: 'À venir' },
  { key: 'current', label: 'En cours' },
  { key: 'past', label: 'Passées' },
  { key: 'blocks', label: 'Blocages' },
  { key: 'cancelled', label: 'Annulées' },
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

export const monthKey = (iso: string) => iso.slice(0, 7);

export const monthTitle = (key: string) => {
  const s = format(parseISO(`${key}-01`), 'MMMM yyyy', { locale: fr });
  return s.charAt(0).toUpperCase() + s.slice(1);
};

export const shortDay = (iso: string) => format(parseISO(iso), 'EEE d MMM', { locale: fr }).replace(/\./g, '');
export const timeLabel = (t: string | null | undefined) => (t ? t.slice(0, 5) : null);

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
