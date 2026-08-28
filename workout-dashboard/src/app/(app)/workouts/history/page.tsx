import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Select } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ExerciseTrendChart } from "@/components/exercise-trend-chart";

export default async function ExerciseHistoryPage({
  searchParams,
}: {
  searchParams: Promise<{ exercise?: string }>;
}) {
  const { exercise: exerciseId } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: exercises } = await supabase
    .from("exercises")
    .select("id, name, category")
    .eq("user_id", user.id)
    .order("name");

  const selected = exerciseId ?? exercises?.[0]?.id;

  let rows: { weight: number | null; reps: number | null; workout_logs: { date: string } | null }[] = [];
  if (selected) {
    const { data } = await supabase
      .from("workout_sets")
      .select("weight, reps, workout_logs(date)")
      .eq("user_id", user.id)
      .eq("exercise_id", selected);
    rows = (data as typeof rows) ?? [];
  }

  const byDate = new Map<string, { topWeight: number; topReps: number }>();
  for (const r of rows) {
    const date = r.workout_logs?.date;
    if (!date || r.weight == null) continue;
    const existing = byDate.get(date);
    if (!existing || r.weight > existing.topWeight) {
      byDate.set(date, { topWeight: r.weight, topReps: r.reps ?? 0 });
    }
  }
  const chartData = Array.from(byDate.entries())
    .map(([date, v]) => ({ date, ...v }))
    .sort((a, b) => a.date.localeCompare(b.date));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-neutral-50">Exercise history</h1>
        <Link href="/workouts" className="text-sm text-emerald-400 hover:underline">
          ← Back to workout log
        </Link>
      </div>

      <Card>
        <CardHeader>
          <div>
            <CardTitle>Progressive overload</CardTitle>
            <CardDescription>Top set weight per session, over time</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {!exercises || exercises.length === 0 ? (
            <p className="text-sm text-neutral-600">
              Log a set on the Workouts page to start building history.
            </p>
          ) : (
            <>
              <form method="GET" className="flex items-center gap-2">
                <Select name="exercise" defaultValue={selected} className="w-64">
                  {exercises.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.name}
                    </option>
                  ))}
                </Select>
                <Button type="submit" size="sm" variant="outline">
                  View
                </Button>
              </form>
              <ExerciseTrendChart data={chartData} />
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
