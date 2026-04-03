export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { refreshGoogleToken } from "@/lib/google-business";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const body = await request.json();
    const { locationId, googleAccountId, googleLocationId, accountName, locationName } = body;

    if (!locationId || !googleAccountId || !googleLocationId) {
      return NextResponse.json(
        { error: "locationId, googleAccountId, and googleLocationId are required" },
        { status: 400 },
      );
    }

    // Verify the location belongs to this user
    const location = await prisma.location.findFirst({
      where: {
        id: locationId,
        business: { ownerId: userId },
      },
      select: { id: true, platformAccounts: true },
    });

    if (!location) {
      return NextResponse.json({ error: "Location not found" }, { status: 404 });
    }

    // Fetch the user's Google OAuth tokens from the Account table
    let account = await prisma.account.findFirst({
      where: { userId, provider: "google" },
      select: { access_token: true, refresh_token: true, expires_at: true },
    });

    if (!account?.access_token) {
      return NextResponse.json(
        { error: "No Google account linked. Please sign in with Google." },
        { status: 404 },
      );
    }

    // Refresh the token if it has expired
    if (account.expires_at && account.expires_at * 1000 < Date.now()) {
      if (!account.refresh_token) {
        return NextResponse.json(
          { error: "Google token expired and no refresh token is available." },
          { status: 401 },
        );
      }
      const newTokens = await refreshGoogleToken(account.refresh_token);
      const newExpiresAt = Math.floor(Date.now() / 1000) + newTokens.expires_in;

      await prisma.account.updateMany({
        where: { userId, provider: "google" },
        data: {
          access_token: newTokens.access_token,
          expires_at: newExpiresAt,
        },
      });

      account = {
        access_token: newTokens.access_token,
        refresh_token: account.refresh_token,
        expires_at: newExpiresAt,
      };
    }

    // Build the full platform config including OAuth tokens
    const googleConfig = {
      accessToken: account.access_token,
      refreshToken: account.refresh_token,
      // expires_at from NextAuth is Unix seconds; store as milliseconds for consistency
      expiresAt: account.expires_at ? account.expires_at * 1000 : null,
      accountId: googleAccountId,
      locationId: googleLocationId,
      accountName: accountName || "",
      locationName: locationName || "",
    };

    // Merge into the existing platformAccounts JSON
    const existing = (location.platformAccounts as Record<string, unknown>) || {};
    await prisma.location.update({
      where: { id: locationId },
      data: {
        platformAccounts: { ...existing, google: googleConfig },
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[POST /api/integrations/google/connect]", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to save Google connection",
      },
      { status: 500 },
    );
  }
}
