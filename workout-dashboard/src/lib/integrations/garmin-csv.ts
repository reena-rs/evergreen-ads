import { parseCsv } from "@/lib/csv";

export interface GarminCsvRow {
  date: string;
  resting_hr: number | null;
  hrv: number | null;
  sleep_score: number | null;
  steps: number | null;
  weight: number | null;
}

// Garmin Connect export formats vary by page/report, so this matches on
// common column name variants rather than one fixed schema.
const COLUMN_ALIASES: Record<keyof Omit<GarminCsvRow, "date">, string[]> = {
  resting_hr: ["restingheartrate", "resting heart rate", "resting_hr", "resting hr"],
  hrv: ["hrv", "average hrv", "hrvweeklyaverage", "hrv (ms)"],
  sleep_score: ["sleepscore", "sleep score", "overallscore"],
  steps: ["steps", "totalsteps", "total steps"],
  weight: ["weight", "weight (lbs)", "weight (lb)", "bodyweight"],
};
const DATE_ALIASES = ["date", "calendar date", "day"];

function normalize(header: string): string {
  return header.trim().toLowerCase();
}

function findColumn(headers: string[], aliases: string[]): number {
  const normalized = headers.map(normalize);
  for (const alias of aliases) {
    const idx = normalized.indexOf(alias);
    if (idx !== -1) return idx;
  }
  return -1;
}

function toNumber(value: string | undefined): number | null {
  if (!value) return null;
  const n = Number(value.replace(/,/g, ""));
  return Number.isFinite(n) ? n : null;
}

function toDateKey(value: string): string | null {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
}

export interface ParsedGarminCsv {
  rows: GarminCsvRow[];
  matchedColumns: string[];
  unmatchedFields: string[];
}

export function parseGarminCsv(text: string): ParsedGarminCsv {
  const table = parseCsv(text);
  if (table.length === 0) {
    return { rows: [], matchedColumns: [], unmatchedFields: Object.keys(COLUMN_ALIASES) };
  }

  const [headerRow, ...dataRows] = table;
  const dateCol = findColumn(headerRow, DATE_ALIASES);

  const fieldCols = Object.fromEntries(
    (Object.keys(COLUMN_ALIASES) as (keyof typeof COLUMN_ALIASES)[]).map((field) => [
      field,
      findColumn(headerRow, COLUMN_ALIASES[field]),
    ]),
  ) as Record<keyof Omit<GarminCsvRow, "date">, number>;

  const matchedColumns = Object.entries(fieldCols)
    .filter(([, idx]) => idx !== -1)
    .map(([field]) => field);
  const unmatchedFields = Object.entries(fieldCols)
    .filter(([, idx]) => idx === -1)
    .map(([field]) => field);

  if (dateCol === -1) {
    return { rows: [], matchedColumns, unmatchedFields: ["date", ...unmatchedFields] };
  }

  const rows: GarminCsvRow[] = [];
  for (const cells of dataRows) {
    const date = toDateKey(cells[dateCol]);
    if (!date) continue;
    rows.push({
      date,
      resting_hr: toNumber(cells[fieldCols.resting_hr]),
      hrv: toNumber(cells[fieldCols.hrv]),
      sleep_score: toNumber(cells[fieldCols.sleep_score]),
      steps: toNumber(cells[fieldCols.steps]),
      weight: toNumber(cells[fieldCols.weight]),
    });
  }

  return { rows, matchedColumns, unmatchedFields };
}
