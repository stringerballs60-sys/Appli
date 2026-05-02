import { format, differenceInDays, isToday, parseISO, startOfMonth, endOfMonth, addDays } from 'date-fns';
import { fr } from 'date-fns/locale';

export const formatDate = (dateStr: string): string =>
  format(parseISO(dateStr), 'dd MMM yyyy', { locale: fr });

export const formatDateShort = (dateStr: string): string =>
  format(parseISO(dateStr), 'dd/MM', { locale: fr });

export const formatDateLong = (dateStr: string): string =>
  format(parseISO(dateStr), 'EEEE dd MMMM yyyy', { locale: fr });

export const formatMonthYear = (dateStr: string): string =>
  format(parseISO(dateStr + '-01'), 'MMMM yyyy', { locale: fr });

export const calcNights = (checkIn: string, checkOut: string): number =>
  differenceInDays(parseISO(checkOut), parseISO(checkIn));

export const isCheckInToday = (checkIn: string): boolean =>
  isToday(parseISO(checkIn));

export const isCheckOutToday = (checkOut: string): boolean =>
  isToday(parseISO(checkOut));

export const toISODateString = (date: Date): string =>
  format(date, 'yyyy-MM-dd');

export const todayISO = (): string => toISODateString(new Date());

export const getMonthRange = (yearMonth: string): { from: string; to: string } => {
  const date = parseISO(yearMonth + '-01');
  return {
    from: toISODateString(startOfMonth(date)),
    to: toISODateString(endOfMonth(date)),
  };
};

export const getDatesInRange = (checkIn: string, checkOut: string): string[] => {
  const dates: string[] = [];
  let current = parseISO(checkIn);
  const end = parseISO(checkOut);
  while (current < end) {
    dates.push(toISODateString(current));
    current = addDays(current, 1);
  }
  return dates;
};

export const getNightsLabel = (n: number): string =>
  n === 1 ? '1 nuit' : `${n} nuits`;
