# Aleev - AI Review Management Platform

A production-ready SaaS web application for managing online reviews with AI-powered responses, analytics, and multi-platform integration.

## 🚀 Features

### Core Functionality

- **Unified Inbox**: Centralized review management across multiple platforms
- **AI Reply Generation**: Intelligent, brand-consistent responses using OpenAI
- **Crisis Detection**: Automatic flagging of critical reviews requiring immediate attention
- **Analytics Dashboard**: Comprehensive metrics and performance tracking
- **Ticket System**: Escalate complex issues to support tickets
- **Multi-Platform Support**: Google, Yelp, Facebook, TripAdvisor integration

### AI & Automation

- **Smart Reply Generation**: Context-aware responses based on review sentiment and business rules
- **Policy Filtering**: Automatic detection of PII, banned phrases, and content violations
- **Tone Customization**: Professional, friendly, apologetic, or empathetic response styles
- **Auto-send Capabilities**: Automated responses for positive reviews

### Business Management

- **Multi-location Support**: Manage multiple business locations
- **Role-based Access**: Owner, Manager, and Staff permission levels
- **Brand Rules**: Customizable guidelines for AI responses
- **Subscription Management**: Stripe-powered billing with multiple tiers

## 🛠 Tech Stack

### Frontend

- **Next.js 14** with App Router
- **React 18** with TypeScript
- **TailwindCSS** for styling
- **shadcn/ui** component library
- **Recharts** for data visualization

### Backend

- **Next.js API Routes** and Server Actions
- **Node.js 18+** with TypeScript
- **PostgreSQL** database
- **Prisma** ORM

### Authentication & Payments

- **NextAuth.js** with Google OAuth
- **Stripe** for subscription management
- **JWT** tokens for session management

### AI & Integrations

- **OpenAI GPT-4** for reply generation
- **Google Business Profile API** for review management
- **Platform Adapters** for extensible integrations

### Monitoring & Quality

- **Sentry** for error tracking
- **Jest** for unit testing
- **Playwright** for E2E testing
- **ESLint & Prettier** for code quality

## 📋 Prerequisites

- Node.js 18+
- PostgreSQL 13+
- OpenAI API key
- Google OAuth credentials
- Stripe account
- Sentry account (optional)

## 🚀 Quick Start

### 1. Clone and Install

```bash
git clone <repository-url>
cd aireview
npm install
```

### 2. Environment Setup

Copy the environment template and configure your variables:

```bash
cp env.example .env.local
```

Update `.env.local` with your credentials:

```env
# Database
DATABASE_URL="postgresql://username:password@localhost:5432/aireview"

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-nextauth-secret"

# Google OAuth
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"

# OpenAI
OPENAI_API_KEY="your-openai-api-key"

# Stripe
STRIPE_PUBLISHABLE_KEY="pk_test_..."
STRIPE_SECRET_KEY="sk_test_..."
STRIPE_WEBHOOK_SECRET="whsec_..."

# Sentry (optional)
SENTRY_DSN="your-sentry-dsn"
```

### 3. Database Setup

```bash
# Generate Prisma client
npm run db:generate

# Run migrations
npm run db:migrate

# Seed with sample data
npm run db:seed
```

### 4. Start Development Server

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000) to see the application.

## 🧪 Testing

### Unit Tests

```bash
npm test
```

### E2E Tests

```bash
npm run test:e2e
```

### Type Checking

```bash
npm run type-check
```

### Linting

```bash
npm run lint
```

## 📊 Database Schema

### Core Entities

- **Users**: Authentication and role management
- **Businesses**: Multi-tenant business accounts
- **Locations**: Physical business locations
- **Reviews**: Platform reviews with metadata
- **Replies**: AI-generated and manual responses
- **Tickets**: Support ticket system
- **Subscriptions**: Stripe billing integration
- **AuditLogs**: Security and compliance tracking

### Key Relationships

- Users own Businesses
- Businesses have multiple Locations
- Locations have Reviews
- Reviews can have Replies and Tickets
- Businesses have Subscriptions

## 🔌 API Endpoints

### Reviews

- `GET /api/reviews` - List reviews with filtering
- `POST /api/reviews` - Create manual review

### Replies

- `POST /api/replies` - Generate or update replies
  - Action: `generate` - Create AI reply
  - Action: `update` - Approve or send reply

### Analytics

- `GET /api/analytics` - Get performance metrics

### Settings

- `GET /api/settings` - Get business settings
- `POST /api/settings` - Update settings

### Billing

- `GET /api/billing` - Get subscription info
- `POST /api/billing` - Create checkout or portal session

### Webhooks

- `POST /api/webhooks/stripe` - Stripe webhook handler
- `POST /api/webhooks/google` - Google reviews webhook

### Background Jobs

- `POST /api/jobs/ingest` - Review ingestion job
- `POST /api/jobs/metrics` - Metrics rollup job

## 🚀 Deployment

### Vercel (Recommended)

1. **Connect Repository**: Link your GitHub repository to Vercel
2. **Environment Variables**: Add all required environment variables
3. **Database**: Set up PostgreSQL (Vercel Postgres, Supabase, or Railway)
4. **Deploy**: Automatic deployment on push to main branch

### Environment Variables for Production

```env
DATABASE_URL="postgresql://..."
NEXTAUTH_URL="https://your-domain.com"
NEXTAUTH_SECRET="production-secret"
GOOGLE_CLIENT_ID="production-google-id"
GOOGLE_CLIENT_SECRET="production-google-secret"
OPENAI_API_KEY="production-openai-key"
STRIPE_PUBLISHABLE_KEY="pk_live_..."
STRIPE_SECRET_KEY="sk_live_..."
STRIPE_WEBHOOK_SECRET="whsec_..."
SENTRY_DSN="production-sentry-dsn"
```

### Background Jobs

For production, set up background jobs using:

- **Vercel Cron** for scheduled tasks
- **Railway** or **Fly.io** for worker processes
- **CronJob.org** for external scheduling

## 🔒 Security Features

- **Authentication**: NextAuth.js with Google OAuth
- **Authorization**: Role-based access control (RBAC)
- **Rate Limiting**: API endpoint protection
- **Input Validation**: Zod schema validation
- **CSRF Protection**: Built-in Next.js protection
- **Audit Logging**: Comprehensive activity tracking
- **PII Protection**: Automatic data scrubbing
- **GDPR Compliance**: Data export and deletion endpoints

## 📈 Monitoring & Observability

- **Error Tracking**: Sentry integration
- **Performance Monitoring**: Built-in Next.js analytics
- **Audit Logs**: Database-stored activity logs
- **Health Checks**: `/api/healthz` endpoint
- **Structured Logging**: JSON-formatted logs

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

- **Documentation**: Check this README and inline code comments
- **Issues**: Create a GitHub issue for bugs or feature requests
- **Email**: support@aleev.com
- **Discord**: [Join our community](https://discord.gg/aleev)

## 🗺 Roadmap

- [ ] Mobile app (React Native)
- [ ] Advanced AI training with custom models
- [ ] Multi-language support
- [ ] Advanced analytics with ML insights
- [ ] White-label solutions
- [ ] API for third-party integrations
- [ ] Advanced workflow automation
- [ ] Social media integration

---

Built with ❤️ by the Aleev team
