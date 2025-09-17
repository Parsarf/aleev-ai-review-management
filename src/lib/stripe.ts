import Stripe from 'stripe'

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-12-18.acacia',
})

export const STRIPE_PLANS = {
  STARTER: {
    name: 'Starter',
    price: 29,
    features: ['Up to 100 reviews/month', 'Basic AI replies', 'Email support'],
    stripePriceId: process.env.STRIPE_STARTER_PRICE_ID!,
  },
  PROFESSIONAL: {
    name: 'Professional',
    price: 79,
    features: ['Up to 500 reviews/month', 'Advanced AI replies', 'Analytics dashboard', 'Priority support'],
    stripePriceId: process.env.STRIPE_PROFESSIONAL_PRICE_ID!,
  },
  ENTERPRISE: {
    name: 'Enterprise',
    price: 199,
    features: ['Unlimited reviews', 'Custom AI training', 'Advanced analytics', 'Dedicated support', 'Custom integrations'],
    stripePriceId: process.env.STRIPE_ENTERPRISE_PRICE_ID!,
  },
}

export async function createCheckoutSession({
  businessId,
  plan,
  successUrl,
  cancelUrl,
}: {
  businessId: string
  plan: keyof typeof STRIPE_PLANS
  successUrl: string
  cancelUrl: string
}) {
  const priceId = STRIPE_PLANS[plan].stripePriceId

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    payment_method_types: ['card'],
    line_items: [
      {
        price: priceId,
        quantity: 1,
      },
    ],
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: {
      businessId,
      plan,
    },
  })

  return session
}

export async function createCustomerPortalSession({
  businessId,
  returnUrl,
}: {
  businessId: string
  returnUrl: string
}) {
  // First, find the customer by business ID
  const subscription = await stripe.subscriptions.list({
    limit: 1,
    metadata: { businessId },
  })

  if (subscription.data.length === 0) {
    throw new Error('No subscription found for business')
  }

  const customerId = subscription.data[0].customer as string

  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl,
  })

  return session
}

export async function handleWebhookEvent(event: Stripe.Event) {
  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session
      const businessId = session.metadata?.businessId
      const plan = session.metadata?.plan

      if (businessId && plan) {
        // Create or update subscription in database
        await createOrUpdateSubscription({
          businessId,
          plan,
          stripeSubscriptionId: session.subscription as string,
          status: 'ACTIVE',
        })
      }
      break
    }

    case 'customer.subscription.updated': {
      const subscription = event.data.object as Stripe.Subscription
      const businessId = subscription.metadata?.businessId

      if (businessId) {
        await updateSubscriptionStatus({
          stripeSubscriptionId: subscription.id,
          status: subscription.status === 'active' ? 'ACTIVE' : 'CANCELED',
          endsAt: subscription.canceled_at ? new Date(subscription.canceled_at * 1000) : null,
        })
      }
      break
    }

    case 'customer.subscription.deleted': {
      const subscription = event.data.object as Stripe.Subscription
      const businessId = subscription.metadata?.businessId

      if (businessId) {
        await updateSubscriptionStatus({
          stripeSubscriptionId: subscription.id,
          status: 'CANCELED',
          endsAt: new Date(),
        })
      }
      break
    }
  }
}

async function createOrUpdateSubscription({
  businessId,
  plan,
  stripeSubscriptionId,
  status,
}: {
  businessId: string
  plan: string
  stripeSubscriptionId: string
  status: 'ACTIVE' | 'CANCELED' | 'PAST_DUE'
}) {
  const { prisma } = await import('./prisma')
  
  await prisma.subscription.upsert({
    where: { businessId },
    update: {
      plan,
      stripeId: stripeSubscriptionId,
      status,
    },
    create: {
      businessId,
      plan,
      stripeId: stripeSubscriptionId,
      status,
    },
  })
}

async function updateSubscriptionStatus({
  stripeSubscriptionId,
  status,
  endsAt,
}: {
  stripeSubscriptionId: string
  status: 'ACTIVE' | 'CANCELED' | 'PAST_DUE'
  endsAt: Date | null
}) {
  const { prisma } = await import('./prisma')
  
  await prisma.subscription.update({
    where: { stripeId: stripeSubscriptionId },
    data: {
      status,
      endsAt,
    },
  })
}
