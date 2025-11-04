export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logAuditEvent } from "@/lib/audit";

export async function POST(request: NextRequest) {
  try {
    // Verify this is a legitimate cron job request
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log("Starting metrics rollup job...");

    // Get all businesses
    const businesses = await prisma.business.findMany({
      include: {
        locations: {
          include: {
            reviews: {
              where: {
                createdAt: {
                  gte: new Date(
                    new Date().getFullYear(),
                    new Date().getMonth(),
                    1,
                  ), // Current month
                },
              },
              include: {
                reply: true,
              },
            },
          },
        },
      },
    });

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let totalProcessed = 0;

    for (const business of businesses) {
      try {
        // Type the reviews array explicitly to avoid unknown type issues
        type ReviewWithReply = {
          stars: number;
          createdAt: Date;
          reply?: {
            status: string;
            sentAt: Date | null;
          } | null;
        };
        
        const allReviews: ReviewWithReply[] = business.locations.flatMap(
          (l) => (l.reviews || []) as ReviewWithReply[]
        );

        // Calculate metrics
        const totalReviews = allReviews.length;
        const avgRating =
          totalReviews > 0
            ? allReviews.reduce((sum, r) => sum + r.stars, 0) / totalReviews
            : 0;

        const reviewsWithReplies = allReviews.filter(
          (r) => r.reply?.status === "SENT",
        );
        const coverage =
          totalReviews > 0
            ? (reviewsWithReplies.length / totalReviews) * 100
            : 0;

        // Calculate average response time (ms) only for reviews that have a sent reply
        const responseTimes = reviewsWithReplies
          .map((r) => {
            const sentAt: Date | null | undefined = r.reply?.sentAt ?? null;
            return sentAt ? sentAt.getTime() - r.createdAt.getTime() : null;
          })
          .filter((n): n is number => n !== null);

        const avgResponseMs =
          responseTimes.length > 0
            ? Math.round(responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length)
            : 0;

        const avgResponseTime = avgResponseMs / (1000 * 60 * 60); // Convert to hours

        // Upsert metrics record
        await prisma.metrics.upsert({
          where: {
            businessId: business.id,
            date: today,
          },
          update: {
            coverage,
            avgResponseTime,
            totalReviews,
            avgRating,
          },
          create: {
            businessId: business.id,
            date: today,
            coverage,
            avgResponseTime,
            totalReviews,
            avgRating,
          },
        });

        totalProcessed++;
      } catch (businessError) {
        console.error(
          `Error processing metrics for business ${business.id}:`,
          businessError,
        );
      }
    }

    // Log job completion
    await logAuditEvent({
      action: "JOB_COMPLETED",
      resource: "METRICS_JOB",
      details: {
        totalProcessed,
        businessesProcessed: businesses.length,
      },
    });

    console.log(
      `Metrics rollup job completed. Processed: ${totalProcessed} businesses`,
    );

    return NextResponse.json({
      success: true,
      totalProcessed,
      businessesProcessed: businesses.length,
    });
  } catch (error) {
    console.error("Error in metrics job:", error);

    // Log job failure
    await logAuditEvent({
      action: "JOB_FAILED",
      resource: "METRICS_JOB",
      details: {
        error: error instanceof Error ? error.message : "Unknown error",
      },
    });

    return NextResponse.json({ error: "Metrics job failed" }, { status: 500 });
  }
}
