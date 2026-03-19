**Digital Library Management System**

**Feature List → Database Design Mapping**

_Every feature from the Feature List Document matched to its Database
Collections_

v1.0 \| 36 Collections \| Feature-Complete Verification

# What This Document Shows

This document maps every single feature from the Final Feature List
Document to the exact MongoDB collection(s) that store its data. Use
this as a verification checklist to confirm the database design is 100%
complete.

---

**Symbol** **Meaning**

---

Collection Name The MongoDB collection that stores this feature\'s
data

Fields The specific fields in that collection used by this
feature

Multiple Some features need data from more than one collection
Collections (JOINs via \$lookup)

---

# Complete Summary --- All Features at a Glance

---

**Module / Feature** **Primary Collection(s)** **Total**

---

Registration + Social Login users 1

Email Verification email_verify_tokens + users 2

Password Reset password_reset_tokens 1

Login History login_history 1

Onboarding + Plan Selection users + plans + subscriptions 3

Profile & Settings users 1

Push Device Tokens device_tokens 1

Plans plans 1
(Free/Basic/Standard/Premium)

Subscriptions subscriptions 1

Payments payments 1
(bKash/Nagad/Stripe/PayPal)

Refunds refunds 1

Webhook Logs webhook_logs 1

Freemium Lock users + plans (no dedicated 2
collection)

Coupon Codes coupons + coupon_usages 2

Birthday Discount coupons + users (cron job) 2

Flash Sale flash_sales 1

Authors authors 1

Categories / Genres categories 1

Book Management books + book_files 2

Book Catalogue + Search books + authors + categories (text 3
index)

Online Reader (PDF+EPUB) book_files + reading_progress + 3
reading_sessions

Reading Progress + Resume reading_progress 1

Reading Sessions (Analytics) reading_sessions 1

Bookmarks bookmarks 1

Highlights & Notes highlights 1

Borrow System borrows 1

Reservation System reservations 1

Wishlist wishlists 1

Reading History reading_progress 1

Rating & Reviews reviews 1

Recommendations reading_progress + search_logs + 3
books

Search Logs search_logs 1

In-App Notifications notifications 1

Email/SMS/Push Delivery Logs notification_logs + device_tokens 2

Staff Invite System staff + staff_invite_tokens 2

Staff Login staff + login_history 2

RBAC --- Roles roles + permissions 2

RBAC --- Permissions permissions (seeded) 1

Staff Activity Log staff_activity_logs 1

Admin Activity Log admin_activity_logs 1

Admin Dashboard Widgets users+subscriptions+payments+books 5+
(live aggr)

Admin Book Management books + book_files + authors + 4
categories

Admin User Management users + subscriptions + 3
reading_progress

Admin Subscription Management subscriptions + payments + refunds 3

Admin Staff Management staff + staff_invite_tokens + roles 3

Admin Coupon Management coupons + coupon_usages 2

Admin Flash Sale Management flash_sales 1

System Settings settings 1

Monthly Revenue Report payments + refunds + subscriptions + 4
plans

Yearly Revenue Report payments + refunds + subscriptions 3

Top Books Report books + reading_sessions + reviews 3

User Analytics Report users + reading_sessions + 3
subscriptions

Subscription Report subscriptions + plans + payments 3

Active/Inactive Users Report users + reading_sessions 2

Coupon Usage Report coupons + coupon_usages + payments 3

Borrow & Reservation Stats borrows + reservations + books 3

Staff Activity Report staff_activity_logs + 2
admin_activity_logs

Reading Analytics Report reading_sessions + 3
reading_progress + books

Report Jobs (PDF/Excel export) report_jobs 1

---

---

**🔐 Auth & Onboarding**

---

---

**Registration**

---

**Feature **Collections **Key Fields / Logic**
Description** Used**

---

Email/Password, users name, email, password_hash,
Google Login, google_id, facebook_id, status,
Facebook Login language

---

**Email Verification**

---

**Feature **Collections Used\*\* **Key Fields / Logic**
Description\*\*

---

Verification email, email_verify_tokens, token, expires_at, used_at →
resend option, 24hr users users.email_verified,
expiry, banner if email_verified_at
not verified

---

**Login**

---

**Feature **Collections **Key Fields / Logic**
Description** Used**

