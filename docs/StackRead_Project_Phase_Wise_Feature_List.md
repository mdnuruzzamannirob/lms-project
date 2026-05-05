# StackRead — Features List

**Platform:** Commercial Digital Library & Self-Publishing Portal
**Developer:** Solo
**Total Phases:** 8
**Date:** May 2026

---

## Priority Legend

| Badge | Meaning |
|---|---|
| `MUST` | Required for launch — without this the product cannot function |
| `SHOULD` | Important — build in next phase if not in current |
| `COULD` | Nice to have — after all MUST and SHOULD are done |

---

## Phase 1 — Discovery & Design
**Goal:** Zero code. Everything planned, designed, and documented before a single line is written.

### Documents to Produce
- Software Requirements Specification (SRS)
- MoSCoW Feature Priority List
- Royalty Calculation Formula Document *(define exactly how royalties work before coding)*
- Database Schema / ERD
- API Contract — OpenAPI 3.0 spec for all endpoints
- UI/UX Wireframe — all pages for web (Figma or Stitch)
- Tech Stack Decision Document
- DRM Architecture Decision *(which provider, how signing works, key management)*
- Development Roadmap — sprint-by-sprint plan
- Environment Setup — local dev, staging, production structure

### Third-Party Accounts to Set Up
- Stripe (payments)
- Cloudinary (file storage)
- Cloudflare (CDN + signed URLs)
- Readium LCP or Adobe ACS (DRM)
- Nodemailer (email)
- Firebase (push notifications — for PWA and future mobile)
- Sentry (error monitoring)
- UptimeRobot or Better Uptime (uptime monitoring)

---

## Phase 2 — Core MVP
**Goal:** A working platform. Guests browse. Readers subscribe and read. Authors upload. Admin operates. PWA works on mobile.

---

### 👁️ Guest Module

#### Homepage & Navigation
- `MUST` Homepage — featured titles, trending, new arrivals, staff picks
- `MUST` Persistent navigation — search, browse, pricing, login, register
- `MUST` Subscription pricing page with plan comparison table

#### Browse & Search
- `MUST` Catalogue browse by genre, format, language, subject
- `MUST` Keyword search — title, author, ISBN
- `MUST` Filter by format, genre, language, year
- `MUST` Title detail page — cover, synopsis, author name, format, availability status, reviews

#### Samples & Preview
- `MUST` Free sample/excerpt reader for permitted titles
- `SHOULD` Audiobook sample playback (first few minutes)

#### Author Profile (Public)
- `MUST` Public author profile — bio, photo, bibliography

#### Registration & Login
- `MUST` Reader registration — email and password
- `MUST` Reader registration — Google OAuth
- `MUST` Author/Publisher registration form
- `MUST` Email verification on registration
- `MUST` Login — email/password and Google
- `MUST` Password reset via email link
- `SHOULD` Apple Sign-In *(not MVP-blocking)*
- `COULD` Institutional SSO *(post-launch B2B feature)*

---

### 🧑‍💻 Reader Module

#### Account & Subscription
- `MUST` Choose subscription plan at registration — Basic, Standard, Premium
- `MUST` Payment processing via Stripe
- `MUST` Upgrade, downgrade, or cancel subscription
- `MUST` Subscription status page — current plan, renewal date, billing history
- `MUST` Update payment method
- `MUST` Email notifications — subscription start, renewal, cancellation, payment failure
- `MUST` Account deletion request *(GDPR-compliant data deletion workflow)*
- `SHOULD` Download PDF invoices for past payments
- `SHOULD` Apply promo codes at checkout
- `COULD` PayPal as additional payment method *(Stripe covers MVP)*

#### Profile & Preferences
- `MUST` Set display name, avatar
- `MUST` Select preferred genres and formats *(used for basic recommendations)*
- `MUST` Privacy settings — public/private reading history
- `MUST` Notification preferences — email on/off per type
- `SHOULD` Enable 2FA via email OTP
- `SHOULD` Change email with re-verification
- `SHOULD` View and revoke active sessions on other devices

