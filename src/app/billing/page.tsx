'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { 
  CreditCard, 
  CheckCircle, 
  AlertTriangle, 
  ExternalLink,
  Calendar,
  DollarSign,
  BarChart3
} from 'lucide-react'
import { toast } from 'sonner'

interface Business {
  id: string
  name: string
  subscription?: {
    plan: string
    status: string
    endsAt?: string
  }
  usage: {
    reviews: number
    limit: number
  }
}

interface Plan {
  name: string
  price: number
  features: string[]
  stripePriceId: string
}

const PLANS: Record<string, Plan> = {
  STARTER: {
    name: 'Starter',
    price: 29,
    features: ['Up to 100 reviews/month', 'Basic AI replies', 'Email support'],
    stripePriceId: 'price_starter'
  },
  PROFESSIONAL: {
    name: 'Professional',
    price: 79,
    features: ['Up to 500 reviews/month', 'Advanced AI replies', 'Analytics dashboard', 'Priority support'],
    stripePriceId: 'price_professional'
  },
  ENTERPRISE: {
    name: 'Enterprise',
    price: 199,
    features: ['Unlimited reviews', 'Custom AI training', 'Advanced analytics', 'Dedicated support', 'Custom integrations'],
    stripePriceId: 'price_enterprise'
  }
}

