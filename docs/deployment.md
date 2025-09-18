# Aleev Deployment Guide

This guide covers deploying the Aleev AI Review Management platform to production.

## Prerequisites

- Node.js 18+ installed
- PostgreSQL 13+ database
- Domain name and SSL certificate
- External service accounts (OpenAI, Stripe, Google, Sentry)

## Quick Deploy to Vercel

### 1. Prepare Repository

```bash
# Ensure all code is committed
git add .
git commit -m "Production ready deployment"
git push origin main
```

### 2. Connect to Vercel

1. Go to [vercel.com](https://vercel.com)
2. Import your GitHub repository
3. Configure build settings:
   - Framework Preset: Next.js
   - Build Command: `npm run build`
   - Output Directory: `.next`
   - Install Command: `npm install`

### 3. Environment Variables

Set the following environment variables in Vercel:

```env
# Database
DATABASE_URL="postgresql://username:password@host:port/database"

# NextAuth
NEXTAUTH_URL="https://your-domain.com"
NEXTAUTH_SECRET="your-production-secret"

# Google OAuth
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"

# OpenAI
OPENAI_API_KEY="your-openai-api-key"

# Stripe
STRIPE_PUBLISHABLE_KEY="pk_live_..."
STRIPE_SECRET_KEY="sk_live_..."
STRIPE_WEBHOOK_SECRET="whsec_..."

# Sentry
SENTRY_DSN="your-sentry-dsn"
SENTRY_ORG="your-sentry-org"
SENTRY_PROJECT="your-sentry-project"

# App Configuration
NODE_ENV="production"
NEXT_PUBLIC_APP_URL="https://your-domain.com"

# Background Jobs
CRON_SECRET="your-cron-secret"
```

### 4. Database Setup

#### Option A: Vercel Postgres

1. Add Vercel Postgres addon
2. Copy connection string to `DATABASE_URL`
3. Run migrations: `vercel env pull && npm run db:deploy`

#### Option B: External Database

1. Set up PostgreSQL (Railway, Supabase, or AWS RDS)
2. Update `DATABASE_URL` with connection string
3. Run migrations: `npm run db:deploy`

### 5. Deploy

```bash
# Deploy to production
vercel --prod

# Or push to main branch for automatic deployment
git push origin main
```

## Manual Deployment

### 1. Build Application

```bash
# Install dependencies
npm install

# Generate Prisma client
npm run db:generate

# Build application
npm run build
```

### 2. Database Migration

```bash
# Run migrations
npm run db:deploy

# Seed with initial data
npm run db:seed
```

### 3. Start Application

```bash
# Start production server
npm start
```

## Background Jobs Setup

### Vercel Cron (Recommended)

1. Create `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/jobs/ingest",
      "schedule": "*/10 * * * *"
    },
    {
      "path": "/api/jobs/metrics",
      "schedule": "0 0 * * *"
    }
  ]
}
```

2. Add `CRON_SECRET` environment variable
3. Deploy to Vercel

### External Cron Service

1. Set up CronJob.org or similar service
2. Configure webhooks:
   - Ingest: `https://your-domain.com/api/jobs/ingest` (every 10 minutes)
   - Metrics: `https://your-domain.com/api/jobs/metrics` (daily at midnight)
3. Add `Authorization: Bearer YOUR_CRON_SECRET` header

## External Service Configuration

### Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create OAuth 2.0 credentials
3. Add authorized redirect URIs:
   - `https://your-domain.com/api/auth/callback/google`
4. Copy Client ID and Secret to environment variables

### Stripe Setup

1. Go to [Stripe Dashboard](https://dashboard.stripe.com)
2. Create products and prices for your plans
3. Update price IDs in `src/lib/stripe.ts`
4. Configure webhook endpoint:
   - URL: `https://your-domain.com/api/webhooks/stripe`
   - Events: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`
5. Copy webhook secret to environment variables

### OpenAI Setup

1. Go to [OpenAI Platform](https://platform.openai.com)
2. Create API key
3. Set usage limits and billing
4. Copy API key to environment variables

### Sentry Setup

1. Go to [Sentry.io](https://sentry.io)
2. Create new project
3. Copy DSN to environment variables
4. Configure release tracking

## Domain and SSL

### Custom Domain

1. Add domain in Vercel dashboard
2. Configure DNS records:
   - A record: `@` → Vercel IP
   - CNAME: `www` → `cname.vercel-dns.com`
3. Enable SSL (automatic with Vercel)

### SSL Certificate

Vercel provides automatic SSL certificates. For other deployments:

```bash
# Using Let's Encrypt with Certbot
sudo certbot --nginx -d your-domain.com
```

## Monitoring and Maintenance

### Health Checks

Monitor the health endpoint:

```bash
curl https://your-domain.com/api/healthz
```

### Logs

- **Vercel**: View logs in dashboard
- **Sentry**: Error tracking and performance monitoring
- **Database**: Monitor connection pool and query performance

### Updates

```bash
# Pull latest changes
git pull origin main

# Install dependencies
npm install

# Run migrations
npm run db:migrate

# Deploy
vercel --prod
```

## Security Checklist

- [ ] Environment variables are secure
- [ ] Database is not publicly accessible
- [ ] API rate limiting is enabled
- [ ] CORS is properly configured
- [ ] SSL/TLS is enabled
- [ ] Security headers are set
- [ ] Audit logging is enabled
- [ ] PII scrubbing is working
- [ ] Webhook signatures are verified

## Performance Optimization

### Database

- Enable connection pooling
- Set up read replicas for analytics
- Monitor query performance
- Regular backups

### Application

- Enable Next.js caching
- Optimize images
- Use CDN for static assets
- Monitor bundle size

### Monitoring

- Set up alerts for errors
- Monitor response times
- Track user metrics
- Database performance monitoring

## Troubleshooting

### Common Issues

1. **Build Failures**
   - Check Node.js version compatibility
   - Verify all dependencies are installed
   - Check for TypeScript errors

2. **Database Connection Issues**
   - Verify `DATABASE_URL` format
   - Check database accessibility
   - Run migrations manually

3. **Authentication Issues**
   - Verify OAuth redirect URIs
   - Check `NEXTAUTH_SECRET` is set
   - Ensure `NEXTAUTH_URL` matches domain

4. **API Errors**
   - Check external service credentials
   - Verify webhook endpoints
   - Check rate limiting

### Debug Commands

```bash
# Check build locally
npm run build

# Run type checking
npm run type-check

# Run tests
npm test

# Check database connection
npm run db:generate
```

## Rollback Plan

1. **Database Rollback**

   ```bash
   # Revert to previous migration
   npx prisma migrate resolve --rolled-back <migration_name>
   ```

2. **Application Rollback**

   ```bash
   # Revert to previous Vercel deployment
   vercel rollback <deployment_url>
   ```

3. **Emergency Procedures**
   - Disable new user registrations
   - Switch to maintenance mode
   - Contact support team

## Support

For deployment issues:

- Check Vercel documentation
- Review application logs
- Contact development team
- Create GitHub issue

---

**Note**: This deployment guide assumes a standard production setup. Adjust configurations based on your specific requirements and infrastructure.
