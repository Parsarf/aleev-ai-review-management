import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { rateLimit, getRateLimitIdentifier } from '@/lib/rate-limit'
import { logAuditEvent, AUDIT_ACTIONS } from '@/lib/audit'

const updateBusinessSchema = z.object({
  name: z.string().min(1),
  brandRules: z.string().optional(),
  tone: z.string().optional(),
  autoSendThreshold: z.number().min(1).max(5).optional(),
  crisisAlerts: z.boolean().optional()
})

const updateLocationSchema = z.object({
  locationId: z.string(),
  name: z.string().min(1),
  address: z.string().optional(),
  platformAccounts: z.record(z.any()).optional()
})

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Rate limiting
    const identifier = getRateLimitIdentifier(request)
    const rateLimitResult = rateLimit(identifier)
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: 'Rate limit exceeded' },
        { status: 429 }
      )
    }

    // Get user's businesses and locations
    const businesses = await prisma.business.findMany({
      where: { ownerId: session.user.id },
      include: {
        locations: true,
        subscriptions: true
      }
    })

    return NextResponse.json({ businesses })
  } catch (error) {
    console.error('Error fetching settings:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Rate limiting
    const identifier = getRateLimitIdentifier(request)
    const rateLimitResult = rateLimit(identifier)
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: 'Rate limit exceeded' },
        { status: 429 }
      )
    }

    const body = await request.json()
    const { action } = body

    if (action === 'updateBusiness') {
      return await updateBusinessAction(body, session.user.id)
    } else if (action === 'updateLocation') {
      return await updateLocationAction(body, session.user.id)
    } else if (action === 'createLocation') {
      return await createLocationAction(body, session.user.id)
    } else {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }
  } catch (error) {
    console.error('Error in settings API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

async function updateBusinessAction(body: any, userId: string) {
  const data = updateBusinessSchema.parse(body)
  const { businessId } = body

  if (!businessId) {
    return NextResponse.json({ error: 'Business ID required' }, { status: 400 })
  }

  // Verify user owns the business
  const business = await prisma.business.findFirst({
    where: {
      id: businessId,
      ownerId: userId
    }
  })

  if (!business) {
    return NextResponse.json({ error: 'Business not found' }, { status: 404 })
  }

  const updatedBusiness = await prisma.business.update({
    where: { id: businessId },
    data: {
      name: data.name,
      brandRules: data.brandRules,
      tone: data.tone
    }
  })

  // Log audit event
  await logAuditEvent({
    userId,
    action: AUDIT_ACTIONS.SETTINGS_UPDATED,
    resource: 'BUSINESS',
    details: { businessId, changes: data }
  })

  return NextResponse.json(updatedBusiness)
}

async function updateLocationAction(body: any, userId: string) {
  const data = updateLocationSchema.parse(body)

  // Verify user owns the location's business
  const location = await prisma.location.findFirst({
    where: {
      id: data.locationId,
      business: {
        ownerId: userId
      }
    }
  })

  if (!location) {
    return NextResponse.json({ error: 'Location not found' }, { status: 404 })
  }

  const updatedLocation = await prisma.location.update({
    where: { id: data.locationId },
    data: {
      name: data.name,
      address: data.address,
      platformAccounts: data.platformAccounts
    }
  })

  // Log audit event
  await logAuditEvent({
    userId,
    action: AUDIT_ACTIONS.SETTINGS_UPDATED,
    resource: 'LOCATION',
    details: { locationId: data.locationId, changes: data }
  })

  return NextResponse.json(updatedLocation)
}

async function createLocationAction(body: any, userId: string) {
  const { businessId, name, address, platformAccounts } = body

  if (!businessId || !name) {
    return NextResponse.json({ error: 'Business ID and name required' }, { status: 400 })
  }

  // Verify user owns the business
    const business = await prisma.business.findFirst({
      where: {
        id: businessId,
        ownerId: userId
      }
    })

    if (!business) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 })
    }

    const location = await prisma.location.create({
      data: {
        businessId,
        name,
        address,
        platformAccounts: platformAccounts || {}
      }
    })

    // Log audit event
    await logAuditEvent({
      userId,
      action: AUDIT_ACTIONS.BUSINESS_CREATED,
      resource: 'LOCATION',
      details: { locationId: location.id, businessId }
    })

    return NextResponse.json(location, { status: 201 })
}
