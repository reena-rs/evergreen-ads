import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { buildDateRange, computeConsistencyByWeek, computeMacroAdherenceByWeek } from "@/lib/progress";
import { cn } from "@/lib/utils";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import {
  WeightTrendChart,
  RecoveryTrendChart,
  ConsistencyChart,
  AdherenceChart,
} from "@/components/progress-charts";

const RANGES = [7, 30, 90] as const;

export default async function ProgressPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  const { range: rangeParam } = await searchParams;
  const range = RANGES.includes(Number(rangeParam) as (typeof RANGES)[number])
    ? (Number(rangeParam) as (typeof RANGES)[number])
    : 30;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const dates = buildDateRange(range);
  const startDate = dates[0];

  const [metricsRes, recoveryRes, macroLogsRes, targetsRes, templateRes, logsRes] = await Promise.all([
    supabase
      .from("daily_metrics")
      .select("date, weight")
      .eq("user_id", user.id)
      .gte("date", startDate)
      .order("date"),
    supabase
      .from("recovery_data")
      .select("date, source, resting_hr, hrv, sleep_quality")
      .eq("user_id", user.id)
      .gte("date", startDate)
      .order("date"),
    supabase
      .from("macro_logs")
      .select("date, protein_g, carb_g, fat_g")
      .eq("user_id", user.id)
      .gte("date", startDate)
      .order("date"),
    supabase
      .from("macro_targets")
      .select("effective_date, protein_g, carb_g, fat_g")
      .eq("user_id", user.id)
      .order("effective_date", { ascending: false }),
    supabase.from("workout_templates").select("day_of_week, workout_type").eq("user_id", user.id),
    supabase
      .from("workout_logs")
      .select("date, status")
      .eq("user_id", user.id)
      .gte("date", startDate),
  ]);

  const weightSeries = (metricsRes.data ?? [])
    .filter((m) => m.weight != null)
    .map((m) => ({ date: m.date, weight: Number(m.weight) }));

  // resting HR / HRV are directly comparable across sources (bpm / ms), so
  // merge them with oura > garmin > manual priority when more than one
  // source has an entry for the same day. sleep_quality is a 1-5 subjective
  // manual-only field — it stays manual-only rather than mixing with Oura's
  // 0-100 sleep score, which the chart isn't scaled for.
  const SOURCE_PRIORITY = { oura: 0, garmin: 1, manual: 2 } as const;
  const recoveryByDate = new Map<
    string,
    { date: string; restingHr: number | null; hrv: number | null; sleepQuality: number | null }
  >();
  for (const r of (recoveryRes.data ?? []).slice().sort((a, b) => SOURCE_PRIORITY[b.source] - SOURCE_PRIORITY[a.source])) {
    const row = recoveryByDate.get(r.date) ?? { date: r.date, restingHr: null, hrv: null, sleepQuality: null };
    if (r.resting_hr != null) row.restingHr = r.resting_hr;
    if (r.hrv != null) row.hrv = r.hrv;
    if (r.source === "manual" && r.sleep_quality != null) row.sleepQuality = r.sleep_quality;
    recoveryByDate.set(r.date, row);
  }
  const recoverySeries = Array.from(recoveryByDate.values()).sort((a, b) => a.date.localeCompare(b.date));

  const templateByDow = new Map((templateRes.data ?? []).map((t) => [t.day_of_week, t.workout_type]));
  const logStatusByDate = new Map((logsRes.data ?? []).map((l) => [l.date, l.status]));
  const consistency = computeConsistencyByWeek({ dates, templateByDow, logStatusByDate });

  const macroLogByDate = new Map(
    (macroLogsRes.data ?? []).map((m) => [
      m.date,
      { protein_g: Number(m.protein_g), carb_g: Number(m.carb_g), fat_g: Number(m.fat_g) },
    ]),
  );
  const adherence = computeMacroAdherenceByWeek({
    dates,
    macroLogByDate,
    targetsDesc: targetsRes.data ?? [],
    tolerancePct: 0.1,
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold text-neutral-50">Progress</h1>
        <div className="flex gap-1 rounded-lg border border-neutral-800 p-1">
          {RANGES.map((r) => (
            <Link
              key={r}
              href={`/progress?range=${r}`}
              className={cn(
                "rounded-md px-3 py-1 text-xs font-medium",
                r === range ? "bg-emerald-950 text-emerald-300" : "text-neutral-400 hover:text-neutral-100",
              )}
            >
              {r}d
            </Link>
          ))}
        </div>
      </div>

      <Card>
        <CardHeader>
          <div>
            <CardTitle>Weight trend</CardTitle>
            <CardDescription>Manual weigh-ins over the last {range} days</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <WeightTrendChart data={weightSeries} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div>
            <CardTitle>Training consistency</CardTitle>
            <CardDescription>Workouts completed vs. scheduled, by week</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <ConsistencyChart data={consistency} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div>
            <CardTitle>Macro adherence</CardTitle>
            <CardDescription>% of logged days within 10% of your kcal target, by week</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <AdherenceChart data={adherence} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div>
            <CardTitle>Recovery trend</CardTitle>
            <CardDescription>Manual entries — auto-populates once Oura/Garmin (Phase 2/3) land</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <RecoveryTrendChart data={recoverySeries} />
        </CardContent>
      </Card>
    </div>
  );
}
