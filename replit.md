# Aleev - AI Review Management Platform

## Overview

Aleev is a production-ready SaaS web application for managing online reviews with AI-powered responses, analytics, and multi-platform integration. Built with Next.js 14, TypeScript, and PostgreSQL, it provides businesses with a centralized inbox for managing reviews across Google, Yelp, Facebook, and TripAdvisor, featuring intelligent AI reply generation, crisis detection, and comprehensive analytics.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Framework**: Next.js 14 with App Router and React 19
- **UI Components**: shadcn/ui component library built on Radix UI primitives
- **Styling**: TailwindCSS with custom theme configuration
- **State Management**: React hooks and Next.js server components
- **Data Visualization**: Recharts for analytics dashboards
- **Session Management**: NextAuth.js client-side hooks

**Key Pages**:
- `/inbox` - Unified review management interface with filters and search
- `/analytics` - Business metrics and performance tracking
- `/tickets` - Support ticket escalation system
- `/settings` - Business profile, locations, and platform integrations
- `/billing` - Subscription management and usage tracking

### Backend Architecture

**API Design**: Next.js API Routes with Node.js runtime
- **Database ORM**: Prisma with PostgreSQL
- **Authentication**: NextAuth.js with database sessions and Google OAuth
- **Validation**: Zod schemas for input validation
- **Rate Limiting**: Token bucket algorithm with in-memory store
- **Audit Logging**: Comprehensive activity tracking for security and compliance

**Core API Endpoints**:
- `/api/reviews` - Review CRUD operations with filtering
- `/api/replies` - AI reply generation and management
- `/api/analytics` - Business metrics and KPI calculations
- `/api/settings` - Business and location configuration
- `/api/billing` - Subscription and usage tracking
- `/api/webhooks/[google|stripe]` - External service integrations

**Background Jobs**:
- Review ingestion from connected platforms (cron-based)
- Metrics rollup for analytics (daily aggregation)

**AI Integration**:
- OpenAI GPT for intelligent response generation
- Crisis detection using keyword analysis
- Policy filtering for PII and banned content
- Customizable tone (professional, friendly, apologetic, empathetic)

### Database Schema

**User Management**:
- `users` - User accounts with role-based permissions (OWNER, MANAGER, STAFF)
- `accounts` - OAuth provider connections (Google)
- `sessions` - Database-backed session storage
- `verification_tokens` - Email verification tokens

**Business Entities**:
- `businesses` - Business profiles with brand rules and tone settings
- `locations` - Physical locations with platform account connections
- `subscriptions` - Stripe subscription tracking

**Review Management**:
- `reviews` - Review data from multiple platforms (Google, Yelp, Facebook, TripAdvisor)
- `replies` - AI-generated and manual replies with approval workflow
- `tickets` - Escalated issues requiring manual intervention

**Analytics**:
- `metrics` - Daily rollup of key performance indicators
- `audit_logs` - Activity tracking for security and compliance

### Authentication & Authorization

**Strategy**: Database sessions with NextAuth.js
- Google OAuth 2.0 for sign-in
- Session tokens stored in database
- Role-based access control (RBAC) with three levels
- JWT tokens for API authentication

**Protected Routes**: Middleware-based protection for all dashboard pages and API routes

### External Dependencies

**Required Services**:
- **PostgreSQL**: Primary database (v13+)
- **OpenAI API**: GPT-based reply generation and content analysis
- **Google Cloud Platform**: OAuth authentication and Business Profile API integration
- **Stripe**: Subscription billing and payment processing
- **Sentry**: Error monitoring and performance tracking (optional)

**Environment Variables**:
- `DATABASE_URL` - PostgreSQL connection string
- `NEXTAUTH_SECRET` - Session encryption key
- `NEXTAUTH_URL` - Application base URL
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` - OAuth credentials
- `OPENAI_API_KEY` - AI service access
- `STRIPE_SECRET_KEY` / `STRIPE_PUBLISHABLE_KEY` - Payment processing
- `STRIPE_WEBHOOK_SECRET` - Webhook signature verification
- `SENTRY_DSN` - Error tracking (optional)
- `CRON_SECRET` - Background job authentication

**Third-Party Libraries**:
- `googleapis` - Google Business Profile API client
- `openai` - OpenAI SDK
- `stripe` / `@stripe/stripe-js` - Payment processing
- `@sentry/nextjs` - Error monitoring
- `@auth/prisma-adapter` - NextAuth database adapter
- `bullmq` / `ioredis` - Job queue (configured but optional)

### Deployment Configuration

**Platform**: Replit (migrated from Vercel on November 5, 2025)
- **Build Command**: `npm run build` (includes Prisma generation)
- **Start Command**: `npm run dev` (development) or `npm run start` (production)
- **Port Configuration**: Bound to `0.0.0.0:5000` for Replit compatibility
- **Runtime**: Node.js 20 (Replit default)
- **Database**: Replit PostgreSQL (Neon-backed) with direct connection
- **Package Manager**: npm (consolidated, pnpm-lock.yaml removed for security)
- **Monitoring**: Sentry instrumentation commented out to prevent startup issues

**Replit-Specific Changes**:
- Prisma schema simplified: removed `directUrl` (Vercel-specific pooling)
- Next.js dev/start scripts configured with `-p 5000 -H 0.0.0.0`
- Removed turbopack flags for compatibility
- Deployment type: Autoscale (stateless web application)

**Production Considerations**:
- Database migrations run automatically on deployment  
- Environment variables managed through Replit Secrets
- Sentry webpack plugin conditionally enabled when DSN is configured
- CORS headers configured for API routes
- Health check endpoint at `/api/healthz`