import { addDays, format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Property, Reservation, Task, TaskStatus } from '@/types';
import { buildDayModel, DayModel } from '@/components/calendar/web/dayModel';

export type ViewKey = 'sheet' | 'tour' | 'hours';
export const VIEWS: { key: ViewKey; label: string }[] = [
  { key: 'sheet', label: 'A · Feuille de route' },
  { key: 'tour', label: 'B · Tournée' },
  { key: 'hours', label: 'C · Fil des heures' },
];

export const DEFAULT_CHECKOUT = '10:00';
export const DEFAULT_CHECKIN = '16:00';

export const toISO = (d: Date) => format(d, 'yyyy-MM-dd');
export const shiftDay = (iso: string, n: number) => toISO(addDays(parseISO(iso), n));
export const dayTitle = (iso: string) => {
  const s = format(parseISO(iso), 'EEEE d MMMM', { locale: fr });
  return s.charAt(0).toUpperCase() + s.slice(1);
};
export const shortDay = (iso: string) => format(parseISO(iso), 'EEE d', { locale: fr }).replace('.', '');
export const hhmm = (t: string | null | undefined) => (t ? t.slice(0, 5) : null);

/** Ce qui se passe dans un logement ce jour-là. */
export interface PropertyDay {
  property: Property;
  departure: Reservation | null;
  arrival: Reservation | null;
  staying: Reservation | null;
  /** Un voyageur part et un autre arrive le même jour : ménage entre deux séjours. */
  turnover: boolean;
  /** Ménage à faire aujourd'hui (départ du jour) ou resté en attente d'un jour précédent. */
  cleaning: 'today' | 'late' | null;
  cleaningDone: boolean;
  task: Task | null;
  arrivalTime: string;
  arrivalTimeConfirmed: boolean;
}

export interface TodayModel {
  date: string;
  day: DayModel;
  rows: PropertyDay[];
  departures: PropertyDay[];
  cleanings: PropertyDay[];
  arrivals: PropertyDay[];
  stayingCount: number;
  next: { date: string; arrivals: Reservation[]; departures: Reservation[] }[];
}

const groupOf = (p: Property) => p.group_name?.trim() || 'Autres logements';

export function buildToday(date: string, stays: Reservation[], properties: Property[], tasks: Task[], today: string): TodayModel {
  const byId = new Map(properties.map((p) => [p.id, p]));
  const day = buildDayModel(date, stays, byId);
  const rows: PropertyDay[] = [];

  properties.filter((p) => p.is_active).forEach((p) => {
    const departure = day.departures.find((r) => r.property_id === p.id) ?? null;
    const arrival = day.arrivals.find((r) => r.property_id === p.id) ?? null;
    const staying = day.staying.find((r) => r.property_id === p.id) ?? null;
    const isToday = date === today;
    const mine = tasks.filter((t) => t.property_id === p.id);
    const task =
      mine.find((t) => t.scheduled_date === date && (!departure || t.reservation_id === departure.id)) ??
      mine.find((t) => t.scheduled_date === date) ??
      (isToday ? mine.find((t) => t.scheduled_date < date && t.status !== TaskStatus.DONE) : undefined) ??
      null;
    const cleaning: PropertyDay['cleaning'] = task ? (task.scheduled_date === date ? 'today' : 'late') : departure ? 'today' : null;
    if (!departure && !arrival && !staying && !cleaning) return;
    rows.push({
      property: p,
      departure,
      arrival,
      staying,
      turnover: !!departure && !!arrival,
      cleaning,
      cleaningDone: task?.status === TaskStatus.DONE,
      task,
      arrivalTime: hhmm(arrival?.check_in_time) ?? DEFAULT_CHECKIN,
      arrivalTimeConfirmed: !!arrival?.check_in_time && !!arrival?.check_in_time_confirmed,
    });
  });

  const order = (a: PropertyDay, b: PropertyDay) =>
    groupOf(a.property).localeCompare(groupOf(b.property), 'fr') || a.property.name.localeCompare(b.property.name, 'fr', { numeric: true });
  rows.sort(order);

  const next = [1, 2, 3].map((n) => {
    const d = shiftDay(date, n);
    return { date: d, arrivals: stays.filter((r) => r.check_in === d), departures: stays.filter((r) => r.check_out === d) };
  });

  return {
    date,
    day,
    rows,
    departures: rows.filter((r) => r.departure),
    cleanings: rows.filter((r) => r.cleaning).sort((a, b) => Number(b.turnover) - Number(a.turnover) || a.arrivalTime.localeCompare(b.arrivalTime)),
    arrivals: rows.filter((r) => r.arrival).sort((a, b) => a.arrivalTime.localeCompare(b.arrivalTime)),
    stayingCount: day.staying.length,
    next,
  };
}

export const guestsOf = (r: Reservation) => r.nb_couples * 2 + r.nb_solo_adults + r.nb_children + r.nb_babies;

export interface ViewProps {
  model: TodayModel;
  isToday: boolean;
  onOpen: (r: Reservation) => void;
  onToggleCleaning: (p: Property, done: boolean) => void;
}
