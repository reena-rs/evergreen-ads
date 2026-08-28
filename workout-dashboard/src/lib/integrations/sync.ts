import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import { decryptToken, encryptToken } from "@/lib/crypto";
import { fetchOuraRecovery, refreshOuraTokens } from "@/lib/integrations/oura";
import { toDateKey } from "@/lib/utils";

type Client = SupabaseClient<Database>;

export interface SyncResult {
  synced: boolean;
  daysWritten: number;
  error?: string;
}

// Refreshes the stored Oura tokens if needed, pulls the last few days of
// recovery data (Oura sometimes finalizes a night's data with a short delay),
// and upserts it into recovery_data(source='oura'). Used by both the daily
// cron job and the "Sync now" button in Settings.
export async function syncOuraForUser(admin: Client, userId: string): Promise<SyncResult> {
  const { data: tokenRow } = await admin
    .from("integration_tokens")
    .select("*")
    .eq("user_id", userId)
    .eq("service", "oura")
    .maybeSingle();

  if (!tokenRow || !tokenRow.access_token || !tokenRow.refresh_token) {
    return { synced: false, daysWritten: 0, error: "not_connected" };
  }

  let accessToken = decryptToken(tokenRow.access_token);
  const expiresAt = tokenRow.expires_at ? new Date(tokenRow.expires_at).getTime() : 0;
  const needsRefresh = expiresAt - Date.now() < 5 * 60 * 1000; // refresh with a 5 min buffer

  if (needsRefresh) {
    try {
      const refreshed = await refreshOuraTokens(decryptToken(tokenRow.refresh_token));
      accessToken = refreshed.access_token;
      await admin
        .from("integration_tokens")
        .update({
          access_token: encryptToken(refreshed.access_token),
          refresh_token: encryptToken(refreshed.refresh_token),
          expires_at: new Date(Date.now() + refreshed.expires_in * 1000).toISOString(),
        })
        .eq("user_id", userId)
        .eq("service", "oura");
    } catch (e) {
      return {
        synced: false,
        daysWritten: 0,
        error: e instanceof Error ? e.message : "refresh_failed",
      };
    }
  }

  const today = new Date();
  const startDate = toDateKey(new Date(today.getTime() - 3 * 24 * 60 * 60 * 1000));
  const endDate = toDateKey(today);

  try {
    const days = await fetchOuraRecovery(accessToken, startDate, endDate);
    for (const day of days) {
      await admin.from("recovery_data").upsert(
        {
          user_id: userId,
          date: day.date,
          source: "oura",
          sleep_score: day.sleep_score,
          readiness_score: day.readiness_score,
          temperature_deviation: day.temperature_deviation,
          hrv: day.hrv,
          resting_hr: day.resting_hr,
        },
        { onConflict: "user_id,date,source" },
      );
    }
    await admin
      .from("integration_tokens")
      .update({ last_sync_at: new Date().toISOString() })
      .eq("user_id", userId)
      .eq("service", "oura");

    return { synced: true, daysWritten: days.length };
  } catch (e) {
    return { synced: false, daysWritten: 0, error: e instanceof Error ? e.message : "fetch_failed" };
  }
}
