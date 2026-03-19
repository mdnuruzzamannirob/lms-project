## Plan: LMS Backend Modular Monolith

Build the backend as a strict TypeScript modular monolith on Node.js + Express + Mongoose, using the attached docs as source of truth and normalizing a few documented inconsistencies. The recommended shape is domain-first modules with shared infrastructure, separate API and worker processes from day one, user auth and staff auth separated at the route/token layer, and Super Admin implemented as a privileged staff role. Bangladesh payments should be abstracted through a payment provider layer that can back bKash/Nagad via SSLCommerz while preserving the route intent from the REST design.

**Steps**

1. Phase 1, foundation: scaffold the app, strict TypeScript config, Express bootstrap, config validation, logging, request tracing, security middleware, unified API response helpers, AppError/global error handling, async wrapper, health endpoint, DB connection, graceful shutdown, and API versioning. This blocks all other phases.
2. Phase 2, platform primitives: implement shared auth/token utilities, password hashing, RBAC middleware, pagination/query helpers, base repository/service helpers, Zod request validation wrapper, file upload abstraction, notification channel abstraction, payment provider abstraction, audit logging hooks, and worker process bootstrap. This depends on step 1.
3. Phase 3, identity and access: implement auth, staff-auth, onboarding, rbac, and staff modules first because most protected routes depend on them. This depends on step 2.
4. Phase 4, commercial core: implement plans, subscriptions, payments, and promotions after identity so onboarding, checkout, upgrades, renewals, refunds, coupons, and flash sales work end to end. This depends on step 3.
5. Phase 5, catalog core: implement authors, categories, and books, including admin book management, featured books, availability toggles, text search indexing, and file metadata. This depends on step 2 and can run in parallel with step 4 after step 3 if separate engineers work on it.
6. Phase 6, reading and circulation: implement reading, borrows, reservations, wishlist, and reviews after catalog and subscriptions because access rules and borrow limits depend on plans, subscriptions, and book/file metadata. This depends on steps 4 and 5.
7. Phase 7, user experience surfaces: implement notifications, search, dashboard, and members after the underlying user, reading, billing, and catalog data is available. This depends on steps 4, 5, and 6.
8. Phase 8, administration and observability: implement audit, reports, settings, admin overview aggregations, scheduled jobs, and report generation worker. This depends on steps 3 through 7.
9. Phase 9, hardening: complete integration tests, seeders, OpenAPI/Postman export if desired, data migration/seed scripts, rate-limit tuning, log rotation policy, background job retry policy, and deployment readiness. This depends on all previous steps.

**Target module list**

- auth: user registration, login, social auth, email verification, password reset, own profile, login history, device tokens.
- staff-auth: staff login, invite acceptance, logout, self profile, password change, 2FA lifecycle.
- onboarding: plan selection flow, onboarding completion, free vs paid redirect logic.
- plans: public/admin plan retrieval and plan management.
- subscriptions: current subscription, history, renew/cancel/upgrade/downgrade, admin adjustments.
- payments: payment initiation, verification, receipts, refunds, webhook processing.
- promotions: coupons, coupon usage, flash sales, birthday/first-purchase discount rules.
- authors: author CRUD and author profile retrieval.
- categories: category tree CRUD and category-based counts.
- books: public catalogue, featured books, preview logic, admin book management, file upload metadata.
- reading: reading progress, reading sessions, bookmarks, highlights, reading history/currently-reading/completed.
- borrows: user borrow actions and staff borrow management.
- reservations: reservation queue lifecycle and staff reservation management.
- wishlist: save/remove books and wishlist retrieval.
- reviews: user reviews and admin review visibility control.
- notifications: in-app notifications, bulk send, delivery logs, unread counts.
- search: search, suggestions, popular terms, search logging.
- dashboard: user dashboard home, stats, recommendations, my-library aggregations.
- members: admin-facing user/member management and user detail/read/payment views.
- rbac: permissions and roles management.
- staff: staff invitation, role assignment, suspension, staff listing/profile/activity.
- audit: staff/admin activity logs and export.
- reports: report job creation, listing, generation tracking, download, worker-facing aggregation services.
- settings: singleton system settings and provider/template configuration.
- health: liveness/readiness, response time metrics, environment/build status.

**Recommended folder structure**

