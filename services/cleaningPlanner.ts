import { Reservation, Property } from '@/types';

export type CleaningPriority = 'critique' | 'recommande' | 'flexible';
export type CleaningUrgency = 'turnover' | 'urgent' | 'normal' | 'relaxed';

export interface CleaningTask {
  depReservationId: string;
  property: Property;
  checkOut: string;
  nextCheckIn: string | null;
  isOverdue: boolean;
  windowDays: number;
  suggestedDate: string;
  suggestedStartTime: string;
  suggestedEndTime: string;
  estimatedMinutes: number;
  priority: CleaningPriority;
  urgency: CleaningUrgency;
  reason: string;
  helpNeeded: boolean;
  guestCount: number;
}

export interface DayLoadInfo {
  tasks: CleaningTask[];
  totalMinutes: number;
  overCapacity: boolean;
  helpNeeded: boolean;
}

function addDaysStr(date: string, n: number): string {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

function addMinutesToTime(start: string, minutes: number): string {
  const [h, m] = start.split(':').map(Number);
  const total = h * 60 + m + minutes;
  const hh = Math.floor(total / 60) % 24;
  const mm = total % 60;
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
}

function estimateDuration(guestCount: number, nbBathrooms: number): number {
  const base = Math.max(80, guestCount * 40);
  const extraBathrooms = Math.max(0, (nbBathrooms ?? 1) - 1);
  return base + extraBathrooms * 20;
}

function suggestStartTime(urgency: CleaningUrgency): string {
  if (urgency === 'turnover') return '10:00';
  return '09:00';
}

// Pick the best date for a cleaning task.
// - Group co-scheduling: if a group preferred date falls in the window, use it (bypass maxPerDay).
// - Consolidation: otherwise prefer the most-loaded day that still has capacity,
//   to leave other days completely free.
function pickDate(
  from: string,
  deadline: string,
  daySlotCount: Map<string, number>,
  maxPerDay: number,
  groupPreferredDate: string | null,
): string {
  // Group co-scheduling: bypass maxPerDay, same trip = same day
  if (groupPreferredDate && groupPreferredDate >= from && groupPreferredDate <= deadline) {
    return groupPreferredDate;
  }

  // Consolidation: pick most-loaded day that still has room (fill before opening new days)
  let bestDate = from;
  let bestLoad = -1;
  let cursor = from;
  while (cursor <= deadline) {
    const load = daySlotCount.get(cursor) ?? 0;
    if (load < maxPerDay && load > bestLoad) {
      bestDate = cursor;
      bestLoad = load;
    }
    cursor = addDaysStr(cursor, 1);
  }
  return bestDate;
}

function computePriority(suggestedDate: string, today: string): CleaningPriority {
  const days = Math.max(0, Math.round(
    (new Date(suggestedDate).getTime() - new Date(today).getTime()) / 86400000
  ));
  if (days <= 2) return 'critique';
  if (days <= 10) return 'recommande';
  return 'flexible';
}

export function computeCleaningPlan(
  reservations: Reservation[],
  properties: Property[],
  maxPerDay: number,
  horizonDate: string
): CleaningTask[] {
  const today = new Date().toISOString().slice(0, 10);
  const propMap = new Map(properties.map((p) => [p.id, p]));
  const active = reservations.filter((r) => r.status !== 'cancelled');

  const departures = active
    .filter((r) => r.check_out >= today && r.check_out <= horizonDate)
    .sort((a, b) => a.check_out.localeCompare(b.check_out));

  const daySlotCount = new Map<string, number>();
  const dayMinutes = new Map<string, number>();
  // group_name → preferred date for co-scheduling
  const groupDates = new Map<string, string>();

  const tasks: CleaningTask[] = [];

  // ── Pass 1: future departures ──────────────────────────────────────────────
  for (const dep of departures) {
    const property = propMap.get(dep.property_id);
    if (!property || !property.is_active) continue;

    const nextArr = active
      .filter((r) => r.property_id === dep.property_id && r.check_in >= dep.check_out && r.id !== dep.id)
      .sort((a, b) => a.check_in.localeCompare(b.check_in))[0];

    const checkIn = nextArr?.check_in ?? null;
    const windowDays = checkIn
      ? Math.round((new Date(checkIn).getTime() - new Date(dep.check_out).getTime()) / 86400000)
      : 99;

    const guestCount = (dep.nb_couples ?? 0) * 2 + (dep.nb_solo_adults ?? 0) + (dep.nb_children ?? 0);
    const estimatedMinutes = estimateDuration(guestCount, property.nb_bathrooms ?? 1);

    let urgency: CleaningUrgency;
    if (windowDays === 0) urgency = 'turnover';
    else if (windowDays <= 1) urgency = 'urgent';
    else if (windowDays <= 3) urgency = 'normal';
    else urgency = 'relaxed';

    let reason: string;
    if (urgency === 'turnover') reason = 'Turn-over le jour même';
    else if (urgency === 'urgent') reason = `Fenêtre courte (${windowDays}j)`;
    else if (urgency === 'normal') reason = 'Anticipation dernière minute';
    else reason = 'Logement libre — planifier tôt';

    let suggestedDate = dep.check_out;

    if (windowDays > 0) {
      const deadline = checkIn ? addDaysStr(checkIn, -1) : horizonDate;
      const group = property.group_name?.trim() || null;
      const groupPreferred = group ? (groupDates.get(group) ?? null) : null;
      suggestedDate = pickDate(dep.check_out, deadline, daySlotCount, maxPerDay, groupPreferred);
      if (group) groupDates.set(group, suggestedDate);
    }

    daySlotCount.set(suggestedDate, (daySlotCount.get(suggestedDate) ?? 0) + 1);
    dayMinutes.set(suggestedDate, (dayMinutes.get(suggestedDate) ?? 0) + estimatedMinutes);

    const startTime = suggestStartTime(urgency);
    tasks.push({
      depReservationId: dep.id,
      property,
      checkOut: dep.check_out,
      nextCheckIn: checkIn,
      windowDays,
      suggestedDate,
      suggestedStartTime: startTime,
      suggestedEndTime: addMinutesToTime(startTime, estimatedMinutes),
      estimatedMinutes,
      priority: computePriority(suggestedDate, today),
      urgency,
      reason,
      helpNeeded: (dayMinutes.get(suggestedDate) ?? 0) > 240,
      guestCount,
      isOverdue: false,
    });
  }

  // ── Pass 2: properties with cleaning_status = 'to_do' not covered above ───
  const URGENT_DAYS = 3;
  const PLANNING_WINDOW = 14;
  const GROUP_PLANNING_WINDOW = 30;

  for (const property of properties) {
    if (!property.is_active || property.cleaning_status !== 'to_do') continue;

    const nextArr = active
      .filter((r) => r.property_id === property.id && r.check_in >= today)
      .sort((a, b) => a.check_in.localeCompare(b.check_in))[0];
    if (!nextArr) continue;

    const alreadyCovered = tasks.some(
      (t) => t.property.id === property.id && t.suggestedDate < nextArr.check_in
    );
    if (alreadyCovered) continue;

    const lastDep = active
      .filter((r) => r.property_id === property.id && r.check_out < today)
      .sort((a, b) => b.check_out.localeCompare(a.check_out))[0];

    const daysUntilArrival = Math.round(
      (new Date(nextArr.check_in).getTime() - new Date(today).getTime()) / 86400000
    );

    const guestCount = lastDep
      ? (lastDep.nb_couples ?? 0) * 2 + (lastDep.nb_solo_adults ?? 0) + (lastDep.nb_children ?? 0)
      : 2;
    const estimatedMinutes = estimateDuration(Math.max(guestCount, 2), property.nb_bathrooms ?? 1);

    let urgency: CleaningUrgency;
    if (daysUntilArrival <= 1) urgency = 'turnover';
    else if (daysUntilArrival <= 3) urgency = 'urgent';
    else if (daysUntilArrival <= 7) urgency = 'normal';
    else urgency = 'relaxed';

    const group = property.group_name?.trim() || null;
    let suggestedDate: string = today;
    let isOverdue: boolean;

    if (daysUntilArrival <= URGENT_DAYS) {
      suggestedDate = today;
      isOverdue = true;
    } else {
      // Group gets wider window to maximize chance of overlap with other group members
      const window = group ? GROUP_PLANNING_WINDOW : PLANNING_WINDOW;
      const searchStart = addDaysStr(nextArr.check_in, -window);
      const from = searchStart >= today ? searchStart : today;
      const deadline = addDaysStr(nextArr.check_in, -1);
      const groupPreferred = group ? (groupDates.get(group) ?? null) : null;
      suggestedDate = pickDate(from, deadline, daySlotCount, maxPerDay, groupPreferred);
      isOverdue = false;
    }

    if (group) groupDates.set(group, suggestedDate);

    daySlotCount.set(suggestedDate, (daySlotCount.get(suggestedDate) ?? 0) + 1);
    dayMinutes.set(suggestedDate, (dayMinutes.get(suggestedDate) ?? 0) + estimatedMinutes);

    let reason: string;
    if (isOverdue && lastDep) {
      const daysSinceDep = Math.round(
        (new Date(today).getTime() - new Date(lastDep.check_out).getTime()) / 86400000
      );
      reason = `En retard de ${daysSinceDep}j · arrivée dans ${daysUntilArrival}j`;
    } else if (isOverdue) {
      reason = `Préparation requise · arrivée dans ${daysUntilArrival}j`;
    } else if (group) {
      reason = `Groupe ${group} · arrivée dans ${daysUntilArrival}j`;
    } else {
      reason = `Logement à préparer · arrivée dans ${daysUntilArrival}j`;
    }

    tasks.push({
      depReservationId: lastDep?.id ?? '',
      property,
      checkOut: lastDep?.check_out ?? today,
      nextCheckIn: nextArr.check_in,
      windowDays: daysUntilArrival,
      suggestedDate,
      suggestedStartTime: '09:00',
      suggestedEndTime: addMinutesToTime('09:00', estimatedMinutes),
      estimatedMinutes,
      priority: computePriority(suggestedDate, today),
      urgency,
      reason,
      helpNeeded: (dayMinutes.get(suggestedDate) ?? 0) > 240,
      guestCount,
      isOverdue,
    });
  }

  // Re-compute helpNeeded at day level (after all tasks assigned)
  const finalDayMinutes = new Map<string, number>();
  for (const t of tasks) {
    finalDayMinutes.set(t.suggestedDate, (finalDayMinutes.get(t.suggestedDate) ?? 0) + t.estimatedMinutes);
  }

  return tasks
    .map((t) => ({
      ...t,
      helpNeeded: (finalDayMinutes.get(t.suggestedDate) ?? 0) > 240,
    }))
    .sort((a, b) => {
      if (a.isOverdue && !b.isOverdue) return -1;
      if (!a.isOverdue && b.isOverdue) return 1;
      return a.suggestedDate.localeCompare(b.suggestedDate);
    });
}

export function groupTasksByDate(tasks: CleaningTask[]): Map<string, CleaningTask[]> {
  const map = new Map<string, CleaningTask[]>();
  for (const task of tasks) {
    const list = map.get(task.suggestedDate) ?? [];
    list.push(task);
    map.set(task.suggestedDate, list);
  }
  return map;
}

export function getDayLoad(tasks: CleaningTask[], date: string, maxPerDay: number): DayLoadInfo {
  const dayTasks = tasks.filter((t) => t.suggestedDate === date);
  const totalMinutes = dayTasks.reduce((acc, t) => acc + t.estimatedMinutes, 0);
  return {
    tasks: dayTasks,
    totalMinutes,
    overCapacity: dayTasks.length > maxPerDay,
    helpNeeded: totalMinutes > 240,
  };
}
