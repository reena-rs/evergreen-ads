import { format, startOfWeek, subDays } from "date-fns";

export function buildDateRange(days: number, end: Date = new Date()): string[] {
  const dates: string[] = [];
  for (let i = days - 1; i >= 0; i--) {
    dates.push(format(subDays(end, i), "yyyy-MM-dd"));
  }
  return dates;
}

export interface MacroTargetRow {
  effective_date: string;
  protein_g: number;
  carb_g: number;
  fat_g: number;
}

export function resolveTargetForDate<T extends MacroTargetRow>(
  targetsDesc: T[],
  date: string,
): T | undefined {
  return targetsDesc.find((t) => t.effective_date <= date);
}

export function weekBucketLabel(date: string): string {
  return format(startOfWeek(new Date(`${date}T12:00:00`), { weekStartsOn: 1 }), "MMM d");
}

export interface ConsistencyInput {
  dates: string[];
  templateByDow: Map<number, string>; // day_of_week -> workout_type
  logStatusByDate: Map<string, string>; // date -> status
}

export function computeConsistencyByWeek({ dates, templateByDow, logStatusByDate }: ConsistencyInput) {
  const buckets = new Map<string, { week: string; scheduled: number; completed: number }>();

  for (const date of dates) {
    const dow = new Date(`${date}T12:00:00`).getDay();
    const scheduledType = templateByDow.get(dow) ?? "Rest";
    const isScheduledWorkout = scheduledType !== "Rest";
    const status = logStatusByDate.get(date);

    const week = weekBucketLabel(date);
    const bucket = buckets.get(week) ?? { week, scheduled: 0, completed: 0 };
    if (isScheduledWorkout) bucket.scheduled += 1;
    if (status === "completed") bucket.completed += 1;
    buckets.set(week, bucket);
  }

  return Array.from(buckets.values());
}

export interface AdherenceInput {
  dates: string[];
  macroLogByDate: Map<string, { protein_g: number; carb_g: number; fat_g: number }>;
  targetsDesc: MacroTargetRow[];
  tolerancePct: number; // e.g. 0.1 for +/-10%
}

export function computeMacroAdherenceByWeek({
  dates,
  macroLogByDate,
  targetsDesc,
  tolerancePct,
}: AdherenceInput) {
  const buckets = new Map<string, { week: string; loggedDays: number; withinTarget: number }>();

  for (const date of dates) {
    const log = macroLogByDate.get(date);
    if (!log) continue;
    const target = resolveTargetForDate(targetsDesc, date);
    if (!target) continue;

    const kcalLogged = log.protein_g * 4 + log.carb_g * 4 + log.fat_g * 9;
    const kcalTarget = target.protein_g * 4 + target.carb_g * 4 + target.fat_g * 9;
    const within = Math.abs(kcalLogged - kcalTarget) <= kcalTarget * tolerancePct;

    const week = weekBucketLabel(date);
    const bucket = buckets.get(week) ?? { week, loggedDays: 0, withinTarget: 0 };
    bucket.loggedDays += 1;
    if (within) bucket.withinTarget += 1;
    buckets.set(week, bucket);
  }

  return Array.from(buckets.values()).map((b) => ({
    week: b.week,
    adherencePct: b.loggedDays > 0 ? Math.round((b.withinTarget / b.loggedDays) * 100) : 0,
  }));
}
