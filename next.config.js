/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ['@prisma/client'],
  images: {
    domains: ['images.unsplash.com', 'lh3.googleusercontent.com']
  },
  env: {
    CUSTOM_KEY: process.env.CUSTOM_KEY,
  },
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET, POST, PUT, DELETE, OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'Content-Type, Authorization' },
        ],
      },
    ]
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