---

Email+Password, users, users.password_hash,
Google, Facebook login_history login_history: actor_id, method,
--- JWT session ip, status

---

**Password Reset**

---

**Feature **Collections Used\*\* **Key Fields / Logic**
Description\*\*

---

Forgot password via password_reset_tokens token, expires_at, used_at,
email link ip_address

---

**Onboarding Flow**

---

**Feature **Collections **Key Fields / Logic**
Description** Used**

---

Plan selection users, users.onboarding_completed,
after verify --- subscriptions, subscription_status,
Free/Paid --- Skip plans current_plan_id
option

---

**Profile & Settings**

---

**Feature **Collections **Key Fields / Logic**
Description** Used**

---

Edit name/photo, users name, avatar_url, password_hash,
change password, language, notification_prefs
language toggle,
notification prefs

---

**Push Notification Device**

---

**Feature **Collections **Key Fields / Logic**
Description** Used**

---

FCM device token device_tokens user_id, token, platform,
registration for device_name, is_active
push notifications

---

---

**💳 Subscription & Payments**

---

---

**Plan Definitions**

---

**Feature **Collections **Key Fields / Logic**
Description** Used**

---

Free / Basic / plans name, slug, price_monthly,
Standard / Premium price_yearly, borrow_limit,
--- Monthly + book_access_limit,
Yearly pricing monthly_read_limit,
offline_access, is_free

---

**Subscription Management**

---

**Feature **Collections **Key Fields / Logic**
Description** Used**

---

Subscribe, cancel, subscriptions user_id, plan_id, billing_cycle,
upgrade, downgrade, status, is_trial, starts_at,
auto-renew, trial ends_at, auto_renew, cancelled_at
period

---

**Payment Processing**

---

**Feature **Collections **Key Fields / Logic**
Description** Used**

---

bKash, Nagad, payments user_id, subscription_id, amount,
Stripe, PayPal --- gateway, gateway_txn_id, status,
Invoice, receipt, invoice_url, paid_at
payment history

---

**Refund**

---

**Feature **Collections **Key Fields / Logic**
Description** Used**

---

Admin can process refunds payment_id, user_id, processed_by,
refund --- tracked amount, reason, status,
separately processed_at

---

**Payment Gateway Webhooks**

---

**Feature **Collections **Key Fields / Logic**
Description** Used**

---

Receive and process webhook_logs gateway, event_type,
gateway events gateway_txn_id, payload, status
(payment success,
failure)

---

**Freemium Lock System**

---

**Feature **Collections **Key Fields / Logic**
Description** Used**

---

Free user hits users, plans users.subscription_status,
premium feature → users.current_plan_id,
upgrade prompt plans.book_access_limit,
plans.is_free

---

---

**🎁 Marketing & Promotions**

---

---

**Coupon Codes**

---

**Feature **Collections **Key Fields / Logic**
Description** Used**

---

Create coupons --- coupons code, discount_type,
% or fixed --- discount_value, usage_limit,
expiry, usage per_user_limit, is_active,
limit, per user expires_at
limit

---

**Coupon Usage Tracking**

---

**Feature **Collections **Key Fields / Logic**
Description** Used**

---

Track who used coupon_usages coupon_id, user_id, payment_id,
which coupon, on discount_applied
which payment

---

**Birthday Discount**

---

**Feature **Collections **Key Fields / Logic**
Description** Used**

---

Auto-apply discount coupons, users coupons.is_birthday=true,
on user birthday users.birthday --- cron checks
daily

---

**Flash Sale**

---

**Feature **Collections **Key Fields / Logic**
Description** Used**

---

Time-limited flash_sales title, discount_type,
promotional sale discount_value, starts_at,
with banner and ends_at, max_redemptions,
auto-activation is_active

---

---

**📚 Library & Book Management**

---

---

**Author Management**

---

**Feature **Collections **Key Fields / Logic**
Description** Used**

---

Author profiles authors name, slug, bio, photo_url,
with bio, photo, nationality, book_count
nationality

---

**Category / Genre**

---

**Feature **Collections **Key Fields / Logic**
Description** Used**

---

Hierarchical categories name, name_bn, slug, parent_id,
categories --- book_count, sort_order
parent/child ---
bilingual names

---

**Book Management**

