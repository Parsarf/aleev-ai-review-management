export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getAdapter, PlatformConfig } from "@/lib/platforms";

export async function POST(_request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;

    // Get all locations belonging to this user's businesses
    const locations = await prisma.location.findMany({
      where: {
        business: { ownerId: userId },
        platformAccounts: { not: null },
      },
      include: { business: true },
    });

    let totalSynced = 0;
    let totalErrors = 0;

    for (const location of locations) {
      const platformAccounts =
        (location.platformAccounts as Record<string, PlatformConfig>) || {};

      for (const [platform, config] of Object.entries(platformAccounts)) {
        if (!config || typeof config !== "object") continue;

        try {
          const adapter = getAdapter(platform.toUpperCase());

          // Attach prismaLocationId so token refresh can persist back to DB
          const configWithLocationId: PlatformConfig = {
            ...config,
            prismaLocationId: location.id,
          };

          if (!adapter.isConnected(configWithLocationId)) {
            console.log(
              `[sync] Platform ${platform} not connected for location ${location.id} — skipping`,
            );
            continue;
          }

          const reviews = await adapter.readReviews(
            location.id,
            configWithLocationId,
          );

          for (const reviewData of reviews) {
            try {
              const existing = await prisma.review.findUnique({
                where: { platformId: reviewData.platformId },
              });

              if (existing) {
                await prisma.review.update({
                  where: { platformId: reviewData.platformId },
                  data: {
                    stars: reviewData.stars,
                    text: reviewData.text,
                    authorName: reviewData.authorName,
                    authorAvatar: reviewData.authorAvatar,
                    url: reviewData.url,
                    updatedAt: new Date(),
                  },
                });
              } else {
                await prisma.review.create({
                  data: {
                    locationId: location.id,
                    platform: platform.toUpperCase() as
                      | "GOOGLE"
                      | "YELP"
                      | "FACEBOOK"
                      | "TRIPADVISOR",
                    platformId: reviewData.platformId,
                    stars: reviewData.stars,
                    text: reviewData.text,
                    authorName: reviewData.authorName,
                    authorAvatar: reviewData.authorAvatar,
                    url: reviewData.url,
                    createdAt: reviewData.createdAt,
                    language: "en",
                  },
                });
                totalSynced++;
              }
            } catch (err) {
              console.error(
                `[sync] Error processing review ${reviewData.platformId}:`,
                err,
              );
              totalErrors++;
            }
          }
        } catch (err) {
          console.error(
            `[sync] Error syncing platform ${platform} for location ${location.id}:`,
            err,
          );
          totalErrors++;
        }
      }
    }

    return NextResponse.json({ synced: totalSynced, errors: totalErrors });
  } catch (error) {
    console.error("[POST /api/reviews/sync]", error);
    return NextResponse.json({ error: "Sync failed" }, { status: 500 });
  }
}