#### Discovery
- `MUST` Full-text search across catalogue *(PostgreSQL FTS)*
- `MUST` Filter by format, genre, language, rating, availability, year
- `MUST` Browse curated shelves, new arrivals, staff picks
- `SHOULD` "Readers also enjoyed" on title detail page *(genre-based, not AI — simple query)*
- `COULD` AI-powered personalized recommendations *(needs read data — useless at launch)*
- `COULD` Mood-based or reading-time discovery

#### Borrowing & Access
- `MUST` Access subscription catalogue without borrowing limits
- `MUST` Place holds on limited-access titles with queue position display
- `MUST` Automatic email notification when held title becomes available
- `MUST` View borrowing history
- `SHOULD` Offline download within active subscription *(DRM + service worker — complex, post-MVP)*
- `SHOULD` Individual title purchase outside subscription *(separate payment flow)*
- `COULD` Borrow eBook and audiobook of same title simultaneously

#### Reading Experience
- `MUST` In-browser eBook reader — EPUB and PDF
- `MUST` Adjustable font size, font family, line spacing, margins
- `MUST` Theme — light, dark, sepia
- `MUST` At least one dyslexia-friendly font (OpenDyslexic)
- `MUST` Highlight text and add personal annotations
- `MUST` Reading progress percentage and chapter indicator
- `MUST` Auto-save reading position per device
- `MUST` Integrated audiobook player — play/pause, chapter skip, speed control, sleep timer
- `SHOULD` Real-time reading position sync across all devices *(WebSocket — move to Phase 3)*
- `SHOULD` In-book dictionary lookup
- `SHOULD` Text-to-speech read-aloud for eBooks
- `COULD` In-book Wikipedia and translation lookup
- `COULD` Export highlights and annotations as PDF

#### Organization & Lists
- `MUST` Create and name multiple reading lists (Want to Read, Favorites, etc.)
- `MUST` Add or remove titles from reading lists
- `SHOULD` Make lists public or private
- `SHOULD` Share a reading list via public link
- `COULD` Export reading list as CSV
- `COULD` Personal tags on titles

#### Basic Community
- `MUST` Write and submit reviews and star ratings (1–5)
- `MUST` Reviews displayed on title detail pages *(visible to guests too)*
- `SHOULD` Like other readers' reviews

---

### ✍️ Author Module (Basic — MVP)

#### Account
- `MUST` Individual author account
- `MUST` Basic author profile — bio, photo, genres
- `SHOULD` Verified author badge after admin approval

#### Content Upload
- `MUST` Upload eBook — EPUB and PDF
- `MUST` Upload audiobook — MP3 and M4B
- `MUST` File format and size validation
- `MUST` Metadata entry — title, synopsis, genre tags, cover image, publication date
- `MUST` ISBN-based metadata auto-fill
- `MUST` Cover image upload with basic crop/resize
- `MUST` Save as draft before submitting
- `MUST` Submit to admin review queue
- `MUST` Unpublish or withdraw a title anytime
- `SHOULD` Update/replace files for published titles without losing history
- `SHOULD` Schedule title for future publication date
- `COULD` Upload supplementary materials — reading guides, author notes
- `COULD` Bulk upload with CSV metadata

#### Rights & Licensing
- `MUST` Choose distribution model — subscription-only, purchase, or both
- `MUST` Set simultaneous user access limits — 1, 3, 5, or unlimited
- `MUST` Define loan duration — 7, 14, 21, or 30 days
- `MUST` Configure DRM per title — apply platform DRM, or waive
- `SHOULD` Set geo-restrictions by country or region
- `SHOULD` Set title expiry after N loans or a specific date
- `COULD` Promotional free-access window with start and end date

#### Basic Analytics
- `MUST` Dashboard — total reads, downloads, active readers per title
- `SHOULD` Completion rate per title
- `COULD` Geographic breakdown, chapter drop-off, referral sources *(Phase 3)*

