export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getGoogleAccounts, refreshGoogleToken } from "@/lib/google-business";

export async function GET(_request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;

    const account = await prisma.account.findFirst({
      where: { userId, provider: "google" },
      select: {
        access_token: true,
        refresh_token: true,
        expires_at: true,
      },
    });

    if (!account?.access_token) {
      return NextResponse.json(
        { error: "No Google account linked. Please sign in with Google." },
        { status: 404 },
      );
    }

    let accessToken = account.access_token;

    // Refresh if expired (expires_at is Unix seconds from Google OAuth)
    if (account.expires_at && account.expires_at * 1000 < Date.now()) {
      if (!account.refresh_token) {
        return NextResponse.json(
          { error: "Google token expired and no refresh token available." },
          { status: 401 },
        );
      }
      const newTokens = await refreshGoogleToken(account.refresh_token);
      accessToken = newTokens.access_token;

      await prisma.account.updateMany({
        where: { userId, provider: "google" },
        data: {
          access_token: newTokens.access_token,
          expires_at: Math.floor(Date.now() / 1000) + newTokens.expires_in,
        },
      });
    }

    const accounts = await getGoogleAccounts(accessToken);
    return NextResponse.json({ accounts });
  } catch (error) {
    console.error("[GET /api/integrations/google/accounts]", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to fetch Google accounts",
      },
      { status: 500 },
    );
  }
}
