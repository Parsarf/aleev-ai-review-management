export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { rateLimit, getRateLimitIdentifier } from "@/lib/rate-limit";
import { logAuditEvent, AUDIT_ACTIONS } from "@/lib/audit";
import { randomUUID } from "crypto";
import { Prisma, $Enums } from "@prisma/client";

const createSchema = z.object({
  reviewId: z.string(),
  issueType: z.string().min(1),
  severity: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]),
  description: z.string().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const identifier = getRateLimitIdentifier(request);
    if (!rateLimit(identifier).success) {
      return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") || undefined;
    const severity = searchParams.get("severity") || undefined;
    const assignee = searchParams.get("assignee") || undefined;
    const search = searchParams.get("search")?.trim().toLowerCase() || "";

    const userId = session.user.id;

    const statusOk =
      status &&
      (Object.values($Enums.TicketStatus) as string[]).includes(status);
    const severityOk =
      severity &&
      (Object.values($Enums.TicketSeverity) as string[]).includes(severity);

    const tickets = await prisma.ticket.findMany({
      where: {
        review: {
          location: {
            business: { ownerId: userId },
          },
        },
        ...(statusOk ? { status: status as $Enums.TicketStatus } : {}),
        ...(severityOk ? { severity: severity as $Enums.TicketSeverity } : {}),
        ...(assignee === "unassigned"
          ? { assigneeId: null }
          : assignee === "me"
            ? { assigneeId: userId }
            : {}),
        ...(search
          ? {
              OR: [
                { issueType: { contains: search, mode: "insensitive" } },
                {
                  review: {
                    text: { contains: search, mode: "insensitive" },
                  },
                },
              ],
            }
          : {}),
      },
      include: {
        assignee: {
          select: { id: true, name: true, email: true },
        },
        review: {
          include: {
            location: {
              include: { business: true },
            },
          },
        },
      },
      orderBy: { updatedAt: "desc" },
    });

    return NextResponse.json({
      tickets: tickets.map(serializeTicket),
    });
  } catch (error) {
    console.error("GET /api/tickets:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const identifier = getRateLimitIdentifier(request);
    if (!rateLimit(identifier).success) {
      return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
    }

    const body = createSchema.parse(await request.json());
    const userId = session.user.id;

    const review = await prisma.review.findFirst({
      where: {
        id: body.reviewId,
        location: {
          business: { ownerId: userId },
        },
      },
    });

    if (!review) {
      return NextResponse.json({ error: "Review not found" }, { status: 404 });
    }

    const existing = await prisma.ticket.findUnique({
      where: { reviewId: body.reviewId },
    });
    if (existing) {
      return NextResponse.json(
        { error: "A ticket already exists for this review" },
        { status: 409 },
      );
    }

    const initialComments: Prisma.InputJsonValue[] = [];
    if (body.description?.trim()) {
      initialComments.push({
        id: randomUUID(),
        text: body.description.trim(),
        author: session.user.name || session.user.email || "User",
        createdAt: new Date().toISOString(),
      });
    }

    const ticket = await prisma.ticket.create({
      data: {
        reviewId: body.reviewId,
        issueType: body.issueType,
        severity: body.severity,
        status: "OPEN",
        comments: initialComments,
      },
      include: {
        assignee: {
          select: { id: true, name: true, email: true },
        },
        review: {
          include: {
            location: {
              include: { business: true },
            },
          },
        },
      },
    });

    await logAuditEvent({
      userId,
      action: AUDIT_ACTIONS.TICKET_CREATED,
      resource: "TICKET",
      details: { ticketId: ticket.id, reviewId: body.reviewId },
    });

    return NextResponse.json({ ticket: serializeTicket(ticket) }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.flatten() }, { status: 400 });
    }
    console.error("POST /api/tickets:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

function serializeTicket(
  ticket: {
    id: string;
    issueType: string;
    severity: string;
    status: string;
    assigneeId: string | null;
    assignee?: { id: string; name: string | null; email: string | null } | null;
    dueDate: Date | null;
    createdAt: Date;
    updatedAt: Date;
    comments: Prisma.JsonValue[];
    review: {
      id: string;
      stars: number;
      text: string;
      authorName: string | null;
      platform: string;
      location: {
        name: string;
        business: { name: string };
      };
    };
  },
) {
  const comments = (ticket.comments || []) as Array<{
    id: string;
    text: string;
    author: string;
    createdAt: string | Date;
  }>;

  return {
    id: ticket.id,
    issueType: ticket.issueType,
    severity: ticket.severity,
    status: ticket.status,
    assigneeId: ticket.assigneeId,
    assignee: ticket.assignee
      ? {
          name: ticket.assignee.name || "",
          email: ticket.assignee.email || "",
        }
      : undefined,
    dueDate: ticket.dueDate ? ticket.dueDate.toISOString() : undefined,
    createdAt: ticket.createdAt.toISOString(),
    updatedAt: ticket.updatedAt.toISOString(),
    comments: comments.map((c) => ({
      id: c.id,
      text: c.text,
      author: c.author,
      createdAt:
        typeof c.createdAt === "string"
          ? c.createdAt
          : new Date(c.createdAt).toISOString(),
    })),
    review: {
      id: ticket.review.id,
      stars: ticket.review.stars,
      text: ticket.review.text,
      authorName: ticket.review.authorName ?? undefined,
      platform: ticket.review.platform,
      location: {
        name: ticket.review.location.name,
        business: { name: ticket.review.location.business.name },
      },
    },
  };
}
