import { createClient } from "@/lib/supabase/server";
import { getProfile, getMacroTargetForDate, getIntegrationToken } from "@/lib/data";
import { toDateKey, macroKcal } from "@/lib/utils";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { updateMacroTarget, updateProfile } from "@/actions/settings";
import { disconnectOura } from "@/actions/integrations";
import { OuraSyncButton } from "@/components/oura-sync-button";
import { GarminImportForm } from "@/components/garmin-import-form";

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ oura?: string; oura_error?: string }>;
}) {
  const { oura: ouraStatus, oura_error: ouraError } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const today = toDateKey(new Date());
  const [profile, target, ouraToken] = await Promise.all([
    getProfile(supabase, user.id),
    getMacroTargetForDate(supabase, user.id, today),
    getIntegrationToken(supabase, user.id, "oura"),
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
            <CardTitle>Oura</CardTitle>
            <CardDescription>OAuth2, synced automatically every morning</CardDescription>
          </div>
          <Badge variant={ouraToken ? "default" : "outline"}>
            {ouraToken ? "Connected" : "Not connected"}
          </Badge>
        </CardHeader>
        <CardContent className="space-y-3">
          {ouraStatus === "connected" ? (
            <p className="text-sm text-emerald-400">Oura connected — first sync will run shortly.</p>
          ) : null}
          {ouraError ? (
            <p className="text-sm text-amber-400">Couldn&apos;t connect Oura: {ouraError}</p>
          ) : null}

          {ouraToken ? (
            <div className="space-y-3">
              <p className="text-sm text-neutral-400">
                Last synced:{" "}
                {ouraToken.last_sync_at
                  ? new Date(ouraToken.last_sync_at).toLocaleString()
                  : "not yet — click Sync now"}
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <OuraSyncButton />
                <form action={disconnectOura}>
                  <Button type="submit" size="sm" variant="destructive">
                    Disconnect
                  </Button>
                </form>
              </div>
            </div>
          ) : (
            <a href="/api/integrations/oura/authorize">
              <Button type="button" size="sm">
                Connect Oura
              </Button>
            </a>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div>
            <CardTitle>Garmin</CardTitle>
            <CardDescription>
              CSV import — live OAuth needs Garmin Developer Program approval (see README)
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <GarminImportForm />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div>
            <CardTitle>Cal AI</CardTitle>
            <CardDescription>No integration path exists</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-neutral-400">
            No public API or data export — macro entry stays manual on the{" "}
            <a href="/nutrition" className="text-emerald-400 hover:underline">
              Nutrition
            </a>{" "}
            page.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
