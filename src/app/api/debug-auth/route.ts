import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const nextauthUrl = process.env.NEXTAUTH_URL || "(not set)";
  const redirectUri = `${nextauthUrl}/api/auth/callback/google`;

  return NextResponse.json({
    NEXTAUTH_URL: nextauthUrl,
    redirect_uri_that_will_be_sent_to_google: redirectUri,
    NODE_ENV: process.env.NODE_ENV || "(not set)",
    REPLIT_DEV_DOMAIN: process.env.REPLIT_DEV_DOMAIN || "(not set)",
    request_host: req.headers.get("host"),
    x_forwarded_host: req.headers.get("x-forwarded-host"),
    x_forwarded_proto: req.headers.get("x-forwarded-proto"),
  });
}
