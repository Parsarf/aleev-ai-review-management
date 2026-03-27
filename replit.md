# Aleev - AI Review Management Platform

## Overview
Aleev is a production-ready SaaS web application for businesses to manage online reviews efficiently. It provides a centralized inbox for reviews from platforms like Google, Yelp, Facebook, and TripAdvisor, leveraging AI for intelligent response generation, crisis detection, and comprehensive analytics.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
The frontend is built with Next.js 15 (App Router, React 19), using `shadcn/ui` (Radix UI) for components and TailwindCSS for styling. Data visualization is handled by Recharts, and session management uses NextAuth.js client-side hooks. Key pages: Inbox, Analytics, Tickets, Settings, and Billing.

### Backend Architecture
Next.js API Routes with Node.js runtime. Prisma ORM for PostgreSQL, NextAuth.js for authentication (Google OAuth, database sessions), Zod for input validation. Rate limiting via token bucket algorithm. Background jobs handle review ingestion and daily metrics rollup. OpenAI GPT powers reply generation, crisis detection, and content safety filtering.

### Database Schema
PostgreSQL tables: `users` (RBAC: OWNER, MANAGER, STAFF), `accounts`, `sessions`, `businesses`, `locations`, `subscriptions`, `reviews`, `replies`, `tickets`, `metrics`, `audit_logs`.

### Authentication & Authorization
NextAuth.js with Google OAuth 2.0, database-backed sessions. RBAC with three roles: OWNER, MANAGER, STAFF — enforced on dashboard pages and API routes via middleware.

### Deployment Configuration
- **Platform**: Replit Autoscale (Node.js 20)
- **Database**: Replit PostgreSQL (Neon-backed), accessed via `DATABASE_URL`
- **Dev server**: `npm run dev` on `0.0.0.0:5000`
- **Build**: `npm run build` → `npm run start`
- **Secrets**: Managed via Replit Secrets

### Replit-Specific Fixes Applied
- `allowedDevOrigins` set in `next.config.js` to whitelist `*.replit.dev` domains (fixes blank screen in preview pane)
- Sentry fully disabled: `instrumentation.ts` and `instrumentation-client.ts` are empty stubs; all Sentry config files removed (they caused a `SyntaxError` in the browser)
- `directUrl` removed from Prisma schema (was Vercel-specific connection pooling)

## Landing Page
A standalone marketing landing page lives in `landing/` (source) and `public/landing/` (served by Next.js). Access at `/landing/index.html`. Also pushed to GitHub: `github.com/Parsarf/ALEEV_WEB`.

## External Dependencies

### Required Services
- **PostgreSQL**: Primary database (v13+)
- **OpenAI API**: GPT-based AI reply generation and content analysis
- **Google Cloud Platform**: OAuth authentication and Google Business Profile API
- **Stripe**: Subscription billing and payment processing

### Third-Party Libraries
- `googleapis`: Google Business Profile API client
- `openai`: OpenAI SDK
- `stripe` / `@stripe/stripe-js`: Payment processing
- `@auth/prisma-adapter`: NextAuth database adapter
- `@sentry/nextjs`: Installed but not active (no DSN configured)
- `bullmq` / `ioredis`: Job queue (optional)
- `@replit/connectors-sdk`: Replit GitHub integration (used for landing page deployment)
