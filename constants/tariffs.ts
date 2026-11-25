import { parseISO } from 'date-fns';
import { Payer, Property, PropertyType, Reservation, ReservationSource } from '@/types';
import { CHANNEL_LABELS } from '@/constants/channels';

export const PAYERS: { value: Payer; label: string }[] = [
  { value: 'platform', label: 'La plateforme (Airbnb, Booking…)' },
  { value: 'owner', label: 'Le propriétaire' },
  { value: 'onsite', label: 'Les voyageurs, sur place' },
];

export const MONTHS_SHORT = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];

/** Logement où Charles fait seulement le ménage (pas de gestion, pas de commission). */
export const isPrestaProperty = (p?: Pick<Property, 'property_type'> | null) =>
  p?.property_type === PropertyType.EXTERNAL_CLEANING || p?.property_type === PropertyType.EXTERNAL_CLEANING_CHECKIN;

const PLATFORMS: ReservationSource[] = ['airbnb', 'booking', 'abritel'];
export const isPlatform = (channel: ReservationSource) => PLATFORMS.includes(channel);

type TariffProperty = Pick<Property, 'cleaning_fee' | 'cleaning_fee_peak' | 'peak_months' | 'bed_double_fee' | 'bed_single_fee' | 'commission_rate' | 'cleaning_payer' | 'beds_payer' | 'property_type'>;
type BedsUse = Pick<Reservation, 'beds_double_used' | 'beds_single_used' | 'beds_sofa_used'>;

const num = (v: unknown) => (v == null || v === '' ? null : Number(v));

/** Forfait ménage : celui de haute saison si le départ (jour du ménage) tombe dans un mois de haute saison. */
export function cleaningFor(p: TariffProperty | null | undefined, checkOut?: string | null): number | null {
  const base = num(p?.cleaning_fee);
  if (base == null) return null;
  const peak = num(p?.cleaning_fee_peak);
  if (peak != null && checkOut && /^\d{4}-\d{2}-\d{2}$/.test(checkOut)) {
    const m = parseISO(checkOut).getMonth() + 1;
    if ((p?.peak_months ?? []).map(Number).includes(m)) return peak;
  }
  return base;
}

/** Lits : lits doubles au prix « double », lits simples et canapés-lits au prix « simple ». */
export function bedsFor(p: TariffProperty | null | undefined, beds: BedsUse): { total: number | null; detail: string } {
  const d = num(p?.bed_double_fee);
  const s = num(p?.bed_single_fee);
  if (d == null && s == null) return { total: null, detail: '' };
  const doubles = beds.beds_double_used ?? 0;
  const singles = (beds.beds_single_used ?? 0) + (beds.beds_sofa_used ?? 0);
  const parts: string[] = [];
  if (d != null && doubles > 0) parts.push(`${doubles} × ${d}`);
  if (s != null && singles > 0) parts.push(`${singles} × ${s}`);
  return { total: (d ?? 0) * doubles + (s ?? 0) * singles, detail: parts.join(' + ') };
}

export const commissionApplies = (p: TariffProperty | null | undefined, channel: ReservationSource) =>
  !!p && num(p.commission_rate) != null && num(p.commission_rate)! > 0 && isPlatform(channel);

/** Qui verse réellement cette part : « via la plateforme » devient « propriétaire » pour une résa en direct. */
export function payerFor(setting: Payer | undefined, channel: ReservationSource): Payer {
  const s = setting ?? 'platform';
  if (s === 'platform' && !isPlatform(channel)) return 'owner';
  return s;
}

export function payerLabel(payer: Payer, channel: ReservationSource) {
  if (payer === 'platform') return `via ${isPlatform(channel) ? CHANNEL_LABELS[channel] : 'la plateforme'}`;
  if (payer === 'owner') return 'propriétaire';
  return 'sur place';
}

export function tariffSummary(p: TariffProperty): string {
  const parts: string[] = [];
  const base = num(p.cleaning_fee);
  const peak = num(p.cleaning_fee_peak);
  if (base != null) {
    const months = (p.peak_months ?? []).map((m) => MONTHS_SHORT[Number(m) - 1]).join(', ');
    parts.push(peak != null ? `Ménage ${base} € (${peak} € en ${months})` : `Ménage ${base} €`);
  }
  const d = num(p.bed_double_fee);
  const s = num(p.bed_single_fee);
  if (d != null || s != null) parts.push(`lits ${d ?? 0} € double, ${s ?? 0} € simple`);
  const rate = num(p.commission_rate);
  if (rate) parts.push(`${rate} % de commission sur les plateformes`);
  return parts.length ? parts.join(' · ') : 'Aucun tarif réglé';
}

/** Répartit les gains d'une résa selon qui les verse : plateforme, propriétaire, sur place. */
export function splitByPayer(
  r: Pick<Reservation, 'cleaning_amount' | 'beds_amount' | 'commission_amount'>,
  p: Pick<Property, 'cleaning_payer' | 'beds_payer'> | null | undefined,
  channel: ReservationSource
): Record<Payer, number> {
  const out: Record<Payer, number> = { platform: 0, owner: 0, onsite: 0 };
  const n = (v: number | null | undefined) => (v == null ? 0 : Number(v));
  out[payerFor(p?.cleaning_payer, channel)] += n(r.cleaning_amount);
  out[payerFor(p?.beds_payer, channel)] += n(r.beds_amount);
  out[payerFor('platform', channel)] += n(r.commission_amount);
  return out;
}
