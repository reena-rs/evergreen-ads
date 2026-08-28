import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { syncOuraForUser } from "@/lib/integrations/sync";

// Runs every morning (see vercel.json) to pull the prior night's Oura data
// into recovery_data ahead of the Daily Feed being opened. Vercel Cron sends
// `Authorization: Bearer ${CRON_SECRET}` automatically when CRON_SECRET is
// set in the project's env vars.
export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const auth = request.headers.get("authorization");
    if (auth !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
  }

  const admin = createAdminClient();
  const { data: tokenRows } = await admin
    .from("integration_tokens")
    .select("user_id")
    .eq("service", "oura");

  const results = await Promise.all(
    (tokenRows ?? []).map(async (row) => ({
      user_id: row.user_id,
      ...(await syncOuraForUser(admin, row.user_id)),
    })),
  );

  return NextResponse.json({ ranAt: new Date().toISOString(), results });
}
