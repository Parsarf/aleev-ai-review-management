import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Starting database seed...')

  // Create users
  const owner = await prisma.user.upsert({
    where: { email: 'owner@aleev.com' },
    update: {},
    create: {
      email: 'owner@aleev.com',
      name: 'John Owner',
      role: 'OWNER',
    },
  })

  const manager = await prisma.user.upsert({
    where: { email: 'manager@aleev.com' },
    update: {},
    create: {
      email: 'manager@aleev.com',
      name: 'Jane Manager',
      role: 'MANAGER',
    },
  })

  const staff = await prisma.user.upsert({
    where: { email: 'staff@aleev.com' },
    update: {},
    create: {
      email: 'staff@aleev.com',
      name: 'Bob Staff',
      role: 'STAFF',
    },
  })

  console.log('✅ Users created')

  // Create businesses
  const business1 = await prisma.business.upsert({
    where: { id: 'business-1' },
    update: {},
    create: {
      id: 'business-1',
      name: 'Bella Vista Restaurant',
      brandRules: 'We are a family-owned Italian restaurant focused on authentic cuisine and warm hospitality. Always be friendly, professional, and apologize when appropriate. Never make promises we cannot keep.',
      tone: 'friendly',
      ownerId: owner.id,
    },
  })

  const business2 = await prisma.business.upsert({
    where: { id: 'business-2' },
    update: {},
    create: {
      id: 'business-2',
      name: 'Tech Solutions Inc',
      brandRules: 'We are a professional technology consulting firm. Maintain a professional, knowledgeable tone. Focus on solutions and technical expertise.',
      tone: 'professional',
      ownerId: owner.id,
    },
  })

  console.log('✅ Businesses created')

  // Create locations
  const location1 = await prisma.location.upsert({
    where: { id: 'location-1' },
    update: {},
    create: {
      id: 'location-1',
      businessId: business1.id,
      name: 'Downtown Location',
      address: '123 Main St, Downtown, NY 10001',
      platformAccounts: {
        google: {
          placeId: 'ChIJN1t_tDeuEmsRUsoyG83frY4',
          accessToken: 'mock-google-token',
          connected: true
        },
        yelp: {
          businessId: 'bella-vista-restaurant-downtown',
          connected: false
        }
      },
    },
  })

  const location2 = await prisma.location.upsert({
    where: { id: 'location-2' },
    update: {},
    create: {
      id: 'location-2',
      businessId: business1.id,
      name: 'Uptown Location',
      address: '456 Oak Ave, Uptown, NY 10002',
      platformAccounts: {
        google: {
          placeId: 'ChIJN1t_tDeuEmsRUsoyG83frY5',
          accessToken: 'mock-google-token-2',
          connected: true
        }
      },
    },
  })

  const location3 = await prisma.location.upsert({
    where: { id: 'location-3' },
    update: {},
    create: {
      id: 'location-3',
      businessId: business2.id,
      name: 'Headquarters',
      address: '789 Tech Blvd, Silicon Valley, CA 94000',
      platformAccounts: {
        google: {
          placeId: 'ChIJN1t_tDeuEmsRUsoyG83frY6',
          accessToken: 'mock-google-token-3',
          connected: true
        }
      },
    },
  })

  console.log('✅ Locations created')

  // Create reviews
  const reviews: Array<{
    id: string
    locationId: string
    platform: 'GOOGLE' | 'YELP' | 'FACEBOOK' | 'TRIPADVISOR'
    platformId: string
    stars: number
    text: string
    authorName: string
    authorAvatar?: string
    url?: string
    status: 'NEEDS_REPLY' | 'AUTO_SENT' | 'FLAGGED' | 'RESOLVED'
    createdAt: Date
  }> = [
    {
      id: 'review-1',
      locationId: location1.id,
      platform: 'GOOGLE' as const,
      platformId: 'google-review-1',
      stars: 5,
      text: 'Amazing food and excellent service! The pasta was perfectly cooked and the staff was very friendly. Will definitely come back!',
      authorName: 'Sarah Johnson',
      authorAvatar: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150&h=150&fit=crop&crop=face',
      url: 'https://maps.google.com/review/1',
      status: 'NEEDS_REPLY' as const,
      createdAt: new Date('2024-01-15T10:30:00Z'),
    },
    {
      id: 'review-2',
      locationId: location1.id,
      platform: 'GOOGLE' as const,
      platformId: 'google-review-2',
      stars: 3,
      text: 'Food was okay but the service was slow. Had to wait 45 minutes for our order. The pasta was good though.',
      authorName: 'Mike Chen',
      authorAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face',
      url: 'https://maps.google.com/review/2',
      status: 'NEEDS_REPLY' as const,
      createdAt: new Date('2024-01-14T18:45:00Z'),
    },
    {
      id: 'review-3',
      locationId: location1.id,
      platform: 'YELP',
      platformId: 'yelp-review-1',
      stars: 1,
      text: 'Terrible experience! The food was cold, the waiter was rude, and we found a hair in our pasta. This is unacceptable and I will never return. I am considering legal action.',
      authorName: 'Anonymous',
      status: 'FLAGGED',
      createdAt: new Date('2024-01-13T20:15:00Z'),
    },
    {
      id: 'review-4',
      locationId: location2.id,
      platform: 'GOOGLE' as const,
      platformId: 'google-review-3',
      stars: 4,
      text: 'Great atmosphere and delicious food. The wine selection is excellent. Only minor issue was the noise level.',
      authorName: 'Emily Davis',
      authorAvatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face',
      url: 'https://maps.google.com/review/3',
      status: 'AUTO_SENT',
      createdAt: new Date('2024-01-12T14:20:00Z'),
    },
    {
      id: 'review-5',
      locationId: location3.id,
      platform: 'GOOGLE' as const,
      platformId: 'google-review-4',
      stars: 5,
      text: 'Outstanding technical expertise and great communication. They helped us modernize our infrastructure and the results exceeded our expectations.',
      authorName: 'David Wilson',
      authorAvatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face',
      url: 'https://maps.google.com/review/4',
      status: 'NEEDS_REPLY' as const,
      createdAt: new Date('2024-01-11T09:30:00Z'),
    },
    {
      id: 'review-6',
      locationId: location1.id,
      platform: 'FACEBOOK',
      platformId: 'facebook-review-1',
      stars: 2,
      text: 'The food was decent but overpriced. The portion sizes were small for the price. The ambiance was nice but not worth the cost.',
      authorName: 'Lisa Rodriguez',
      status: 'NEEDS_REPLY' as const,
      createdAt: new Date('2024-01-10T16:45:00Z'),
    },
  ]

  for (const reviewData of reviews) {
    await prisma.review.upsert({
      where: { platformId: reviewData.platformId },
      update: {},
      create: reviewData,
    })
  }

  console.log('✅ Reviews created')

  // Create replies
  const replies = [
    {
      id: 'reply-1',
      reviewId: 'review-4',
      draftText: 'Thank you so much for your wonderful review, Emily! We\'re thrilled to hear you enjoyed the food and wine selection. We appreciate your feedback about the noise level and will look into ways to improve the acoustics. We look forward to welcoming you back soon!',
      finalText: 'Thank you so much for your wonderful review, Emily! We\'re thrilled to hear you enjoyed the food and wine selection. We appreciate your feedback about the noise level and will look into ways to improve the acoustics. We look forward to welcoming you back soon!',
      tone: 'friendly',
      status: 'SENT' as const,
      sentById: owner.id,
      sentAt: new Date('2024-01-12T15:30:00Z'),
    },
  ]

  for (const replyData of replies) {
    await prisma.reply.upsert({
      where: { reviewId: replyData.reviewId },
      update: {},
      create: replyData,
    })
  }

  console.log('✅ Replies created')

  // Create tickets
  const tickets = [
    {
      id: 'ticket-1',
      reviewId: 'review-3',
      issueType: 'crisis',
      severity: 'CRITICAL' as const,
      assigneeId: manager.id,
      status: 'OPEN' as const,
      comments: [
        {
          id: 'comment-1',
          text: 'This review contains serious allegations including food safety concerns and legal threats. Immediate attention required.',
          author: 'System',
          createdAt: new Date('2024-01-13T20:30:00Z'),
        },
        {
          id: 'comment-2',
          text: 'I\'ve contacted the customer directly to address their concerns. Will follow up with management about food safety protocols.',
          author: 'Jane Manager',
          createdAt: new Date('2024-01-13T21:15:00Z'),
        },
      ],
      dueDate: new Date('2024-01-20T23:59:59Z'),
    },
  ]

  for (const ticketData of tickets) {
    await prisma.ticket.upsert({
      where: { reviewId: ticketData.reviewId },
      update: {},
      create: ticketData,
    })
  }

  console.log('✅ Tickets created')

  // Create subscriptions
  const subscriptions = [
    {
      id: 'sub-1',
      businessId: business1.id,
      plan: 'PROFESSIONAL',
      stripeId: 'sub_stripe_1',
      status: 'ACTIVE' as const,
    },
    {
      id: 'sub-2',
      businessId: business2.id,
      plan: 'STARTER',
      stripeId: 'sub_stripe_2',
      status: 'ACTIVE' as const,
    },
  ]

  for (const subData of subscriptions) {
    await prisma.subscription.upsert({
      where: { businessId: subData.businessId },
      update: {},
      create: subData,
    })
  }

  console.log('✅ Subscriptions created')

  // Create sample metrics
  const metrics = [
    {
      id: 'metrics-1',
      businessId: business1.id,
      date: new Date('2024-01-15'),
      coverage: 75.0,
      avgResponseTime: 2.5,
      totalReviews: 4,
      avgRating: 3.25,
    },
    {
      id: 'metrics-2',
      businessId: business2.id,
      date: new Date('2024-01-16'),
      coverage: 0.0,
      avgResponseTime: 0.0,
      totalReviews: 1,
      avgRating: 5.0,
    },
  ]

  for (const metricData of metrics) {
    await prisma.metrics.upsert({
      where: { id: metricData.id },
      update: {},
      create: metricData,
    })
  }

  console.log('✅ Metrics created')

  console.log('🎉 Database seed completed successfully!')
}

main()
  .catch((e) => {
    console.error('❌ Error during seed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