#### Basic Revenue
- `MUST` Royalty earnings display — total earned, pending payout, per-title
- `MUST` Royalty formula shown transparently
- `MUST` Payout method setup — bank transfer or PayPal
- `SHOULD` Payout history
- `COULD` Invoice download, tax document storage *(Phase 3)*

---

### 🛠️ Admin Module (Core)

#### User Management
- `MUST` View, search, filter, and edit all user accounts
- `MUST` Suspend, unsuspend, or delete accounts
- `MUST` Manually reset passwords and verify emails
- `MUST` Assign and override user roles and subscription plans
- `MUST` View user activity log — logins, reads, purchases
- `SHOULD` Bulk import users via CSV
- `SHOULD` Flag accounts with internal notes

#### Catalogue Management
- `MUST` Review queue — all submitted titles
- `MUST` Approve, reject, or request revisions with mandatory feedback message to author
- `MUST` Edit metadata for any title
- `MUST` Remove any title immediately
- `MUST` Create and manage curated shelves and staff picks
- `SHOULD` Catalogue audit — flag missing metadata or broken files

#### Subscription & Plans
- `MUST` Create and edit subscription plans — price, features, trial period
- `MUST` Process manual subscription changes and refunds
- `SHOULD` Create promo codes — type, value, usage limit, expiry
- `COULD` Institutional subscription contract management

#### Basic Royalty Admin
- `MUST` View pending payout requests
- `MUST` Approve or hold payout requests
- `MUST` Set platform-wide royalty rates and commission percentages

#### Simple Metrics Dashboard *(new addition)*
- `MUST` Total registered users (readers, authors)
- `MUST` Active subscribers count
- `MUST` MRR (Monthly Recurring Revenue)
- `MUST` Total titles in catalogue
- `MUST` Total reads this month
- `MUST` Pending review queue count

#### System Configuration
- `MUST` Configure global settings — supported formats, max file sizes, default loan durations
- `MUST` Manage authentication providers
- `MUST` Edit email notification templates
- `MUST` Update Terms of Service, Privacy Policy with version tracking

#### Security & Compliance
- `MUST` Full immutable audit log of all admin actions
- `MUST` Process GDPR data deletion requests within 30 days
- `MUST` Alert on suspicious activity — brute force, unusual downloads
- `SHOULD` Enforce 2FA for all admin accounts

---

### 📱 PWA (Progressive Web App) — Phase 2
**This replaces native mobile apps for now**

- `MUST` Web app is fully responsive — 320px to 2560px
- `MUST` PWA manifest — installable on iOS and Android home screen
- `MUST` Service worker — basic caching for faster reload
- `MUST` Reading engine works correctly on mobile browsers (Chrome, Safari)
- `MUST` Audiobook player works with mobile screen lock controls
- `MUST` All tap targets minimum 44x44px (mobile touch friendly)
- `SHOULD` Offline page caching — last opened book available without internet *(basic, not full DRM offline)*
- `SHOULD` Push notifications via Firebase for PWA
- `COULD` App-like splash screen and loading experience

---

## Phase 3 — Advanced Author Tools + Financial Engine + Search Upgrade
**Goal:** Full author/publisher experience. Royalty engine fully operational. Search upgraded. Real-time sync added.

> ⚠️ **Before coding Phase 3:** The Royalty Calculation Formula Document from Phase 1 must be signed off. Do not build the royalty engine without a documented, agreed-upon formula.

### Royalty Engine — Full Implementation
- `MUST` Per-read event tracking — page-level (eBook) and minute-level (audiobook)
- `MUST` Monthly royalty pool distribution — proportional to reads/pages consumed
- `MUST` Edge case handling — partial reads, refunded subscriptions, disputed reads
- `MUST` Per-purchase royalty — 70% to author on individual title sales
- `MUST` Automated monthly payout processing via Stripe/PayPal
- `MUST` Payout failure handling — retry logic, author notification
- `MUST` Full payout history with calculation breakdown per author
- `SHOULD` Invoice generation and download per payout
- `SHOULD` Tax document storage — W-8, W-9, VAT
- `COULD` Revenue split for co-authored titles

