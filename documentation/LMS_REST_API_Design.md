**Digital Library Management System**

**REST API Design Document**

v1.0 \| Node.js + Express \| JWT Auth \| Feature-Complete

# API Conventions

---

**Item** **Value**

---

Base URL (Dev) http://localhost:5000/api/v1

Base URL (Prod) https://api.yourdomain.com/api/v1

Content-Type application/json

Authentication Bearer Token (JWT) in Authorization header

Date Format ISO 8601 --- 2025-01-15T09:30:00Z

Pagination ?page=1&limit=20

Sort ?sort=created_at&order=desc

Search ?search=keyword

API Versioning /api/v1/\... (URL versioning)

---

## Auth Header

---

Authorization: Bearer \<jwt_token\>

---

---

## Standard Response Format

+-----------------------------------------------------------------------+
| // Success |
| |
| { \"success\": true, \"data\": { \... }, \"message\": \"OK\" } |
| |
| // Paginated |
| |
| { \"success\": true, \"data\": \[\...\], \"meta\": { \"page\": 1, |
| \"limit\": 20, \"total\": 150, \"pages\": 8 } } |
| |
| // Error |
| |
| { \"success\": false, \"message\": \"Validation failed\", \"errors\": |
| { \"email\": \"Required\" } } |
+=======================================================================+

## HTTP Status Codes Used

---

**Code** **Meaning** **When Used**

---

200 OK Successful GET, PUT, PATCH

201 Created Successful POST (resource created)

204 No Content Successful DELETE

400 Bad Request Validation error, missing fields

401 Unauthorized No token or invalid token

403 Forbidden Valid token but no permission

404 Not Found Resource does not exist

409 Conflict Duplicate email, already exists

422 Unprocessable Business logic error (e.g. already
Entity subscribed)

429 Too Many Requests Rate limit exceeded

500 Internal Server Unexpected server error
Error

---

## Auth Levels Used in This Document

---

**Label** **Meaning**

---

Public No authentication required

User Valid user JWT required

Staff Valid staff JWT required (any role)

Admin Super admin JWT only

Staff+Perm Staff JWT + specific RBAC permission required

---

---

**🔐 Group 1 --- Authentication & Onboarding**

---

---

---

**Method** **Endpoint** **Auth** **Description**

---

**POST** /auth/register Public Register new user with
email+password

**POST** /auth/login Public Login with email+password

**POST** /auth/google Public Login or register with
Google OAuth

**POST** /auth/facebook Public Login or register with
Facebook OAuth

**POST** /auth/logout User Logout --- invalidate token

**POST** /auth/verify-email Public Verify email with token
from email link

**POST** /auth/resend-verification Public Resend email verification
link

**POST** /auth/forgot-password Public Request password reset
email

**POST** /auth/reset-password Public Reset password with token
from email

**GET** /auth/me User Get current logged-in user
profile

**PATCH** /auth/me User Update own profile (name,
avatar, language)

**PATCH** /auth/me/password User Change own password

**PATCH** /auth/me/notification-prefs User Update notification
preferences

**GET** /auth/me/login-history User Get own login history

---

**POST /auth/register --- Request Body**

---

**Field** **Type** **Required** **Description**

---

name String Yes Full name. min:2, max:100

email String Yes Valid email address

password String Yes min:8, must include letter+number

language String No en \| bn. Default: en

---

**POST /auth/login --- Request Body**

---

**Field** **Type** **Required** **Description**

---

email String Yes Registered email

password String Yes Account password

---

**POST /auth/login --- Response**

+-----------------------------------------------------------------------+
| { |
| \"success\": true, |
| \"data\": { |
| \"requiresTwoFactor\": false, |
| \"accessToken\": \"eyJ...\", |
| \"user\": { \"id\": \"...\", \"email\": \"rahim@...\" } |
| } |
| } |
+-----------------------------------------------------------------------+

If user 2FA is enabled:

+-----------------------------------------------------------------------+
| { |
| \"success\": true, |
| \"data\": { |
| \"requiresTwoFactor\": true, |
| \"tempToken\": \"eyJ...\" |
| } |
| } |
+=======================================================================+

---

**🎯 Group 2 --- Onboarding & Plan Selection**

---

---

---

**Method** **Endpoint** **Auth** **Description**

---

**GET** /onboarding/plans User Get all available plans for
plan selection page

**POST** /onboarding/select User Select a plan (free → skip
\| paid → go to payment)

**POST** /onboarding/complete User Mark onboarding as
completed

---

**POST /onboarding/select --- Request Body**

---

**Field** **Type** **Required** **Description**

---

plan_id ObjectId Yes ID of selected plan

billing_cycle String No monthly \| yearly (required if
paid plan)

---

**POST /onboarding/select --- Response (Free Plan)**

---

{ \"success\": true, \"data\": { \"redirect\": \"/dashboard\",
\"plan\": \"free\" } }

---

---

**POST /onboarding/select --- Response (Paid Plan)**

---

{ \"success\": true, \"data\": { \"redirect\": \"/checkout\",
\"subscription_id\": \"\...\" } }

---

---

---

**💳 Group 3 --- Plans, Subscriptions & Payments**

---

---

## Plans

---

**Method** **Endpoint** **Auth** **Description**

---

**GET** /plans Public Get all active plans (for
pricing page)

**GET** /plans/:id Public Get single plan details

**POST** /plans Admin Create new plan

**PUT** /plans/:id Admin Update plan details or
pricing

**PATCH** /plans/:id/toggle Admin Activate or deactivate a
plan

---

## Subscriptions

---

**Method** **Endpoint** **Auth** **Description**

---

**GET** /subscriptions/my User Get current user\'s active
subscription

**GET** /subscriptions/my/history User Get user\'s full
subscription history

**POST** /subscriptions User Create new subscription
(triggers payment)

**PATCH** /subscriptions/my/cancel User Cancel subscription (ends
at period end)

**PATCH** /subscriptions/my/renew User Manually renew subscription

**PATCH** /subscriptions/my/upgrade User Upgrade to higher plan

**PATCH** /subscriptions/my/downgrade User Downgrade to lower plan

**GET** /subscriptions Staff+Perm List all subscriptions
(subscriptions.view)

**GET** /subscriptions/:id Staff+Perm Get single subscription
details

**PATCH** /subscriptions/:id Staff+Perm Admin modify a user\'s
subscription

---

## Payments

---

**Method** **Endpoint** **Auth** **Description**

---

**GET** /payments/my User Get current user\'s payment
history

**GET** /payments/my/:id User Get single payment +
invoice

**POST** /payments/initiate User Initiate payment ---
returns gateway URL/token

**POST** /payments/verify User Verify payment after
gateway redirect

**GET** /payments Staff+Perm List all payments
(subscriptions.view)

**GET** /payments/:id Staff+Perm Get single payment details

**POST** /payments/:id/refund Staff+Perm Process refund
(subscriptions.refund)

---

**POST /payments/initiate --- Request Body**

---

**Field** **Type** **Required** **Description**

---

subscription_id ObjectId Yes Subscription to pay for

gateway String Yes bkash \| nagad \| stripe \| paypal

coupon_code String No Apply coupon code

---

**POST /payments/initiate --- Response**

+-----------------------------------------------------------------------+
| { |
| |
| \"success\": true, |
| |
| \"data\": { |
| |
| \"payment_id\": \"\...\", |
| |
| \"gateway\": \"bkash\", |
| |
| \"gateway_url\": \"https://gateway.bkash.com/checkout?token=\...\", |
| |
| \"amount\": 399, |
| |
| \"discount_amount\": 50, |
| |
| \"final_amount\": 349 |
| |
| } |
| |
| } |
+=======================================================================+

## Webhooks

---

**Method** **Endpoint** **Auth** **Description**

---

**POST** /webhooks/bkash Public bKash payment webhook
(signature
verified)

**POST** /webhooks/nagad Public Nagad payment webhook
(signature
verified)

**POST** /webhooks/stripe Public Stripe payment webhook
(signature
verified)

**POST** /webhooks/paypal Public PayPal payment webhook
(signature
verified)

---

---

**🎁 Group 4 --- Coupons, Flash Sales & Discounts**

---

---

## Coupons

---

**Method** **Endpoint** **Auth** **Description**

---

**POST** /coupons/validate User Validate a coupon code
before payment

**GET** /coupons Staff+Perm List all coupons
(coupons.view)

**POST** /coupons Staff+Perm Create new coupon
(coupons.create)

**GET** /coupons/:id Staff+Perm Get coupon details + usage
stats

**PUT** /coupons/:id Staff+Perm Update coupon
(coupons.edit)

**DELETE** /coupons/:id Staff+Perm Delete coupon
(coupons.delete)

**PATCH** /coupons/:id/toggle Staff+Perm Activate or deactivate
coupon

---

**POST /coupons/validate --- Request Body**

---

**Field** **Type** **Required** **Description**

---

code String Yes Coupon code to validate

plan_id ObjectId Yes Plan being purchased

billing_cycle String Yes monthly \| yearly

---

**POST /coupons/validate --- Response**

+-----------------------------------------------------------------------+
| { \"success\": true, \"data\": { |
| |
| \"valid\": true, \"discount_type\": \"percentage\", |
| |
| \"discount_value\": 20, \"discount_amount\": 79.8, |
| |
| \"final_amount\": 319.2 } } |
+=======================================================================+

## Flash Sales

---

**Method** **Endpoint** **Auth** **Description**

---

**GET** /flash-sales/active Public Get currently active flash
sale (for homepage banner)

**GET** /flash-sales Staff+Perm List all flash sales
(flash_sales.view)

**POST** /flash-sales Staff+Perm Create flash sale
(flash_sales.create)

**PUT** /flash-sales/:id Staff+Perm Update flash sale
(flash_sales.edit)

**DELETE** /flash-sales/:id Staff+Perm Delete flash sale
(flash_sales.delete)

**PATCH** /flash-sales/:id/toggle Staff+Perm Manually activate or
deactivate

---

---

**📚 Group 5 --- Library --- Authors, Categories & Books**

---

---

## Authors

---

**Method** **Endpoint** **Auth** **Description**

---

**GET** /authors Public List all authors
(paginated)

**GET** /authors/:id Public Get author profile + their
books

**POST** /authors Staff+Perm Create author
(books.create)

**PUT** /authors/:id Staff+Perm Update author (books.edit)

**DELETE** /authors/:id Staff+Perm Delete author
(books.delete)

---

## Categories

---

**Method** **Endpoint** **Auth** **Description**

---

**GET** /categories Public List all active categories
(tree structure)

**GET** /categories/:id Public Get category +
sub-categories + books
count

**POST** /categories Staff+Perm Create category
(books.create)

**PUT** /categories/:id Staff+Perm Update category
(books.edit)

**DELETE** /categories/:id Staff+Perm Delete category
(books.delete)

---

## Books --- Public Catalogue

---

**Method** **Endpoint** **Auth** **Description**

---

**GET** /books Public List books (paginated +
search + filter)

**GET** /books/featured Public Get featured books for
homepage

**GET** /books/:id Public Get full book details

**GET** /books/:id/preview User Get preview content (first
20% of book)

**GET** /books/:id/reviews Public Get book reviews
(paginated)

---

**GET /books --- Query Parameters**

---

**Parameter** **Type** **Description**

---

search String Full-text search on title, author, description

category ObjectId Filter by category ID

language String en \| bn \| ar \| hi

access_level String free \| basic \| standard \| premium

sort String newest \| popular \| top_rated \| title_az

page Number Page number. Default: 1

limit Number Items per page. Default: 20, Max: 100

---

## Books --- Admin Management

---

**Method** **Endpoint** **Auth** **Description**

---

**POST** /admin/books Staff+Perm Add new book (books.create)

**PUT** /admin/books/:id Staff+Perm Update book metadata
(books.edit)

**DELETE** /admin/books/:id Staff+Perm Delete book (books.delete)

**POST** /admin/books/:id/files Staff+Perm Upload PDF or EPUB file
(books.upload)

**DELETE** /admin/books/:id/files/:fid Staff+Perm Remove a book file
(books.delete)

**PATCH** /admin/books/:id/featured Staff+Perm Toggle featured status
(books.edit)

**PATCH** /admin/books/:id/available Staff+Perm Toggle availability
(books.edit)

**POST** /admin/books/bulk-import Staff+Perm Bulk import books via CSV
(books.create)

---

**POST /admin/books --- Request Body**

---

**Field** **Type** **Required** **Description**

---

title String Yes Book title

title_bn String No Bangla title (optional)

author_ids ObjectId\[\] Yes Array of author IDs

category_ids ObjectId\[\] Yes Array of category IDs

language String Yes en \| bn \| ar \| \...

access_level String Yes free \| basic \| standard \|
premium

isbn String No ISBN-10 or ISBN-13

publisher String No Publisher name

description String No Book synopsis max:2000

cover_url String No Cloudinary image URL

tags String\[\] No Array of tag strings

published_at Date No Original publication date

---

---

**📖 Group 6 --- Reading, Borrows & Reservations**

---

---

## Reading

---

**Method** **Endpoint** **Auth** **Description**

---

**POST** /reading/:bookId/start User Start reading ---
create/get reading progress

**PATCH** /reading/:bookId/progress User Save reading progress
(current page)

**POST** /reading/:bookId/session User End reading session ---
save duration

**GET** /reading/history User Get user\'s reading history
(all books started)

**GET** /reading/currently-reading User Get books user is currently
reading

**GET** /reading/completed User Get books user has
completed

---

**PATCH /reading/:bookId/progress --- Request Body**

---

**Field** **Type** **Required** **Description**

---

book_file_id ObjectId Yes Which file format being read

current_page Number Yes Current page number

total_pages Number Yes Total pages in book

---

## Bookmarks

---

**Method** **Endpoint** **Auth** **Description**

---

**GET** /books/:bookId/bookmarks User Get all bookmarks for a
book

**POST** /books/:bookId/bookmarks User Add a bookmark

**PATCH** /books/:bookId/bookmarks/:id User Update bookmark label

**DELETE** /books/:bookId/bookmarks/:id User Remove a bookmark

---

## Highlights

---

**Method** **Endpoint** **Auth** **Description**

---

**GET** /books/:bookId/highlights User Get all highlights for a
book

**POST** /books/:bookId/highlights User Add a highlight with
optional note

**PATCH** /books/:bookId/highlights/:id User Update highlight color or
note

**DELETE** /books/:bookId/highlights/:id User Remove a highlight

---

## Borrow

---

**Method** **Endpoint** **Auth** **Description**

---

**GET** /borrows/my User Get current user\'s active
borrows

**POST** /borrows User Borrow a book

**POST** /borrows/:id/return User Return a borrowed book
early

**GET** /borrows Staff+Perm List all borrows
(borrows.view)

**PATCH** /borrows/:id Staff+Perm Override borrow status
(borrows.manage)

---

**POST /borrows --- Request Body**

---

**Field** **Type** **Required** **Description**

---

book_id ObjectId Yes Book to borrow

book_file_id ObjectId Yes Specific file format to borrow

---

## Reservations

---

**Method** **Endpoint** **Auth** **Description**

---

**GET** /reservations/my User Get current user\'s
reservations with queue
position

**POST** /reservations User Reserve an unavailable book

**DELETE** /reservations/:id User Cancel a reservation

**GET** /reservations Staff+Perm List all reservations
(borrows.view)

**PATCH** /reservations/:id Staff+Perm Manually update reservation
(borrows.manage)

---

## Wishlist

---

**Method** **Endpoint** **Auth** **Description**

---

**GET** /wishlist User Get user\'s wishlist

**POST** /wishlist/:bookId User Add book to wishlist

**DELETE** /wishlist/:bookId User Remove book from wishlist

---

## Reviews

---

**Method** **Endpoint** **Auth** **Description**

---

**POST** /books/:bookId/reviews User Add rating + review for a
book

**PATCH** /books/:bookId/reviews/:id User Edit own review

**DELETE** /books/:bookId/reviews/:id User Delete own review

**PATCH** /admin/reviews/:id/toggle Staff+Perm Show or hide a review
(members.edit)

---

**POST /books/:bookId/reviews --- Request Body**

---

**Field** **Type** **Required** **Description**

---

rating Number Yes Integer 1--5

review_text String No Written review text max:2000

---

---

**🔔 Group 7 --- Notifications**

---

---

---

**Method** **Endpoint** **Auth** **Description**

---

**GET** /notifications User Get in-app notifications
(paginated)

**GET** /notifications/unread-count User Get unread notification
count

**PATCH** /notifications/:id/read User Mark single notification as
read

**POST** /notifications/read-all User Mark all notifications as
read

**DELETE** /notifications/:id User Delete a notification

**POST** /admin/notifications/send Staff+Perm Send bulk notification to
users (notifications.send)

**GET** /admin/notification-logs Staff+Perm View email/SMS/push
delivery logs

---

**POST /admin/notifications/send --- Request Body**

---

**Field** **Type** **Required** **Description**

---

target String Yes all \| subscribed \| free \| specific

user_ids ObjectId\[\] No Required if target=specific

type String Yes notification type enum

title String Yes Notification title

body String Yes Notification message

channels String\[\] Yes \[\'email\',\'sms\',\'in_app\',\'push\'\]

link String No Dashboard deep-link URL

---

---

**🔍 Group 8 --- Search**

---

---

---

**Method** **Endpoint** **Auth** **Description**

---

**GET** /search User Full-text search across
books

**GET** /search/suggestions Public Autocomplete suggestions as
user types

**GET** /search/popular-terms Public Get popular search terms

---

**GET /search --- Query Parameters**

---

**Parameter** **Type** **Description**

---

q String Search query (required)

category ObjectId Filter by category

language String Filter by language

access_level String Filter by access level

sort String relevance \| newest \| popular \| top_rated

page Number Page number

limit Number Results per page. Default: 20

---

---

**👥 Group 9 --- User Dashboard**

---

---

---

**Method** **Endpoint** **Auth** **Description**

---

**GET** /dashboard User Get dashboard home data
(resume reading,
recommendations, new books)

**GET** /dashboard/stats User Get user reading stats
(streak, total books, total
time)

**GET** /dashboard/recommended User Get personalised book
recommendations

**GET** /dashboard/my-library User Get complete My Library
(progress, wishlist,
borrows, reserves)

---

**GET /dashboard --- Response**

+-----------------------------------------------------------------------+
| { |
| |
| \"success\": true, |
| |
| \"data\": { |
| |
| \"resume_reading\": \[ { book, progress_percent, last_read_at } \], |
| |
| \"recommended\": \[ { book, reason } \], |
| |
| \"new_books\": \[ { book } \], |
| |
| \"active_borrows\": 2, |
| |
| \"reservations\": 1, |
| |
| \"unread_notifications\": 5, |
| |
| \"subscription\": { plan, status, ends_at } |
| |
| } |
| |
| } |
+=======================================================================+

---

**🖥️ Group 10 --- Admin: User Management**

---

---

---

**Method** **Endpoint** **Auth** **Description**

---

**GET** /admin/users Staff+Perm List all users with filters
(members.view)

**GET** /admin/users/:id Staff+Perm Get full user profile +
sub + activity

**PATCH** /admin/users/:id Staff+Perm Edit user info
(members.edit)

**PATCH** /admin/users/:id/suspend Staff+Perm Suspend a user account
(members.suspend)

**PATCH** /admin/users/:id/unsuspend Staff+Perm Unsuspend a user account
(members.suspend)

**DELETE** /admin/users/:id Staff+Perm Delete a user
(members.delete)

**GET** /admin/users/:id/reading-history Staff+Perm View user reading history
(members.view)

**GET** /admin/users/:id/payments Staff+Perm View user payment history
(subscriptions.view)

---

**GET /admin/users --- Query Parameters**

---

**Parameter** **Type** **Description**

---

search String Search by name or email

status String active \| suspended \| deleted

subscription_status String free \| trial \| active \| expired

plan_id ObjectId Filter by current plan

sort String newest \| oldest \| name \| last_active

page Number Page number

limit Number Items per page

---

---

**📊 Group 11 --- Admin: Dashboard Overview & Analytics**

---

---

---

**Method** **Endpoint** **Auth** **Description**

---

**GET** /admin/overview Staff+Perm Get live dashboard stats
(reports.view)

**GET** /admin/overview/revenue-chart Staff+Perm Revenue chart data for last
30 days

**GET** /admin/overview/registration-chart Staff+Perm Registration trend for last
30 days

**GET** /admin/overview/popular-books Staff+Perm Top 5 books by read count

**GET** /admin/overview/plan-distribution Staff+Perm Plan distribution pie chart
data

---

**GET /admin/overview --- Response**

+-----------------------------------------------------------------------+
| { |
| |
| \"success\": true, |
| |
| \"data\": { |
| |
| \"total_users\": 1240, |
| |
| \"active_subscriptions\": 890, |
| |
| \"new_today\": 12, |
| |
| \"mrr\": 45000, |
| |
| \"revenue_this_month\": 89500, |
| |
| \"total_books\": 350, |
| |
| \"active_borrows\": 67, |
| |
| \"pending_reservations\": 23, |
| |
| \"failed_payments_7d\": 4, |
| |
| \"expiring_subscriptions\": 18 |
| |
| } |
| |
| } |
+=======================================================================+

---

**👑 Group 12 --- Admin: Staff Management & RBAC**

---

---

## Permissions

---

**Method** **Endpoint** **Auth** **Description**

---

**GET** /admin/permissions Admin Get all permissions (for
role builder UI)

---

## Roles

---

**Method** **Endpoint** **Auth** **Description**

---

**GET** /admin/roles Admin List all roles

**POST** /admin/roles Admin Create new role with
permissions

**GET** /admin/roles/:id Admin Get role details + assigned
permissions

**PUT** /admin/roles/:id Admin Update role name or
permissions

**DELETE** /admin/roles/:id Admin Delete role (must reassign
staff first)

---

**POST /admin/roles --- Request Body**

---

**Field** **Type** **Required** **Description**

---

name String Yes Unique role name e.g. Book Manager

description String No Role description

permissions ObjectId\[\] Yes Array of permission IDs

---

## Staff

---

**Method** **Endpoint** **Auth** **Description**

---

**GET** /admin/staff Admin List all staff members

**POST** /admin/staff/invite Admin Invite new staff member by
email

**GET** /admin/staff/:id Admin Get staff profile + role +
activity

**PATCH** /admin/staff/:id/role Admin Change staff member\'s role

**PATCH** /admin/staff/:id/suspend Admin Suspend staff account

**PATCH** /admin/staff/:id/unsuspend Admin Unsuspend staff account

**DELETE** /admin/staff/:id Admin Delete staff account

**POST** /admin/staff/:id/reinvite Admin Resend invitation email

**GET** /admin/staff/:id/activity Admin View staff activity log

---

**POST /admin/staff/invite --- Request Body**

---

**Field** **Type** **Required** **Description**

---

name String Yes Staff member\'s full name

email String Yes Email to send invitation to

role_id ObjectId Yes Role to assign

---

## Staff Auth (Separate from User Auth)

---

**Method** **Endpoint** **Auth** **Description**

---

**POST** /staff/login Public Staff login with
email+password

**POST** /staff/accept-invite Public Accept invitation and set
password

**POST** /staff/logout Staff Staff logout

**GET** /staff/me Staff Get logged-in staff
profile + role +
permissions

**PATCH** /staff/me/password Staff Change own password

**POST** /staff/2fa/setup Public Start mandatory 2FA setup
using mustSetup2FA tempToken

**POST** /staff/2fa/enable Public Complete setup with
tempToken + OTP and issue
accessToken

**POST** /staff/2fa/verify Public Verify login challenge with
tempToken + OTP and issue
accessToken

**POST** /staff/2fa/disable Staff Disable 2FA

---

**POST /staff/accept-invite --- Request Body**

---

**Field** **Type** **Required** **Description**

---

token String Yes Invitation token from email link

password String Yes New password to set. min:8

---

---

**📈 Group 13 --- Admin: Reports**

---

---

---

**Method** **Endpoint** **Auth** **Description**

---

**GET** /admin/reports Staff+Perm List all generated reports
(reports.view)

**POST** /admin/reports Staff+Perm Request new report
generation (reports.export)

**GET** /admin/reports/:id Staff+Perm Get report status +
download link

**DELETE** /admin/reports/:id Staff+Perm Delete a generated report

**GET** /admin/reports/:id/download Staff+Perm Download report file
(redirects to file URL)

---

**POST /admin/reports --- Request Body**

---

**Field** **Type** **Required** **Description**

---

type String Yes revenue_monthly \| revenue_yearly
\| top_books \| active_users \|
inactive_users \| subscriptions \|
coupon_usage \| staff_activity \|
borrow_stats \| reading_analytics

format String Yes pdf \| excel

from Date No Filter start date (ISO 8601)

to Date No Filter end date (ISO 8601)

plan_id ObjectId No Filter by specific plan (where
applicable)

gateway String No Filter by payment gateway (revenue
reports)

staff_id ObjectId No Filter by staff member (staff
activity report)

---

**GET /admin/reports/:id --- Response**

+-----------------------------------------------------------------------+
| { |
| |
| \"success\": true, |
| |
| \"data\": { |
| |
| \"\_id\": \"\...\", |
| |
| \"type\": \"revenue_monthly\", |
| |
| \"format\": \"excel\", |
| |
| \"status\": \"completed\", |
| |
| \"file_url\": \"https://cdn.cloudinary.com/reports/\...\", |
| |
| \"file_size_kb\": 245, |
| |
| \"row_count\": 320, |
| |
| \"expires_at\": \"2025-02-15T09:00:00Z\", |
| |
| \"completed_at\": \"2025-02-08T09:02:13Z\" |
| |
| } |
| |
| } |
+=======================================================================+

---

**⚙️ Group 14 --- Admin: System Settings**

---

---

---

**Method** **Endpoint** **Auth** **Description**

---

**GET** /admin/settings Staff+Perm Get all system settings
(settings.view)

**PATCH** /admin/settings/general Admin Update library name, logo,
address

**PATCH** /admin/settings/gateways Admin Update payment gateway
config

**PATCH** /admin/settings/email Admin Update email provider
config

**PATCH** /admin/settings/sms Admin Update SMS provider config

**PATCH** /admin/settings/push Admin Update FCM server key

**PATCH** /admin/settings/storage Admin Update Cloudinary/Backblaze
config

**PATCH** /admin/settings/templates/email Admin Update email notification
templates

**PATCH** /admin/settings/templates/sms Admin Update SMS notification
templates

**PATCH** /admin/settings/maintenance Admin Toggle maintenance mode

**PATCH** /admin/settings/trial Admin Update trial duration days

---

---

**🔍 Group 15 --- Admin: Activity & Audit Logs**

---

---

---

**Method** **Endpoint** **Auth** **Description**

---

**GET** /admin/activity-logs Admin Get admin (super) activity
log

**GET** /admin/staff/:id/activity Admin Get specific staff
member\'s activity log

**GET** /admin/activity-logs/export Admin Export activity log to CSV

---

---

**📋 API Endpoint Summary --- All Routes**

---

---

---

**Group** **Endpoints** **Auth Levels**

---

Auth & Onboarding 14 Public, User

Onboarding Flow 3 User

Plans & Subscriptions 10 Public, User, Staff+Perm, Admin

Payments & Webhooks 11 User, Staff+Perm, Public
(signed)

Coupons & Flash Sales 13 User, Staff+Perm

Authors & Categories 10 Public, Staff+Perm

Books --- Catalogue 5 Public, User

Books --- Admin Management 8 Staff+Perm

Reading, Borrows & 16 User, Staff+Perm
Reservations

Wishlist & Reviews 7 User, Staff+Perm

Notifications 7 User, Staff+Perm

Search 3 Public, User

User Dashboard 4 User

Admin: User Management 8 Staff+Perm

Admin: Dashboard Overview 5 Staff+Perm

Admin: Staff & RBAC 15 Admin, Staff

Staff Auth 8 Public, Staff

Admin: Reports 5 Staff+Perm

Admin: Settings 11 Admin, Staff+Perm

Admin: Activity Logs 3 Admin

---

---

**Item** **Count**

---

Total Endpoint Groups 20

Total API Endpoints \~175

Public Endpoints \~15

User Auth Required \~65

Staff Auth Required \~65

Admin Only \~30

---

_Digital Library Management System --- REST API Design Document v1.0_

_\~175 Endpoints \| 20 Groups \| Node.js + Express + JWT_