- src/
  - app/
    - app.ts
    - server.ts
    - worker.ts
    - routes.ts
  - config/
    - index.ts
    - env.ts
    - logger.ts
    - db.ts
    - passport.ts
  - common/
    - errors/
      - AppError.ts
      - handleValidationError.ts
      - handleCastError.ts
      - handleDuplicateError.ts
      - globalErrorHandler.ts
    - middlewares/
      - auth.ts
      - requirePermission.ts
      - validateRequest.ts
      - notFound.ts
      - rateLimiter.ts
      - requestContext.ts
      - responseTime.ts
    - utils/
      - catchAsync.ts
      - sendResponse.ts
      - pick.ts
      - pagination.ts
      - queryBuilder.ts
      - crypto.ts
      - token.ts
    - constants/
      - roles.ts
      - permissions.ts
      - notificationTypes.ts
      - plans.ts
      - httpStatus.ts
    - interfaces/
      - apiResponse.ts
      - jwtPayload.ts
      - paginatedResult.ts
    - services/
      - email.service.ts
      - sms.service.ts
      - push.service.ts
      - storage.service.ts
      - payment-provider.service.ts
      - audit.service.ts
      - scheduler.service.ts
    - validators/
      - objectId.ts
      - common.ts
  - modules/
    - auth/
      - auth.router.ts
      - auth.controller.ts
      - auth.service.ts
      - auth.model.ts
      - auth.validation.ts
      - auth.interface.ts
      - auth.constants.ts
      - auth.utils.ts
      - index.ts
    - staff-auth/
      - router.ts
      - controller.ts
      - service.ts
      - model.ts
      - validation.ts
      - interface.ts
      - index.ts
    - onboarding/
      - router.ts
      - controller.ts
      - service.ts
      - model.ts
      - validation.ts
      - interface.ts
      - index.ts
    - plans/
      - router.ts
      - controller.ts
      - service.ts
      - model.ts
      - validation.ts
      - interface.ts
      - index.ts
    - subscriptions/
      - router.ts
      - controller.ts
      - service.ts
      - model.ts
      - validation.ts
      - interface.ts
      - index.ts
    - payments/
      - router.ts
      - controller.ts
      - service.ts
      - model.ts
      - validation.ts
      - interface.ts
      - index.ts
    - promotions/
      - router.ts
      - controller.ts
      - service.ts
      - model.ts
      - validation.ts
      - interface.ts
      - index.ts
    - authors/
      - router.ts
      - controller.ts
      - service.ts
      - model.ts
      - validation.ts
      - interface.ts
      - index.ts
    - categories/
      - router.ts
      - controller.ts
      - service.ts
      - model.ts
      - validation.ts
      - interface.ts
      - index.ts
    - books/
      - router.ts
      - controller.ts
      - service.ts
      - model.ts
      - validation.ts
      - interface.ts
      - index.ts
    - reading/
      - router.ts
      - controller.ts
      - service.ts
      - model.ts
      - validation.ts
      - interface.ts
      - index.ts
    - borrows/
      - router.ts
      - controller.ts
      - service.ts
      - model.ts
      - validation.ts
      - interface.ts
      - index.ts
    - reservations/
      - router.ts
      - controller.ts
      - service.ts
      - model.ts
      - validation.ts
      - interface.ts
      - index.ts
    - wishlist/
      - router.ts
      - controller.ts
      - service.ts
      - model.ts
      - validation.ts
      - interface.ts
      - index.ts
    - reviews/
      - router.ts
      - controller.ts
      - service.ts
      - model.ts
      - validation.ts
      - interface.ts
      - index.ts
    - notifications/
      - router.ts
      - controller.ts
      - service.ts
      - model.ts
      - validation.ts
      - interface.ts
      - index.ts
    - search/
      - router.ts
      - controller.ts
      - service.ts
      - model.ts
      - validation.ts
      - interface.ts
      - index.ts
    - dashboard/
      - router.ts
      - controller.ts
      - service.ts
      - model.ts
      - validation.ts
      - interface.ts
      - index.ts
    - members/
      - router.ts
      - controller.ts
      - service.ts
      - model.ts
      - validation.ts
      - interface.ts
      - index.ts
    - rbac/
      - router.ts
      - controller.ts
      - service.ts
      - model.ts
      - validation.ts
      - interface.ts
      - index.ts
    - staff/
      - router.ts
      - controller.ts
      - service.ts
      - model.ts
      - validation.ts
      - interface.ts
      - index.ts
    - audit/
      - router.ts
      - controller.ts
      - service.ts
      - model.ts
      - validation.ts
      - interface.ts
      - index.ts
    - reports/
      - router.ts
      - controller.ts
      - service.ts
      - model.ts
      - validation.ts
      - interface.ts
      - index.ts
    - settings/
      - router.ts
      - controller.ts
      - service.ts
      - model.ts
      - validation.ts
      - interface.ts
      - index.ts
    - health/
      - router.ts
      - controller.ts
      - service.ts
      - model.ts
      - validation.ts
      - interface.ts
      - index.ts
  - workers/
    - report-generator.worker.ts
    - notification.worker.ts
    - subscription.worker.ts
    - borrow-expiry.worker.ts
    - reservation.worker.ts
  - jobs/
    - scheduleReports.job.ts
    - renewalReminder.job.ts
    - birthdayCoupon.job.ts
    - borrowExpiryReminder.job.ts
    - reservationClaimExpiry.job.ts
  - seeds/
    - permissions.seed.ts
    - plans.seed.ts
    - settings.seed.ts
    - superAdmin.seed.ts
  - tests/
    - integration/
    - unit/
    - fixtures/

