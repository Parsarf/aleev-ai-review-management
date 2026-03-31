/** @type {import('next').NextConfig} */
const isDev = process.env.NODE_ENV !== 'production'

// In Replit dev, force assets to load via the direct port-5000 URL so
// chunk requests are not intercepted/dropped by the Replit proxy layer.
const assetPrefix = isDev && process.env.REPLIT_DEV_DOMAIN
  ? `https://${process.env.REPLIT_DEV_DOMAIN}:5000`
  : undefined


const nextConfig = {
  serverExternalPackages: ['@prisma/client'],
  allowedDevOrigins: ['*.replit.dev', '*.kirk.replit.dev', '*.repl.co'],
  assetPrefix,
  images: {
    domains: ['images.unsplash.com', 'lh3.googleusercontent.com']
  },
  env: {
    CUSTOM_KEY: process.env.CUSTOM_KEY,
  },
  async headers() {
    const rules = [
      {
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET, POST, PUT, DELETE, OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'Content-Type, Authorization' },
        ],
      },
    ]

    if (isDev) {
      rules.push({
        source: '/_next/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Cache-Control', value: 'no-store, must-revalidate' },
        ],
      })
    }

    return rules
  },
  async rewrites() {
    return [
      {
        source: '/api/healthz',
        destination: '/api/healthz',
      },
    ]
  },
}

// Only use Sentry if DSN is configured
if (process.env.SENTRY_DSN) {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { withSentryConfig } = require('@sentry/nextjs')
  
  const sentryWebpackPluginOptions = {
    org: process.env.SENTRY_ORG,
    project: process.env.SENTRY_PROJECT,
    url: process.env.SENTRY_URL,
    urlPrefix: '~/_next',
    silent: !process.env.CI,
  }

  module.exports = withSentryConfig(nextConfig, sentryWebpackPluginOptions)
} else {
  console.warn("SENTRY_DSN is not configured - Sentry webpack plugin will be disabled")
  module.exports = nextConfig
}
