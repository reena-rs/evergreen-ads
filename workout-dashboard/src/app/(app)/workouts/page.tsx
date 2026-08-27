import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getWorkoutTemplate, getWorkoutLogForDate } from "@/lib/data";
import { toDateKey, WEEKDAY_LABELS, WORKOUT_TYPE_OPTIONS } from "@/lib/utils";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/input";
import { updateTemplateDay, logSet, deleteSet, setWorkoutStatus } from "@/actions/workouts";

export default async function WorkoutsPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const { date: dateParam } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const date = dateParam ?? toDateKey(new Date());
  const dayOfWeek = new Date(`${date}T12:00:00`).getDay();

  const [template, log, exerciseRows] = await Promise.all([
    getWorkoutTemplate(supabase, user.id),
    getWorkoutLogForDate(supabase, user.id, date),
    supabase.from("exercises").select("id, name, category").eq("user_id", user.id).order("name"),
  ]);
  const exercises = exerciseRows.data ?? [];

  const scheduled = template.find((t) => t.day_of_week === dayOfWeek);
  const workoutType = log?.workout_type ?? scheduled?.workout_type ?? "Rest";
  const status = log?.status ?? "scheduled";

  let sets: {
    id: string;
    set_number: number;
    reps: number | null;
    weight: number | null;
    superset_group: string | null;
    notes: string | null;
    exercises: { name: string } | null;
  }[] = [];
  if (log) {
    const { data } = await supabase
      .from("workout_sets")
      .select("id, set_number, reps, weight, superset_group, notes, exercises(name)")
      .eq("workout_log_id", log.id)
      .order("created_at", { ascending: true });
    sets = (data as typeof sets) ?? [];
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-neutral-50">Workout Log</h1>
        <Link href="/workouts/history" className="text-sm text-emerald-400 hover:underline">
          Exercise history →
        </Link>
      </div>

      {/* Weekly template */}
      <Card>
        <CardHeader>
          <div>
            <CardTitle>Standing weekly split</CardTitle>
            <CardDescription>Your default PPL + Solidcore template — edit any day</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
            {WEEKDAY_LABELS.map((label, dow) => {
              const row = template.find((t) => t.day_of_week === dow);
              return (
                <form
                  action={updateTemplateDay}
                  key={dow}
                  className="flex flex-wrap items-center gap-2 rounded-lg border border-neutral-800 p-2"
                >
                  <input type="hidden" name="day_of_week" value={dow} />
                  <span className="w-24 text-sm text-neutral-400">{label}</span>
                  <Select name="workout_type" defaultValue={row?.workout_type ?? "Rest"} className="w-40">
                    {WORKOUT_TYPE_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </Select>
                  <Input
                    name="label"
                    placeholder="label (optional)"
                    defaultValue={row?.label ?? ""}
                    className="w-48 flex-1"
                  />
                  <Button type="submit" size="sm" variant="secondary">
                    Save
                  </Button>
                </form>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Date picker */}
      <form method="GET" className="flex items-center gap-2">
        <Label htmlFor="date" className="mb-0">
          Session date
        </Label>
        <Input id="date" name="date" type="date" defaultValue={date} className="w-44" />
        <Button type="submit" size="sm" variant="outline">
          Go
        </Button>
      </form>

      {/* Session for chosen date */}
      <Card>
        <CardHeader>
          <div>
            <CardTitle>
              {date} — {workoutType}
            </CardTitle>
            <CardDescription>Status: {status.replace("_", " ")}</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {(["completed", "skipped", "rest", "active_recovery"] as const).map((s) => (
              <form action={setWorkoutStatus} key={s}>
                <input type="hidden" name="date" value={date} />
                <input type="hidden" name="workout_type" value={workoutType} />
                <input type="hidden" name="status" value={s} />
                <Button type="submit" size="sm" variant={status === s ? "default" : "outline"}>
                  {s.replace("_", " ")}
                </Button>
              </form>
            ))}
          </div>

          <div>
            <h4 className="mb-2 text-sm font-medium text-neutral-300">Logged sets</h4>
            {sets.length === 0 ? (
              <p className="text-sm text-neutral-600">No sets logged for this date yet.</p>
            ) : (
              <div className="space-y-1">
                {sets.map((s) => (
                  <div
                    key={s.id}
                    className="flex items-center justify-between rounded-lg border border-neutral-800 px-3 py-2 text-sm"
                  >
                    <span>
                      <span className="font-medium text-neutral-100">{s.exercises?.name}</span>{" "}
                      <span className="text-neutral-500">
                        — set {s.set_number}
                        {s.reps ? ` · ${s.reps} reps` : ""}
                        {s.weight ? ` · ${s.weight} lb` : ""}
                        {s.superset_group ? ` · superset ${s.superset_group}` : ""}
                      </span>
                      {s.notes ? <span className="ml-2 text-neutral-600">({s.notes})</span> : null}
                    </span>
                    <form action={deleteSet}>
                      <input type="hidden" name="id" value={s.id} />
                      <Button type="submit" size="sm" variant="ghost">
                        Remove
                      </Button>
                    </form>
                  </div>
                ))}
              </div>
            )}
          </div>

          <form action={logSet} className="grid grid-cols-2 gap-3 border-t border-neutral-800 pt-4 sm:grid-cols-4">
            <input type="hidden" name="date" value={date} />
            <input type="hidden" name="workout_type" value={workoutType} />
            <div className="col-span-2">
              <Label htmlFor="exercise_name">Exercise</Label>
              <Input id="exercise_name" name="exercise_name" list="exercise-options" required />
              <datalist id="exercise-options">
                {exercises.map((e) => (
                  <option key={e.id} value={e.name} />
                ))}
              </datalist>
            </div>
            <div>
              <Label htmlFor="category">Category</Label>
              <Input id="category" name="category" placeholder="e.g. Push" />
            </div>
            <div>
              <Label htmlFor="set_number">Set #</Label>
              <Input id="set_number" name="set_number" type="number" defaultValue={1} min={1} />
            </div>
            <div>
              <Label htmlFor="reps">Reps</Label>
              <Input id="reps" name="reps" type="number" />
            </div>
            <div>
              <Label htmlFor="weight">Weight (lb)</Label>
              <Input id="weight" name="weight" type="number" step="0.5" />
            </div>
            <div>
              <Label htmlFor="superset_group">Superset group</Label>
              <Input id="superset_group" name="superset_group" placeholder="e.g. A" />
            </div>
            <div className="col-span-2 sm:col-span-1">
              <Label htmlFor="notes">Notes</Label>
              <Input id="notes" name="notes" />
            </div>
            <div className="col-span-2 sm:col-span-4">
              <Button type="submit" size="sm">
                Add set
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