**Database models and relationships**

- users: central user entity. References plans via current_plan_id and is referenced by subscriptions, payments, reading_progress, reading_sessions, bookmarks, highlights, borrows, reservations, wishlists, reviews, notifications, notification_logs, device_tokens, search_logs, coupon_usages.
- email_verify_tokens and password_reset_tokens: TTL support tables linked to users.
- login_history: linked polymorphically to users or staff via actor_id plus actor_type.
- device_tokens: belongs to users for push.
- plans: referenced by users.current_plan_id, subscriptions.plan_id and previous_plan_id, borrows.plan_id snapshots, coupons.applicable_plans, flash_sales.applicable_plans.
- subscriptions: belongs to users and plans; referenced by payments.
- payments: belongs to users and subscriptions; optionally references coupons and flash_sales; referenced by refunds and coupon_usages.
- refunds: belongs to payments, users, and processing staff.
- webhook_logs: standalone payment webhook audit with idempotency by gateway_txn_id.
- coupons: referenced by coupon_usages and optionally payments.
- coupon_usages: join table linking coupons, users, and payments.
- flash_sales: optionally referenced by payments.
- authors: referenced many-to-many by books.author_ids.
- categories: self-referencing tree via parent_id and many-to-many with books.category_ids.
- books: central catalogue entity; references authors, categories, and added_by staff; referenced by book_files, reading_progress, reading_sessions, bookmarks, highlights, borrows, reservations, wishlists, reviews, search_logs.clicked_book_id.
- book_files: belongs to books and is referenced by reading_progress, reading_sessions, bookmarks, highlights, borrows.
- reading_progress: unique per user per book; references users, books, book_files.
- reading_sessions: analytics per session; references users, books, book_files with 1-year TTL.
- bookmarks and highlights: belong to users, books, book_files.
- borrows: belong to users, books, book_files, and plans; drive availability and expiry jobs.
- reservations: belong to users and books; queue_position plus claim_expires_at drive reservation flow.
- wishlists and reviews: user-book relationship tables; reviews also affect books.average_rating and review_count.
- notifications: belongs to users, 90-day TTL.
- notification_logs: belongs to users, tracks email/SMS/push delivery with 90-day TTL.
- search_logs: optionally linked to users and clicked_book_id, 180-day TTL.
- permissions: seeded permission catalog.
- roles: references permissions and is referenced by staff.role_id.
- staff: staff account entity with role_id and 2FA state.
- staff_invite_tokens: TTL invite tokens linked to staff.
- staff_activity_logs: linked to staff with 180-day TTL.
- admin_activity_logs: privileged audit log with 2-year TTL.
- report_jobs: linked to requesting staff, supports async export lifecycle and 7-day expiry.
- settings: singleton global configuration document.

**Route plan per module**