export default function BillingPage() {
  const [businesses, setBusinesses] = useState<Business[]>([])
  const [loading, setLoading] = useState(true)
  const [upgrading, setUpgrading] = useState<string | null>(null)

  useEffect(() => {
    fetchBillingInfo()
  }, [])

  const fetchBillingInfo = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/billing')
      const data = await response.json()
      
      if (response.ok) {
        setBusinesses(data.businesses)
      } else {
        toast.error('Failed to fetch billing information')
      }
    } catch (error) {
      console.error('Error fetching billing info:', error)
      toast.error('Failed to fetch billing information')
    } finally {
      setLoading(false)
    }
  }

  const upgradePlan = async (businessId: string, plan: string) => {
    try {
      setUpgrading(businessId)
      const response = await fetch('/api/billing', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'createCheckout',
          businessId,
          plan
        })
      })

      const data = await response.json()
      
      if (response.ok) {
        // Redirect to Stripe checkout
        window.location.href = data.url
      } else {
        toast.error(data.error || 'Failed to start upgrade process')
      }
    } catch (error) {
      console.error('Error upgrading plan:', error)
      toast.error('Failed to upgrade plan')
    } finally {
      setUpgrading(null)
    }
  }

  const openCustomerPortal = async (businessId: string) => {
    try {
      const response = await fetch('/api/billing', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'createPortal',
          businessId
        })
      })

      const data = await response.json()
      
      if (response.ok) {
        // Redirect to Stripe customer portal
        window.location.href = data.url
      } else {
        toast.error(data.error || 'Failed to open customer portal')
      }
    } catch (error) {
      console.error('Error opening customer portal:', error)
      toast.error('Failed to open customer portal')
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return 'bg-green-100 text-green-800'
      case 'CANCELED':
        return 'bg-red-100 text-red-800'
      case 'PAST_DUE':
        return 'bg-yellow-100 text-yellow-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return <CheckCircle className="h-4 w-4" />
      case 'CANCELED':
        return <AlertTriangle className="h-4 w-4" />
      case 'PAST_DUE':
        return <AlertTriangle className="h-4 w-4" />
      default:
        return <AlertTriangle className="h-4 w-4" />
    }
  }

  const getUsagePercentage = (usage: number, limit: number) => {
    if (limit === -1) return 0 // Unlimited
    return Math.min((usage / limit) * 100, 100)
  }

  const getUsageColor = (percentage: number) => {
    if (percentage >= 90) return 'text-red-600'
    if (percentage >= 75) return 'text-yellow-600'
    return 'text-green-600'
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Billing & Usage</h1>
      </div>

      {/* Current Subscriptions */}
      <div className="space-y-6">
        {businesses.map((business) => (
          <Card key={business.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center">
                    <CreditCard className="h-5 w-5 mr-2" />
                    {business.name}
                  </CardTitle>
                  {business.subscription && (
                    <div className="flex items-center space-x-2 mt-2">
                      <Badge className={getStatusColor(business.subscription.status)}>
                        {getStatusIcon(business.subscription.status)}
                        <span className="ml-1">{business.subscription.status}</span>
                      </Badge>
                      <span className="text-sm text-gray-600">
                        {PLANS[business.subscription.plan]?.name || business.subscription.plan}
                      </span>
                    </div>
                  )}
                </div>
                <div className="flex space-x-2">
                  {business.subscription && (
                    <Button
                      variant="outline"
                      onClick={() => openCustomerPortal(business.id)}
                    >
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Manage Billing
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Usage */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium">Review Usage</h4>
                  <span className={`text-sm font-medium ${getUsageColor(getUsagePercentage(business.usage.reviews, business.usage.limit))}`}>
                    {business.usage.reviews} / {business.usage.limit === -1 ? '∞' : business.usage.limit}
                  </span>
                </div>
                {business.usage.limit !== -1 && (
                  <Progress 
                    value={getUsagePercentage(business.usage.reviews, business.usage.limit)} 
                    className="h-2"
                  />
                )}
                <p className="text-sm text-gray-500 mt-1">
                  Reviews processed this month
                </p>
              </div>

              {/* Subscription Details */}
              {business.subscription ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="flex items-center space-x-2">
                    <DollarSign className="h-4 w-4 text-gray-400" />
                    <div>
                      <p className="text-sm font-medium">
                        ${PLANS[business.subscription.plan]?.price || 0}/month
                      </p>
                      <p className="text-xs text-gray-500">Current plan</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Calendar className="h-4 w-4 text-gray-400" />
                    <div>
                      <p className="text-sm font-medium">
                        {business.subscription.endsAt 
                          ? new Date(business.subscription.endsAt).toLocaleDateString()
                          : 'No end date'
                        }
                      </p>
                      <p className="text-xs text-gray-500">
                        {business.subscription.endsAt ? 'Next billing' : 'Billing cycle'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <BarChart3 className="h-4 w-4 text-gray-400" />
                    <div>
                      <p className="text-sm font-medium">
                        {business.usage.limit === -1 ? 'Unlimited' : `${business.usage.limit} reviews`}
                      </p>
                      <p className="text-xs text-gray-500">Monthly limit</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-4">
                  <p className="text-gray-600 mb-4">No active subscription</p>
                  <Button onClick={() => upgradePlan(business.id, 'STARTER')}>
                    Choose a Plan
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Available Plans */}
      <Card>
        <CardHeader>
          <CardTitle>Available Plans</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {Object.entries(PLANS).map(([key, plan]) => (
              <div key={key} className="border rounded-lg p-6 space-y-4">
                <div>
                  <h3 className="text-lg font-semibold">{plan.name}</h3>
                  <div className="flex items-baseline space-x-1">
                    <span className="text-3xl font-bold">${plan.price}</span>
                    <span className="text-gray-500">/month</span>
                  </div>
                </div>
                
                <ul className="space-y-2">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-center space-x-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <span className="text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>

                <Button 
                  className="w-full" 
                  variant={key === 'PROFESSIONAL' ? 'default' : 'outline'}
                  onClick={() => {
                    const business = businesses[0] // For demo, use first business
                    if (business) {
                      upgradePlan(business.id, key)
                    }
                  }}
                  disabled={upgrading === businesses[0]?.id}
                >
                  {upgrading === businesses[0]?.id ? 'Processing...' : 'Choose Plan'}
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Billing History */}
      <Card>
        <CardHeader>
          <CardTitle>Billing History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <CreditCard className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Billing History</h3>
            <p className="text-gray-600">
              Your billing history will appear here once you have an active subscription.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
