import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,
  
  // Performance Monitoring
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
  
  // Session Replay
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
  
  // Release tracking
  release: process.env.npm_package_version || '1.0.0',
  
  // Filter sensitive data
  beforeSend(event) {
    // Remove sensitive data from events
    if (event.request?.data && typeof event.request.data === 'object') {
      const data = event.request.data as Record<string, any>
      delete data.password
      delete data.token
      delete data.secret
    }
    
    return event
  }
})