- auth: POST /auth/register, /auth/login, /auth/google, /auth/facebook, /auth/logout, /auth/verify-email, /auth/resend-verification, /auth/forgot-password, /auth/reset-password, /auth/2fa/enable, /auth/2fa/verify, /auth/2fa/disable, /auth/2fa/challenge; GET /auth/me, /auth/me/login-history, /auth/2fa/backup-codes; PATCH /auth/me, /auth/me/password, /auth/me/notification-prefs.
- staff-auth: POST /staff/login, /staff/accept-invite, /staff/logout, /staff/2fa/setup, /staff/2fa/enable, /staff/2fa/verify, /staff/2fa/disable; GET /staff/me; PATCH /staff/me/password.
- onboarding: GET /onboarding/plans; POST /onboarding/select, /onboarding/complete.
- plans: GET /plans, /plans/:id; POST /plans; PUT /plans/:id; PATCH /plans/:id/toggle.
- subscriptions: GET /subscriptions/my, /subscriptions/my/history, /subscriptions, /subscriptions/:id; POST /subscriptions; PATCH /subscriptions/my/cancel, /subscriptions/my/renew, /subscriptions/my/upgrade, /subscriptions/my/downgrade, /subscriptions/:id.
- payments: GET /payments/my, /payments/my/:id, /payments, /payments/:id; POST /payments/initiate, /payments/verify, /payments/:id/refund; POST /webhooks/bkash, /webhooks/nagad, /webhooks/stripe, /webhooks/paypal. Recommended internal improvement: route these through a provider adapter and support SSLCommerz-backed Bangladesh processing behind the service layer.
- promotions: POST /coupons/validate; GET/POST /coupons; GET/PUT/DELETE /coupons/:id; PATCH /coupons/:id/toggle; GET /flash-sales/active; GET/POST /flash-sales; PUT/DELETE /flash-sales/:id; PATCH /flash-sales/:id/toggle.
- authors: GET /authors, /authors/:id; POST /authors; PUT /authors/:id; DELETE /authors/:id.
- categories: GET /categories, /categories/:id; POST /categories; PUT /categories/:id; DELETE /categories/:id.
- books: GET /books, /books/featured, /books/:id, /books/:id/preview, /books/:id/reviews; POST /admin/books, /admin/books/:id/files, /admin/books/bulk-import; PUT /admin/books/:id; DELETE /admin/books/:id, /admin/books/:id/files/:fid; PATCH /admin/books/:id/featured, /admin/books/:id/available.
- reading: POST /reading/:bookId/start, /reading/:bookId/session; PATCH /reading/:bookId/progress; GET /reading/history, /reading/currently-reading, /reading/completed; GET/POST/PATCH/DELETE /books/:bookId/bookmarks and /books/:bookId/highlights.
- borrows: GET /borrows/my, /borrows; POST /borrows, /borrows/:id/return; PATCH /borrows/:id.
- reservations: GET /reservations/my, /reservations; POST /reservations; DELETE /reservations/:id; PATCH /reservations/:id.
- wishlist: GET /wishlist; POST /wishlist/:bookId; DELETE /wishlist/:bookId.
- reviews: POST /books/:bookId/reviews; PATCH /books/:bookId/reviews/:id, /admin/reviews/:id/toggle; DELETE /books/:bookId/reviews/:id.
- notifications: GET /notifications, /notifications/unread-count, /admin/notification-logs; PATCH /notifications/:id/read; POST /notifications/read-all, /admin/notifications/send; DELETE /notifications/:id.
- search: GET /search, /search/suggestions, /search/popular.
- dashboard: GET /dashboard, /dashboard/stats, /dashboard/recommended, /dashboard/my-library.
- members: GET /admin/users, /admin/users/:id, /admin/users/:id/reading-history, /admin/users/:id/payments; PATCH /admin/users/:id, /admin/users/:id/suspend, /admin/users/:id/unsuspend; DELETE /admin/users/:id.
- rbac: GET /admin/permissions, /admin/roles, /admin/roles/:id; POST /admin/roles; PUT /admin/roles/:id; DELETE /admin/roles/:id.
- staff: GET /admin/staff, /admin/staff/:id, /admin/staff/:id/activity; POST /admin/staff/invite, /admin/staff/:id/reinvite; PATCH /admin/staff/:id/role, /admin/staff/:id/suspend, /admin/staff/:id/unsuspend; DELETE /admin/staff/:id.
- reports: GET /admin/reports, /admin/reports/:id, /admin/reports/:id/download; POST /admin/reports; DELETE /admin/reports/:id.
- settings: GET /admin/settings; PATCH /admin/settings/general, /admin/settings/gateways, /admin/settings/email, /admin/settings/sms, /admin/settings/push, /admin/settings/storage, /admin/settings/templates/email, /admin/settings/templates/sms, /admin/settings/maintenance, /admin/settings/trial.
- audit: GET /admin/activity-logs, /admin/activity-logs/export, /admin/staff/:id/activity.
- health: GET /health, /health/live, /health/ready, with response-time metrics and dependency checks.