---

**Feature **Collections **Key Fields / Logic**
Description** Used**

---

Add/Edit/Delete books title, author_ids, isbn, language,
books --- Cover, cover_url, description,
ISBN, Language, category_ids, tags, access_level,
Access Level, is_featured, is_available,
Featured, Bulk CSV added_by

---

**Book File Upload**

---

**Feature **Collections **Key Fields / Logic**
Description** Used**

---

Upload PDF and EPUB book_files book_id, format, file_url,
files --- DRM file_size_kb, total_pages, is_drm,
enabled is_primary

---

**Book Catalogue (User)**

---

**Feature Description** **Collections **Key Fields / Logic**
Used**

---

Search by title/author/ISBN --- books, authors, Text index: title, description,
Filter by categories tags --- filters: category_ids,
category/language/format/rating language, access_level,
average_rating

---

**Book Preview**

---

**Feature **Collections **Key Fields / Logic**
Description** Used**

---

Free users see books, books.access_level vs
first 20% only --- book_files, users.subscription_status/current_plan_id
access_level gate users

---

---

**📖 Reading Activity**

---

---

**Online Reader**

---

**Feature **Collections **Key Fields / Logic**
Description** Used**

---

In-browser PDF+EPUB book_files, book_files.file_url, is_drm ---
reading --- font reading_progress, reading_progress.current_page,
size, dark/light reading_sessions percent_complete
mode --- DRM
protected

---

**Reading Progress**

---

**Feature **Collections **Key Fields / Logic**
Description** Used**

---

Auto-save last page reading_progress user_id, book_id, current_page,
--- resume reading percent_complete, is_completed,
--- % complete last_read_at
tracker

---

**Reading Sessions**

---

**Feature **Collections **Key Fields / Logic**
Description** Used**

---

Per-session reading_sessions user_id, book_id, start_page,
analytics --- time end_page, duration_mins,
spent, pages read, device_type, started_at, ended_at
device used

---

**Bookmarks**

---

**Feature **Collections **Key Fields / Logic**
Description** Used**

---

Save specific pages bookmarks user_id, book_id, page_number,
with optional label label

---

**Highlights & Notes**

---

**Feature **Collections **Key Fields / Logic**
Description** Used**

---

Highlight text --- highlights user_id, book_id, page_number,
add personal notes selected_text, color, note
--- color-coded

---

**Borrow System**

---

**Feature **Collections **Key Fields / Logic**
Description** Used**

---

Time-limited borrow borrows user_id, book_id, book_file_id,
--- auto-expiry --- plan_id, status, borrowed_at,
borrow limit per due_at, returned_at
plan

---

**Reservation System**

---

**Feature **Collections **Key Fields / Logic**
Description** Used**

---

Reserve unavailable reservations user_id, book_id, queue_position,
book --- queue status, notified_at,
position --- notify claim_expires_at
when available ---
48hr claim window

---

**Wishlist**

---

**Feature **Collections **Key Fields / Logic**
Description** Used**

---

Save books to read wishlists user_id, book_id
later

---

**Reading History**

---

**Feature **Collections **Key Fields / Logic**
Description** Used**

---

All books ever reading_progress user_id, book_id,
started/completed percent_complete, is_completed,
--- % complete --- last_read_at
last read date

---

**Rating & Reviews**

---

**Feature **Collections **Key Fields / Logic**
Description** Used**

---

1-5 star rating --- reviews user_id, book_id, rating,
written review --- review_text, is_visible,
edit/delete own is_verified
review

---

**Recommended Books**

---

**Feature **Collections **Key Fields / Logic**
Description** Used**

---

Based on reading reading_progress, reading_progress.book_id →
history and reading_sessions, books.category_ids → recommend
category preference search_logs, books similar books

---

**Search Logs**

---

**Feature **Collections **Key Fields / Logic**
Description** Used**

---

Track user searches search_logs user_id, query, filters,
for analytics and results_count, clicked_book_id
recommendations

---

---

**🔔 Notification System**

---

---

**In-App Notifications**

---

**Feature **Collections **Key Fields / Logic**
Description** Used**

---

Dashboard notifications user_id, type, title, body, link,
notification center metadata, is_read, read_at
--- mark read ---
delete

---

**Email Notifications**

