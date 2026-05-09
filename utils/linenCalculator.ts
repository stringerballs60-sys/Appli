import { LinenCalculation, Property } from '@/types';

export interface GuestBreakdown {
  nb_couples: number;
  nb_solo_adults: number;
  nb_children: number;
  nb_babies: number;
}

export interface BedUsage {
  beds_double_used: number;
  beds_single_used: number;
  beds_sofa_used: number;
  beds_crib_used: number;
}

export function suggestBedAllocation(
  guests: GuestBreakdown,
  property: Pick<Property, 'nb_double_beds' | 'nb_single_beds' | 'nb_sofa_beds' | 'nb_baby_cribs'>
): BedUsage {
  const { nb_couples, nb_solo_adults, nb_children, nb_babies } = guests;

  const couplesInDouble = Math.min(nb_couples, property.nb_double_beds);
  const overflowCouples = nb_couples - couplesInDouble;

  const singleNeeded = nb_solo_adults + nb_children + overflowCouples * 2;
  const inSingle = Math.min(singleNeeded, property.nb_single_beds);
  const overflowSingle = singleNeeded - inSingle;

  const inSofa = Math.min(overflowSingle, property.nb_sofa_beds);
  const inCrib = Math.min(nb_babies, property.nb_baby_cribs);

  return {
    beds_double_used: couplesInDouble,
    beds_single_used: inSingle,
    beds_sofa_used: inSofa,
    beds_crib_used: inCrib,
  };
}

export function calculateLinen(
  guests: Pick<GuestBreakdown, 'nb_couples' | 'nb_solo_adults' | 'nb_children'>,
  beds: BedUsage,
  nb_bathrooms: number
): LinenCalculation {
  const nb_adults = guests.nb_couples * 2 + guests.nb_solo_adults;

  return {
    double_sheets: beds.beds_double_used,
    single_sheets: beds.beds_single_used + beds.beds_sofa_used,
    baby_sheets: beds.beds_crib_used,
    bath_towels: nb_adults + guests.nb_children,
    hand_towels: nb_adults + guests.nb_children,
    face_towels: nb_adults + guests.nb_children,
    bath_mats: nb_bathrooms,
    kitchen_towels: 1,
  };
}

export function getTotalLinenSets(linen: LinenCalculation): number {
  return linen.double_sheets + linen.single_sheets + linen.baby_sheets;
}
