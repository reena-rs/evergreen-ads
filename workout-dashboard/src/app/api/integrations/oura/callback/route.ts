import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { exchangeCodeForTokens } from "@/lib/integrations/oura";
import { encryptToken } from "@/lib/crypto";

const STATE_COOKIE = "oura_oauth_state";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");
  const expectedState = request.cookies.get(STATE_COOKIE)?.value;
  const error = request.nextUrl.searchParams.get("error");

  const fail = (reason: string) =>
    NextResponse.redirect(new URL(`/settings?oura_error=${encodeURIComponent(reason)}`, request.url));

  if (error) return fail(error);
  if (!code || !state || !expectedState || state !== expectedState) {
    return fail("invalid_state");
  }

  try {
    const redirectUri = new URL("/api/integrations/oura/callback", request.url).toString();
    const tokens = await exchangeCodeForTokens(code, redirectUri);
    const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString();

    const { error: dbError } = await supabase.from("integration_tokens").upsert(
      {
        user_id: user.id,
        service: "oura",
        access_token: encryptToken(tokens.access_token),
        refresh_token: encryptToken(tokens.refresh_token),
        expires_at: expiresAt,
      },
      { onConflict: "user_id,service" },
    );
    if (dbError) throw new Error(dbError.message);
  } catch (e) {
    return fail(e instanceof Error ? e.message : "token_exchange_failed");
  }

  const response = NextResponse.redirect(new URL("/settings?oura=connected", request.url));
  response.cookies.delete(STATE_COOKIE);
  return response;
}