---

**Feature **Collections **Key Fields / Logic**
Description** Used**

---

Verification, notification_logs channel=email, type, recipient,
payment, renewal subject, body, provider, status
reminder, borrow
expiry, new book,
offers

---

**SMS Notifications**

---

**Feature **Collections **Key Fields / Logic**
Description** Used**

---

Payment confirm, notification_logs channel=sms, type, recipient
renewal reminder (phone), body, provider
(ssl_wireless/twilio), status

---

**Push Notifications**

---

**Feature **Collections **Key Fields / Logic**
Description** Used**

---

FCM push for new device_tokens, device_tokens.token → FCM send →
books, offers, notification_logs notification_logs.channel=push
reminders

---

---

**👑 Staff System & RBAC**

---

---

**Staff Invite System**

---

**Feature **Collections Used\*\* **Key Fields / Logic**
Description\*\*

---

Admin invites staff staff, staff: name, email, role_id,
by email --- 48hr staff_invite_tokens status, invited_by --- token:
token --- staff expires_at, used_at
sets own password

---

**Staff Login**

---

**Feature **Collections **Key Fields / Logic**
Description** Used**

---

Separate staff, staff.password_hash,
/staff/login --- login_history staff.two_factor.enabled controls
Email+Password --- mandatory setup flow ---
mandatory 2FA staff_activity mustSetup2FA temp token for
setup/verify flow logs /staff/2fa/setup + /staff/2fa/enable,
pending2FA temp token for
/staff/2fa/verify

---

**Role Management (RBAC)**

---

**Feature **Collections **Key Fields / Logic**
Description** Used**

---

Admin creates roles roles, roles.name, roles.permissions
--- assigns permissions, (array of permission ids) ---
permissions --- staff staff.role_id
roles assigned to
staff

---

**Permission System**

---

**Feature **Collections **Key Fields / Logic**
Description** Used**

---

Granular permissions name, module, action --- seeded on
permissions: deploy --- embedded in
books.create, roles.permissions
members.suspend,
reports.export etc.

---

**Staff Activity Log**

---

**Feature **Collections Used\*\* **Key Fields / Logic**
Description\*\*

---

Every staff action staff_activity_logs staff_id, action, module,
logged --- who did target_id, description, ip_address
what when --- Admin
can view all

---

**Admin Activity Log**

---

**Feature **Collections Used\*\* **Key Fields / Logic**
Description\*\*

---

Super Admin actions admin_activity_logs action, module, target_id,
logged separately description, before_data,
with before/after after_data, ip_address
data snapshots

---

---

**🖥️ Admin Dashboard Features**

---

---

**Dashboard Overview (Live Widgets)**

---

**Feature **Collections **Key Fields / Logic**
Description** Used**

---

Total members, users, Aggregation queries --- no
active subs, MRR, subscriptions, dedicated collection --- real-time
revenue this month, payments, books, COUNT/SUM
top books, plan borrows,
distribution reservations,
report_jobs

---

**Book Management (Admin)**

---

**Feature **Collections **Key Fields / Logic**
Description** Used**

---

Add/edit/delete books, books: all fields --- book_files:
books --- PDF+EPUB book_files, format, file_url ---
upload --- Featured authors, books.is_featured, added_by
toggle --- Bulk CSV categories
import

---

**User Management (Admin)**

---

**Feature **Collections **Key Fields / Logic**
Description** Used**

---

View all users --- users, users.status, subscription_status
details, subscriptions, --- lookup subscriptions,
subscription, reading_progress, reading_progress
reading history --- reviews
Suspend/Delete

---

**Subscription Management (Admin)**

---

**Feature **Collections **Key Fields / Logic**
Description** Used**

---

View/modify subscriptions, subscriptions.status ---
subscriptions --- payments, payments.status ---
cancel --- refund refunds refunds.processed_by, reason
processing

---

**Staff Management (Admin)**

---

**Feature **Collections Used\*\* **Key Fields / Logic**
Description\*\*

---

Invite staff --- staff, staff.role_id, status ---
assign role --- staff_invite_tokens, invite_tokens ---
suspend/delete --- staff_activity_logs, activity_logs.staff_id
view activity roles

---

**Coupon Management (Admin)**

---

