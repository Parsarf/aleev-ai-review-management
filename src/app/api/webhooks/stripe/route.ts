import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { stripe } from "@/lib/stripe";
import { handleWebhookEvent } from "@/lib/stripe";
import { logAuditEvent, AUDIT_ACTIONS } from "@/lib/audit";

export async function POST(request: NextRequest) {
  try {
    // Skip webhook processing during build time
    if (
      process.env.NODE_ENV === "production" &&
      !process.env.STRIPE_WEBHOOK_SECRET
    ) {
      return NextResponse.json(
        { error: "Webhook not configured" },
        { status: 503 },
      );
    }

    const body = await request.text();
    const headersList = await headers();
    const signature = headersList.get("stripe-signature");

    if (!signature) {
      return NextResponse.json(
        { error: "No signature provided" },
        { status: 400 },
      );
    }

    let event;

    try {
      event = stripe.webhooks.constructEvent(
        body,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET!,
      );
    } catch (err) {
      console.error("Webhook signature verification failed:", err);
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }

    // Log webhook received
    await logAuditEvent({
      action: AUDIT_ACTIONS.WEBHOOK_RECEIVED,
      resource: "STRIPE_WEBHOOK",
      details: { eventType: event.type, eventId: event.id },
    });

    // Handle the event
    await handleWebhookEvent(event);

    // Log webhook processed
    await logAuditEvent({
      action: AUDIT_ACTIONS.WEBHOOK_PROCESSED,
      resource: "STRIPE_WEBHOOK",
      details: { eventType: event.type, eventId: event.id },
    });

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Error processing Stripe webhook:", error);

    // Log webhook failure
    await logAuditEvent({
      action: AUDIT_ACTIONS.WEBHOOK_FAILED,
      resource: "STRIPE_WEBHOOK",
      details: {
        error: error instanceof Error ? error.message : "Unknown error",
      },
    });

    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 },
    );
  }
}
