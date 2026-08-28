"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { importGarminCsv, type GarminImportResult } from "@/actions/integrations";

export function GarminImportForm() {
  const [state, formAction, isPending] = useActionState<GarminImportResult | null, FormData>(
    async (_prev, formData) => importGarminCsv(formData),
    null,
  );

  return (
    <form action={formAction} className="space-y-3">
      <div>
        <Label htmlFor="garmin-file">Garmin Connect CSV export</Label>
        <Input id="garmin-file" name="file" type="file" accept=".csv,text/csv" required />
        <p className="mt-1 text-xs text-neutral-500">
          From Garmin Connect: Account Settings → Export Your Data, or a report&apos;s own CSV export
          (Sleep, Heart Rate, Steps). Column names vary — this matches common variants for date, resting
          heart rate, HRV, sleep score, steps, and weight.
        </p>
      </div>
      <Button type="submit" size="sm" variant="secondary" disabled={isPending}>
        {isPending ? "Importing…" : "Import CSV"}
      </Button>

      {state ? (
        <div className="rounded-lg border border-neutral-800 p-3 text-xs text-neutral-400">
          {state.error ? (
            <p className="text-amber-400">{state.error}</p>
          ) : (
            <p className="text-emerald-400">Imported {state.rowsImported} day(s).</p>
          )}
          {state.matchedColumns.length > 0 ? (
            <p className="mt-1">Matched columns: {state.matchedColumns.join(", ")}</p>
          ) : null}
          {state.unmatchedFields.length > 0 ? (
            <p>Not found in this file: {state.unmatchedFields.join(", ")}</p>
          ) : null}
        </div>
      ) : null}
    </form>
  );
}