### Author — Advanced Analytics
- `MUST` Chapter-level drop-off analysis per title
- `MUST` Geographic readership breakdown — country and city
- `SHOULD` Search appearance count and click-through rate per title
- `SHOULD` Referral source breakdown
- `SHOULD` Performance comparison across titles and date ranges
- `SHOULD` Download reports — CSV or PDF
- `SHOULD` Schedule automated report delivery to author email

### Author — Publisher Organization
- `MUST` Publisher organization account with brand name and logo
- `MUST` Team role management — Owner, Admin, Editor, Finance, Uploader
- `SHOULD` Bulk upload via metadata CSV or ONIX feed
- `SHOULD` Series grouping — series name, reading order, instalment count
- `COULD` Promotional bundle creation

### Reader — Advanced Features
- `MUST` Real-time reading position sync across all devices (WebSocket)
- `MUST` Offline download within subscription period *(DRM-protected)*
- `SHOULD` Individual title purchase outside subscription
- `SHOULD` In-book Wikipedia and translation lookup
- `COULD` Export highlights and annotations as PDF

### Search Upgrade
- `SHOULD` Upgrade from PostgreSQL FTS to Elasticsearch or Algolia *(when catalogue exceeds 5,000 titles)*
- `SHOULD` Faceted filtering — multiple simultaneous filter combinations
- `SHOULD` Autocomplete and search-as-you-type
- `COULD` Saved searches and keyword alerts

### Admin — Full Financial Dashboard
- `MUST` Full subscription analytics — MRR, ARR, churn rate, trial-to-paid conversion
- `MUST` Revenue vs royalty payout breakdown
- `SHOULD` Custom report builder with date range and segment filters
- `SHOULD` Financial summaries for auditing — CSV and PDF export
- `COULD` Scheduled automated report delivery to admin emails

---

## Phase 4 — Community, Engagement & Gamification
**Goal:** Readers stay longer. Book clubs, goals, badges, author marketing tools, and events go live.

### Reader — Reading Goals & Gamification
- `SHOULD` Set yearly or monthly reading goal — books or pages
- `SHOULD` Daily reading streak tracking
- `SHOULD` Digital badges — first book, 5 books, 25 books, genre explorer, etc.
- `SHOULD` Annual reading summary — total books, pages, hours, top genre, top author
- `COULD` Share annual summary as a social media image card

### Reader — Community & Social
- `SHOULD` Comment on other readers' reviews
- `SHOULD` Follow reader and author profiles
- `SHOULD` Social feed — activity from followed users
- `SHOULD` Join or create book clubs with description and genre tags
- `SHOULD` Book club discussion threads
- `SHOULD` RSVP to author events and platform programmes
- `COULD` Shared annotations within a book club

### Reader — Research Tools
- `SHOULD` Generate formatted citations — APA, MLA, Chicago, Harvard
- `SHOULD` Save and export personal reference list
- `COULD` Inter-library loan (ILL) request for unavailable titles

### Author — Promotion & Marketing
- `SHOULD` Automatic new release notification pushed to followers
- `SHOULD` Pre-order listing with release date countdown
- `SHOULD` Request featured placement (admin approval + fee)
- `SHOULD` Affiliate tracking link generation
- `COULD` Embeddable title widget for external websites

### Author — Community & Engagement
- `SHOULD` Reply publicly to reader reviews
- `SHOULD` Upload book club resource kits — discussion guide, author notes
- `SHOULD` Send broadcast announcements to followers
- `COULD` Host virtual Q&A events through the platform

### Admin — Content Moderation
- `MUST` Moderation queue — flagged reviews, comments, community posts
- `MUST` Approve or remove flagged content with moderation note
- `MUST` Issue formal warnings to users with logged record
- `MUST` Process DMCA takedown requests
- `SHOULD` Publish and version-control community guidelines

