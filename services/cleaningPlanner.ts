import { Reservation, Property } from '@/types';

export type CleaningPriority = 'critique' | 'recommande' | 'flexible';
export type CleaningUrgency = 'turnover' | 'urgent' | 'normal' | 'relaxed';

export interface CleaningTask {
  depReservationId: string;
  property: Property;
  checkOut: string;
  nextCheckIn: string | null;
  isOverdue: boolean; // guests already left, cleaning not done yet
  windowDays: number;
  suggestedDate: string;
  suggestedStartTime: string; // "HH:MM"
  suggestedEndTime: string;   // "HH:MM"
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
  // Calibrated on real data:
  //   3 guests (1 couple + sofa) = 2h (120min) → 40min/guest
  //   6 guests (F5 Padru)        = 4h (240min) → 40min/guest
  const base = Math.max(80, guestCount * 40);

  // +20min per extra bathroom beyond the first
  const extraBathrooms = Math.max(0, (nbBathrooms ?? 1) - 1);
  return base + extraBathrooms * 20;
}

function suggestStartTime(urgency: CleaningUrgency): string {
  // Turnovers: start right after typical checkout (10h)
  // Others: suggest morning start
  if (urgency === 'turnover') return '10:00';
  return '09:00';
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

  // Track per-day slot count and total minutes
  const daySlotCount = new Map<string, number>();
  const dayMinutes = new Map<string, number>();

  const tasks: CleaningTask[] = [];

  for (const dep of departures) {
    const property = propMap.get(dep.property_id);
    if (!property || !property.is_active) continue;

    // Find next arrival for same property on or after check_out
    const nextArr = active
      .filter(
        (r) =>
          r.property_id === dep.property_id &&
          r.check_in >= dep.check_out &&
          r.id !== dep.id
      )
      .sort((a, b) => a.check_in.localeCompare(b.check_in))[0];

    const checkIn = nextArr?.check_in ?? null;
    const windowDays = checkIn
      ? Math.round(
          (new Date(checkIn).getTime() - new Date(dep.check_out).getTime()) / 86400000
        )
      : 99;

    // Guest count from departure reservation
    const guestCount =
      (dep.nb_couples ?? 0) * 2 + (dep.nb_solo_adults ?? 0) + (dep.nb_children ?? 0);

    const estimatedMinutes = estimateDuration(guestCount, property.nb_bathrooms ?? 1);

    // Urgency (based on the gap between checkout and next checkin)
    let urgency: CleaningUrgency;
    if (windowDays === 0) urgency = 'turnover';
    else if (windowDays <= 1) urgency = 'urgent';
    else if (windowDays <= 3) urgency = 'normal';
    else urgency = 'relaxed';

    // Reason
    let reason: string;
    if (urgency === 'turnover') reason = 'Turn-over le jour même';
    else if (urgency === 'urgent') reason = `Fenêtre courte (${windowDays}j)`;
    else if (urgency === 'normal') reason = 'Anticipation dernière minute';
    else reason = 'Logement libre — planifier tôt';

    // Suggested date: always as early as possible (J or J+1 max)
    // This keeps the property "ready to book" for last-minute reservations
    let suggestedDate = dep.check_out;

    if (windowDays > 0) {
      const deadline = checkIn ? addDaysStr(checkIn, -1) : horizonDate;
      // Try earliest available day (J, J+1, ...)
      let cursor = dep.check_out;
      let found = false;
      while (cursor <= deadline) {
        if ((daySlotCount.get(cursor) ?? 0) < maxPerDay) {
          suggestedDate = cursor;
          found = true;
          break;
        }
        cursor = addDaysStr(cursor, 1);
      }
      if (!found) suggestedDate = dep.check_out; // overloaded, put on checkOut anyway
    }

    // Priority based on how soon the cleaning needs to happen (suggestedDate vs today)
    const daysUntilSuggested = Math.max(0, Math.round(
      (new Date(suggestedDate).getTime() - new Date(today).getTime()) / 86400000
    ));
    let priority: CleaningPriority;
    if (daysUntilSuggested <= 2) priority = 'critique';
    else if (daysUntilSuggested <= 10) priority = 'recommande';
    else priority = 'flexible';

    // Update day load
    daySlotCount.set(suggestedDate, (daySlotCount.get(suggestedDate) ?? 0) + 1);
    dayMinutes.set(suggestedDate, (dayMinutes.get(suggestedDate) ?? 0) + estimatedMinutes);

    // Help needed: if this day accumulates > 4h of cleaning solo
    const dayTotal = dayMinutes.get(suggestedDate)!;
    const helpNeeded = dayTotal > 240;

    const startTime = suggestStartTime(urgency);
    const endTime = addMinutesToTime(startTime, estimatedMinutes);

    tasks.push({
      depReservationId: dep.id,
      property,
      checkOut: dep.check_out,
      nextCheckIn: checkIn,
      windowDays,
      suggestedDate,
      suggestedStartTime: startTime,
      suggestedEndTime: endTime,
      estimatedMinutes,
      priority,
      urgency,
      reason,
      helpNeeded,
      guestCount,
      isOverdue: false,
    });
  }

  // --- Pass 2: properties with cleaning_status = 'to_do' not covered above ---
  // Catches guests who already left (check_out < today) and properties needing prep
  for (const property of properties) {
    if (!property.is_active || property.cleaning_status !== 'to_do') continue;

    // Skip if a future task already covers the next arrival for this property
    const nextArr = active
      .filter((r) => r.property_id === property.id && r.check_in >= today)
      .sort((a, b) => a.check_in.localeCompare(b.check_in))[0];
    if (!nextArr) continue;

    const alreadyCovered = tasks.some(
      (t) => t.property.id === property.id && t.suggestedDate < nextArr.check_in
    );
    if (alreadyCovered) continue;

    // Most recent past departure to estimate duration
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

    // Suggest cleaning date:
    // - ≤ 3 days until arrival → urgent, plan today
    // - > 3 days → find first quiet day in the 14 days before arrival (not earlier)
    const URGENT_DAYS = 3;
    const PLANNING_WINDOW = 14;
    let suggestedDate: string = today;
    let isOverdue: boolean;
    if (daysUntilArrival <= URGENT_DAYS) {
      suggestedDate = today;
      isOverdue = true;
    } else {
      const searchStart = addDaysStr(nextArr.check_in, -PLANNING_WINDOW);
      const earliestDate = searchStart >= today ? searchStart : today;
      const deadline = addDaysStr(nextArr.check_in, -1);
      let cursor = earliestDate;
      let found = false;
      while (cursor <= deadline) {
        if ((daySlotCount.get(cursor) ?? 0) < maxPerDay) {
          suggestedDate = cursor;
          found = true;
          break;
        }
        cursor = addDaysStr(cursor, 1);
      }
      if (!found) suggestedDate = earliestDate;
      isOverdue = false;
    }

    // Priority based on suggestedDate proximity
    const daysUntilSuggested2 = Math.max(0, Math.round(
      (new Date(suggestedDate).getTime() - new Date(today).getTime()) / 86400000
    ));
    let priority: CleaningPriority;
    if (daysUntilSuggested2 <= 2) priority = 'critique';
    else if (daysUntilSuggested2 <= 10) priority = 'recommande';
    else priority = 'flexible';

    let reason: string;
    if (isOverdue && lastDep) {
      const daysSinceDep = Math.round(
        (new Date(today).getTime() - new Date(lastDep.check_out).getTime()) / 86400000
      );
      reason = `En retard de ${daysSinceDep}j · arrivée dans ${daysUntilArrival}j`;
    } else if (isOverdue) {
      reason = `Préparation requise · arrivée dans ${daysUntilArrival}j`;
    } else {
      reason = `Logement à préparer · arrivée dans ${daysUntilArrival}j`;
    }

    daySlotCount.set(suggestedDate, (daySlotCount.get(suggestedDate) ?? 0) + 1);
    dayMinutes.set(suggestedDate, (dayMinutes.get(suggestedDate) ?? 0) + estimatedMinutes);

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
      priority,
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
      // Overdue tasks always first (today), then by date
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
