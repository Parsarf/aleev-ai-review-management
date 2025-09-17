import { prisma } from './prisma'

export interface AuditLogEntry {
  userId?: string
  action: string
  resource: string
  details?: Record<string, any>
}

export async function logAuditEvent(entry: AuditLogEntry) {
  try {
    await prisma.auditLog.create({
      data: {
        userId: entry.userId,
        action: entry.action,
        resource: entry.resource,
        details: entry.details || {},
      },
    })
  } catch (error) {
    console.error('Failed to log audit event:', error)
    // Don't throw - audit logging should not break the main flow
  }
}

export const AUDIT_ACTIONS = {
  // User actions
  USER_LOGIN: 'USER_LOGIN',
  USER_LOGOUT: 'USER_LOGOUT',
  USER_CREATED: 'USER_CREATED',
  USER_UPDATED: 'USER_UPDATED',
  
  // Business actions
  BUSINESS_CREATED: 'BUSINESS_CREATED',
  BUSINESS_UPDATED: 'BUSINESS_UPDATED',
  BUSINESS_DELETED: 'BUSINESS_DELETED',
  
  // Review actions
  REVIEW_CREATED: 'REVIEW_CREATED',
  REVIEW_UPDATED: 'REVIEW_UPDATED',
  REVIEW_DELETED: 'REVIEW_DELETED',
  
  // Reply actions
  REPLY_GENERATED: 'REPLY_GENERATED',
  REPLY_APPROVED: 'REPLY_APPROVED',
  REPLY_SENT: 'REPLY_SENT',
  REPLY_FAILED: 'REPLY_FAILED',
  
  // Ticket actions
  TICKET_CREATED: 'TICKET_CREATED',
  TICKET_UPDATED: 'TICKET_UPDATED',
  TICKET_ASSIGNED: 'TICKET_ASSIGNED',
  TICKET_RESOLVED: 'TICKET_RESOLVED',
  
  // Subscription actions
  SUBSCRIPTION_CREATED: 'SUBSCRIPTION_CREATED',
  SUBSCRIPTION_UPDATED: 'SUBSCRIPTION_UPDATED',
  SUBSCRIPTION_CANCELED: 'SUBSCRIPTION_CANCELED',
  
  // Webhook actions
  WEBHOOK_RECEIVED: 'WEBHOOK_RECEIVED',
  WEBHOOK_PROCESSED: 'WEBHOOK_PROCESSED',
  WEBHOOK_FAILED: 'WEBHOOK_FAILED',
  
  // Settings actions
  SETTINGS_UPDATED: 'SETTINGS_UPDATED',
  INTEGRATION_CONNECTED: 'INTEGRATION_CONNECTED',
  INTEGRATION_DISCONNECTED: 'INTEGRATION_DISCONNECTED',
} as const
