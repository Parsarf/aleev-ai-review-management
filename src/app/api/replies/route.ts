export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { rateLimit, getRateLimitIdentifier } from "@/lib/rate-limit";
import { logAuditEvent, AUDIT_ACTIONS } from "@/lib/audit";
import { generateReply } from "@/lib/ai";
import { getAdapter } from "@/lib/platforms";

const generateReplySchema = z.object({
  reviewId: z.string(),
  tone: z.string().optional().default("professional"),
});

const updateReplySchema = z.object({
  replyId: z.string(),
  finalText: z.string().optional(),
  action: z.enum(["approve", "send"]),
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
    const { action } = body;

    if (action === "generate") {
      return await generateReplyAction(body, session.user.id);
    } else if (action === "update" || action === "send") {
      return await updateReplyAction(body, session.user.id);
    } else {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }
  } catch (error) {
    console.error("Error in replies API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

async function generateReplyAction(body: any, userId: string) {
  const data = generateReplySchema.parse(body);

  // Get review with business context
  const review = await prisma.review.findFirst({
    where: {
      id: data.reviewId,
      location: {
        business: {
          ownerId: userId,
        },
      },
    },
    include: {
      location: {
        include: {
          business: true,
        },
      },
    },
  });

  if (!review) {
    return NextResponse.json({ error: "Review not found" }, { status: 404 });
  }

  // Check if reply already exists
  const existingReply = await prisma.reply.findUnique({
    where: { reviewId: data.reviewId },
  });

  if (existingReply) {
    return NextResponse.json(
      { error: "Reply already exists" },
      { status: 409 },
    );
  }

  // Generate AI reply
  const aiResponse = await generateReply({
    businessName: review.location.business.name,
    brandRules: review.location.business.brandRules || "",
    tone: data.tone,
    stars: review.stars,
    reviewText: review.text,
  });

  // Create reply record
  const reply = await prisma.reply.create({
    data: {
      reviewId: data.reviewId,
      draftText: aiResponse.reply,
      tone: data.tone,
      status: aiResponse.flagged ? "DRAFT" : "DRAFT",
    },
  });

  // Log audit event
  await logAuditEvent({
    userId,
    action: AUDIT_ACTIONS.REPLY_GENERATED,
    resource: "REPLY",
    details: {
      replyId: reply.id,
      reviewId: data.reviewId,
      isCrisis: aiResponse.isCrisis,
      flagged: aiResponse.flagged,
    },
  });

  return NextResponse.json({
    reply,
    isCrisis: aiResponse.isCrisis,
    flagged: aiResponse.flagged,
    reason: aiResponse.reason,
  });
}

async function updateReplyAction(body: any, userId: string) {
  const data = updateReplySchema.parse(body);

  // Get reply with review context
  const reply = await prisma.reply.findFirst({
    where: {
      id: data.replyId,
      review: {
        location: {
          business: {
            ownerId: userId,
          },
        },
      },
    },
    include: {
      review: {
        include: {
          location: {
            include: {
              business: true,
            },
          },
        },
      },
    },
  });

  if (!reply) {
    return NextResponse.json({ error: "Reply not found" }, { status: 404 });
  }

  if (data.action === "approve") {
    // Update reply with final text and mark as approved
    const updatedReply = await prisma.reply.update({
      where: { id: data.replyId },
      data: {
        finalText: data.finalText || reply.draftText,
        status: "APPROVED",
      },
    });

    // Log audit event
    await logAuditEvent({
      userId,
      action: AUDIT_ACTIONS.REPLY_APPROVED,
      resource: "REPLY",
      details: { replyId: data.replyId },
    });

    return NextResponse.json(updatedReply);
  } else if (data.action === "send") {
    // Send reply via platform adapter
    const finalText = data.finalText || reply.draftText || reply.finalText;

    if (!finalText) {
      return NextResponse.json({ error: "No text to send" }, { status: 400 });
    }

    try {
      // Get platform adapter
      const adapter = getAdapter(reply.review.platform);

      // Get platform configuration
      const platformConfig =
        (reply.review.location.platformAccounts as any) || {};

      // Send reply via platform
      const success = await adapter.postReply(
        reply.review.platformId,
        finalText,
        platformConfig,
      );

      if (success) {
        // Update reply status
        const updatedReply = await prisma.reply.update({
          where: { id: data.replyId },
          data: {
            finalText,
            status: "SENT",
            sentById: userId,
            sentAt: new Date(),
          },
        });

        // Update review status
        await prisma.review.update({
          where: { id: reply.reviewId },
          data: { status: "AUTO_SENT" },
        });

        // Log audit event
        await logAuditEvent({
          userId,
          action: AUDIT_ACTIONS.REPLY_SENT,
          resource: "REPLY",
          details: { replyId: data.replyId, platform: reply.review.platform },
        });

        return NextResponse.json(updatedReply);
      } else {
        // Mark as failed
        await prisma.reply.update({
          where: { id: data.replyId },
          data: { status: "FAILED" },
        });

        // Log audit event
        await logAuditEvent({
          userId,
          action: AUDIT_ACTIONS.REPLY_FAILED,
          resource: "REPLY",
          details: { replyId: data.replyId, platform: reply.review.platform },
        });

        return NextResponse.json(
          { error: "Failed to send reply" },
          { status: 500 },
        );
      }
    } catch (error) {
      console.error("Error sending reply:", error);

      // Mark as failed
      await prisma.reply.update({
        where: { id: data.replyId },
        data: { status: "FAILED" },
      });

      return NextResponse.json(
        { error: "Failed to send reply" },
        { status: 500 },
      );
    }
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
