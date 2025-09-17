import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  
  // Performance Monitoring
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
  
  // Release tracking
  release: process.env.npm_package_version || '1.0.0',
  
  // Filter sensitive data
  beforeSend(event) {
    // Remove sensitive data from events
    if (event.request?.data) {
      delete event.request.data.password
      delete event.request.data.token
      delete event.request.data.secret
    }
    
    // Filter out health check requests
    if (event.request?.url?.includes('/api/healthz')) {
      return null
    }
    
    return event
  }
})
