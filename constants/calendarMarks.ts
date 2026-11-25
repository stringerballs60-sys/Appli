import { addYears, format, parseISO } from 'date-fns';
import type { CalendarMark, CalendarMarkColor } from '@/types';

export const MARK_COLORS: { value: CalendarMarkColor; label: string; fond: string; texte: string }[] = [
  { value: 'sable', label: 'Sable', fond: '#F4E8C8', texte: '#7A5B12' },
  { value: 'lavande', label: 'Lavande', fond: '#E8E2F4', texte: '#5A4A86' },
  { value: 'olive', label: 'Olive', fond: '#E4ECD4', texte: '#4F6230' },
  { value: 'ciel', label: 'Ciel', fond: '#DDEBF6', texte: '#2F5A7E' },
  { value: 'rose', label: 'Rose', fond: '#F6E1E4', texte: '#8A3E4B' },
];

export const markColor = (c: CalendarMarkColor) => MARK_COLORS.find((m) => m.value === c) ?? MARK_COLORS[0];

export interface MarkOccurrence {
  mark: CalendarMark;
  start: string;
  end: string;
}

/** Dates marquées qui tombent dans [from, to] ; celles « chaque année » sont reportées sur l'année demandée. */
export function marksInRange(marks: CalendarMark[], from: string, to: string): MarkOccurrence[] {
  const years = new Set([Number(from.slice(0, 4)), Number(to.slice(0, 4))]);
  const out: MarkOccurrence[] = [];
  marks.forEach((mark) => {
    const candidates: MarkOccurrence[] = [];
    if (mark.yearly) {
      const baseYear = Number(mark.start_date.slice(0, 4));
      years.forEach((y) => {
        const shift = y - baseYear;
        candidates.push({
          mark,
          start: format(addYears(parseISO(mark.start_date), shift), 'yyyy-MM-dd'),
          end: format(addYears(parseISO(mark.end_date), shift), 'yyyy-MM-dd'),
        });
      });
    } else {
      candidates.push({ mark, start: mark.start_date, end: mark.end_date });
    }
    candidates.forEach((c) => {
      if (c.end >= from && c.start <= to) out.push(c);
    });
  });
  return out.sort((a, b) => a.start.localeCompare(b.start));
}
