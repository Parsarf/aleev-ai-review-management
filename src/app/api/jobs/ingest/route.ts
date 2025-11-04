export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getAdapter, PlatformConfig } from "@/lib/platforms";
import { logAuditEvent } from "@/lib/audit";

export async function POST(request: NextRequest) {
  try {
    // Verify this is a legitimate cron job request
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log("Starting review ingestion job...");

    // Get all locations with connected platforms
    const locations = await prisma.location.findMany({
      where: {
        platformAccounts: { not: Prisma.DbNull }, // Exclude DB NULL for JSON column
      },
      include: {
        business: true,
      },
    });

    let totalIngested = 0;
    let totalErrors = 0;

    for (const location of locations) {
      try {
        const platformAccounts = (location.platformAccounts as Record<string, PlatformConfig>) || {};

        // Process each connected platform
        for (const [platform, config] of Object.entries(platformAccounts)) {
          if (!config || typeof config !== "object") continue;

          try {
            const adapter = getAdapter(platform.toUpperCase());

            if (!adapter.isConnected(config)) {
              console.log(
                `Platform ${platform} not connected for location ${location.id}`,
              );
              continue;
            }

            // Fetch reviews from platform
            const reviews = await adapter.readReviews(location.id, config);

            for (const reviewData of reviews) {
              try {
                // Check if review already exists
                const existingReview = await prisma.review.findUnique({
                  where: { platformId: reviewData.platformId },
                });

                if (existingReview) {
                  // Update existing review
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
                  // Create new review
                  await prisma.review.create({
                    data: {
                      locationId: location.id,
                      platform: platform.toUpperCase() as "GOOGLE" | "YELP" | "FACEBOOK" | "TRIPADVISOR",
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
                  totalIngested++;
                }
              } catch (reviewError) {
                console.error(
                  `Error processing review ${reviewData.platformId}:`,
                  reviewError,
                );
                totalErrors++;
              }
            }
          } catch (platformError) {
            console.error(
              `Error processing platform ${platform} for location ${location.id}:`,
              platformError,
            );
            totalErrors++;
          }
        }
      } catch (locationError) {
        console.error(
          `Error processing location ${location.id}:`,
          locationError,
        );
        totalErrors++;
      }
    }

    // Log job completion
    await logAuditEvent({
      action: "JOB_COMPLETED",
      resource: "INGEST_JOB",
      details: {
        totalIngested,
        totalErrors,
        locationsProcessed: locations.length,
      },
    });

    console.log(
      `Ingestion job completed. Ingested: ${totalIngested}, Errors: ${totalErrors}`,
    );

    return NextResponse.json({
      success: true,
      totalIngested,
      totalErrors,
      locationsProcessed: locations.length,
    });
  } catch (error) {
    console.error("Error in ingestion job:", error);

    // Log job failure
    await logAuditEvent({
      action: "JOB_FAILED",
      resource: "INGEST_JOB",
      details: {
        error: error instanceof Error ? error.message : "Unknown error",
      },
    });

    return NextResponse.json(
      { error: "Ingestion job failed" },
      { status: 500 },
    );
  }
}