**Feature **Collections **Key Fields / Logic**
Description** Used**

---

Create/edit/delete coupons, coupons: all fields ---
coupons --- usage coupon_usages coupon_usages for usage report
limit --- expiry ---
birthday/first
purchase flags

---

**Flash Sale Management (Admin)**

---

**Feature Description** **Collections **Key Fields / Logic**
Used**

---

Create time-limited sales flash_sales title, discount_type,
with banner --- discount_value, starts_at,
auto-activate/deactivate ends_at, max_redemptions

---

**System Settings (Admin)**

---

**Feature **Collections **Key Fields / Logic**
Description** Used**

---

Library name/logo, settings library_name, sslcommerz, stripe,
payment gateway paypal, email_config, sms_config,
config, email/SMS maintenance_mode
templates,
maintenance mode

---

---

**📊 Admin Reports**

---

---

**Monthly Revenue Report**

---

**Feature **Collections **Key Fields / Logic**
Description** Used**

---

Revenue by month payments, payments.amount, paid_at, gateway
--- gateway refunds, --- GROUP BY month --- JOIN
breakdown --- plan subscriptions, subscriptions+plans
breakdown --- plans
discount ---
refunds

---

**Yearly Revenue Report**

---

**Feature **Collections **Key Fields / Logic**
Description** Used**

---

Revenue by year --- payments, Same as monthly but GROUP BY year
YoY growth --- refunds, --- calculate YoY %
best/worst month subscriptions

---

**Top Books Report**

---

**Feature **Collections **Key Fields / Logic**
Description** Used**

---

Books ranked by books, books.read_count, borrow_count ---
read count, borrow, reading_sessions, reading_sessions aggregate by
wishlist, rating reviews, authors, book_id
--- with reading categories
time

---

**User Analytics Report**

---

**Feature **Collections **Key Fields / Logic**
Description** Used**

---

New registrations, users, users.created_at, last_active_at,
active vs inactive, reading_sessions, subscription_status ---
plan distribution, subscriptions, reading_sessions by user
top readers, churn reading_progress,
login_history

---

**Subscription Report**

---

**Feature **Collections **Key Fields / Logic**
Description** Used**

---

MRR, ARR, new subs, subscriptions, subscriptions: all fields ---
cancellations, plans, users, calculate MRR from active plan
churn rate, payments prices
upgrades, trial
conversions

---

**Active/Inactive Users Report**

---

**Feature **Collections **Key Fields / Logic**
Description** Used**

---

Segment: active users, reading_sessions.created_at most
(read \< 30d) / reading_sessions recent per user --- calculate
semi-active days_since_read
(31-90d) / inactive
(90d+) / never read

---

**Coupon Usage Report**

---

**Feature **Collections **Key Fields / Logic**
Description** Used**

---

Which coupons used, coupons, coupon_usages GROUP BY coupon_id
by whom, total coupon_usages, --- SUM discount_applied --- JOIN
discount given, payments, users users
revenue impact

---

**Borrow & Reservation Stats**

---

**Feature **Collections **Key Fields / Logic**
Description** Used**

---

Total borrows, borrows, borrows: status, due_at,
overdue, on-time reservations, returned_at --- reservations:
returns, avg books, users queue_position, notified_at
duration, queue
stats

---

**Staff Activity Report**

---

**Feature **Collections Used\*\* **Key Fields / Logic**
Description\*\*

---

Who did what --- staff_activity_logs, GROUP BY staff_id, module, action
actions by module admin_activity_logs, --- filters: date, staff, module
--- most active staff, roles
staff --- audit log
view

---

**Reading Analytics Report**

---

**Feature **Collections **Key Fields / Logic**
Description** Used**

---

Total reading time, reading_sessions, reading_sessions: duration_mins,
avg session, peak reading_progress, device_type, started_at --- GROUP
hours, genre books, categories BY hour/day/device
popularity, device,
completion rate

---

**Report Jobs Queue**

---

**Feature **Collections **Key Fields / Logic**
Description** Used**

---

Async export to report_jobs type, format, filters, status,
PDF/Excel --- file_url, expires_at
queued, generated,
downloadable for 7
days

---

_Digital Library Management System --- Feature to Database Mapping v1.0_

_Every feature from the Feature List Document is covered by the Database
Design Document_
