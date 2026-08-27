"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  return { supabase, user };
}

function numOrNull(v: FormDataEntryValue | null) {
  if (v === null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

export async function upsertDailyMetrics(formData: FormData) {
  const { supabase, user } = await requireUser();
  const date = String(formData.get("date"));

  const { error } = await supabase.from("daily_metrics").upsert(
    {
      user_id: user.id,
      date,
      steps: numOrNull(formData.get("steps")),
      weight: numOrNull(formData.get("weight")),
      energy_level: numOrNull(formData.get("energy_level")),
      note: (formData.get("note") as string) || null,
    },
    { onConflict: "user_id,date" },
  );
  if (error) throw new Error(error.message);
  revalidatePath("/");
  revalidatePath("/progress");
}

export async function upsertRecovery(formData: FormData) {
  const { supabase, user } = await requireUser();
  const date = String(formData.get("date"));

  const { error } = await supabase.from("recovery_data").upsert(
    {
      user_id: user.id,
      date,
      source: "manual",
      sleep_quality: numOrNull(formData.get("sleep_quality")),
      hrv: numOrNull(formData.get("hrv")),
      resting_hr: numOrNull(formData.get("resting_hr")),
      notes: (formData.get("notes") as string) || null,
    },
    { onConflict: "user_id,date,source" },
  );
  if (error) throw new Error(error.message);
  revalidatePath("/");
  revalidatePath("/progress");
}

export async function upsertMacroLog(formData: FormData) {
  const { supabase, user } = await requireUser();
  const date = String(formData.get("date"));

  const { error } = await supabase.from("macro_logs").upsert(
    {
      user_id: user.id,
      date,
      protein_g: numOrNull(formData.get("protein_g")) ?? 0,
      carb_g: numOrNull(formData.get("carb_g")) ?? 0,
      fat_g: numOrNull(formData.get("fat_g")) ?? 0,
    },
    { onConflict: "user_id,date" },
  );
  if (error) throw new Error(error.message);
  revalidatePath("/");
  revalidatePath("/nutrition");
  revalidatePath("/progress");
}

export async function setWorkoutForDate(formData: FormData) {
  const { supabase, user } = await requireUser();
  const date = String(formData.get("date"));
  const workout_type = String(formData.get("workout_type"));
  const status = String(formData.get("status") ?? "scheduled");
  const notes = (formData.get("notes") as string) || null;

  const { error } = await supabase.from("workout_logs").upsert(
    {
      user_id: user.id,
      date,
      workout_type,
      status: status as
        | "scheduled"
        | "completed"
        | "skipped"
        | "rest"
        | "active_recovery",
      notes,
    },
    { onConflict: "user_id,date" },
  );
  if (error) throw new Error(error.message);
  revalidatePath("/");
  revalidatePath("/workouts");
  revalidatePath("/progress");
}
