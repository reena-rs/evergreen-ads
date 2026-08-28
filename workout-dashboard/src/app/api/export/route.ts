import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

function toCsv(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return "";
  const headers = Object.keys(rows[0]);
  const escape = (v: unknown) => {
    if (v === null || v === undefined) return "";
    const s = String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [headers.join(",")];
  for (const row of rows) {
    lines.push(headers.map((h) => escape(row[h])).join(","));
  }
  return lines.join("\n");
}

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const table = request.nextUrl.searchParams.get("table") ?? "daily";

  if (table === "sets") {
    const { data } = await supabase
      .from("workout_sets")
      .select("set_number, reps, weight, superset_group, notes, exercises(name, category), workout_logs(date, workout_type, status)")
      .eq("user_id", user.id);

    type SetExportRow = {
      set_number: number;
      reps: number | null;
      weight: number | null;
      superset_group: string | null;
      notes: string | null;
      exercises: { name: string; category: string | null } | null;
      workout_logs: { date: string; workout_type: string; status: string } | null;
    };

    const rows = ((data as unknown as SetExportRow[]) ?? []).map((r) => {
      const exercise = r.exercises;
      const log = r.workout_logs;
      return {
        date: log?.date ?? "",
        workout_type: log?.workout_type ?? "",
        status: log?.status ?? "",
        exercise: exercise?.name ?? "",
        category: exercise?.category ?? "",
        set_number: r.set_number,
        reps: r.reps,
        weight: r.weight,
        superset_group: r.superset_group,
        notes: r.notes,
      };
    });
    rows.sort((a, b) => a.date.localeCompare(b.date));

    return new Response(toCsv(rows), {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="workout-sets-export.csv"`,
      },
    });
  }

  const [metrics, macros, recovery, logs] = await Promise.all([
    supabase.from("daily_metrics").select("date, steps, weight, energy_level, note").eq("user_id", user.id),
    supabase.from("macro_logs").select("date, protein_g, carb_g, fat_g").eq("user_id", user.id),
    supabase
      .from("recovery_data")
      .select("date, source, sleep_quality, hrv, resting_hr, readiness_score, notes")
      .eq("user_id", user.id),
    supabase.from("workout_logs").select("date, workout_type, status, notes").eq("user_id", user.id),
  ]);

  const byDate = new Map<string, Record<string, unknown>>();
  const ensure = (date: string) => {
    if (!byDate.has(date)) byDate.set(date, { date });
    return byDate.get(date)!;
  };

  for (const m of metrics.data ?? []) {
    Object.assign(ensure(m.date), {
      steps: m.steps,
      weight: m.weight,
      energy_level: m.energy_level,
      note: m.note,
    });
  }
  for (const m of macros.data ?? []) {
    Object.assign(ensure(m.date), {
      protein_g: m.protein_g,
      carb_g: m.carb_g,
      fat_g: m.fat_g,
    });
  }
  for (const r of recovery.data ?? []) {
    Object.assign(ensure(r.date), {
      recovery_source: r.source,
      sleep_quality: r.sleep_quality,
      hrv: r.hrv,
      resting_hr: r.resting_hr,
      readiness_score: r.readiness_score,
      recovery_notes: r.notes,
    });
  }
  for (const l of logs.data ?? []) {
    Object.assign(ensure(l.date), {
      workout_type: l.workout_type,
      workout_status: l.status,
      workout_notes: l.notes,
    });
  }

  const rows = Array.from(byDate.values()).sort((a, b) =>
    String(a.date).localeCompare(String(b.date)),
  );

  return new Response(toCsv(rows), {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="daily-export.csv"`,
    },
  });
}
