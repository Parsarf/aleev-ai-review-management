export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { rateLimit, getRateLimitIdentifier } from "@/lib/rate-limit";
import { logAuditEvent, AUDIT_ACTIONS } from "@/lib/audit";

const querySchema = z.object({
  platforms: z
    .string()
    .optional()
    .transform((val) => (val ? val.split(",") : undefined)),
  statuses: z
    .string()
    .optional()
    .transform((val) => (val ? val.split(",") : undefined)),
  stars: z
    .string()
    .optional()
    .transform((val) => (val ? val.split(",").map(Number) : undefined)),
  page: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val) : 1)),
  limit: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val) : 20)),
});

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Log session details for debugging
    console.log("[GET /api/reviews] Session data:", {
      userId: session.user.id,
      userEmail: session.user.email,
      userName: session.user.name,
      userRole: (session.user as { role?: string }).role,
    });

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
    console.log("[GET /api/reviews] Querying user from database:", session.user.id);
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
      // Log comprehensive debugging info
      console.error("[GET /api/reviews] User not found in database:", {
        sessionUserId: session.user.id,
        sessionUserEmail: session.user.email,
        sessionUserName: session.user.name,
        timestamp: new Date().toISOString(),
      });

      // Try to find user by email as fallback (for debugging)
      if (session.user.email) {
        const userByEmail = await prisma.user.findUnique({
          where: { email: session.user.email },
        });
        if (userByEmail) {
          console.error("[GET /api/reviews] User exists with different ID:", {
            sessionId: session.user.id,
            dbId: userByEmail.id,
            email: session.user.email,
          });
        } else {
          console.error("[GET /api/reviews] No user found with email either:", session.user.email);
        }
      }

      return NextResponse.json(
        {
          error: "User not found",
          message:
            "Your account was not found in the database. Please sign out and sign in again to create your account.",
          debug: process.env.NODE_ENV === "development" ? {
            sessionUserId: session.user.id,
            sessionUserEmail: session.user.email,
          } : undefined,
        },
        { status: 404 },
      );
    }

    console.log("[GET /api/reviews] User found:", {
      userId: user.id,
      email: user.email,
      businessesCount: user.businesses.length,
    });

    const locationIds = user.businesses.flatMap((b: { locations: Array<{ id: string }> }) =>
      b.locations.map((l: { id: string }) => l.id),
    );

    // Build where clause (Google-only)
    const where: Record<string, unknown> = {
      platform: "GOOGLE" as const,
      locationId: { in: locationIds },
    };

    if (query.statuses) {
      where.status = { in: query.statuses };
    }

    if (query.stars) {
      where.stars = { in: query.stars };
    }

    // Get reviews with pagination
    const [reviews, total] = await Promise.all([
      prisma.review.findMany({
        where,
        include: {
          location: {
            include: {
              business: true,
            },
          },
          reply: true,
          ticket: true,
        },
        orderBy: { createdAt: "desc" },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      prisma.review.count({ where }),
    ]);

    return NextResponse.json({
      reviews,
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        pages: Math.ceil(total / query.limit),
      },
    });
  } catch (error) {
    console.error("Error fetching reviews:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

const createReviewSchema = z.object({
  locationId: z.string(),
  platform: z.literal("GOOGLE"),
  platformId: z.string(),
  stars: z.number().min(1).max(5),
  text: z.string().min(1),
  authorName: z.string().optional(),
  authorAvatar: z.string().optional(),
  url: z.string().optional(),
});

export async function POST(request: NextRequest) {
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

    const body = await request.json();
    const data = createReviewSchema.parse(body);

    // Verify user has access to the location
    const location = await prisma.location.findFirst({
      where: {
        id: data.locationId,
        business: {
          ownerId: session.user.id,
        },
      },
    });

    if (!location) {
      return NextResponse.json(
        { error: "Location not found" },
        { status: 404 },
      );
    }

    // Check if review already exists
    const existingReview = await prisma.review.findUnique({
      where: { platformId: data.platformId },
    });

    if (existingReview) {
      return NextResponse.json(
        { error: "Review already exists" },
        { status: 409 },
      );
    }

    const review = await prisma.review.create({
      data: {
        ...data,
        language: "en",
      },
      include: {
        location: {
          include: {
            business: true,
          },
        },
        reply: true,
        ticket: true,
      },
    });

    // Log audit event
    await logAuditEvent({
      userId: session.user.id,
      action: AUDIT_ACTIONS.REVIEW_CREATED,
      resource: "REVIEW",
      details: { reviewId: review.id, platform: data.platform },
    });

    return NextResponse.json(review, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 },
      );
    }

    console.error("Error creating review:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
