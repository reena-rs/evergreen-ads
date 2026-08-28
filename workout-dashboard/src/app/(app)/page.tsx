import { createClient } from "@/lib/supabase/server";
import {
  getMacroTargetForDate,
  getWorkoutTemplate,
  getWorkoutLogForDate,
  getMacroLogForDate,
  getDailyMetricsForDate,
  getRecoveryForDate,
  getProfile,
} from "@/lib/data";
import { toDateKey, macroKcal, WORKOUT_TYPE_OPTIONS } from "@/lib/utils";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Input, Label, Select, Textarea } from "@/components/ui/input";
import { upsertDailyMetrics, upsertRecovery, upsertMacroLog, setWorkoutForDate } from "@/actions/daily";
import { MacroBar } from "@/components/macro-bar";

export default async function DailyFeedPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const today = new Date();
  const date = toDateKey(today);
  const dayOfWeek = today.getDay();

  const [template, log, target, macroLog, metrics, recovery, profile] = await Promise.all([
    getWorkoutTemplate(supabase, user.id),
    getWorkoutLogForDate(supabase, user.id, date),
    getMacroTargetForDate(supabase, user.id, date),
    getMacroLogForDate(supabase, user.id, date),
    getDailyMetricsForDate(supabase, user.id, date),
    getRecoveryForDate(supabase, user.id, date),
    getProfile(supabase, user.id),
  ]);

  const scheduled = template.find((t) => t.day_of_week === dayOfWeek);
  const workoutType = log?.workout_type ?? scheduled?.workout_type ?? "Rest";
  const status = log?.status ?? "scheduled";

  const proteinTarget = target?.protein_g ?? 125;
  const carbTarget = target?.carb_g ?? 160;
  const fatTarget = target?.fat_g ?? 57;
  const stepGoal = target?.step_goal ?? 12000;
  const kcalTarget = macroKcal(proteinTarget, carbTarget, fatTarget);

  const proteinLogged = macroLog?.protein_g ?? 0;
  const carbLogged = macroLog?.carb_g ?? 0;
  const fatLogged = macroLog?.fat_g ?? 0;
  const kcalLogged = macroKcal(proteinLogged, carbLogged, fatLogged);

  const steps = metrics?.steps ?? 0;

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">
          {today.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}
        </p>
        <h1 className="text-2xl font-semibold text-neutral-50">
          Good morning{profile?.full_name ? `, ${profile.full_name}` : ""}
        </h1>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Today's workout */}
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Today&apos;s workout</CardTitle>
              <CardDescription>Standing split, editable for swaps or rest days</CardDescription>
            </div>
            <Badge variant={status === "completed" ? "default" : status === "rest" ? "secondary" : "outline"}>
              {status.replace("_", " ")}
            </Badge>
          </CardHeader>
          <CardContent>
            <form action={setWorkoutForDate} className="space-y-3">
              <input type="hidden" name="date" value={date} />
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="workout_type">Workout</Label>
                  <Select id="workout_type" name="workout_type" defaultValue={workoutType}>
                    {WORKOUT_TYPE_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </Select>
                </div>
                <div>
                  <Label htmlFor="status">Status</Label>
                  <Select id="status" name="status" defaultValue={status}>
                    <option value="scheduled">Scheduled</option>
                    <option value="completed">Completed</option>
                    <option value="skipped">Skipped</option>
                    <option value="rest">Rest</option>
                    <option value="active_recovery">Active recovery</option>
                  </Select>
                </div>
              </div>
              <div>
                <Label htmlFor="notes">Today&apos;s note</Label>
                <Textarea
                  id="notes"
                  name="notes"
                  rows={2}
                  placeholder="e.g. deload today, high stress, cut volume"
                  defaultValue={log?.notes ?? ""}
                />
              </div>
              <Button type="submit" size="sm">
                Save
              </Button>
            </form>
            <p className="mt-3 text-xs text-neutral-500">
              Log sets for this session on the{" "}
              <a href="/workouts" className="text-emerald-400 hover:underline">
                Workouts
              </a>{" "}
              page.
            </p>
          </CardContent>
        </Card>

        {/* Macros */}
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Macros</CardTitle>
              <CardDescription>
                {kcalLogged} / {kcalTarget} kcal today
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <MacroBar label="Protein" logged={proteinLogged} target={proteinTarget} unit="g" />
            <MacroBar label="Carbs" logged={carbLogged} target={carbTarget} unit="g" />
            <MacroBar label="Fat" logged={fatLogged} target={fatTarget} unit="g" />

            <form action={upsertMacroLog} className="grid grid-cols-3 gap-2 pt-2">
              <input type="hidden" name="date" value={date} />
              <div>
                <Label htmlFor="protein_g">Protein (g)</Label>
                <Input id="protein_g" name="protein_g" type="number" step="1" defaultValue={proteinLogged} />
              </div>
              <div>
                <Label htmlFor="carb_g">Carb (g)</Label>
                <Input id="carb_g" name="carb_g" type="number" step="1" defaultValue={carbLogged} />
              </div>
              <div>
                <Label htmlFor="fat_g">Fat (g)</Label>
                <Input id="fat_g" name="fat_g" type="number" step="1" defaultValue={fatLogged} />
              </div>
              <div className="col-span-3">
                <Button type="submit" size="sm">
                  Update today&apos;s totals
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Recovery */}
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Recovery</CardTitle>
              <CardDescription>Manual today — auto-fills from Oura in Phase 2</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <form action={upsertRecovery} className="grid grid-cols-3 gap-3">
              <input type="hidden" name="date" value={date} />
              <div>
                <Label htmlFor="sleep_quality">Sleep quality</Label>
                <Select id="sleep_quality" name="sleep_quality" defaultValue={recovery?.sleep_quality ?? ""}>
                  <option value="">—</option>
                  {[1, 2, 3, 4, 5].map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <Label htmlFor="hrv">HRV (ms)</Label>
                <Input id="hrv" name="hrv" type="number" step="0.1" defaultValue={recovery?.hrv ?? ""} />
              </div>
              <div>
                <Label htmlFor="resting_hr">Resting HR</Label>
                <Input
                  id="resting_hr"
                  name="resting_hr"
                  type="number"
                  defaultValue={recovery?.resting_hr ?? ""}
                />
              </div>
              <div className="col-span-3">
                <Label htmlFor="notes">Notes</Label>
                <Input id="notes" name="notes" defaultValue={recovery?.notes ?? ""} />
              </div>
              <div className="col-span-3">
                <Button type="submit" size="sm">
                  Save recovery
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Steps, weight, energy, note */}
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Steps &amp; energy</CardTitle>
              <CardDescription>
                {steps.toLocaleString()} / {stepGoal.toLocaleString()} steps
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <Progress value={steps} max={stepGoal} className="mb-4" />
            <form action={upsertDailyMetrics} className="grid grid-cols-2 gap-3">
              <input type="hidden" name="date" value={date} />
              <div>
                <Label htmlFor="steps">Steps</Label>
                <Input id="steps" name="steps" type="number" defaultValue={metrics?.steps ?? ""} />
              </div>
              <div>
                <Label htmlFor="energy_level">Energy (1-5)</Label>
                <Select id="energy_level" name="energy_level" defaultValue={metrics?.energy_level ?? ""}>
                  <option value="">—</option>
                  {[1, 2, 3, 4, 5].map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="col-span-2">
                <Label htmlFor="weight">Weight (lb) — optional, weekly is fine</Label>
                <Input id="weight" name="weight" type="number" step="0.1" defaultValue={metrics?.weight ?? ""} />
              </div>
              <div className="col-span-2">
                <Label htmlFor="note">Today</Label>
                <Textarea
                  id="note"
                  name="note"
                  rows={2}
                  placeholder="freeform notes about today"
                  defaultValue={metrics?.note ?? ""}
                />
              </div>
              <div className="col-span-2">
                <Button type="submit" size="sm">
                  Save
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>

      <p className="text-xs text-neutral-600">
        Diet reference: {profile?.diet_constraints?.join(" · ") ?? "Gluten-free · Minimal dairy · Minimal chicken · Fish-forward"}
      </p>
    </div>
  );
}
