import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { logAuditEvent, AUDIT_ACTIONS } from '@/lib/audit'
import { z } from 'zod'

const googleWebhookSchema = z.object({
  action: z.enum(['review.created', 'review.updated']),
  review: z.object({
    id: z.string(),
    placeId: z.string(),
    stars: z.number().min(1).max(5),
    text: z.string(),
    authorName: z.string().optional(),
    authorAvatar: z.string().optional(),
    url: z.string().optional(),
    createdAt: z.string().transform(str => new Date(str))
  })
})

export async function POST(request: NextRequest) {
  try {
    // Skip webhook processing during build time
    if (process.env.NODE_ENV === 'production' && !process.env.GOOGLE_CLIENT_ID) {
      return NextResponse.json({ error: 'Webhook not configured' }, { status: 503 })
    }

    const body = await request.json()
    const data = googleWebhookSchema.parse(body)

    // Log webhook received
    await logAuditEvent({
      action: AUDIT_ACTIONS.WEBHOOK_RECEIVED,
      resource: 'GOOGLE_WEBHOOK',
      details: { action: data.action, reviewId: data.review.id }
    })

    // Find location by placeId
    const location = await prisma.location.findFirst({
      where: {
        platformAccounts: {
          path: ['google', 'placeId'],
          equals: data.review.placeId
        }
      },
      include: {
        business: true
      }
    })

    if (!location) {
      console.warn(`No location found for placeId: ${data.review.placeId}`)
      return NextResponse.json({ received: true })
    }

    if (data.action === 'review.created') {
      // Check if review already exists
      const existingReview = await prisma.review.findUnique({
        where: { platformId: data.review.id }
      })

      if (existingReview) {
        return NextResponse.json({ received: true })
      }

      // Create new review
      await prisma.review.create({
        data: {
          locationId: location.id,
          platform: 'GOOGLE',
          platformId: data.review.id,
          stars: data.review.stars,
          text: data.review.text,
          authorName: data.review.authorName,
          authorAvatar: data.review.authorAvatar,
          url: data.review.url,
          createdAt: data.review.createdAt,
          language: 'en'
        }
      })

      // Log webhook processed
      await logAuditEvent({
        action: AUDIT_ACTIONS.WEBHOOK_PROCESSED,
        resource: 'GOOGLE_WEBHOOK',
        details: { action: data.action, reviewId: data.review.id, locationId: location.id }
      })
    } else if (data.action === 'review.updated') {
      // Update existing review
      await prisma.review.update({
        where: { platformId: data.review.id },
        data: {
          stars: data.review.stars,
          text: data.review.text,
          authorName: data.review.authorName,
          authorAvatar: data.review.authorAvatar,
          url: data.review.url,
          updatedAt: new Date()
        }
      })

      // Log webhook processed
      await logAuditEvent({
        action: AUDIT_ACTIONS.WEBHOOK_PROCESSED,
        resource: 'GOOGLE_WEBHOOK',
        details: { action: data.action, reviewId: data.review.id, locationId: location.id }
      })
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Error processing Google webhook:', error)
    
    // Log webhook failure
    await logAuditEvent({
      action: AUDIT_ACTIONS.WEBHOOK_FAILED,
      resource: 'GOOGLE_WEBHOOK',
      details: { error: error instanceof Error ? error.message : 'Unknown error' }
    })

    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    )
  }
}
