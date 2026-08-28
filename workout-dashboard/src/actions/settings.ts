"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { toDateKey } from "@/lib/utils";

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  return { supabase, user };
}

export async function updateMacroTarget(formData: FormData) {
  const { supabase, user } = await requireUser();
  const protein_g = Number(formData.get("protein_g"));
  const carb_g = Number(formData.get("carb_g"));
  const fat_g = Number(formData.get("fat_g"));
  const step_goal = Number(formData.get("step_goal"));
  const today = toDateKey(new Date());

  // Versioned: a new target takes effect today. If you've already changed
  // your target today, this updates that same row instead of stacking dupes.
  const { error } = await supabase.from("macro_targets").upsert(
    { user_id: user.id, effective_date: today, protein_g, carb_g, fat_g, step_goal },
    { onConflict: "user_id,effective_date" },
  );
  if (error) throw new Error(error.message);
  revalidatePath("/settings");
  revalidatePath("/");
  revalidatePath("/nutrition");
}

export async function updateProfile(formData: FormData) {
  const { supabase, user } = await requireUser();
  const full_name = (formData.get("full_name") as string) || null;
  const timezone = (formData.get("timezone") as string) || "America/New_York";
  const diet_constraints = String(formData.get("diet_constraints") ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  const { error } = await supabase
    .from("profiles")
    .update({ full_name, timezone, diet_constraints })
    .eq("id", user.id);
  if (error) throw new Error(error.message);
  revalidatePath("/settings");
  revalidatePath("/nutrition");
}
