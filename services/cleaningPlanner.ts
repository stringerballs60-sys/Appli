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
  groupName: string | null;
  arrivalsOnDay: number;
  departuresOnDay: number;
}

export interface DayLoadInfo {
  tasks: CleaningTask[];
  totalMinutes: number;
  overCapacity: boolean;
  helpNeeded: boolean;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function addDaysStr(date: string, n: number): string {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

function addMinutesToTime(start: string, minutes: number): string {
  const [h, m] = start.split(':').map(Number);
  const total = h * 60 + m + minutes;
  return `${String(Math.floor(total / 60) % 24).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

function estimateDuration(guestCount: number, nbBathrooms: number): number {
  const base = Math.max(80, guestCount * 40);
  return base + Math.max(0, (nbBathrooms ?? 1) - 1) * 20;
}

function suggestStartTime(urgency: CleaningUrgency): string {
  return urgency === 'turnover' ? '10:00' : '09:00';
}

function computePriority(suggestedDate: string, today: string): CleaningPriority {
  const days = Math.max(0, Math.round(
    (new Date(suggestedDate).getTime() - new Date(today).getTime()) / 86400000
  ));
  if (days <= 2) return 'critique';
  if (days <= 10) return 'recommande';
  return 'flexible';
}

// Rule 1: max cleanings allowed on a given day based on arrival pressure
function maxCleaningsOnDay(arrivalsOnDay: number, globalMax: number): number {
  if (arrivalsOnDay >= 3) return Math.min(globalMax, 1);
  if (arrivalsOnDay >= 2) return Math.min(globalMax, 2);
  return globalMax;
}

// Pick the best date for a cleaning task.
//
// 1. Group co-scheduling (Rule 3): use cluster anchor, bypass maxPerDay,
//    but still respect arrival-day cap. Only applied if daysUntilArrival ≤ 7.
// 2. Consolidation: prefer most-loaded days to leave other days fully free.
// 3. Rule 1: arrival-day cap applied to all candidates.
function pickDate(
  from: string,
  deadline: string,
  daySlotCount: Map<string, number>,
  maxPerDay: number,
  arrivalsPerDay: Map<string, number>,
  clusterAnchor: string | null,
  daysUntilArrival: number,
): string {
  // Rule 3 — cluster co-scheduling (bypass maxPerDay)
  if (clusterAnchor && clusterAnchor >= from && clusterAnchor <= deadline && daysUntilArrival <= 7) {
    const arrivals = arrivalsPerDay.get(clusterAnchor) ?? 0;
    const load = daySlotCount.get(clusterAnchor) ?? 0;
    const arrivalCap = arrivals >= 3 ? 1 : arrivals >= 2 ? 2 : 99;
    if (load < arrivalCap) return clusterAnchor;
    // Anchor blocked by arrivals — fall through
  }

  // Consolidation: pick most-loaded available day (score = load - arrival penalty)
  let bestDate = from;
  let bestScore = -Infinity;
  let hasCandidate = false;

  let cursor = from;
  while (cursor <= deadline) {
    const load = daySlotCount.get(cursor) ?? 0;
    const arrivals = arrivalsPerDay.get(cursor) ?? 0;
    const cap = maxCleaningsOnDay(arrivals, maxPerDay);
    if (load < cap) {
      if (!hasCandidate) { bestDate = cursor; hasCandidate = true; }
      const score = load * 10 - arrivals * 5;
      if (score > bestScore) { bestScore = score; bestDate = cursor; }
    }
    cursor = addDaysStr(cursor, 1);
  }
  return bestDate;
}

// ── Main planner ─────────────────────────────────────────────────────────────

export function computeCleaningPlan(
  reservations: Reservation[],
  properties: Property[],
  maxPerDay: number,
  horizonDate: string
): CleaningTask[] {
  const today = new Date().toISOString().slice(0, 10);
  const propMap = new Map(properties.map((p) => [p.id, p]));
  const active = reservations.filter((r) => r.status !== 'cancelled');

  // Pre-compute arrivals & departures per day (Rules 1 & 4)
  const arrivalsPerDay = new Map<string, number>();
  const departuresPerDay = new Map<string, number>();
  for (const r of active) {
    if (r.check_in >= today) arrivalsPerDay.set(r.check_in, (arrivalsPerDay.get(r.check_in) ?? 0) + 1);
    if (r.check_out >= today) departuresPerDay.set(r.check_out, (departuresPerDay.get(r.check_out) ?? 0) + 1);
  }

  const departures = active
    .filter((r) => r.check_out >= today && r.check_out <= horizonDate)
    .sort((a, b) => a.check_out.localeCompare(b.check_out));

  const daySlotCount = new Map<string, number>();
  const clusterAnchors = new Map<string, string>(); // group_name → anchor date
  const tasks: CleaningTask[] = [];

  // ── Pass 1: future departures ─────────────────────────────────────────────
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

    const group = property.group_name?.trim() || null;
    let suggestedDate = dep.check_out;

    if (windowDays > 0) {
      const deadline = checkIn ? addDaysStr(checkIn, -1) : horizonDate;
      const daysUntilCheckIn = checkIn
        ? Math.round((new Date(checkIn).getTime() - new Date(today).getTime()) / 86400000)
        : 99;
      const anchor = group ? (clusterAnchors.get(group) ?? null) : null;
      suggestedDate = pickDate(dep.check_out, deadline, daySlotCount, maxPerDay, arrivalsPerDay, anchor, daysUntilCheckIn);
      if (group) clusterAnchors.set(group, suggestedDate);
    }

    daySlotCount.set(suggestedDate, (daySlotCount.get(suggestedDate) ?? 0) + 1);

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
      helpNeeded: false,
      guestCount,
      groupName: group,
      arrivalsOnDay: 0,
      departuresOnDay: 0,
      isOverdue: false,
    });
  }

  // ── Pass 2: properties with cleaning_status = 'to_do' ────────────────────
  // Sorted by nearest arrival so urgent cluster members set the anchor first (Rule 3)
  const URGENT_DAYS = 3;
  const PLANNING_WINDOW = 14;
  const GROUP_PLANNING_WINDOW = 30;

  const pass2 = properties
    .filter((p) => p.is_active && p.cleaning_status === 'to_do')
    .map((p) => {
      const nextArr = active
        .filter((r) => r.property_id === p.id && r.check_in >= today)
        .sort((a, b) => a.check_in.localeCompare(b.check_in))[0] ?? null;
      const daysUntil = nextArr
        ? Math.round((new Date(nextArr.check_in).getTime() - new Date(today).getTime()) / 86400000)
        : 9999;
      return { property: p, nextArr, daysUntil };
    })
    .filter((x) => x.nextArr !== null)
    .sort((a, b) => a.daysUntil - b.daysUntil);

  for (const { property, nextArr, daysUntil: daysUntilArrival } of pass2) {
    const alreadyCovered = tasks.some(
      (t) => t.property.id === property.id && t.suggestedDate < nextArr!.check_in
    );
    if (alreadyCovered) continue;

    const lastDep = active
      .filter((r) => r.property_id === property.id && r.check_out < today)
      .sort((a, b) => b.check_out.localeCompare(a.check_out))[0];

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
      if (group) clusterAnchors.set(group, today);
      isOverdue = true;
    } else {
      const window = group ? GROUP_PLANNING_WINDOW : PLANNING_WINDOW;
      const searchStart = addDaysStr(nextArr!.check_in, -window);
      const from = searchStart >= today ? searchStart : today;
      const deadline = addDaysStr(nextArr!.check_in, -1);
      const anchor = group ? (clusterAnchors.get(group) ?? null) : null;
      suggestedDate = pickDate(from, deadline, daySlotCount, maxPerDay, arrivalsPerDay, anchor, daysUntilArrival);
      if (group) clusterAnchors.set(group, suggestedDate);
      isOverdue = false;
    }

    daySlotCount.set(suggestedDate, (daySlotCount.get(suggestedDate) ?? 0) + 1);

    let reason: string;
    if (isOverdue && lastDep) {
      const daysSince = Math.round((new Date(today).getTime() - new Date(lastDep.check_out).getTime()) / 86400000);
      reason = `En retard de ${daysSince}j · arrivée J+${daysUntilArrival}`;
    } else if (isOverdue) {
      reason = `Préparation requise · arrivée J+${daysUntilArrival}`;
    } else if (group) {
      reason = `Cluster ${group} · arrivée J+${daysUntilArrival}`;
    } else {
      reason = `À préparer · arrivée J+${daysUntilArrival}`;
    }

    tasks.push({
      depReservationId: lastDep?.id ?? '',
      property,
      checkOut: lastDep?.check_out ?? today,
      nextCheckIn: nextArr!.check_in,
      windowDays: daysUntilArrival,
      suggestedDate,
      suggestedStartTime: '09:00',
      suggestedEndTime: addMinutesToTime('09:00', estimatedMinutes),
      estimatedMinutes,
      priority: computePriority(suggestedDate, today),
      urgency,
      reason,
      helpNeeded: false,
      guestCount,
      groupName: group,
      arrivalsOnDay: 0,
      departuresOnDay: 0,
      isOverdue,
    });
  }

  // ── Final pass: Rule 4 — recompute helpNeeded per day ────────────────────
  // Alert if count > 3 (hard), or count ≥ 3 AND arrivals+departures ≥ 2 (soft)
  const finalDayCount = new Map<string, number>();
  for (const t of tasks) finalDayCount.set(t.suggestedDate, (finalDayCount.get(t.suggestedDate) ?? 0) + 1);

  return tasks
    .map((t) => {
      const count = finalDayCount.get(t.suggestedDate) ?? 0;
      const arrivals = arrivalsPerDay.get(t.suggestedDate) ?? 0;
      const departures = departuresPerDay.get(t.suggestedDate) ?? 0;
      return {
        ...t,
        helpNeeded: count > 3 || (count >= 3 && arrivals + departures >= 2),
        arrivalsOnDay: arrivals,
        departuresOnDay: departures,
      };
    })
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
    helpNeeded: dayTasks.some((t) => t.helpNeeded),
  };
}
