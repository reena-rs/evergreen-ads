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

export async function updateTemplateDay(formData: FormData) {
  const { supabase, user } = await requireUser();
  const day_of_week = Number(formData.get("day_of_week"));
  const workout_type = String(formData.get("workout_type"));
  const label = (formData.get("label") as string) || null;

  const { error } = await supabase.from("workout_templates").upsert(
    { user_id: user.id, day_of_week, workout_type, label },
    { onConflict: "user_id,day_of_week" },
  );
  if (error) throw new Error(error.message);
  revalidatePath("/workouts");
  revalidatePath("/");
}

async function getOrCreateExercise(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  name: string,
  category: string | null,
) {
  const { data: existing } = await supabase
    .from("exercises")
    .select("*")
    .eq("user_id", userId)
    .eq("name", name)
    .maybeSingle();
  if (existing) return existing;

  const { data: created, error } = await supabase
    .from("exercises")
    .insert({ user_id: userId, name, category })
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return created;
}

async function getOrCreateWorkoutLog(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  date: string,
  workoutType: string,
) {
  const { data: existing } = await supabase
    .from("workout_logs")
    .select("*")
    .eq("user_id", userId)
    .eq("date", date)
    .maybeSingle();
  if (existing) return existing;

  const { data: created, error } = await supabase
    .from("workout_logs")
    .insert({ user_id: userId, date, workout_type: workoutType, status: "completed" })
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return created;
}

export async function logSet(formData: FormData) {
  const { supabase, user } = await requireUser();
  const date = String(formData.get("date"));
  const workout_type = String(formData.get("workout_type"));
  const exercise_name = String(formData.get("exercise_name")).trim();
  const category = (formData.get("category") as string) || null;
  const set_number = Number(formData.get("set_number") ?? 1);
  const reps = formData.get("reps") ? Number(formData.get("reps")) : null;
  const weight = formData.get("weight") ? Number(formData.get("weight")) : null;
  const superset_group = (formData.get("superset_group") as string) || null;
  const notes = (formData.get("notes") as string) || null;

  if (!exercise_name) throw new Error("Exercise name is required");

  const log = await getOrCreateWorkoutLog(supabase, user.id, date, workout_type);
  const exercise = await getOrCreateExercise(supabase, user.id, exercise_name, category);

  const { error } = await supabase.from("workout_sets").insert({
    workout_log_id: log.id,
    user_id: user.id,
    exercise_id: exercise.id,
    set_number,
    reps,
    weight,
    superset_group,
    notes,
  });
  if (error) throw new Error(error.message);

  revalidatePath("/workouts");
  revalidatePath("/workouts/history");
}

export async function deleteSet(formData: FormData) {
  const { supabase, user } = await requireUser();
  const id = String(formData.get("id"));
  const { error } = await supabase
    .from("workout_sets")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);
  if (error) throw new Error(error.message);
  revalidatePath("/workouts");
  revalidatePath("/workouts/history");
}

export async function setWorkoutStatus(formData: FormData) {
  const { supabase, user } = await requireUser();
  const date = String(formData.get("date"));
  const workout_type = String(formData.get("workout_type"));
  const status = String(formData.get("status"));

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
    },
    { onConflict: "user_id,date" },
  );
  if (error) throw new Error(error.message);
  revalidatePath("/workouts");
  revalidatePath("/");
}
