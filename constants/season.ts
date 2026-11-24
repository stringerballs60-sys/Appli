import { parseISO } from 'date-fns';

export interface Season {
  year: number;
  start: string;
  end: string;
}

const SEASON_START = '03-15';
const SEASON_END = '11-15';

export const SEASON_YEARS = [2026, 2027];

export function getSeason(year: number): Season {
  return { year, start: `${year}-${SEASON_START}`, end: `${year}-${SEASON_END}` };
}

export function getCurrentSeason(today: Date = new Date()): Season {
  const iso = today.toISOString().slice(0, 10);
  const year = today.getFullYear();
  const season = getSeason(year);
  if (iso > season.end) return getSeason(year + 1);
  return season;
}

export function seasonStartDate(season: Season): Date {
  return parseISO(season.start);
}

export function seasonEndDate(season: Season): Date {
  return parseISO(season.end);
}
