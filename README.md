# Stackread Backend

![Node.js](https://img.shields.io/badge/Node.js-22.x-339933?logo=node.js&logoColor=white)
![Express](https://img.shields.io/badge/Express-5.1.0-000000?logo=express&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5.8.2-3178C6?logo=typescript&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-7+-47A248?logo=mongodb&logoColor=white)
![Mongoose](https://img.shields.io/badge/Mongoose-8.13.0-880000?logo=mongoose&logoColor=white)
![pnpm](https://img.shields.io/badge/pnpm-10.30.2-F69220?logo=pnpm&logoColor=white)
![Vitest](https://img.shields.io/badge/Vitest-4.1.0-6E9F18?logo=vitest&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-ready-2496ED?logo=docker&logoColor=white)

## 1. 🚀 Project Overview

**Project Name:** Stackread
**Type:** Library Management System (LMS) backend API (modular monolith)

Stackread is a production-focused LMS backend built with Node.js, Express, TypeScript, and MongoDB. It powers user authentication, staff/admin operations, catalog management, subscriptions, payments, reading workflows, notifications, search, reporting, and operational observability.

The project follows a **modular monolithic architecture** with:

- Strictly separated domain modules (25 modules)
- Shared infrastructure under common/config
- Dedicated API process and worker process
- Built-in scheduling and background processing

## 2. ✨ Features

### Complete Feature List by Module (25 modules)

1. **auth** - User registration, login, social OAuth, password reset, profile and login history.
2. **staff-auth** - Staff login/invite acceptance/logout and 2FA lifecycle.
3. **onboarding** - Plan selection and onboarding completion flow.
4. **authors** - Author CRUD and catalog author management.
5. **categories** - Category CRUD and taxonomy organization.
6. **plans** - Subscription plan listing and plan administration.
7. **subscriptions** - User subscription lifecycle (renew/upgrade/downgrade/cancel).
8. **books** - Public catalog + admin book management, availability, featured flags, file metadata.
9. **reading** - Reading progress, sessions, bookmarks, highlights, history.
10. **borrows** - Borrow initiation, returns, and borrow state management.
11. **reservations** - Reservation queue and claim-expiry lifecycle.
12. **wishlist** - Save/remove books and retrieve wishlist.
13. **reviews** - Book review CRUD and admin moderation toggle.
14. **payments** - Payment initiation/verification/refund and gateway webhooks.
15. **promotions** - Coupon and flash-sale management and validation.
16. **search** - Search, suggestions, history, popular terms and click logging.
17. **dashboard** - User dashboard metrics, recommendations, and library snapshot.
18. **notifications** - In-app notifications, unread count, read status, bulk send.
19. **rbac** - Permission and role management.
20. **staff** - Staff invitation, role updates, suspension, activity views.
21. **members** - Admin member lookup, payments/history, suspension controls.
22. **audit** - Administrative audit/event logging and export.
23. **reports** - Report job queueing, processing, and downloadable report artifacts.
24. **settings** - System/global settings and maintenance configuration.
25. **health** - Liveness/readiness/status endpoints for uptime and monitoring.

## 3. 🧰 Tech Stack

### Runtime, Framework, and Platform

| Technology |            Version | Why it was chosen                                                  |
| ---------- | -----------------: | ------------------------------------------------------------------ |
| Node.js    | 22.x (Docker base) | Modern runtime with native fetch and strong ecosystem support.     |
| Express    |              5.1.0 | Stable, minimal web framework with mature middleware support.      |
| TypeScript |              5.8.2 | Strict typing for large modular codebases and safer refactoring.   |
| MongoDB    |                 7+ | Flexible document model for rapidly evolving LMS domains.          |
| Mongoose   |             8.13.0 | Schema modeling, indexes, middleware, and robust query ergonomics. |
| pnpm       |            10.30.2 | Fast, deterministic and workspace-friendly package management.     |

### Security, Auth, Validation

| Technology              | Version | Why it was chosen                                          |
| ----------------------- | ------: | ---------------------------------------------------------- |
| jsonwebtoken            |   9.0.2 | JWT-based access control for user and staff token domains. |
| passport                |   0.7.0 | Pluggable authentication strategy framework.               |
| passport-google-oauth20 |   2.0.0 | Google social login support.                               |
| passport-facebook       |   3.0.0 | Facebook social login support.                             |
| speakeasy               |   2.0.0 | TOTP-based staff two-factor authentication.                |
| zod                     |  3.24.2 | Runtime validation and schema-first request validation.    |
| zod-validation-error    |   3.5.3 | Clean, user-friendly validation error messages.            |
| helmet                  |   8.1.0 | Secure default HTTP headers.                               |
| cors                    |   2.8.5 | Controlled cross-origin API access.                        |
| express-rate-limit      |   7.5.0 | Abuse protection and route-group throttling.               |
| express-mongo-sanitize  |   2.2.0 | Mitigates MongoDB operator injection payloads.             |

### Payments and Integrations

| Technology                  | Version | Why it was chosen                                                 |
| --------------------------- | ------: | ----------------------------------------------------------------- |
| sslcommerz-lts              |   1.2.0 | Bangladesh-friendly gateway aggregation (bKash/Nagad card rails). |
| stripe                      |  20.4.1 | Global card and billing support.                                  |
| @paypal/checkout-server-sdk |   1.0.3 | PayPal checkout for international transactions.                   |
| cloudinary                  |   2.7.0 | Media/file asset storage abstraction support.                     |
| nodemailer                  |   7.0.7 | SMTP-based outbound email infrastructure.                         |
| firebase-admin              |  13.5.0 | Push notification delivery integration.                           |

### Operations and Quality

| Technology                |                   Version | Why it was chosen                                      |
| ------------------------- | ------------------------: | ------------------------------------------------------ |
| winston                   |                    3.17.0 | Structured application logging.                        |
| winston-daily-rotate-file |                     5.0.0 | Log rotation and retention management.                 |
| morgan                    |                    1.10.0 | HTTP access logs with request timing integration.      |
| node-cron                 |                     4.2.1 | Lightweight recurring job scheduling.                  |
| vitest                    |                     4.1.0 | Fast TypeScript-friendly unit and integration testing. |
| supertest                 |                     7.2.2 | HTTP integration testing for Express routes.           |
| tsx                       |                    4.19.0 | Zero-config TypeScript execution in dev scripts.       |
| Docker                    |               Compose 3.9 | Reproducible containerized local/prod runtime.         |
| PM2                       | ecosystem config included | Multi-process production process management.           |

## 4. 🏗️ Architecture

### Modular Monolithic Architecture

Stackread is a **single deployable backend** organized into domain modules. Each module encapsulates routing, validation, service logic, and persistence, while shared infrastructure (auth middleware, error handling, logger, utils) is centralized in common/config.

Benefits:

- Strong domain boundaries without microservice complexity
- Easier local development and transactional consistency
- Centralized observability, auth, and config governance
- Clear path to service extraction later if needed

### Folder Structure (Tree)

```text
.
├─ src/
│  ├─ app/
│  │  ├─ app.ts
│  │  ├─ routes.ts
│  │  ├─ server.ts
│  │  └─ worker.ts
│  ├─ common/
│  │  ├─ errors/
│  │  ├─ interfaces/
│  │  ├─ middlewares/
│  │  ├─ services/
│  │  ├─ utils/
│  │  └─ validators/
│  ├─ config/
│  ├─ jobs/
│  ├─ modules/
│  │  ├─ auth/
│  │  ├─ staff-auth/
│  │  ├─ onboarding/
│  │  ├─ authors/
│  │  ├─ categories/
│  │  ├─ plans/
│  │  ├─ subscriptions/
│  │  ├─ books/
│  │  ├─ reading/
│  │  ├─ borrows/
│  │  ├─ reservations/
│  │  ├─ wishlist/
│  │  ├─ reviews/
│  │  ├─ payments/
│  │  ├─ promotions/
│  │  ├─ search/
│  │  ├─ dashboard/
│  │  ├─ notifications/
│  │  ├─ rbac/
│  │  ├─ staff/
│  │  ├─ members/
│  │  ├─ audit/
│  │  ├─ reports/
│  │  ├─ settings/
│  │  └─ health/
│  ├─ scripts/
│  ├─ seeds/
│  ├─ types/
│  └─ workers/
├─ documentation/
├─ tests/
├─ Dockerfile
├─ docker-compose.yml
└─ ecosystem.config.cjs
```

### Module Structure Pattern

Each module follows a predictable shape (with slight naming variants for legacy modules):

```text
module-name/
├─ router.ts (or auth.router.ts / health.router.ts)
├─ controller.ts
├─ service.ts
├─ model.ts
├─ validation.ts
├─ interface.ts
└─ index.ts
```

### API and Worker Process Separation

- **API process**: Handles HTTP requests, auth, validation, responses, and route dispatch.
- **Worker process**: Runs background jobs, cron schedules, retries, and async processing.

This separation prevents long-running tasks from affecting request latency and improves production resilience.

## 5. ✅ Prerequisites

- **Node.js**: `>=22` (recommended `22.x`)
- **MongoDB**: `>=7`
- **pnpm**: `10.30.2` (or compatible `10.x`)

## 6. 🏁 Getting Started

### 1) Clone repository

```bash
git clone https://github.com/mdnuruzzamannirob/lms-project.git
cd lms-project
```

### 2) Install dependencies

```bash
pnpm install
```

### 3) Environment setup (`.env.example` -> `.env`)

**Linux/macOS**

```bash
cp .env.example .env
```

**Windows PowerShell**

```powershell
Copy-Item .env.example .env
```

### 4) Generate strong JWT and session secrets

```bash
node -e "const c=require('crypto'); console.log('JWT_USER_SECRET='+c.randomBytes(48).toString('hex')); console.log('JWT_STAFF_SECRET='+c.randomBytes(48).toString('hex')); console.log('SESSION_SECRET='+c.randomBytes(48).toString('hex'));"
```

Copy generated values into your `.env`.

### 5) Run seeds

```bash
pnpm seed:all
```

Or run all from script entrypoint:

```bash
pnpm seed
```

### 6) Start development API server

```bash
pnpm dev
```

### 7) Start worker process (separate terminal)

```bash
pnpm dev:worker
```

## 7. 🔐 Environment Variables

> All variables below come from `.env.example` and are validated in runtime config.

### Runtime

| Variable      | Required | Example       | Description                                         |
| ------------- | -------- | ------------- | --------------------------------------------------- |
| `NODE_ENV`    | Optional | `development` | Runtime mode (`development`, `test`, `production`). |
| `PORT`        | Optional | `5000`        | API server port.                                    |
| `API_VERSION` | Optional | `v1`          | API version prefix (used in `/api/{version}`).      |

### Database

| Variable      | Required | Example                                               | Description                |
| ------------- | -------- | ----------------------------------------------------- | -------------------------- |
| `MONGODB_URI` | Yes      | `mongodb://127.0.0.1:27017/library-management-system` | MongoDB connection string. |

### HTTP / CORS

| Variable       | Required | Example                                       | Description                                |
| -------------- | -------- | --------------------------------------------- | ------------------------------------------ |
| `CORS_ORIGINS` | Optional | `http://localhost:3000,http://localhost:3001` | Allowed browser origins (comma separated). |

### Logging

| Variable                     | Required | Example | Description                          |
| ---------------------------- | -------- | ------- | ------------------------------------ |
| `LOG_LEVEL`                  | Optional | `info`  | Logger verbosity level.              |
| `LOG_DIR`                    | Optional | `logs`  | Directory where logs are stored.     |
| `LOG_ROTATE_MAX_SIZE`        | Optional | `20m`   | Max size per rotated log file.       |
| `LOG_ROTATE_APP_MAX_FILES`   | Optional | `14d`   | Retention for application log files. |
| `LOG_ROTATE_ERROR_MAX_FILES` | Optional | `30d`   | Retention for error log files.       |
| `LOG_ZIPPED_ARCHIVE`         | Optional | `true`  | Compress rotated logs.               |

### Rate Limiting

| Variable                 | Required | Example  | Description                               |
| ------------------------ | -------- | -------- | ----------------------------------------- |
| `RATE_LIMIT_WINDOW_MS`   | Optional | `900000` | Global rate-limit window in milliseconds. |
| `RATE_LIMIT_MAX`         | Optional | `200`    | Global max requests per window.           |
| `AUTH_RATE_LIMIT_MAX`    | Optional | `60`     | Max requests for auth routes.             |
| `ADMIN_RATE_LIMIT_MAX`   | Optional | `120`    | Max requests for admin routes.            |
| `SEARCH_RATE_LIMIT_MAX`  | Optional | `180`    | Max requests for search routes.           |
| `WEBHOOK_RATE_LIMIT_MAX` | Optional | `1000`   | Max requests for payment webhooks.        |
| `REPORT_RATE_LIMIT_MAX`  | Optional | `80`     | Max requests for report endpoints.        |

### JWT / Session / Crypto

| Variable                 | Required | Example                      | Description                    |
| ------------------------ | -------- | ---------------------------- | ------------------------------ |
| `JWT_USER_SECRET`        | Yes      | `change-this-user-secret`    | Signing secret for user JWTs.  |
| `JWT_STAFF_SECRET`       | Yes      | `change-this-staff-secret`   | Signing secret for staff JWTs. |
| `JWT_ACCESS_EXPIRES_IN`  | Optional | `1d`                         | Access token TTL.              |
| `JWT_REFRESH_EXPIRES_IN` | Optional | `30d`                        | Refresh token TTL.             |
| `JWT_ISSUER`             | Optional | `lms-backend`                | JWT issuer claim value.        |
| `BCRYPT_SALT_ROUNDS`     | Optional | `12`                         | Password hash cost factor.     |
| `SESSION_SECRET`         | Optional | `change-this-session-secret` | Session signing secret.        |

### OAuth and 2FA

| Variable                | Required | Example                                               | Description                 |
| ----------------------- | -------- | ----------------------------------------------------- | --------------------------- |
| `GOOGLE_CLIENT_ID`      | Optional | ``                                                    | Google OAuth client ID.     |
| `GOOGLE_CLIENT_SECRET`  | Optional | ``                                                    | Google OAuth client secret. |
| `GOOGLE_CALLBACK_URL`   | Optional | `http://localhost:5000/api/v1/auth/google/callback`   | Google OAuth callback URL.  |
| `FACEBOOK_APP_ID`       | Optional | ``                                                    | Facebook app ID.            |
| `FACEBOOK_APP_SECRET`   | Optional | ``                                                    | Facebook app secret.        |
| `FACEBOOK_CALLBACK_URL` | Optional | `http://localhost:5000/api/v1/auth/facebook/callback` | Facebook callback URL.      |
| `TWO_FACTOR_ISSUER`     | Optional | `LMS-Staff`                                           | TOTP issuer for staff 2FA.  |

### Email Provider

| Variable             | Required                 | Example               | Description                        |
| -------------------- | ------------------------ | --------------------- | ---------------------------------- |
| `GMAIL_USER`         | Optional (Prod required) | ``                    | SMTP username for outbound emails. |
| `GMAIL_APP_PASSWORD` | Optional (Prod required) | ``                    | SMTP app password/token.           |
| `EMAIL_FROM`         | Optional                 | `noreply@example.com` | Default sender address.            |

### Push Provider (Firebase)

| Variable                | Required                 | Example | Description                            |
| ----------------------- | ------------------------ | ------- | -------------------------------------- |
| `FIREBASE_PROJECT_ID`   | Optional (Prod required) | ``      | Firebase project ID.                   |
| `FIREBASE_CLIENT_EMAIL` | Optional (Prod required) | ``      | Firebase service account client email. |
| `FIREBASE_PRIVATE_KEY`  | Optional (Prod required) | ``      | Firebase service account private key.  |

### Storage Provider (Cloudinary)

| Variable                | Required                 | Example | Description            |
| ----------------------- | ------------------------ | ------- | ---------------------- |
| `CLOUDINARY_CLOUD_NAME` | Optional (Prod required) | ``      | Cloudinary cloud name. |
| `CLOUDINARY_API_KEY`    | Optional (Prod required) | ``      | Cloudinary API key.    |
| `CLOUDINARY_API_SECRET` | Optional (Prod required) | ``      | Cloudinary API secret. |

### Payments

| Variable                    | Required                 | Example   | Description                               |
| --------------------------- | ------------------------ | --------- | ----------------------------------------- |
| `SSLCOMMERZ_STORE_ID`       | Optional (Prod required) | ``        | SSLCommerz store ID.                      |
| `SSLCOMMERZ_STORE_PASSWORD` | Optional (Prod required) | ``        | SSLCommerz store password.                |
| `SSLCOMMERZ_IS_LIVE`        | Optional                 | `false`   | Toggle SSLCommerz sandbox/live mode.      |
| `STRIPE_SECRET_KEY`         | Optional (Prod required) | ``        | Stripe secret key.                        |
| `STRIPE_WEBHOOK_SECRET`     | Optional (Prod required) | ``        | Stripe webhook signature secret.          |
| `PAYPAL_CLIENT_ID`          | Optional (Prod required) | ``        | PayPal client ID.                         |
| `PAYPAL_CLIENT_SECRET`      | Optional (Prod required) | ``        | PayPal client secret.                     |
| `PAYPAL_MODE`               | Optional                 | `sandbox` | PayPal environment (`sandbox` or `live`). |
| `PAYPAL_WEBHOOK_ID`         | Optional                 | ``        | PayPal webhook ID for verification.       |

### URLs

| Variable           | Required | Example                 | Description         |
| ------------------ | -------- | ----------------------- | ------------------- |
| `FRONTEND_URL`     | Optional | `http://localhost:3000` | Frontend base URL.  |
| `BACKEND_URL`      | Optional | `http://localhost:5000` | Backend public URL. |
| `STAFF_PORTAL_URL` | Optional | `http://localhost:3001` | Staff portal URL.   |

### Super Admin Bootstrap

| Variable               | Required | Example                | Description                       |
| ---------------------- | -------- | ---------------------- | --------------------------------- |
| `SUPER_ADMIN_NAME`     | Optional | `Super Admin`          | Initial super-admin display name. |
| `SUPER_ADMIN_EMAIL`    | Optional | `admin@example.com`    | Initial super-admin login email.  |
| `SUPER_ADMIN_PASSWORD` | Optional | `change-this-password` | Initial super-admin password.     |

### Worker / Jobs

| Variable                  | Required | Example | Description                              |
| ------------------------- | -------- | ------- | ---------------------------------------- |
| `WORKER_ENABLED`          | Optional | `true`  | Enables/disables worker process startup. |
| `WORKER_POLL_INTERVAL_MS` | Optional | `30000` | Worker scheduler tick interval.          |
| `JOB_RETRY_LIMIT`         | Optional | `3`     | Retry attempts for background tasks.     |
| `JOB_RETRY_BACKOFF_MS`    | Optional | `500`   | Retry backoff base milliseconds.         |
| `SHUTDOWN_TIMEOUT_MS`     | Optional | `20000` | Graceful shutdown timeout window.        |

### Domain Defaults

| Variable                   | Required | Example      | Description                        |
| -------------------------- | -------- | ------------ | ---------------------------------- |
| `REPORT_DOWNLOAD_TTL_DAYS` | Optional | `7`          | Report artifact retention in days. |
| `DEFAULT_TIMEZONE`         | Optional | `Asia/Dhaka` | System default timezone.           |
| `DEFAULT_CURRENCY`         | Optional | `BDT`        | System default currency code.      |
| `DEFAULT_LANGUAGE`         | Optional | `en`         | System default language.           |

## 8. 📚 API Documentation

### OpenAPI

- File: `documentation/OpenAPI_v1.json`
- Rebuild command: `pnpm docs:rebuild`
- Recommended viewer: Swagger Editor (import file) or Stoplight Studio

### Postman Collection

- File: `documentation/Postman_Collection_v1.json`
- Import into Postman and set collection variables:
  - `baseUrl` (default: `http://localhost:5000`)
  - `userToken`
  - `staffToken`

### Base URL

```text
http://localhost:5000/api/v1
```

### Authentication

- Protected endpoints require **Bearer token** in `Authorization` header.
- User and staff tokens are separated at auth boundaries.
- Postman collection contains token capture and prerequest checks.

### Standard Response Format

```json
{
  "success": true,
  "message": "Operation successful",
  "data": {},
  "meta": {}
}
```

## 9. 🧪 Available Scripts

| Script             | Command                               | Description                          |
| ------------------ | ------------------------------------- | ------------------------------------ |
| `dev`              | `tsx watch src/app/server.ts`         | Start API server in watch mode.      |
| `dev:worker`       | `tsx watch src/app/worker.ts`         | Start worker process in watch mode.  |
| `build`            | `tsc -p tsconfig.json`                | Compile TypeScript to `dist`.        |
| `start`            | `node dist/app/server.js`             | Start compiled API server.           |
| `start:worker`     | `node dist/app/worker.js`             | Start compiled worker process.       |
| `typecheck`        | `tsc --noEmit`                        | Run strict type checking only.       |
| `test`             | `vitest run`                          | Run all tests once.                  |
| `test:watch`       | `vitest`                              | Run tests in watch mode.             |
| `test:integration` | `vitest run tests/integration`        | Run integration test suite.          |
| `test:unit`        | `vitest run tests/unit`               | Run unit test suite.                 |
| `seed:permissions` | `tsx src/seeds/permissions.seed.ts`   | Seed RBAC permissions.               |
| `seed:plans`       | `tsx src/seeds/plans.seed.ts`         | Seed subscription plans.             |
| `seed:settings`    | `tsx src/seeds/settings.seed.ts`      | Seed global settings defaults.       |
| `seed:super-admin` | `tsx src/seeds/superAdmin.seed.ts`    | Seed super-admin account.            |
| `seed:all`         | `tsx src/seeds/all.seed.ts`           | Run all individual seeds.            |
| `seed`             | `tsx src/scripts/seed.ts`             | Run seed runner script entrypoint.   |
| `migrate`          | `tsx src/scripts/migrate.ts`          | Execute migration script.            |
| `docs:rebuild`     | `tsx src/scripts/rebuild-api-docs.ts` | Regenerate OpenAPI and Postman docs. |
| `export:openapi`   | `echo .../OpenAPI_v1.json`            | Print OpenAPI export path.           |
| `export:postman`   | `echo .../Postman_Collection_v1.json` | Print Postman export path.           |

## 10. 🧩 Module Overview

| Module          | Description                                          | Key routes                                                                                               |
| --------------- | ---------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| `auth`          | User auth and account lifecycle                      | `POST /auth/register`, `POST /auth/login`, `GET /auth/me`                                                |
| `staff-auth`    | Staff auth and 2FA flows                             | `POST /staff/login`, `POST /staff/2fa/verify`, `GET /staff/me`                                           |
| `onboarding`    | New user onboarding and plan selection               | `GET /onboarding/plans`, `POST /onboarding/select`, `POST /onboarding/complete`                          |
| `authors`       | Author catalog records                               | `GET /authors`, `POST /authors`, `PUT /authors/{id}`                                                     |
| `categories`    | Category taxonomy and CRUD                           | `GET /categories`, `POST /categories`, `DELETE /categories/{id}`                                         |
| `plans`         | Public/admin subscription plans                      | `GET /plans`, `POST /plans`, `PATCH /plans/{id}/toggle`                                                  |
| `subscriptions` | Subscription lifecycle and admin controls            | `GET /subscriptions/my`, `PATCH /subscriptions/my/renew`, `PATCH /subscriptions/{id}`                    |
| `books`         | Book catalog + admin content/file management         | `GET /books`, `POST /admin/books`, `POST /admin/books/{id}/files`                                        |
| `reading`       | Reading progress, sessions, bookmarks, highlights    | `POST /reading/{bookId}/start`, `PATCH /reading/{bookId}/progress`, `POST /books/{bookId}/bookmarks`     |
| `borrows`       | Borrow request/return and state updates              | `POST /borrows`, `POST /borrows/{id}/return`, `GET /borrows/my`                                          |
| `reservations`  | Reservation queue and claim windows                  | `POST /reservations`, `PATCH /reservations/{id}`, `GET /reservations/my`                                 |
| `wishlist`      | User saved book list                                 | `GET /wishlist`, `POST /wishlist/{bookId}`, `DELETE /wishlist/{bookId}`                                  |
| `reviews`       | Reviews and admin moderation                         | `POST /books/{bookId}/reviews`, `PATCH /books/{bookId}/reviews/{id}`, `PATCH /admin/reviews/{id}/toggle` |
| `payments`      | Payment execution, verification, refund and webhooks | `POST /payments/initiate`, `POST /payments/verify`, `POST /webhooks/{gateway}`                           |
| `promotions`    | Coupons and flash sales                              | `POST /coupons/validate`, `POST /coupons`, `PATCH /flash-sales/{id}/toggle`                              |
| `search`        | Search UX and analytics logging                      | `GET /search`, `GET /search/suggestions`, `POST /search/log-click`                                       |
| `dashboard`     | User dashboard metrics                               | `GET /dashboard`, `GET /dashboard/stats`, `GET /dashboard/recommendations`                               |
| `notifications` | In-app and bulk notifications                        | `GET /notifications`, `PATCH /notifications/{id}/read`, `POST /notifications/bulk-send`                  |
| `rbac`          | Permission and role administration                   | `GET /admin/permissions`, `POST /admin/roles`, `PUT /admin/roles/{id}`                                   |
| `staff`         | Staff account management                             | `POST /admin/staff/invite`, `PATCH /admin/staff/{id}/role`, `GET /admin/staff/{id}/activity`             |
| `members`       | Member administration and insight                    | `GET /admin/members`, `GET /admin/members/{userId}/payments`, `PATCH /admin/members/{userId}/suspend`    |
| `audit`         | Audit/event logs and export                          | `GET /admin/audit/logs`, `GET /admin/audit/logs/export`, `POST /admin/audit/activity`                    |
| `reports`       | Async report jobs and artifacts                      | `POST /admin/reports`, `GET /admin/reports/{reportId}`, `GET /admin/reports/{reportId}/download`         |
| `settings`      | Global/system settings                               | `GET /admin/settings`, `PUT /admin/settings`, `GET /admin/settings/maintenance`                          |
| `health`        | Service liveness and readiness                       | `GET /health`, `GET /health/live`, `GET /health/ready`                                                   |

## 11. 💳 Payment Gateways

Stackread uses a payment provider abstraction that supports country-appropriate gateways.

### Gateways

- **SSLCommerz (Bangladesh)** - optimized for BD market rails and local methods (including bKash/Nagad ecosystem compatibility).
- **Stripe (International)** - global card processing and modern payment APIs.
- **PayPal (International)** - alternative cross-border checkout option.

### Country-based Gateway Selection

Typical strategy:

1. Use user profile `countryCode` and checkout currency.
2. Route Bangladesh (`BD`) users to SSLCommerz-first flow.
3. Route non-BD users to Stripe/PayPal options.
4. Keep fallback logic for provider outage or compliance exceptions.

This keeps checkout localized while preserving a single API contract.

## 12. 🗄️ Database

### MongoDB + Mongoose

- MongoDB is the primary datastore.
- Mongoose schemas define domain constraints, indexes, references, and model-level behavior.

### Collections (Model-backed)

- `User`
- `UserEmailVerificationToken`
- `UserPasswordResetToken`
- `UserLoginHistory`
- `Staff`
- `StaffInviteToken`
- `StaffActivityLog`
- `StaffTwoFactorChallenge`
- `Permission`
- `Role`
- `Plan`
- `Subscription`
- `Payment`
- `WebhookLog`
- `Coupon`
- `FlashSale`
- `CouponUsage`
- `Author`
- `Category`
- `Book`
- `ReadingProgress`
- `ReadingSession`
- `Bookmark`
- `Highlight`
- `Borrow`
- `Reservation`
- `Wishlist`
- `Review`
- `Notification`
- `SearchLog`
- `AuditLog`
- `ReportJob`
- `ReportArtifact`
- `Settings`
- `Onboarding`

### TTL Indexes (Automatic Expiry)

TTL indexes are used to automatically purge temporary/expirable data:

- Email verification tokens (`UserEmailVerificationToken.expiresAt`)
- Password reset tokens (`UserPasswordResetToken.expiresAt`)
- Staff invite tokens (`StaffInviteToken.expiresAt`)
- Staff 2FA challenges (`StaffTwoFactorChallenge.expiresAt`)
- Audit logs (`AuditLog.expiresAt`)
- Report artifacts (`ReportArtifact.expiresAt`)

Benefits:

- Lower storage overhead for ephemeral security artifacts
- Less manual cleanup logic
- Better compliance hygiene for time-bound data

## 13. ⚙️ Workers and Jobs

### Background Workers

| Worker                    | Description                                                               |
| ------------------------- | ------------------------------------------------------------------------- |
| `worker.report-generator` | Pulls queued report jobs and generates report artifacts with retry logic. |
| `worker.notification`     | Marks pending notifications as delivered in background flow.              |
| `worker.subscription`     | Expires subscriptions that passed end date.                               |
| `worker.borrow-expiry`    | Marks overdue borrows after due date.                                     |
| `worker.reservation`      | Expires unclaimed claimable reservations and clears claim metadata.       |
| `worker-heartbeat`        | Periodic worker heartbeat audit event for observability.                  |

### Scheduled Cron Jobs

| Job name                       | Schedule       | Description                                            |
| ------------------------------ | -------------- | ------------------------------------------------------ |
| `job.renewal-reminders`        | `0 */6 * * *`  | Sends reminders for subscriptions renewing in ~3 days. |
| `job.birthday-coupons`         | `0 2 * * *`    | Generates birthday-week coupons for matching users.    |
| `job.borrow-expiry-reminders`  | `0 */4 * * *`  | Notifies users about borrows due within 24 hours.      |
| `job.reservation-claim-expiry` | `*/30 * * * *` | Expires claimable reservations past claim window.      |
| `job.report-scheduling`        | `*/10 * * * *` | Processes queued report jobs in periodic batches.      |

## 14. 🧪 Testing

### Run tests

```bash
pnpm test
```

### Run specific test types

```bash
pnpm test:unit
pnpm test:integration
pnpm test:watch
```

### Test types used

- **Unit tests**: Isolated service/helper logic checks.
- **Integration tests**: API/module interactions with realistic data flow.

Test folders:

- `tests/unit`
- `tests/integration`
- `tests/fixtures`
- `tests/setup`

## 15. 🚢 Deployment

### Docker setup

Build and run full stack:

```bash
docker compose up --build
```

Services:

- `lms-api` - API process (`dist/app/server.js`)
- `lms-worker` - Worker process (`dist/app/worker.js`)
- `mongo` - MongoDB 7 with persistent volume

### PM2 setup

```bash
pnpm build
pm2 start ecosystem.config.cjs
pm2 status
pm2 logs
```

PM2 apps:

- `lms-api` (cluster mode, max instances)
- `lms-worker` (single fork)

### Production environment checklist

- [ ] `NODE_ENV=production`
- [ ] Strong values for `JWT_USER_SECRET`, `JWT_STAFF_SECRET`, `SESSION_SECRET`
- [ ] Replace default `SUPER_ADMIN_PASSWORD`
- [ ] Configure SMTP (`GMAIL_USER`, `GMAIL_APP_PASSWORD`)
- [ ] Configure Firebase push credentials
- [ ] Configure Cloudinary credentials
- [ ] Configure SSLCommerz, Stripe, and PayPal credentials
- [ ] Restrict `CORS_ORIGINS` to real domains
- [ ] Enable log retention/rotation strategy
- [ ] Run `pnpm typecheck && pnpm test`
- [ ] Run `pnpm docs:rebuild` before release if APIs changed

## 16. 🤝 Contributing

### Code style

- Use strict TypeScript patterns and explicit types for public APIs.
- Follow module boundaries (no cross-module leakage of internals).
- Prefer schema-first validation for request contracts.
- Keep controllers thin; move business logic to services.
- Add tests for changed behavior (unit/integration as appropriate).

### Commit message format

Recommended conventional style:

```text
type(scope): short summary
```

Examples:

```text
feat(payments): add paypal webhook signature verification
fix(reading): prevent progress regression on stale client updates
docs(readme): expand env variable matrix and deployment checklist
```

---

Built for production-grade LMS operations with modular clarity, worker-backed reliability, and API-first integration readiness.