**Suggested npm packages**

- Runtime: express ^5.1.0, mongoose ^8.13.0, zod ^3.24.2, dotenv ^17.0.0, cors ^2.8.5, helmet ^8.1.0, express-rate-limit ^7.5.0, express-mongo-sanitize ^2.2.0, morgan ^1.10.0, winston ^3.17.0, winston-daily-rotate-file ^5.0.0, response-time ^2.3.3, http-status ^1.8.1.
- Auth/security: jsonwebtoken ^9.0.2, bcryptjs ^2.4.3, passport ^0.7.0, passport-google-oauth20 ^2.0.0, passport-facebook ^3.0.0, speakeasy ^2.0.0.
- File/data helpers: multer ^2.0.0, cloudinary ^2.6.0, csv-parse ^5.6.0, exceljs ^4.4.0, pdfkit ^0.17.0.
- Jobs/worker: node-cron ^4.0.0. If job orchestration needs retries/concurrency later, add Redis + BullMQ in a later phase instead of front-loading it.
- Validation/logging helpers: zod-validation-error ^3.4.0, nanoid ^5.1.0.
- Dev dependencies: typescript ^5.8.0, tsx ^4.19.0, @types/node ^22.13.0, @types/express ^5.0.1, @types/cors ^2.8.17, @types/morgan ^1.9.9, @types/jsonwebtoken ^9.0.9, @types/bcryptjs ^2.4.6, @types/passport-facebook ^3.0.16, eslint ^9.21.0, @eslint/js ^9.21.0, typescript-eslint ^8.25.0, prettier ^3.5.0, vitest ^3.1.0, supertest ^7.0.0, @types/supertest ^6.0.3, mongodb-memory-server ^10.1.0.

**Environment variables**

- NODE_ENV, PORT, API_PREFIX, APP_URL, CLIENT_URL, STAFF_PORTAL_URL.
- MONGODB_URI, MONGODB_DB_NAME.
- JWT_ACCESS_SECRET_USER, JWT_REFRESH_SECRET_USER, JWT_ACCESS_SECRET_STAFF, JWT_REFRESH_SECRET_STAFF, JWT_ACCESS_EXPIRES_IN, JWT_REFRESH_EXPIRES_IN.
- BCRYPT_SALT_ROUNDS.
- SESSION_SECRET if Passport state/session helpers are used for OAuth state management.
- GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_CALLBACK_URL.
- FACEBOOK_APP_ID, FACEBOOK_APP_SECRET, FACEBOOK_CALLBACK_URL.
- SSLCOMMERZ_STORE_ID, SSLCOMMERZ_STORE_PASSWORD, SSLCOMMERZ_IS_LIVE.
- STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET.
- PAYPAL_CLIENT_ID, PAYPAL_CLIENT_SECRET, PAYPAL_MODE.
- EMAIL_PROVIDER, RESEND_API_KEY, SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM.
- SMS_PROVIDER, TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM_NUMBER, SSL_WIRELESS_API_TOKEN, ALPHA_SMS_API_KEY.
- FCM_PROJECT_ID, FCM_CLIENT_EMAIL, FCM_PRIVATE_KEY or FCM_SERVER_KEY depending on integration style.
- CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET.
- STORAGE_PROVIDER, B2_KEY_ID, B2_APPLICATION_KEY, B2_BUCKET_NAME, B2_BUCKET_URL.
- RATE_LIMIT_WINDOW_MS, RATE_LIMIT_MAX, CORS_ORIGIN.
- LOG_LEVEL, LOG_DIR.
- REPORT_WORKER_POLL_INTERVAL_MS, REPORT_DOWNLOAD_TTL_DAYS, JOB_RETRY_LIMIT.
- DEFAULT_TIMEZONE, DEFAULT_CURRENCY, DEFAULT_LANGUAGE.

**Implementation order detail**

