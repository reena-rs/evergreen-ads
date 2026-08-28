"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { syncOuraForUser } from "@/lib/integrations/sync";
import { parseGarminCsv } from "@/lib/integrations/garmin-csv";

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  return user;
}

export async function disconnectOura() {
  const user = await requireUser();
  const supabase = await createClient();
  const { error } = await supabase
    .from("integration_tokens")
    .delete()
    .eq("user_id", user.id)
    .eq("service", "oura");
  if (error) throw new Error(error.message);
  revalidatePath("/settings");
  revalidatePath("/");
  revalidatePath("/progress");
}

export async function syncOuraNow() {
  const user = await requireUser();
  const admin = createAdminClient();
  const result = await syncOuraForUser(admin, user.id);
  revalidatePath("/settings");
  revalidatePath("/");
  revalidatePath("/progress");
  return result;
}

export interface GarminImportResult {
  rowsImported: number;
  matchedColumns: string[];
  unmatchedFields: string[];
  error?: string;
}

export async function importGarminCsv(formData: FormData): Promise<GarminImportResult> {
  const user = await requireUser();
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return { rowsImported: 0, matchedColumns: [], unmatchedFields: [], error: "No file provided" };
  }

  const text = await file.text();
  const { rows, matchedColumns, unmatchedFields } = parseGarminCsv(text);

  if (rows.length === 0) {
    return {
      rowsImported: 0,
      matchedColumns,
      unmatchedFields,
      error: unmatchedFields.includes("date")
        ? "Couldn't find a date column in this CSV."
        : "No usable rows found in this CSV.",
    };
  }

  const supabase = await createClient();
  for (const row of rows) {
    if (row.resting_hr != null || row.hrv != null || row.sleep_score != null) {
      await supabase.from("recovery_data").upsert(
        {
          user_id: user.id,
          date: row.date,
          source: "garmin",
          resting_hr: row.resting_hr ?? undefined,
          hrv: row.hrv ?? undefined,
          sleep_score: row.sleep_score ?? undefined,
        },
        { onConflict: "user_id,date,source" },
      );
    }
    if (row.steps != null || row.weight != null) {
      await supabase.from("daily_metrics").upsert(
        { user_id: user.id, date: row.date, steps: row.steps ?? undefined, weight: row.weight ?? undefined },
        { onConflict: "user_id,date" },
      );
    }
  }

  revalidatePath("/settings");
  revalidatePath("/");
  revalidatePath("/progress");
  return { rowsImported: rows.length, matchedColumns, unmatchedFields };
}
