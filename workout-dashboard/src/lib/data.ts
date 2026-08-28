import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";

type Client = SupabaseClient<Database>;

export async function getMacroTargetForDate(supabase: Client, userId: string, date: string) {
  const { data } = await supabase
    .from("macro_targets")
    .select("*")
    .eq("user_id", userId)
    .lte("effective_date", date)
    .order("effective_date", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data;
}

export async function getWorkoutTemplate(supabase: Client, userId: string) {
  const { data } = await supabase
    .from("workout_templates")
    .select("*")
    .eq("user_id", userId)
    .order("day_of_week", { ascending: true });
  return data ?? [];
}

export async function getWorkoutLogForDate(supabase: Client, userId: string, date: string) {
  const { data } = await supabase
    .from("workout_logs")
    .select("*")
    .eq("user_id", userId)
    .eq("date", date)
    .maybeSingle();
  return data;
}

export async function getMacroLogForDate(supabase: Client, userId: string, date: string) {
  const { data } = await supabase
    .from("macro_logs")
    .select("*")
    .eq("user_id", userId)
    .eq("date", date)
    .maybeSingle();
  return data;
}

export async function getDailyMetricsForDate(supabase: Client, userId: string, date: string) {
  const { data } = await supabase
    .from("daily_metrics")
    .select("*")
    .eq("user_id", userId)
    .eq("date", date)
    .maybeSingle();
  return data;
}

export async function getRecoveryForDate(
  supabase: Client,
  userId: string,
  date: string,
  source: "manual" | "oura" | "garmin" = "manual",
) {
  const { data } = await supabase
    .from("recovery_data")
    .select("*")
    .eq("user_id", userId)
    .eq("date", date)
    .eq("source", source)
    .maybeSingle();
  return data;
}

export async function getProfile(supabase: Client, userId: string) {
  const { data } = await supabase.from("profiles").select("*").eq("id", userId).maybeSingle();
  return data;
}

export async function getIntegrationToken(
  supabase: Client,
  userId: string,
  service: "oura" | "garmin",
) {
  const { data } = await supabase
    .from("integration_tokens")
    .select("service, last_sync_at, expires_at")
    .eq("user_id", userId)
    .eq("service", service)
    .maybeSingle();
  return data;
}