1. Bootstrap app, config, logger, DB, common error/response middleware, health routes, and worker process.
2. Seed permissions and plans early so downstream modules can depend on stable RBAC and plan limits.
3. Build auth and staff-auth together because user and staff tokens, login history, and invite/2FA helpers share primitives.
4. Build rbac and staff management immediately after auth so protected admin/staff routes have authorization in place.
5. Build onboarding and plans once auth exists.
6. Build subscriptions and payments next, including webhook idempotency, coupon/flash-sale application hooks, and invoice metadata.
7. Build promotions in parallel with payments once payment abstractions exist.
8. Build authors, categories, books, and book_files together as the catalog foundation.
9. Build reading, wishlist, reviews, borrows, and reservations after catalog plus plan/subscription rules are stable.
10. Build notifications and search after the operational modules exist so they can emit and record real events.
11. Build dashboard and members as aggregation-oriented modules after source data exists.
12. Build audit, admin overview analytics, reports, settings, and scheduled jobs last, because they depend on broad system coverage.
13. Finish with tests, seeders, API docs, deployment config, and load/rate-limit tuning.

**Key architecture decisions**

- Use strict dependency direction: router -> controller -> service -> model. Cross-module access should happen only through exported service interfaces or read-only query services, never by importing another module’s Mongoose model directly if it would create cycles.
- Keep admin routes inside the owning domain module instead of creating a giant admin module. The route namespace can still be /admin/... while business logic remains domain-owned.
- Implement Super Admin as a staff record with elevated role/permission set. This best fits the RBAC collections and REST design.
- Run API and worker as separate Node processes from day one, both sharing the same codebase and MongoDB connection layer.
- Keep webhooks idempotent using webhook_logs plus unique gateway transaction references.
- Use the docs’ unified response contract everywhere: success, message, data, meta.

**Doc inconsistencies to normalize**

- The MongoDB design headings claim 35 collections, but the actual design enumerates 36. Treat 36 as correct.
- The feature list mentions /admin/login, but the REST and DB design are centered on staff auth + RBAC. Treat admin as a privileged staff role unless product requirements change.
- The docs expose bKash and Nagad directly while settings also mention SSLCommerz. Use a payment provider abstraction so the service can support Bangladesh aggregators without rewriting API flows.

**Design improvements and suggestions**

- Add request IDs and correlation IDs to Morgan/Winston logs so API requests and worker jobs can be traced end to end.
- Split auth tokens for users and staff to avoid privilege confusion and simplify middleware.
- Add Mongoose transaction boundaries for payment verification, refund processing, subscription state changes, reservation fulfillment, and borrow return flows.
- Maintain denormalized counters on books, authors, categories, roles, and users through controlled service-layer updates, not ad hoc writes.
- Introduce a domain event layer inside the monolith for side effects such as notifications, audit logs, counters, and worker enqueueing. This keeps modules decoupled without needing microservices.
- Add idempotency keys for payment initiate/verify flows and bulk notification/report generation endpoints.
- Prefer soft-delete/status flags over physical delete for staff, users, and sensitive billing records even where the REST doc says delete.
- Add readiness checks for MongoDB, storage, email provider config, and worker heartbeat in health endpoints.
- Version seed data for permissions, plans, and settings so environments stay deterministic.

**Relevant files**

- c:\Users\devmd\work\stackread-backend\documentation\LMS_Feature_List_v2.md — feature scope and module inventory.
- c:\Users\devmd\work\stackread-backend\documentation\LMS_Feature_DB_Mapping.md — feature-to-collection mapping and cross-check.
- c:\Users\devmd\work\stackread-backend\documentation\LMS_MongoDB_Design_v3.md — collection definitions, TTL/index rules, and report data design.
- c:\Users\devmd\work\stackread-backend\documentation\LMS_REST_API_Design.md — endpoint inventory, auth levels, and response contract.

**Verification**

1. Validate that every feature in the feature list maps to at least one module, one collection/model, and one route or job path.
2. Confirm each documented collection has a corresponding module-owned model or shared singleton model and that TTL/index requirements are captured.
3. Confirm all REST endpoints are assigned to exactly one module and that auth/permission rules are preserved.
4. Review the dependency graph to ensure no module imports another module’s internal model directly in a way that creates cycles.
5. Verify the worker responsibilities cover renewal reminders, borrow expiry, reservation claim expiry, birthday discounts, report generation, and notification fan-out.
6. Verify the env list covers every external integration named in the docs and selected architecture choices.

**Scope boundaries**

- Included: backend modular monolith structure, API/worker architecture, models/relationships, route ownership, core packages, env design, build order, and design improvements.
- Excluded: frontend implementation, exact UI flows, deployment manifests, concrete schema code, exact report aggregation code, and vendor-specific final payment adapter implementation details.
