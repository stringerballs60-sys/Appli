import { LinenCalculation, Property, Reservation } from '@/types';
import { calculateLinen } from '@/utils/linenCalculator';

export interface Turnover {
  property: Property;
  departure: Reservation;
  arrival: Reservation;
}

export interface DayModel {
  date: string;
  departures: Reservation[];
  arrivals: Reservation[];
  turnovers: Turnover[];
  staying: Reservation[];
  linen: LinenCalculation;
}

const EMPTY_LINEN: LinenCalculation = {
  double_sheets: 0,
  single_sheets: 0,
  baby_sheets: 0,
  bath_towels: 0,
  hand_towels: 0,
  bath_mats: 0,
  kitchen_towels: 0,
};

export function linenFor(resa: Reservation, property?: Property): LinenCalculation {
  if (resa.linen_calculation) return resa.linen_calculation;
  return calculateLinen(
    resa,
    {
      beds_double_used: resa.beds_double_used,
      beds_single_used: resa.beds_single_used,
      beds_sofa_used: resa.beds_sofa_used,
      beds_crib_used: resa.beds_crib_used,
    },
    property?.nb_bathrooms ?? 1
  );
}

export function guestCount(resa: Reservation): number {
  return resa.nb_couples * 2 + resa.nb_solo_adults + resa.nb_children + resa.nb_babies;
}

export function buildDayModel(
  date: string,
  reservations: Reservation[],
  propertiesById: Map<string, Property>
): DayModel {
  const departures = reservations.filter((r) => r.check_out === date);
  const arrivals = reservations.filter((r) => r.check_in === date);
  const staying = reservations.filter((r) => r.check_in < date && r.check_out > date);

  const turnovers: Turnover[] = [];
  departures.forEach((dep) => {
    const arr = arrivals.find((a) => a.property_id === dep.property_id);
    const property = propertiesById.get(dep.property_id);
    if (arr && property) turnovers.push({ property, departure: dep, arrival: arr });
  });

  const linen = arrivals.reduce<LinenCalculation>((sum, r) => {
    const l = linenFor(r, propertiesById.get(r.property_id));
    return {
      double_sheets: sum.double_sheets + l.double_sheets,
      single_sheets: sum.single_sheets + l.single_sheets,
      baby_sheets: sum.baby_sheets + l.baby_sheets,
      bath_towels: sum.bath_towels + l.bath_towels,
      hand_towels: sum.hand_towels + l.hand_towels,
      bath_mats: sum.bath_mats + l.bath_mats,
      kitchen_towels: sum.kitchen_towels + l.kitchen_towels,
    };
  }, EMPTY_LINEN);

  return { date, departures, arrivals, turnovers, staying, linen };
}

export function sourceLabel(resa: Reservation): string {
  if (resa.category?.startsWith('AIRBNB') || resa.source === 'airbnb') return 'Airbnb';
  if (resa.source === 'booking') return 'Booking';
  if (resa.source === 'abritel') return 'Abritel';
  if (resa.category === 'EXTERNAL_CLEANING') return 'Ménage seul';
  return 'Direct';
}