### Admin — Events Management
- `SHOULD` Create and manage platform events — author talks, webinars, Q&As
- `SHOULD` Events on public calendar
- `SHOULD` Track RSVPs and send automated reminders 24 hours before
- `COULD` Archive events with recordings and resources

### Admin — Staff Role *(first time staff accounts are needed)*
- `SHOULD` Staff account with limited permissions — moderation and support only
- `SHOULD` Assign moderation tickets to staff members
- `SHOULD` Staff cannot access financial data or system configuration

---

## Phase 5 — Hardening, Search & AI
**Goal:** Platform is fast, smart, and ready to scale.

### Search & Discovery
- `SHOULD` Elasticsearch or Algolia integration *(if not done in Phase 3)*
- `SHOULD` AI-powered personalised recommendations *(now there is enough read data)*
- `SHOULD` Mood-based and reading-time-estimate discovery filters
- `COULD` "Continue a series" smart suggestions

### Performance Optimisation
- `MUST` Database query audit — fix all N+1 queries
- `MUST` Redis caching for frequently accessed catalogue and user data
- `MUST` Image optimisation — WebP conversion, lazy loading
- `MUST` API response time audit — all endpoints under 300ms at P95
- `SHOULD` CDN cache strategy review and optimisation

### Internationalisation
- `SHOULD` Bengali language UI option *(alongside English)*
- `SHOULD` Locale-aware date, time, and currency formatting
- `COULD` Right-to-left (RTL) text support for Arabic content

---

## Phase 6 — QA, Security & Accessibility Audit
**Goal:** Production-ready. Tested, secure, and accessible.

### Testing
- `MUST` End-to-end tests — registration, subscription, upload, read, payout flows
- `MUST` Unit tests — minimum 80% coverage on royalty engine, DRM, access control
- `MUST` API integration tests — Stripe, S3, DRM, email
- `MUST` Cross-browser testing — Chrome, Firefox, Safari, Edge
- `MUST` Mobile browser testing — Chrome Android, Safari iOS (via PWA)
- `SHOULD` Automated regression suite via CI/CD
- `SHOULD` Load test — verify 500 concurrent users without degradation

### Security
- `MUST` OWASP Top 10 vulnerability assessment and fixes
- `MUST` Auth and authorisation penetration test
- `MUST` Signed URL expiry enforcement verification
- `MUST` Rate limiting on all auth endpoints verified
- `MUST` SQL injection and XSS prevention confirmed
- `MUST` No hardcoded secrets in codebase — full secrets audit
- `SHOULD` Independent third-party penetration test
- `SHOULD` Full GDPR compliance audit

### Accessibility
- `MUST` WCAG 2.1 Level AA audit — full platform
- `MUST` Screen reader test — NVDA (Windows), VoiceOver (Mac/iOS)
- `MUST` Keyboard-only navigation test — entire web app
- `MUST` Colour contrast ratio verification
- `SHOULD` Real-user accessibility testing with assistive technology users

---

## Phase 7 — Beta Launch
**Goal:** Real users, real content, real feedback before public launch.

- `MUST` Closed beta — invite 50–100 readers
- `MUST` Onboard 10–20 authors with real content
- `MUST` Collect structured feedback — bugs, UX issues, missing features
- `MUST` Monitor error logs and performance metrics daily
- `MUST` Fix all P0 (critical) and P1 (high) bugs
- `MUST` Validate end-to-end payment flow with real transactions
- `MUST` Validate royalty calculation with real read data
- `SHOULD` NPS survey with beta users
- `SHOULD` A/B test homepage layout and pricing page
- `SHOULD` Stress test with simulated traffic spike

---

## Phase 8 — Public Launch
**Goal:** Live. Monitored. Responding fast.

