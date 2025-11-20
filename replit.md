# Aleev - AI Review Management Platform

## Overview
Aleev is a production-ready SaaS web application designed for businesses to manage online reviews efficiently. It provides a centralized inbox for reviews from platforms like Google, Yelp, Facebook, and TripAdvisor, leveraging AI for intelligent response generation, crisis detection, and comprehensive analytics. The platform aims to streamline review management, enhance customer satisfaction, and protect brand reputation.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
The frontend is built with Next.js 14 (App Router, React 19), utilizing `shadcn/ui` (built on Radix UI) for components and TailwindCSS for styling. Data visualization is handled by Recharts, and session management uses NextAuth.js client-side hooks. Key pages include Inbox, Analytics, Tickets, Settings, and Billing.

### Backend Architecture
The backend uses Next.js API Routes with a Node.js runtime. It features Prisma ORM for PostgreSQL, NextAuth.js for authentication (Google OAuth, database sessions), and Zod for input validation. Rate limiting is implemented using a token bucket algorithm. Background jobs handle review ingestion and daily metrics rollup. AI integration with OpenAI GPT powers reply generation, crisis detection, and content safety filtering.

### Database Schema
The PostgreSQL database schema includes tables for `users` (with RBAC: OWNER, MANAGER, STAFF), `accounts`, `sessions`, `businesses`, `locations`, `subscriptions`, `reviews`, `replies`, `tickets`, `metrics`, and `audit_logs`.

### Authentication & Authorization
Authentication uses NextAuth.js with Google OAuth 2.0 and database-backed sessions. Role-Based Access Control (RBAC) is implemented with three permission levels: OWNER, MANAGER, and STAFF, controlling access to dashboard pages and API routes via middleware.

### Deployment Configuration
The application is deployed on Replit's Autoscale platform, configured for Node.js 20. It uses Replit PostgreSQL (Neon-backed) for the database. Build and start commands are adapted for Replit compatibility, and environment variables are managed via Replit Secrets.

## External Dependencies

### Required Services
- **PostgreSQL**: Primary database (v13+).
- **OpenAI API**: For GPT-based AI reply generation and content analysis.
- **Google Cloud Platform**: For OAuth authentication and Google Business Profile API integration.
- **Stripe**: For subscription billing and payment processing.
- **Sentry**: (Optional) For error monitoring and performance tracking.

### Third-Party Libraries
- `googleapis`: Google Business Profile API client.
- `openai`: OpenAI SDK.
- `stripe` / `@stripe/stripe-js`: Payment processing.
- `@sentry/nextjs`: Error monitoring.
- `@auth/prisma-adapter`: NextAuth database adapter.
- `bullmq` / `ioredis`: Job queue (optional).