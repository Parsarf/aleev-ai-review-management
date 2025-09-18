import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { rateLimit, getRateLimitIdentifier } from "@/lib/rate-limit";
import { logAuditEvent, AUDIT_ACTIONS } from "@/lib/audit";
// import { createCheckoutSession, createCustomerPortalSession, STRIPE_PLANS } from '@/lib/stripe'

const createCheckoutSchema = z.object({
  businessId: z.string(),
  plan: z.enum(["STARTER", "PROFESSIONAL", "ENTERPRISE"]),
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

    // Get user's businesses with subscriptions
    const businesses = await prisma.business.findMany({
      where: { ownerId: session.user.id },
      include: {
        subscriptions: true,
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
            },
          },
        },
      },
    });

    // Calculate usage for each business
    const businessesWithUsage = businesses.map((business) => {
      const totalReviews = business.locations.reduce(
        (sum, location) => sum + location.reviews.length,
        0,
      );
      const subscription = business.subscriptions[0];

      return {
        ...business,
        usage: {
          reviews: totalReviews,
          limit: getReviewLimit(subscription?.plan || "STARTER"),
        },
      };
    });

    return NextResponse.json({
      businesses: businessesWithUsage,
      plans: {}, // STRIPE_PLANS temporarily disabled for build
    });
  } catch (error) {
    console.error("Error fetching billing info:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

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
    const { action } = body;

    // Temporarily disabled for build
    return NextResponse.json(
      { error: "Billing functionality temporarily disabled" },
      { status: 503 },
    );

    // if (action === 'createCheckout') {
    //   return await createCheckoutAction(body, session.user.id)
    // } else if (action === 'createPortal') {
    //   return await createPortalAction(body, session.user.id)
    // } else {
    //   return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    // }
  } catch (error) {
    console.error("Error in billing API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// Temporarily disabled for build
// async function createCheckoutAction(body: any, userId: string) {
//   const data = createCheckoutSchema.parse(body)

//   // Verify user owns the business
//   const business = await prisma.business.findFirst({
//     where: {
//       id: data.businessId,
//       ownerId: userId
//     }
//   })

//   if (!business) {
//     return NextResponse.json({ error: 'Business not found' }, { status: 404 })
//   }

//   const successUrl = `${process.env.NEXT_PUBLIC_APP_URL}/billing?success=true`
//   const cancelUrl = `${process.env.NEXT_PUBLIC_APP_URL}/billing?canceled=true`

//   const session = await createCheckoutSession({
//     businessId: data.businessId,
//     plan: data.plan,
//     successUrl,
//     cancelUrl
//   })

//   // Log audit event
//   await logAuditEvent({
//     userId,
//     action: AUDIT_ACTIONS.SUBSCRIPTION_CREATED,
//     resource: 'SUBSCRIPTION',
//     details: { businessId: data.businessId, plan: data.plan }
//   })

//   return NextResponse.json({ url: session.url })
// }

// Temporarily disabled for build
// async function createPortalAction(body: any, userId: string) {
//   const { businessId } = body

//   if (!businessId) {
//     return NextResponse.json({ error: 'Business ID required' }, { status: 400 })
//   }

//   // Verify user owns the business
//   const business = await prisma.business.findFirst({
//     where: {
//       id: businessId,
//       ownerId: userId
//     }
//   })

//   if (!business) {
//     return NextResponse.json({ error: 'Business not found' }, { status: 404 })
//   }

//   const returnUrl = `${process.env.NEXT_PUBLIC_APP_URL}/billing`

//   const session = await createCustomerPortalSession({
//     businessId,
//     returnUrl
//   })

//   return NextResponse.json({ url: session.url })
// }

function getReviewLimit(plan: string): number {
  switch (plan) {
    case "STARTER":
      return 100;
    case "PROFESSIONAL":
      return 500;
    case "ENTERPRISE":
      return -1; // Unlimited
    default:
      return 100;
  }
}