### Launch Checklist
- `MUST` Production environment fully configured
- `MUST` SSL certificates verified and auto-renewal active
- `MUST` Database backup verified and restore drill completed
- `MUST` Sentry and uptime monitoring active
- `MUST` Stripe in production mode — tested
- `MUST` DRM licenses active in production
- `MUST` All email templates tested in production environment
- `MUST` Terms of Service, Privacy Policy, Refund Policy published
- `MUST` Help centre articles published for all user roles
- `SHOULD` Launch announcement to waitlist subscribers
- `SHOULD` Social media launch posts

### Post-Launch Monitoring (Ongoing)
- `MUST` Daily — error logs, payment failures, uptime checks
- `MUST` Weekly — MRR, subscriber count, churn, support tickets
- `MUST` Weekly — author upload queue, pending royalties
- `MUST` Respond to all support tickets within 48 hours
- `SHOULD` Monthly KPI review against targets
- `SHOULD` Monthly security log review
- `SHOULD` Quarterly roadmap review — promote SHOULD/COULD items to next sprint

---

## Phase 9 — Native Mobile Apps *(Low Priority / Post-Stable-Launch)*
**Goal:** Native iOS and Android apps after platform is stable and generating revenue.

> **Note:** PWA from Phase 2 covers mobile users until this phase. Start this phase only after the platform is stable, has paying users, and you have budget to hire a mobile designer or use a design system.

### Strategy Options
- **Option A:** Hire a freelance mobile UI designer before starting this phase
- **Option B:** Use a React Native UI library (e.g. NativeBase, Tamagui) with a pre-built design system
- **Option C:** Skip native apps entirely if PWA usage data shows it is sufficient

### Scope (when undertaken)
- `MUST` Reader registration, login, subscription management
- `MUST` Catalogue browse, search, filtering
- `MUST` Full reading experience — eBook reader and audiobook player
- `MUST` Lock screen audio controls (iOS and Android)
- `MUST` Offline download (DRM-protected)
- `MUST` Reading position sync with web
- `MUST` Push notifications — holds, new releases, reminders
- `MUST` Highlights, annotations, bookmarks
- `MUST` Reading lists management
- `MUST` Reviews and community features
- `SHOULD` Reading goals and streaks on mobile dashboard
- `SHOULD` Book club participation
- `COULD` Basic author dashboard on mobile

---

## True MVP — What You Need to Launch (Phase 2 MUST only)

This is the absolute minimum that makes ReadVault a working, sellable product:

**Guest**
Browse catalogue → search → view title detail → read sample → see pricing → register → login

**Reader**
Subscribe (Stripe) → browse → borrow → read in-browser (eBook + audiobook) → place hold → write review → manage account

**Author**
Register → upload EPUB/PDF/MP3 → set DRM + access limits → submit for review → see basic read stats → receive royalties

**Admin**
Approve/reject uploads → manage users → configure subscription plans → view basic metrics dashboard → handle GDPR requests → audit log

**PWA**
Everything above works on mobile browser and is installable on home screen.

**That's it. Everything else is post-launch.**

---

## Features Explicitly Removed From MVP

| Feature | Moved To | Reason |
|---|---|---|
| AI recommendations | Phase 5 | No data at launch — useless |
| Real-time cross-device sync | Phase 3 | WebSocket complexity not needed for MVP |
| Offline download | Phase 3 | DRM + service worker complexity |
| Elasticsearch / Algolia | Phase 3–5 | PostgreSQL FTS is fine for early catalogue |
| Promo codes | Phase 3 SHOULD | Growth feature, not launch-critical |
| Apple Sign-In | Phase 2 SHOULD | Google covers OAuth need |
| Institutional SSO | COULD | Post-launch B2B |
| Staff role | Phase 4 | No staff needed at launch |
| Publisher org accounts | Phase 3 | Individual authors cover MVP |
| Series / bundle grouping | Phase 3 COULD | UX improvement, not critical |
| Advanced royalty breakdown | Phase 3 | Basic earnings display covers MVP |
| Events management | Phase 4 | Community feature |
| Native mobile apps | Phase 9 | PWA covers mobile until stable |

---

*StackRead Phase-Wise Features List — Revised Solo Developer Edition — v1.0 — April 2026*
