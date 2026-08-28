import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getMacroTargetForDate, getMacroLogForDate, getProfile } from "@/lib/data";
import { toDateKey, macroKcal } from "@/lib/utils";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { MacroBar } from "@/components/macro-bar";
import { upsertMacroLog } from "@/actions/daily";

export default async function NutritionPage({
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

  const [target, macroLog, profile] = await Promise.all([
    getMacroTargetForDate(supabase, user.id, date),
    getMacroLogForDate(supabase, user.id, date),
    getProfile(supabase, user.id),
  ]);

  const proteinTarget = target?.protein_g ?? 125;
  const carbTarget = target?.carb_g ?? 160;
  const fatTarget = target?.fat_g ?? 57;
  const kcalTarget = macroKcal(proteinTarget, carbTarget, fatTarget);

  const proteinLogged = macroLog?.protein_g ?? 0;
  const carbLogged = macroLog?.carb_g ?? 0;
  const fatLogged = macroLog?.fat_g ?? 0;
  const kcalLogged = macroKcal(proteinLogged, carbLogged, fatLogged);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-neutral-50">Nutrition</h1>
        <Link href="/settings" className="text-sm text-emerald-400 hover:underline">
          Edit targets in Settings →
        </Link>
      </div>

      <form method="GET" className="flex items-center gap-2">
        <Label htmlFor="date" className="mb-0">
          Date
        </Label>
        <Input id="date" name="date" type="date" defaultValue={date} className="w-44" />
        <Button type="submit" size="sm" variant="outline">
          Go
        </Button>
      </form>

      <Card>
        <CardHeader>
          <div>
            <CardTitle>{date}</CardTitle>
            <CardDescription>
              {kcalLogged} / {kcalTarget} kcal ({Math.round((kcalLogged / kcalTarget) * 100) || 0}% of target)
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <MacroBar label="Protein" logged={proteinLogged} target={proteinTarget} unit="g" />
            <MacroBar label="Carbs" logged={carbLogged} target={carbTarget} unit="g" />
            <MacroBar label="Fat" logged={fatLogged} target={fatTarget} unit="g" />
          </div>

          <form action={upsertMacroLog} className="grid grid-cols-3 gap-3 border-t border-neutral-800 pt-4">
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
                Save totals for {date}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div>
            <CardTitle>Diet reference</CardTitle>
            <CardDescription>Reminder surface only — not enforced</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {(profile?.diet_constraints ?? []).map((tag) => (
            <Badge key={tag} variant="secondary">
              {tag}
            </Badge>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
