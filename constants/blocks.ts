import { addDays, differenceInDays, format, parseISO } from 'date-fns';
import type { BlockReason, Reservation } from '@/types';

export const BLOCK_REASONS: { value: BlockReason; label: string }[] = [
  { value: 'personal', label: 'Usage perso' },
  { value: 'owner', label: 'Propriétaire' },
  { value: 'works', label: 'Travaux' },
  { value: 'other', label: 'Autre' },
];

export const blockReasonLabel = (reason: BlockReason | null | undefined) =>
  BLOCK_REASONS.find((r) => r.value === reason)?.label ?? 'Blocage';

type KindLike = Pick<Reservation, 'kind'> & Partial<Pick<Reservation, 'status'>>;

export const isBlock = (r: KindLike) => r.kind === 'block';
export const isStay = (r: KindLike) => r.kind !== 'block';
export const isActiveStay = (r: KindLike) => isStay(r) && r.status !== 'cancelled';
export const isActiveBlock = (r: KindLike) => isBlock(r) && r.status !== 'cancelled';

const toISO = (d: Date) => format(d, 'yyyy-MM-dd');

export function nightsInRange(checkIn: string, checkOut: string, start: string, endInclusive: string) {
  const endExclusive = toISO(addDays(parseISO(endInclusive), 1));
  const a = checkIn < start ? start : checkIn;
  const b = checkOut > endExclusive ? endExclusive : checkOut;
  return Math.max(0, differenceInDays(parseISO(b), parseISO(a)));
}

export type Occupancy = {
  bookedNights: number;
  blockedNights: number;
  availableNights: number;
  rate: number;
};

/** Taux de remplissage d'un logement sur une période : nuits louées ÷ (nuits de la période − nuits bloquées). */
export function computeOccupancy(
  reservations: Pick<Reservation, 'kind' | 'status' | 'check_in' | 'check_out'>[],
  start: string,
  endInclusive: string
): Occupancy {
  const totalNights = differenceInDays(parseISO(endInclusive), parseISO(start)) + 1;
  let bookedNights = 0;
  let blockedNights = 0;
  reservations.forEach((r) => {
    if (r.status === 'cancelled') return;
    const n = nightsInRange(r.check_in, r.check_out, start, endInclusive);
    if (r.kind === 'block') blockedNights += n;
    else bookedNights += n;
  });
  blockedNights = Math.min(blockedNights, totalNights);
  const availableNights = Math.max(0, totalNights - blockedNights);
  const rate = availableNights === 0 ? 0 : Math.min(1, bookedNights / availableNights);
  return { bookedNights, blockedNights, availableNights, rate };
}
