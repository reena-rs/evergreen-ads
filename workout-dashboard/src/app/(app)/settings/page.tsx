import { createClient } from "@/lib/supabase/server";
import { getProfile, getMacroTargetForDate } from "@/lib/data";
import { toDateKey, macroKcal } from "@/lib/utils";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { updateMacroTarget, updateProfile } from "@/actions/settings";

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const today = toDateKey(new Date());
  const [profile, target] = await Promise.all([
    getProfile(supabase, user.id),
    getMacroTargetForDate(supabase, user.id, today),
  ]);

  const proteinTarget = target?.protein_g ?? 125;
  const carbTarget = target?.carb_g ?? 160;
  const fatTarget = target?.fat_g ?? 57;
  const stepGoal = target?.step_goal ?? 12000;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-neutral-50">Settings</h1>

      <Card>
        <CardHeader>
          <div>
            <CardTitle>Macro targets &amp; step goal</CardTitle>
            <CardDescription>
              Changes take effect today ({today}) — past days keep the target that was active then
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <form action={updateMacroTarget} className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div>
              <Label htmlFor="protein_g">Protein (g)</Label>
              <Input id="protein_g" name="protein_g" type="number" defaultValue={proteinTarget} required />
            </div>
            <div>
              <Label htmlFor="carb_g">Carb (g)</Label>
              <Input id="carb_g" name="carb_g" type="number" defaultValue={carbTarget} required />
            </div>
            <div>
              <Label htmlFor="fat_g">Fat (g)</Label>
              <Input id="fat_g" name="fat_g" type="number" defaultValue={fatTarget} required />
            </div>
            <div>
              <Label htmlFor="step_goal">Step goal</Label>
              <Input id="step_goal" name="step_goal" type="number" defaultValue={stepGoal} required />
            </div>
            <p className="col-span-2 self-end text-xs text-neutral-500 sm:col-span-4">
              ≈ {macroKcal(proteinTarget, carbTarget, fatTarget)} kcal/day at current values
            </p>
            <div className="col-span-2 sm:col-span-4">
              <Button type="submit" size="sm">
                Save target
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div>
            <CardTitle>Profile &amp; diet reference</CardTitle>
            <CardDescription>Diet tags shown as a reminder on the Nutrition page — not enforced</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <form action={updateProfile} className="space-y-4">
            <div>
              <Label htmlFor="full_name">Name</Label>
              <Input id="full_name" name="full_name" defaultValue={profile?.full_name ?? ""} />
            </div>
            <div>
              <Label htmlFor="timezone">Timezone (IANA)</Label>
              <Input id="timezone" name="timezone" defaultValue={profile?.timezone ?? "America/New_York"} />
            </div>
            <div>
              <Label htmlFor="diet_constraints">Diet constraints (comma-separated)</Label>
              <Input
                id="diet_constraints"
                name="diet_constraints"
                defaultValue={(profile?.diet_constraints ?? []).join(", ")}
              />
            </div>
            <Button type="submit" size="sm">
              Save profile
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div>
            <CardTitle>Export your data</CardTitle>
            <CardDescription>Download everything as CSV — no lock-in</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <a href="/api/export">
            <Button type="button" size="sm" variant="secondary">
              Download daily data (CSV)
            </Button>
          </a>
          <a href="/api/export?table=sets">
            <Button type="button" size="sm" variant="secondary">
              Download workout sets (CSV)
            </Button>
          </a>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div>
            <CardTitle>Integration status</CardTitle>
            <CardDescription>Phase 2/3, per the PRD</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-neutral-400">
          <p>
            <span className="font-medium text-neutral-200">Oura</span> — not yet connected (Phase 2:
            self-serve OAuth2, no approval gate).
          </p>
          <p>
            <span className="font-medium text-neutral-200">Garmin</span> — not yet connected (Phase 3:
            requires Connect Developer Program approval; CSV import is the fallback if rejected).
          </p>
          <p>
            <span className="font-medium text-neutral-200">Cal AI</span> — no integration path exists;
            macro entry stays manual (see README).
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
