import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { rateLimit, getRateLimitIdentifier } from "@/lib/rate-limit";

const querySchema = z.object({
  days: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val) : 30)),
  businessId: z.string().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Rate limiting
    const identifier = getRateLimitIdentifier(request);
    const rateLimitResult = rateLimit(identifier);
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: "Rate limit exceeded" },
        { status: 429 },
      );
    }

    const { searchParams } = new URL(request.url);
    const query = querySchema.parse(Object.fromEntries(searchParams));

    // Get user's businesses
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: {
        businesses: {
          include: {
            locations: true,
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const businessIds = user.businesses.map((b: { id: string }) => b.id);
    const locationIds = user.businesses.flatMap((b: { locations: Array<{ id: string }> }) =>
      b.locations.map((l: { id: string }) => l.id),
    );

    // Filter by specific business if provided
    const targetLocationIds = query.businessId
      ? user.businesses
          .filter((b: { id: string }) => b.id === query.businessId)
          .flatMap((b: { locations: Array<{ id: string }> }) => b.locations.map((l: { id: string }) => l.id))
      : locationIds;

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - query.days);

    // Get reviews in date range
    const reviews = await prisma.review.findMany({
      where: {
        locationId: { in: targetLocationIds },
        createdAt: { gte: startDate },
      },
      include: {
        reply: true,
        location: {
          include: {
            business: true,
          },
        },
      },
    });

    // Calculate KPIs
    const totalReviews = reviews.length;
    const avgRating =
      totalReviews > 0
        ? reviews.reduce((sum: number, r: { stars: number }) => sum + r.stars, 0) / totalReviews
        : 0;

    const reviewsWithReplies = reviews.filter(
      (r: { reply?: { status: string } | null }) => r.reply?.status === "SENT",
    );
    const coverage =
      totalReviews > 0 ? (reviewsWithReplies.length / totalReviews) * 100 : 0;

    // Calculate average response time
    const responseTimes = reviewsWithReplies
      .map((r: { reply?: { sentAt?: Date } | null; createdAt: Date }) => {
        if (r.reply?.sentAt) {
          return r.reply.sentAt.getTime() - r.createdAt.getTime();
        }
        return null;
      })
      .filter(Boolean) as number[];

    const avgResponseTime =
      responseTimes.length > 0
        ? responseTimes.reduce((sum, time) => sum + time, 0) /
          responseTimes.length /
          (1000 * 60 * 60) // Convert to hours
        : 0;

    // Rating trends (daily)
    const ratingTrends = await getRatingTrends(
      targetLocationIds,
      startDate,
      query.days,
    );

    // Sentiment trends (daily)
    const sentimentTrends = await getSentimentTrends(
      targetLocationIds,
      startDate,
      query.days,
    );

    // Common issues (word frequency analysis)
    const commonIssues = getCommonIssues(reviews);

    // Platform distribution
    const platformDistribution = reviews.reduce(
      (acc: Record<string, number>, review: { platform: string }) => {
        acc[review.platform] = (acc[review.platform] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    // Status distribution
    const statusDistribution = reviews.reduce(
      (acc: Record<string, number>, review: { status: string }) => {
        acc[review.status] = (acc[review.status] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    return NextResponse.json({
      kpis: {
        coverage: Math.round(coverage * 100) / 100,
        avgResponseTime: Math.round(avgResponseTime * 100) / 100,
        totalReviews,
        avgRating: Math.round(avgRating * 100) / 100,
      },
      trends: {
        rating: ratingTrends,
        sentiment: sentimentTrends,
      },
      distribution: {
        platforms: platformDistribution,
        statuses: statusDistribution,
      },
      commonIssues,
    });
  } catch (error) {
    console.error("Error fetching analytics:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

async function getRatingTrends(
  locationIds: string[],
  startDate: Date,
  days: number,
) {
  const trends = [];

  for (let i = 0; i < days; i++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + i);
    const nextDate = new Date(date);
    nextDate.setDate(nextDate.getDate() + 1);

    const reviews = await prisma.review.findMany({
      where: {
        locationId: { in: locationIds },
        createdAt: {
          gte: date,
          lt: nextDate,
        },
      },
    });

    const avgRating =
      reviews.length > 0
        ? reviews.reduce((sum: number, r: { stars: number }) => sum + r.stars, 0) / reviews.length
        : 0;

    trends.push({
      date: date.toISOString().split("T")[0],
      avgRating: Math.round(avgRating * 100) / 100,
      count: reviews.length,
    });
  }

  return trends;
}

async function getSentimentTrends(
  locationIds: string[],
  startDate: Date,
  days: number,
) {
  const trends = [];

  for (let i = 0; i < days; i++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + i);
    const nextDate = new Date(date);
    nextDate.setDate(nextDate.getDate() + 1);

    const reviews = await prisma.review.findMany({
      where: {
        locationId: { in: locationIds },
        createdAt: {
          gte: date,
          lt: nextDate,
        },
      },
    });

    const positive = reviews.filter((r: { stars: number }) => r.stars >= 4).length;
    const neutral = reviews.filter((r: { stars: number }) => r.stars === 3).length;
    const negative = reviews.filter((r: { stars: number }) => r.stars <= 2).length;

    trends.push({
      date: date.toISOString().split("T")[0],
      positive,
      neutral,
      negative,
      total: reviews.length,
    });
  }

  return trends;
}

function getCommonIssues(reviews: Array<{ text: string }>) {
  // Simple keyword extraction for common issues
  const issueKeywords = [
    "service",
    "food",
    "wait",
    "time",
    "staff",
    "clean",
    "dirty",
    "slow",
    "rude",
    "cold",
    "hot",
    "price",
    "expensive",
    "cheap",
    "quality",
    "atmosphere",
    "noise",
    "crowded",
    "parking",
    "location",
  ];

  const issueCounts: Record<string, number> = {};

  reviews.forEach((review) => {
    const text = review.text.toLowerCase();
    issueKeywords.forEach((keyword) => {
      if (text.includes(keyword)) {
        issueCounts[keyword] = (issueCounts[keyword] || 0) + 1;
      }
    });
  });

  return Object.entries(issueCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)
    .map(([keyword, count]) => ({ keyword, count }));
}
