const OURA_AUTHORIZE_URL = "https://cloud.ouraring.com/oauth/authorize";
const OURA_TOKEN_URL = "https://api.ouraring.com/oauth/token";
const OURA_API_BASE = "https://api.ouraring.com/v2/usercollection";

export interface OuraTokens {
  access_token: string;
  refresh_token: string;
  expires_in: number; // seconds
}

export function getOuraAuthorizeUrl(redirectUri: string, state: string): string {
  const params = new URLSearchParams({
    response_type: "code",
    client_id: requireEnv("OURA_CLIENT_ID"),
    redirect_uri: redirectUri,
    scope: "daily heartrate",
    state,
  });
  return `${OURA_AUTHORIZE_URL}?${params.toString()}`;
}

export async function exchangeCodeForTokens(code: string, redirectUri: string): Promise<OuraTokens> {
  const res = await fetch(OURA_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
      client_id: requireEnv("OURA_CLIENT_ID"),
      client_secret: requireEnv("OURA_CLIENT_SECRET"),
    }),
  });
  if (!res.ok) {
    throw new Error(`Oura token exchange failed: ${res.status} ${await res.text()}`);
  }
  return res.json();
}

export async function refreshOuraTokens(refreshToken: string): Promise<OuraTokens> {
  const res = await fetch(OURA_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      client_id: requireEnv("OURA_CLIENT_ID"),
      client_secret: requireEnv("OURA_CLIENT_SECRET"),
    }),
  });
  if (!res.ok) {
    throw new Error(`Oura token refresh failed: ${res.status} ${await res.text()}`);
  }
  return res.json();
}

export interface OuraDailyRecovery {
  date: string;
  sleep_score: number | null;
  readiness_score: number | null;
  temperature_deviation: number | null;
  hrv: number | null;
  resting_hr: number | null;
}

// Pulls sleep score, readiness score, temperature deviation, HRV, and resting
// HR for [startDate, endDate] (inclusive, YYYY-MM-DD) and merges them by day.
export async function fetchOuraRecovery(
  accessToken: string,
  startDate: string,
  endDate: string,
): Promise<OuraDailyRecovery[]> {
  const [dailySleep, dailyReadiness, sleepSessions] = await Promise.all([
    ouraGet(accessToken, "daily_sleep", startDate, endDate),
    ouraGet(accessToken, "daily_readiness", startDate, endDate),
    ouraGet(accessToken, "sleep", startDate, endDate),
  ]);

  const byDate = new Map<string, OuraDailyRecovery>();
  const ensure = (date: string) => {
    if (!byDate.has(date)) {
      byDate.set(date, {
        date,
        sleep_score: null,
        readiness_score: null,
        temperature_deviation: null,
        hrv: null,
        resting_hr: null,
      });
    }
    return byDate.get(date)!;
  };

  for (const item of dailySleep.data ?? []) {
    ensure(item.day).sleep_score = item.score ?? null;
  }
  for (const item of dailyReadiness.data ?? []) {
    const row = ensure(item.day);
    row.readiness_score = item.score ?? null;
    row.temperature_deviation = item.temperature_deviation ?? null;
  }
  // Prefer the main "long_sleep" session per night for HRV/resting HR.
  for (const item of sleepSessions.data ?? []) {
    if (item.type && item.type !== "long_sleep") continue;
    const row = ensure(item.day);
    row.hrv = item.average_hrv ?? row.hrv;
    row.resting_hr = item.lowest_heart_rate ?? item.average_heart_rate ?? row.resting_hr;
  }

  return Array.from(byDate.values());
}

interface OuraApiItem {
  day: string;
  score?: number;
  temperature_deviation?: number;
  type?: string;
  average_hrv?: number;
  lowest_heart_rate?: number;
  average_heart_rate?: number;
}

async function ouraGet(
  accessToken: string,
  path: string,
  startDate: string,
  endDate: string,
): Promise<{ data: OuraApiItem[] }> {
  const params = new URLSearchParams({ start_date: startDate, end_date: endDate });
  const res = await fetch(`${OURA_API_BASE}/${path}?${params.toString()}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    throw new Error(`Oura API ${path} failed: ${res.status} ${await res.text()}`);
  }
  return res.json();
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required env var ${name}`);
  return value;
}
