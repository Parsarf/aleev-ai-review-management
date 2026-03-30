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

const patchSchema = z
  .object({
    status: z.enum(["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"]).optional(),
    assigneeId: z.string().nullable().optional(),
    comment: z
      .object({
        text: z.string().min(1),
      })
      .optional(),
  })
  .refine(
    (data) =>
      data.status !== undefined ||
      data.comment !== undefined ||
      data.assigneeId !== undefined,
    {
      message: "At least one of status, assigneeId, or comment is required",
    },
  );

type TicketWithRelations = Prisma.TicketGetPayload<{
  include: {
    assignee: { select: { id: true; name: true; email: true } };
    review: {
      include: {
        location: {
          include: { business: true };
        };
      };
    };
  };
}>;

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const identifier = getRateLimitIdentifier(request);
    if (!rateLimit(identifier).success) {
      return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
    }

    const { id } = await context.params;
    const userId = session.user.id;
    const body = patchSchema.parse(await request.json());

    const ticket = await prisma.ticket.findFirst({
      where: {
        id,
        review: {
          location: {
            business: { ownerId: userId },
          },
        },
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

    if (!ticket) {
      return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
    }

    const existingComments = (ticket.comments || []) as Array<{
      id: string;
      text: string;
      author: string;
      createdAt: string | Date;
    }>;

    let nextComments = existingComments;
    if (body.comment) {
      nextComments = [
        ...existingComments,
        {
          id: randomUUID(),
          text: body.comment.text,
          author: session.user.name || session.user.email || "User",
          createdAt: new Date().toISOString(),
        },
      ];
    }

    const updated = await prisma.ticket.update({
      where: { id },
      data: {
        ...(body.status !== undefined ? { status: body.status as $Enums.TicketStatus } : {}),
        ...(body.assigneeId !== undefined ? { assigneeId: body.assigneeId } : {}),
        ...(body.comment ? { comments: nextComments } : {}),
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
      action: AUDIT_ACTIONS.TICKET_UPDATED,
      resource: "TICKET",
      details: {
        ticketId: id,
        status: body.status,
        commented: Boolean(body.comment),
      },
    });

    return NextResponse.json({ ticket: serializeTicket(updated) });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.flatten() }, { status: 400 });
    }
    console.error("PATCH /api/tickets/[id]:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

function serializeTicket(ticket: TicketWithRelations) {
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
