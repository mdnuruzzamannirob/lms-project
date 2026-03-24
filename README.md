# stackread-backend

![Node.js](https://img.shields.io/badge/Node.js-22.x-339933?logo=node.js&logoColor=white)
![Express](https://img.shields.io/badge/Express-5.1.0-000000?logo=express&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5.8.2-3178C6?logo=typescript&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-7+-47A248?logo=mongodb&logoColor=white)

## Table of Contents

- [Overview](#overview)
- [Core Information](#core-information)
- [Architecture](#architecture)
- [Module Directory](#module-directory)
- [Technology Stack](#technology-stack)
- [API Communication](#api-communication)
- [Quick Start](#quick-start)
- [Development Guide](#development-guide)
- [Available Commands](#available-commands)
- [Database](#database)
- [API Documentation](#api-documentation)
- [Testing](#testing)
- [Performance](#performance)
- [Security](#security)
- [Deployment](#deployment)
- [FAQ](#faq)
- [Contributing](#contributing)

---

## Overview

Production-grade Node.js backend for a subscription-based digital e-book platform with advanced reading features, payment processing, and content management.

**Key Capabilities:**
- Multi-tier authentication (OAuth, 2FA, JWT)
- Payment processing (Stripe, PayPal, SSLCommerz)
- Advanced reading platform with progress tracking and annotations
- Flexible subscription management
- Comprehensive admin dashboard
- Full-text search with recommendations
- Real-time notifications
- Role-based access control (RBAC)

---

## Core Information

| Property | Value |
| --- | --- |
| **Project** | stackread-backend |
| **Version** | 1.0.0 |
| **License** | ISC |
| **API Version** | v1 |
| **Modules** | 24 |
| **Status** | Production-Ready ✅ |

---

## Architecture

### Modular Monolithic Pattern

A single deployable unit structured as independent domain modules:

```
API Router
    ↓
Auth Middleware
    ↓
24 Domain Modules (auth, books, users, payments, etc.)
    ↓
Shared Services (Database, Cache, Email, Storage)
    ↓
MongoDB + Redis + External APIs
```

### Module Structure

Each module follows a consistent pattern:
- **router.ts** - HTTP routes and middleware
- **controller.ts** - Request handlers
- **service.ts** - Business logic
- **model.ts** - MongoDB schema
- **validation.ts** - Input validation with Zod
- **interface.ts** - TypeScript types
- **index.ts** - Module exports

---

## Module Directory (24 Modules)

- **audit** - Complete audit module with API endpoints and business logic
- **auth** - Complete auth module with API endpoints and business logic
- **authors** - Complete authors module with API endpoints and business logic
- **books** - Complete books module with API endpoints and business logic
- **categories** - Complete categories module with API endpoints and business logic
- **dashboard** - Complete dashboard module with API endpoints and business logic
- **health** - Complete health module with API endpoints and business logic
- **members** - Complete members module with API endpoints and business logic
- **notifications** - Complete notifications module with API endpoints and business logic
- **onboarding** - Complete onboarding module with API endpoints and business logic
- **payments** - Complete payments module with API endpoints and business logic
- **plans** - Complete plans module with API endpoints and business logic
- **promotions** - Complete promotions module with API endpoints and business logic
- **publishers** - Complete publishers module with API endpoints and business logic
- **rbac** - Complete rbac module with API endpoints and business logic
- **reading** - Complete reading module with API endpoints and business logic
- **reports** - Complete reports module with API endpoints and business logic
- **reviews** - Complete reviews module with API endpoints and business logic
- **search** - Complete search module with API endpoints and business logic
- **settings** - Complete settings module with API endpoints and business logic
- **staff** - Complete staff module with API endpoints and business logic
- **staff-auth** - Complete staff-auth module with API endpoints and business logic
- **subscriptions** - Complete subscriptions module with API endpoints and business logic
- **wishlist** - Complete wishlist module with API endpoints and business logic

---

## Technology Stack

| Technology | Version | Purpose |
| --- | --- | --- |
| Node.js | 22.x | Modern async runtime with native ES modules support |
| TypeScript | 5.8.2 | Strict typing for large modular backends |
| Express | 5.1.0 | Lightweight HTTP framework with middleware ecosystem |
| Mongoose | 8.13.0 | MongoDB ODM with schema validation and hooks |
| Zod | 3.24.2 | Runtime schema validation with TypeScript inference |
| Winston | 3.17.0 | Structured logging with rotation and archival |
| Vitest | 4.1.0 | Fast unit and integration test framework |
| pnpm | 10.30.2 | Fast deterministic package management |

---

## API Communication

### Request/Response Flow

All API responses follow a standard format:

```json
{
  "success": true,
  "message": "Operation successful",
  "data": {...},
  "meta": {
    "timestamp": "2026-03-22T10:30:00Z",
    "requestId": "req_123"
  }
}
```

### Status Codes

- **200** - OK (GET, PATCH success)
- **201** - Created (POST success)
- **400** - Bad Request (validation error)
- **401** - Unauthorized (missing/invalid token)
- **403** - Forbidden (insufficient permissions)
- **404** - Not Found
- **429** - Rate Limited
- **500** - Server Error

---

## Quick Start

**Prerequisites:**
- Node.js 22.x
- pnpm 10.x
- MongoDB 7.x
- Git

**Installation:**

```bash
git clone https://github.com/mdnuruzzamannirob/stackread-backend.git
cd stackread-backend
pnpm install

# Setup environment
cp .env.example .env
nano .env

# Database setup
pnpm migrate
pnpm seed:all

# Start
pnpm dev          # Terminal 1: API server
pnpm dev:worker   # Terminal 2: Background worker
```

**API Documentation:**
- Interactive: http://localhost:5000/api/docs
- OpenAPI: docs/openAPI.json

---

## Development Guide

### Adding a New Module

1. Create folder in `src/modules/MODULE_NAME/`
2. Create standard files: router.ts, controller.ts, service.ts, model.ts, validation.ts, interface.ts
3. Define Zod validation schemas
4. Implement service with business logic
5. Add thin controller handlers
6. Define routes with middleware
7. Export router in index.ts
8. Import router in src/app/routes.ts

### Code Organization

- Controllers stay thin - delegate to services
- Services contain all business logic
- Models define schema and methods
- Validation at request boundaries with Zod
- Custom error classes for consistency
- Comprehensive TypeScript typing

---

## Available Commands

### Development

| Command | Description |
| --- | --- |
| pnpm dev | tsx watch src/app/server.ts |
| pnpm dev:worker | tsx watch src/app/worker.ts |

### Build & Compilation

| Command | Description |
| --- | --- |
| pnpm build | tsc -p tsconfig.json |

### Code Generation

| Command | Description |
| --- | --- |
| pnpm generate:permissions | tsx src/scripts/generate-permissions.ts |
| pnpm generate:readme | tsx src/scripts/generate-readme.ts |
| pnpm generate:docs | tsx src/scripts/generate-api-docs.ts |

### Testing

| Command | Description |
| --- | --- |
| pnpm test | vitest run |
| pnpm test:watch | vitest |
| pnpm test:integration | vitest run tests/integration |
| pnpm test:unit | vitest run tests/unit |

### Code Quality

| Command | Description |
| --- | --- |
| pnpm typecheck | tsc --noEmit |

### Database & Migration

| Command | Description |
| --- | --- |
| pnpm start | node dist/app/server.js |
| pnpm start:worker | node dist/app/worker.js |
| pnpm migrate | tsx src/scripts/migrate.ts |
| pnpm seed:permissions | tsx src/seeds/permissions.seed.ts |
| pnpm seed:plans | tsx src/seeds/plans.seed.ts |
| pnpm seed:settings | tsx src/seeds/settings.seed.ts |
| pnpm seed:super-admin | tsx src/seeds/superAdmin.seed.ts |
| pnpm seed:all | tsx src/scripts/seed.ts |

### Utilities

| Command | Description |
| --- | --- |
| pnpm export:openapi | echo OpenAPI export available at /docs/openAPI.json |
| pnpm export:postman | echo Postman export available at /docs/postman-collection.json |

---

## Database

**Collections:**
- Users (reader accounts)
- Staff (admin/manager accounts)
- Books (content catalog)
- Subscriptions (active subscriptions)
- Payments (transaction records)
- ReadingProgress (user activity)
- Notifications (user messages)
- Reports (generated outputs)
- AuditLog (administrative events)

**Indexes:** All critical fields indexed. TTL indexes auto-expire tokens (1hr password reset, 24hr email verification).

---

## API Documentation

**Interactive Docs:** http://localhost:5000/api/docs
- 170+ endpoints
- Try-it-out interface
- Code snippets (cURL, JS, Python)
- Full search

**Postman Collection:** docs/postman-collection.json

---

## Testing

```bash
pnpm test               # Run all tests
pnpm test:watch        # Watch mode
pnpm test:unit         # Unit tests only
pnpm test:integration  # Integration tests
pnpm test -- --coverage
```

---

## Performance

### Database Optimization

- Use indexes on frequently queried fields
- Implement pagination for large datasets
- Use `.lean()` for read-only queries
- Use field projection to limit data transfer
- Add full-text search indexes for text fields

### Caching Strategy

- Redis for session and frequently accessed data
- HTTP caching headers for static resources
- Query result caching for expensive operations
- TTL-based auto-expiration

### Rate Limiting

- Auth endpoints: 60 req/min per IP
- API endpoints: 200 req/15min per user
- Payment webhooks: 1000 req/min

---

## Security

### Authentication

- JWT tokens for user sessions (24hr expiry)
- Staff 2FA with TOTP apps
- OAuth integration (Google, Facebook)
- Token refresh mechanism

### Data Protection

- Passwords hashed with Bcrypt (12 rounds)
- Sensitive fields encrypted at rest
- No credentials in logs or responses
- Environment variables for all secrets

### API Security

- CORS restricted to whitelisted origins
- Input validation with Zod
- No raw SQL/NoSQL queries
- Rate limiting on all endpoints
- Security headers (CSP, X-Frame-Options, etc.)

### Compliance

- PII encrypted
- Audit logging for admin actions
- GDPR compliance framework
- Payment PCI DSS standards

---

## Deployment

### Environment Setup

Set required environment variables:
- `MONGODB_URI` - Database connection
- `JWT_USER_SECRET` - Token signing (48+ chars)
- `JWT_STAFF_SECRET` - Staff token key
- `GMAIL_USER` / `GMAIL_PASS` - Email SMTP
- Payment keys: STRIPE_SECRET_KEY, PAYPAL_CLIENT_ID, etc.

### Docker Deployment

```bash
docker compose up --build -d
```

### PM2 Production

```bash
pnpm build
pm2 start ecosystem.config.cjs --env production
```

### Pre-deployment Checks

- All tests pass: `pnpm test`
- Type checking clean: `pnpm typecheck`
- Build successful: `pnpm build`
- Environment variables configured
- Database backups enabled
- Monitoring configured

---

## Troubleshooting

**MongoDB Connection:** Verify MONGODB_URI, check MongoDB Atlas IP whitelist
**Port in Use:** Kill existing process or use different port: PORT=8000 pnpm dev
**Worker Not Running:** Ensure WORKER_ENABLED=true, check logs
**Type Errors:** Run pnpm typecheck, fix errors
**Validation Errors:** Check request format against Zod schemas

---

## FAQ

**Q: How do I add a new API endpoint?**
A: Create route in module router.ts, implement controller handler, add Zod validation, import router in routes.ts.

**Q: How does authentication work?**
A: Users get JWT token on login (24hr expiry). Token included in Authorization header. Server validates signature and expiry.

**Q: How do I handle file uploads?**
A: Use Cloudinary integration. Client uploads → controller → service → Cloudinary → URL stored in DB.

**Q: Why are queries slow?**
A: Check .explain() output, ensure indexes exist, use projection, add pagination, consider caching.

**Q: How do permissions work?**
A: RBAC system with 30+ permissions. Auto-generated from route definitions. Use @requirePermission decorator.

**Q: How do I run background jobs?**
A: Add .job.ts file in src/jobs/, register in jobs/index.ts, backend worker process executes on schedule.

**Q: How do I add a payment gateway?**
A: Create payment processor in src/modules/payments/, implement webhook handlers, add to payment service.

---

## Contributing

**Code Standards:**
- TypeScript strict mode
- Zod schemas for all inputs
- Services for business logic
- Comprehensive error handling
- Unit + integration tests

**Workflow:**
1. Create feature branch
2. Make changes and test locally
3. Run `pnpm typecheck` and `pnpm test`
4. Commit with conventional format: `feat(module): description`
5. Push and open PR

---

## Resources

- **API Reference:** http://localhost:5000/api/docs
- **Repository:** https://github.com/mdnuruzzamannirob/stackread-backend
- **Issues:** Report bugs or request features on GitHub

---

**Last Generated:** 3/24/2026, 7:48:38 PM

Built with ❤️ using Node.js • Express • TypeScript • MongoDB
