**Digital Library Management System**

**Complete MongoDB Database Design**

v2.0 --- Feature-Complete \| 35 Collections \| Mongoose ODM

# Master Collection Index

Total: 35 Collections across 9 Groups

---

**\#** **Collection** **Group** **Purpose**

---

1 users Auth Registered members

2 email_verify_tokens Auth Email verification tokens (TTL)

3 password_reset_tokens Auth Password reset tokens (TTL)

4 login_history Auth User & staff login history

5 device_tokens Auth FCM push notification device tokens

6 plans Subscription Membership plan definitions

7 subscriptions Subscription User subscription records

8 payments Subscription Payment transactions

9 refunds Subscription Refund records

10 webhook_logs Subscription Payment gateway webhook logs

11 coupons Marketing Discount coupon codes

12 coupon_usages Marketing Coupon usage tracking

13 flash_sales Marketing Flash sale / limited-time offers

14 authors Library Author profiles

15 categories Library Book categories / genres (tree)

16 books Library Book metadata

17 book_files Library PDF / EPUB file records

18 reading_progress Reading User reading progress

19 reading_sessions Reading Per-session reading analytics

20 bookmarks Reading Page bookmarks

21 highlights Reading Text highlights & notes

22 borrows Reading Book borrow records

23 reservations Reading Book reservation queue

24 wishlists Reading User wishlist

25 reviews Reading Book ratings & reviews

26 notifications System In-app notifications

27 notification_logs System Email / SMS / Push delivery logs

28 search_logs System User search history
(recommendations)

29 roles RBAC Staff role definitions

30 permissions RBAC Permission definitions (seeded)

31 staff RBAC Staff / librarian accounts

32 staff_invite_tokens RBAC Invitation tokens (TTL)

33 staff_activity_logs RBAC Staff action audit logs (TTL)

34 admin_activity_logs RBAC Admin (super) action audit logs

35 settings System Global system config (singleton)

36 report_jobs Reports Generated report queue & storage

---

---

**🔐 Group 1 --- Auth & User Management** --- 5 collections

---

---

## 1. users

_Core collection. Every registered member lives here._

---

**Field** **Type** **Required** **Notes / Validation**

---

\_id ObjectId Auto Primary key

name String Yes Full name. trim, min:2,
max:100

email String Yes Unique, lowercase, trim

phone String No International format. For SMS
notifications

password_hash String No null if Google/Facebook login
only

avatar_url String No Cloudinary URL

birthday Date No For birthday coupon auto-apply

timezone String Yes Default: Asia/Dhaka. IANA
timezone string

language String Yes Enum: en \| bn. Default: en

status String Yes Enum: active \| suspended \|
deleted. Default: active

email_verified Boolean Yes Default: false

email_verified_at Date No Set when verified

google_id String No Unique sparse index

facebook_id String No Unique sparse index

current_plan_id ObjectId No Ref: plans. Denormalized for
fast auth check

plan_expires_at Date No Denormalized expiry for fast
middleware check

subscription_status String Yes Enum: free \| trial \| active
\| expired. Default: free

total_books_read Number Yes Denormalized counter. Default:
0

total_reading_mins Number Yes Cumulative reading time.
Default: 0

reading_streak_days Number Yes Consecutive reading days.
Default: 0

last_active_at Date No Updated every dashboard visit

notification_prefs Object Yes { email:true, sms:true,
in_app:true, push:true }

referral_code String No Unique code for future
referral system

referred_by ObjectId No Ref: users. For future
referral system

onboarding_completed Boolean Yes Default: false. Set after plan
selection

created_at Date Auto timestamps: true

updated_at Date Auto timestamps: true

---

**Indexes**

+-----------------------------------------------------------------------+
| { email: 1 } unique: true |
| |
| { google_id: 1 } unique: true, sparse: true |
| |
| { facebook_id: 1 } unique: true, sparse: true |
| |
| { referral_code: 1 } unique: true, sparse: true |
| |
| { status: 1 } |
| |
| { subscription_status: 1 } |
| |
| { current_plan_id: 1 } |
| |
| { plan_expires_at: 1 } --- for expiry cron |
+=======================================================================+

## 2. email_verify_tokens

---

**Field** **Type** **Required** **Notes / Validation**

---

\_id ObjectId Auto Primary key

user_id ObjectId Yes Ref: users

token String Yes Unique.
crypto.randomBytes(32).toString(\'hex\')

expires_at Date Yes createdAt + 24 hours

used_at Date No Set when token consumed

created_at Date Auto timestamps: true

---

**Indexes**

+-----------------------------------------------------------------------+
| { token: 1 } unique: true |
| |
| { user_id: 1 } |
| |
| { expires_at: 1 } expireAfterSeconds: 0 (TTL) |
+=======================================================================+

## 3. password_reset_tokens

---

**Field** **Type** **Required** **Notes / Validation**

---

\_id ObjectId Auto Primary key

user_id ObjectId Yes Ref: users

token String Yes Unique. hashed before storage

expires_at Date Yes createdAt + 1 hour

used_at Date No Set when consumed

ip_address String No Requester IP for security
audit

created_at Date Auto timestamps: true

---

**Indexes**

+-----------------------------------------------------------------------+
| { token: 1 } unique: true |
| |
| { expires_at: 1 } expireAfterSeconds: 0 (TTL) |
+=======================================================================+

## 4. login_history

_Tracks every login for both users and staff. Useful for security &
analytics._

---

**Field** **Type** **Required** **Notes / Validation**

---

\_id ObjectId Auto Primary key

actor_id ObjectId Yes Ref: users OR staff

actor_type String Yes Enum: user \| staff

method String Yes Enum: email \| google \|
facebook

ip_address String No Login IP address

user_agent String No Browser / device info

device_type String No Enum: desktop \| mobile \|
tablet

country String No Geo-detected from IP
(optional)

status String Yes Enum: success \| failed

fail_reason String No e.g. wrong_password \|
account_suspended

created_at Date Auto timestamps: true

---

**Indexes**

+-----------------------------------------------------------------------+
| { actor_id: 1, actor_type: 1, created_at: -1 } |
| |
| { created_at: 1 } expireAfterSeconds: 7776000 (TTL --- 90 days) |
+=======================================================================+

## 5. device_tokens

_FCM device tokens for push notifications. One user can have multiple
devices._

---

**Field** **Type** **Required** **Notes / Validation**

---

\_id ObjectId Auto Primary key

user_id ObjectId Yes Ref: users

token String Yes FCM registration token. Unique

platform String Yes Enum: web \| android \| ios

device_name String No e.g. Chrome on Windows

is_active Boolean Yes Default: true. Set false on
FCM token error

last_used_at Date No Updated when notification sent

created_at Date Auto timestamps: true

---

**Indexes**

+-----------------------------------------------------------------------+
| { token: 1 } unique: true |
| |
| { user_id: 1, is_active: 1 } |
+=======================================================================+

---

**💳 Group 2 --- Subscription & Payments** --- 5 collections

---

---

## 6. plans

---

**Field** **Type** **Required** **Notes / Validation**

---

\_id ObjectId Auto Primary key

name String Yes e.g. Free, Basic, Standard,
Premium

slug String Yes Unique: free \| basic \|
standard \| premium

description String No Marketing description shown on
pricing page

color String No Hex color for UI badge e.g.
#7F77DD

sort_order Number Yes Display order on pricing page.
Default: 0

price_monthly Number Yes 0 for free plan

price_yearly Number Yes 0 for free plan

currency String Yes Default: BDT

borrow_limit Number Yes Max concurrent borrows. 0 =
disabled

borrow_duration_days Number Yes Days per borrow. 0 = not
allowed

book_access_limit Number Yes -1 = unlimited. 0 = preview
only

monthly_read_limit Number Yes -1 = unlimited. For free plan
quota

offline_access Boolean Yes Download for offline. Default:
false

is_free Boolean Yes true only for Free plan

is_active Boolean Yes Default: true

features \[String\] No Bullet point feature list for
pricing UI

created_at Date Auto timestamps: true

updated_at Date Auto timestamps: true

---

## 7. subscriptions

---

**Field** **Type** **Required** **Notes / Validation**

---

\_id ObjectId Auto Primary key

user_id ObjectId Yes Ref: users

plan_id ObjectId Yes Ref: plans

previous_plan_id ObjectId No Ref: plans. Set on
upgrade/downgrade

billing_cycle String Yes Enum: monthly \| yearly

status String Yes Enum: active \| cancelled \|
expired \| trial \| paused

is_trial Boolean Yes Default: false

trial_ends_at Date No Set if is_trial: true

starts_at Date Yes Subscription start date

ends_at Date Yes Subscription end date

auto_renew Boolean Yes Default: true

renewal_count Number Yes How many times renewed.
Default: 0

cancelled_at Date No Set when user cancels

cancel_reason String No Optional cancellation reason

created_at Date Auto timestamps: true

updated_at Date Auto timestamps: true

---

**Indexes**

+-----------------------------------------------------------------------+
| { user_id: 1, status: 1 } |
| |
| { ends_at: 1 } --- expiry cron |
+=======================================================================+

## 8. payments

---

**Field** **Type** **Required** **Notes / Validation**

---

\_id ObjectId Auto Primary key

user_id ObjectId Yes Ref: users

subscription_id ObjectId Yes Ref: subscriptions

coupon_id ObjectId No Ref: coupons --- if discount
applied

flash_sale_id ObjectId No Ref: flash_sales --- if sale
applied

amount Number Yes Final charged amount

original_amount Number Yes Amount before any discount

discount_amount Number Yes Total discount applied.
Default: 0

currency String Yes BDT \| USD \| etc.

gateway String Yes Enum: bkash \| nagad \| stripe
\| paypal

gateway_txn_id String No Gateway transaction reference
ID

gateway_response Object No Full raw response for audit

status String Yes Enum: pending \| success \|
failed \| refunded

failure_reason String No e.g. insufficient_funds \|
card_declined

invoice_number String No Human-readable e.g.
INV-2025-00001

invoice_url String No Generated PDF invoice
Cloudinary URL

paid_at Date No Set when status → success

created_at Date Auto timestamps: true

updated_at Date Auto timestamps: true

---

**Indexes**

+-----------------------------------------------------------------------+
| { user_id: 1 } |
| |
| { subscription_id: 1 } |
| |
| { gateway_txn_id: 1 } unique: true, sparse: true |
| |
| { status: 1 } |
| |
| { invoice_number: 1 } unique: true, sparse: true |
+=======================================================================+

## 9. refunds

_Separate collection for all refund records. Linked to original
payment._

---

**Field** **Type** **Required** **Notes / Validation**

---

\_id ObjectId Auto Primary key

payment_id ObjectId Yes Ref: payments --- original
payment

user_id ObjectId Yes Ref: users

processed_by ObjectId Yes Ref: staff --- who approved
refund

amount Number Yes Refund amount

currency String Yes Same as original payment

reason String Yes Admin-entered refund reason

gateway String Yes Same gateway as original
payment

gateway_refund_id String No Gateway\'s refund transaction
ID

status String Yes Enum: pending \| processed \|
failed

processed_at Date No Set when refund completes

created_at Date Auto timestamps: true

updated_at Date Auto timestamps: true

---

**Indexes**

+-----------------------------------------------------------------------+
| { payment_id: 1 } |
| |
| { user_id: 1 } |
| |
| { status: 1 } |
+=======================================================================+

## 10. webhook_logs

_Stores every incoming payment gateway webhook for debugging and
idempotency._

---

**Field** **Type** **Required** **Notes / Validation**

---

\_id ObjectId Auto Primary key

gateway String Yes Enum: bkash \| nagad \| stripe
\| paypal

event_type String Yes e.g. payment.success,
subscription.cancelled

gateway_txn_id String No Payment reference from gateway

payload Object Yes Full raw webhook payload

status String Yes Enum: received \| processed \|
failed \| ignored

processed_at Date No Set when successfully
processed

error_message String No Set if processing failed

created_at Date Auto timestamps: true

---

**Indexes**

+-----------------------------------------------------------------------+
| { gateway_txn_id: 1 } --- idempotency check |
| |
| { gateway: 1, status: 1 } |
| |
| { created_at: 1 } expireAfterSeconds: 7776000 (TTL --- 90 days) |
+=======================================================================+

---

**🎁 Group 3 --- Marketing & Promotions** --- 3 collections

---

---

## 11. coupons

---

**Field** **Type** **Required** **Notes / Validation**

---

\_id ObjectId Auto Primary key

code String Yes Unique, uppercase, trim

label String No Internal name e.g. \'Eid Sale
2025\'

discount_type String Yes Enum: percentage \| fixed

discount_value Number Yes 20 = 20% or BDT 20

max_discount_cap Number No Max discount in BDT when
type=percentage

min_amount Number No Min subscription amount to
apply

applicable_plans \[ObjectId\] No Ref: plans. Empty = all plans

applicable_cycles \[String\] No \[monthly\] or \[yearly\] or
both

usage_limit Number No null = unlimited total uses

used_count Number Yes Incremented on each use.
Default: 0

per_user_limit Number Yes Max uses per user. Default: 1

is_active Boolean Yes Default: true

is_birthday Boolean Yes Auto-apply on user birthday.
Default: false

is_first_purchase Boolean Yes Only for first-time paid
users. Default: false

expires_at Date No null = no expiry

created_by ObjectId Yes Ref: staff

created_at Date Auto timestamps: true

updated_at Date Auto timestamps: true

---

**Indexes**

+-----------------------------------------------------------------------+
| { code: 1 } unique: true |
| |
| { is_active: 1 } |
| |
| { expires_at: 1 } |
+=======================================================================+

## 12. coupon_usages

---

**Field** **Type** **Required** **Notes / Validation**

---

\_id ObjectId Auto Primary key

coupon_id ObjectId Yes Ref: coupons

user_id ObjectId Yes Ref: users

payment_id ObjectId Yes Ref: payments

discount_applied Number Yes Actual discount amount applied

used_at Date Auto timestamps: true

---

**Indexes**

---

{ coupon_id: 1, user_id: 1 } --- enforce per-user limit check

---

---

## 13. flash_sales

_Time-limited promotional sale events that apply automatic discounts
within a time window._

---

**Field** **Type** **Required** **Notes / Validation**

---

\_id ObjectId Auto Primary key

title String Yes e.g. Eid Sale, New Year Offer

description String No Shown on homepage banner

banner_image_url String No Cloudinary URL for promotional
banner

discount_type String Yes Enum: percentage \| fixed

discount_value Number Yes Discount amount

applicable_plans \[ObjectId\] No Ref: plans. Empty = all plans

applicable_cycles \[String\] No monthly \| yearly or both

max_redemptions Number No null = unlimited

redeemed_count Number Yes Default: 0

starts_at Date Yes Sale start datetime

ends_at Date Yes Sale end datetime

is_active Boolean Yes Admin toggle. Default: true

created_by ObjectId Yes Ref: staff

created_at Date Auto timestamps: true

updated_at Date Auto timestamps: true

---

**Indexes**

---

{ is_active: 1, starts_at: 1, ends_at: 1 } --- active sale lookup

---

---

---

**📚 Group 4 --- Library & Content** --- 4 collections

---

---

## 14. authors

_Author profiles. Books reference authors by ObjectId._

---

**Field** **Type** **Required** **Notes / Validation**

---

\_id ObjectId Auto Primary key

name String Yes Full author name

slug String Yes Unique URL-friendly slug

bio String No Short biography

photo_url String No Cloudinary URL

nationality String No e.g. Bangladeshi, Indian

website String No Author website URL

book_count Number Yes Denormalized count. Default: 0

is_active Boolean Yes Default: true

created_at Date Auto timestamps: true

updated_at Date Auto timestamps: true

---

**Indexes**

+-----------------------------------------------------------------------+
| { slug: 1 } unique: true |
| |
| { name: \'text\' } --- text search |
+=======================================================================+

## 15. categories

---

**Field** **Type** **Required** **Notes / Validation**

---

\_id ObjectId Auto Primary key

name String Yes e.g. Fiction, Science, History

name_bn String No Bangla name for bilingual UI

slug String Yes Unique URL-friendly slug

parent_id ObjectId No Ref: categories. null = root
category

icon_url String No Category icon (Cloudinary)

book_count Number Yes Denormalized. Default: 0

is_active Boolean Yes Default: true

sort_order Number Yes Display order. Default: 0

created_at Date Auto timestamps: true

---

**Indexes**

+-----------------------------------------------------------------------+
| { slug: 1 } unique: true |
| |
| { parent_id: 1 } |
+=======================================================================+

## 16. books

---

**Field** **Type** **Required** **Notes / Validation**

---

\_id ObjectId Auto Primary key

title String Yes trim, min:1, max:300

title_bn String No Bangla title (bilingual
support)

author_ids \[ObjectId\] Yes Ref: authors --- supports
co-authors

publisher String No Publisher name

isbn String No Unique sparse. ISBN-10 or
ISBN-13

language String Yes Enum: en \| bn \| ar \| hi \|
\...

cover_url String No Cloudinary URL

description String No Book synopsis max:2000

category_ids \[ObjectId\] Yes Ref: categories ---
multi-category

tags \[String\] No Free text tags e.g.
\[\'romance\',\'2024\'\]

access_level String Yes Enum: free \| basic \|
standard \| premium

average_rating Number Yes Default: 0. Updated on review
add/edit/delete

review_count Number Yes Default: 0

read_count Number Yes Total reading starts. Default:
0

borrow_count Number Yes Total borrows ever. Default: 0

wishlist_count Number Yes Total wishlists. Default: 0

available_copies Number Yes For borrow control. Default: 1

total_copies Number Yes Default: 1

total_pages Number No From primary file.
Denormalized

avg_reading_mins Number Yes Average minutes to read.
Default: 0

is_featured Boolean Yes Show on homepage. Default:
false

is_available Boolean Yes Visible to members. Default:
true

published_at Date No Original publication date

added_by ObjectId Yes Ref: staff --- uploader

created_at Date Auto timestamps: true

updated_at Date Auto timestamps: true

---

**Indexes**

+-----------------------------------------------------------------------+
| { title: \'text\', description: \'text\', tags: \'text\' } --- full |
| text search |
| |
| { author_ids: 1 } |
| |
| { category_ids: 1 } |
| |
| { isbn: 1 } unique: true, sparse: true |
| |
| { access_level: 1 } |
| |
| { is_featured: 1, is_available: 1 } |
| |
| { average_rating: -1 } --- top rated sort |
| |
| { read_count: -1 } --- popular sort |
| |
| { created_at: -1 } --- newest sort |
+=======================================================================+

## 17. book_files

---

**Field** **Type** **Required** **Notes / Validation**

---

\_id ObjectId Auto Primary key

book_id ObjectId Yes Ref: books

format String Yes Enum: pdf \| epub

file_url String Yes Backblaze B2 signed URL

file_size_kb Number No File size in KB

total_pages Number No Total page count

is_drm Boolean Yes DRM enabled. Default: true

is_primary Boolean Yes Primary reading format.
Default: false

created_at Date Auto timestamps: true

---

**Indexes**

---

{ book_id: 1, format: 1 } unique: true

---

---

---

**📖 Group 5 --- Reading Activity** --- 8 collections

---

---

## 18. reading_progress

_One document per user per book. Upserted (findOneAndUpdate) on each
session save._

---

**Field** **Type** **Required** **Notes / Validation**

---

\_id ObjectId Auto Primary key

user_id ObjectId Yes Ref: users

book_id ObjectId Yes Ref: books

book_file_id ObjectId Yes Ref: book_files --- which
format

current_page Number Yes Last page read

total_pages Number Yes Copied from book_files for
fast %

percent_complete Number Yes Computed:
(current/total)\*100. 0--100

total_reading_mins Number Yes Cumulative minutes for this
book. Default: 0

is_completed Boolean Yes Default: false

completed_at Date No Set when percent_complete
reaches 100

last_read_at Date Yes Updated each save

created_at Date Auto timestamps: true

updated_at Date Auto timestamps: true

---

**Indexes**

+-----------------------------------------------------------------------+
| { user_id: 1, book_id: 1 } unique: true |
| |
| { user_id: 1, last_read_at: -1 } --- \'currently reading\' list |
| |
| { user_id: 1, is_completed: 1 } |
+=======================================================================+

## 19. reading_sessions

_One document per reading session. Used for reading time analytics and
recommendations._

---

**Field** **Type** **Required** **Notes / Validation**

---

\_id ObjectId Auto Primary key

user_id ObjectId Yes Ref: users

book_id ObjectId Yes Ref: books

book_file_id ObjectId Yes Ref: book_files

start_page Number Yes Page at session start

end_page Number No Page at session end (set on
close)

duration_mins Number No Session length in minutes

device_type String No Enum: desktop \| mobile \|
tablet

started_at Date Yes Session start timestamp

ended_at Date No Session end (null if still
open)

created_at Date Auto timestamps: true

---

**Indexes**

+-----------------------------------------------------------------------+
| { user_id: 1, book_id: 1 } |
| |
| { user_id: 1, started_at: -1 } --- reading history |
| |
| { book_id: 1 } --- book analytics |
| |
| { created_at: 1 } expireAfterSeconds: 31536000 (TTL --- 1 year) |
+=======================================================================+

## 20. bookmarks

---

**Field** **Type** **Required** **Notes / Validation**

---

\_id ObjectId Auto Primary key

user_id ObjectId Yes Ref: users

book_id ObjectId Yes Ref: books

book_file_id ObjectId Yes Ref: book_files

page_number Number Yes Bookmarked page number

label String No Optional user label max:100

created_at Date Auto timestamps: true

---

**Indexes**

---

{ user_id: 1, book_id: 1, page_number: 1 } unique: true

---

---

## 21. highlights

---

**Field** **Type** **Required** **Notes / Validation**

---

\_id ObjectId Auto Primary key

user_id ObjectId Yes Ref: users

book_id ObjectId Yes Ref: books

book_file_id ObjectId Yes Ref: book_files

page_number Number Yes Page of highlight

selected_text String Yes Highlighted text content
max:2000

color String Yes Enum: yellow \| green \| blue
\| pink

note String No User note on highlight
max:1000

created_at Date Auto timestamps: true

updated_at Date Auto timestamps: true

---

**Indexes**

+-----------------------------------------------------------------------+
| { user_id: 1, book_id: 1 } |
| |
| { user_id: 1, book_id: 1, page_number: 1 } |
+=======================================================================+

## 22. borrows

---

**Field** **Type** **Required** **Notes / Validation**

---

\_id ObjectId Auto Primary key

user_id ObjectId Yes Ref: users

book_id ObjectId Yes Ref: books

book_file_id ObjectId Yes Ref: book_files --- which
format borrowed

plan_id ObjectId Yes Ref: plans --- plan at time of
borrow

status String Yes Enum: active \| returned \|
expired

borrowed_at Date Yes Borrow start time

due_at Date Yes Expiry based on
plan.borrow_duration_days

returned_at Date No Set when returned early
manually

reminder_sent Boolean Yes Expiry reminder sent. Default:
false

created_at Date Auto timestamps: true

updated_at Date Auto timestamps: true

---

**Indexes**

+-----------------------------------------------------------------------+
| { user_id: 1, status: 1 } |
| |
| { book_id: 1, status: 1 } |
| |
| { due_at: 1 } --- expiry cron |
+=======================================================================+

## 23. reservations

---

**Field** **Type** **Required** **Notes / Validation**

---

\_id ObjectId Auto Primary key

user_id ObjectId Yes Ref: users

book_id ObjectId Yes Ref: books

queue_position Number Yes Position in queue. 1 = next to
be notified

status String Yes Enum: waiting \| notified \|
fulfilled \| cancelled \|
expired

notified_at Date No When availability notification
was sent

claim_expires_at Date No 48hr window to claim after
notified

created_at Date Auto timestamps: true

updated_at Date Auto timestamps: true

---

**Indexes**

+-----------------------------------------------------------------------+
| { user_id: 1, book_id: 1 } unique: true |
| |
| { book_id: 1, queue_position: 1 } |
| |
| { status: 1 } |
| |
| { claim_expires_at: 1 } --- expiry cron |
+=======================================================================+

## 24. wishlists

---

**Field** **Type** **Required** **Notes / Validation**

---

\_id ObjectId Auto Primary key

user_id ObjectId Yes Ref: users

book_id ObjectId Yes Ref: books

created_at Date Auto timestamps: true

---

**Indexes**

+-----------------------------------------------------------------------+
| { user_id: 1, book_id: 1 } unique: true |
| |
| { book_id: 1 } --- wishlist_count aggregation |
+=======================================================================+

## 25. reviews

---

**Field** **Type** **Required** **Notes / Validation**

---

\_id ObjectId Auto Primary key

user_id ObjectId Yes Ref: users

book_id ObjectId Yes Ref: books

rating Number Yes Integer 1--5

review_text String No Optional written review
max:2000

helpful_count Number Yes Other users marked helpful.
Default: 0

is_visible Boolean Yes Admin can hide. Default: true

is_verified Boolean Yes User actually read the book.
Default: false

created_at Date Auto timestamps: true

updated_at Date Auto timestamps: true

---

**Indexes**

+-----------------------------------------------------------------------+
| { user_id: 1, book_id: 1 } unique: true |
| |
| { book_id: 1, is_visible: 1, rating: -1 } |
+=======================================================================+

---

**🔔 Group 6 --- Notifications & System** --- 3 collections

---

---

## 26. notifications

_In-app notifications. Email/SMS/Push handled by external services
(Resend, Twilio, FCM)._

---

**Field** **Type** **Required** **Notes / Validation**

---

\_id ObjectId Auto Primary key

user_id ObjectId Yes Ref: users

type String Yes Enum: subscription_confirmed
\| renewal_reminder \|
borrow_expiry \|
reservation_ready \| new_book
\| offer \| account_suspended
\| payment_failed \|
refund_processed

title String Yes Short title max:150

body String Yes Full message max:500

link String No Deep-link URL within dashboard

metadata Object No Extra data e.g. { book_id,
plan_id } for rich UI

is_read Boolean Yes Default: false

read_at Date No Set when user opens
notification

created_at Date Auto timestamps: true

---

**Indexes**

+-----------------------------------------------------------------------+
| { user_id: 1, is_read: 1, created_at: -1 } |
| |
| { created_at: 1 } expireAfterSeconds: 7776000 (TTL --- 90 days) |
+=======================================================================+

## 27. notification_logs

_Delivery audit log for every email, SMS, and push notification sent.
For debugging and compliance._

---

**Field** **Type** **Required** **Notes / Validation**

---

\_id ObjectId Auto Primary key

user_id ObjectId Yes Ref: users

channel String Yes Enum: email \| sms \| push

type String Yes Same type enum as
notifications

recipient String Yes Email address, phone number,
or FCM token

subject String No Email subject line

body String Yes Message content sent

provider String Yes resend \| twilio \|
ssl_wireless \| fcm

provider_msg_id String No Provider\'s message ID for
tracking

status String Yes Enum: sent \| delivered \|
failed \| bounced

error_message String No Provider error if failed

sent_at Date Yes Timestamp of send attempt

created_at Date Auto timestamps: true

---

**Indexes**

+-----------------------------------------------------------------------+
| { user_id: 1, channel: 1, created_at: -1 } |
| |
| { status: 1 } |
| |
| { created_at: 1 } expireAfterSeconds: 7776000 (TTL --- 90 days) |
+=======================================================================+

## 28. search_logs

_Tracks user search queries. Used for search analytics and improving
recommendations._

---

**Field** **Type** **Required** **Notes / Validation**

---

\_id ObjectId Auto Primary key

user_id ObjectId No Ref: users. null = anonymous
search

query String Yes Search query text

filters Object No Applied filters e.g. {
category, language }

results_count Number Yes Number of results returned

clicked_book_id ObjectId No Ref: books. Which result user
clicked

created_at Date Auto timestamps: true

---

**Indexes**

+-----------------------------------------------------------------------+
| { user_id: 1, created_at: -1 } |
| |
| { query: \'text\' } --- popular searches analytics |
| |
| { created_at: 1 } expireAfterSeconds: 15552000 (TTL --- 180 days) |
+=======================================================================+

---

**👑 Group 7 --- RBAC & Staff System** --- 6 collections

---

---

## 29. permissions

_Seeded on first deploy. Never deleted by admin --- only toggled._

---

**Field** **Type** **Required** **Notes / Validation**

---

\_id ObjectId Auto Primary key

name String Yes Unique. Format: module.action
e.g. books.create

module String Yes Enum: books \| members \|
subscriptions \| borrows \|
notifications \| coupons \|
flash_sales \| reports \|
settings

action String Yes Enum: view \| create \| edit
\| delete \| export \| send \|
refund \| suspend \| manage

description String No Human-readable description

is_active Boolean Yes Default: true

---

**Complete Seed Data**

+-----------------------------------------------------------------------+
| books.view books.create books.edit books.delete books.upload |
| |
| members.view members.edit members.delete members.suspend |
| |
| subscriptions.view subscriptions.edit subscriptions.refund |
| subscriptions.manage |
| |
| borrows.view borrows.manage |
| |
| notifications.send |
| |
| coupons.view coupons.create coupons.edit coupons.delete |
| |
| flash_sales.view flash_sales.create flash_sales.edit |
| flash_sales.delete |
| |
| reports.view reports.export |
| |
| settings.view settings.edit |
+=======================================================================+

## 30. roles

---

**Field** **Type** **Required** **Notes / Validation**

---

\_id ObjectId Auto Primary key

name String Yes Unique role name e.g. Book
Manager

description String No Role description

permissions \[ObjectId\] Yes Ref: permissions --- embedded
for fast check

staff_count Number Yes Denormalized. Default: 0

is_active Boolean Yes Default: true

created_by ObjectId Yes Ref: staff (admin)

created_at Date Auto timestamps: true

updated_at Date Auto timestamps: true

---

**Indexes**

---

{ name: 1 } unique: true

---

---

## 31. staff

---

**Field** **Type** **Required** **Notes / Validation**

---

\_id ObjectId Auto Primary key

name String Yes Full name

email String Yes Unique, lowercase

password_hash String No null until invite accepted

role_id ObjectId Yes Ref: roles

status String Yes Enum: pending \| active \|
suspended \| deleted

invited_by ObjectId Yes Ref: staff (admin who invited)

two_factor Object Yes Embedded 2FA state object
with enabled, secret,
pending_secret,
last_verified_at

joined_at Date No Set when invite accepted

last_login_at Date No Updated each login

last_login_ip String No IP of last successful login

created_at Date Auto timestamps: true

updated_at Date Auto timestamps: true

---

**Indexes**

+-----------------------------------------------------------------------+
| { email: 1 } unique: true |
| |
| { role_id: 1 } |
| |
| { status: 1 } |
+=======================================================================+

## 32. staff_invite_tokens

---

**Field** **Type** **Required** **Notes / Validation**

---

\_id ObjectId Auto Primary key

staff_id ObjectId Yes Ref: staff

token String Yes Unique. crypto random hex
(hashed)

expires_at Date Yes createdAt + 48 hours

used_at Date No Set when staff accepts invite

created_at Date Auto timestamps: true

---

**Indexes**

+-----------------------------------------------------------------------+
| { token: 1 } unique: true |
| |
| { expires_at: 1 } expireAfterSeconds: 0 (TTL) |
+=======================================================================+

## 33. staff_activity_logs

---

**Field** **Type** **Required** **Notes / Validation**

---

\_id ObjectId Auto Primary key

staff_id ObjectId Yes Ref: staff

action String Yes Permission name e.g.
books.create

module String Yes Module acted on

target_id ObjectId No ID of affected document

target_type String No e.g. Book \| User \| Coupon \|
FlashSale

description String Yes Human-readable e.g. \'Added
book: রবীন্দ্র রচনাবলী\'

ip_address String No Staff IP at action time

created_at Date Auto timestamps: true

---

**Indexes**

+-----------------------------------------------------------------------+
| { staff_id: 1, created_at: -1 } |
| |
| { created_at: 1 } expireAfterSeconds: 15552000 (TTL --- 180 days) |
+=======================================================================+

## 34. admin_activity_logs

_Separate audit log for Super Admin actions --- higher sensitivity,
longer retention._

---

**Field** **Type** **Required** **Notes / Validation**

---

\_id ObjectId Auto Primary key

action String Yes e.g. role.created \|
staff.deleted \| plan.edited
\| settings.updated

module String Yes Module acted on

target_id ObjectId No ID of affected document

target_type String No e.g. Role \| Staff \| Plan \|
Settings

description String Yes Human-readable action summary

before_data Object No Snapshot of document before
change

after_data Object No Snapshot of document after
change

ip_address String No Admin IP

created_at Date Auto timestamps: true

---

**Indexes**

+-----------------------------------------------------------------------+
| { module: 1, created_at: -1 } |
| |
| { created_at: 1 } expireAfterSeconds: 63072000 (TTL --- 2 years) |
+=======================================================================+

---

**📊 Group 8 --- Reports** --- 1 collection

---

---

## 35. report_jobs

_Queues and stores generated reports. PDF/Excel exports are async ---
queued, generated, then downloadable._

---

**Field** **Type** **Required** **Notes / Validation**

---

\_id ObjectId Auto Primary key

requested_by ObjectId Yes Ref: staff --- who requested
the report

type String Yes Enum: revenue_monthly \|
revenue_yearly \| top_books \|
active_users \| inactive_users
\| subscriptions \|
coupon_usage \| staff_activity
\| borrow_stats \|
reading_analytics

format String Yes Enum: pdf \| excel

filters Object No Applied filters e.g. { from:
Date, to: Date, plan_id }

status String Yes Enum: queued \| processing \|
completed \| failed

file_url String No Cloudinary/S3 URL. Set when
completed

file_size_kb Number No Generated file size

row_count Number No Number of data rows in report

error_message String No Set if generation failed

expires_at Date No Download link expiry (7 days
after generation)

completed_at Date No Set when file ready

created_at Date Auto timestamps: true

updated_at Date Auto timestamps: true

---

**Indexes**

+-----------------------------------------------------------------------+
| { requested_by: 1, created_at: -1 } |
| |
| { status: 1 } --- processing queue |
| |
| { expires_at: 1 } expireAfterSeconds: 0 (TTL --- auto-delete expired |
| reports) |
+=======================================================================+

---

**⚙️ Group 9 --- System Settings** --- 1 collection --- singleton

---

---

## 36. settings

_Single document. Use findOne(). Never insert more than one document in
this collection._

---

**Field** **Type** **Required** **Notes / Validation**

---

\_id ObjectId Auto Primary key (singleton)

library_name String Yes e.g. MyLibrary

library_name_bn String No Bangla name

library_logo_url String No Cloudinary URL

library_address String No Physical/mailing address

support_email String Yes Primary support contact

support_phone String No Support phone number

default_language String Yes Enum: en \| bn. Default: en

default_currency String Yes BDT \| USD. Default: BDT

default_timezone String Yes Default: Asia/Dhaka

trial_duration_days Number Yes Default: 7

maintenance_mode Boolean Yes Disable access for users.
Default: false

maintenance_message String No Shown to users during
maintenance

new_user_auto_trial Boolean Yes Auto-start trial on
registration. Default: true

report_schedule Object No { monthly_revenue: \'0 9 1 \*
\*\' } --- cron expressions

sslcommerz Object No { store_id, store_passwd,
is_live } --- encrypted

stripe Object No { publishable_key, secret_key,
webhook_secret }

paypal Object No { client_id, client_secret,
mode: sandbox\|live }

email_provider String No Enum: resend \| sendgrid \|
nodemailer

email_config Object No Provider API keys (encrypted)

sms_provider String No Enum: twilio \| ssl_wireless
\| alpha_sms

sms_config Object No Provider credentials
(encrypted)

fcm_server_key String No Firebase Cloud Messaging
server key

cloudinary_config Object No { cloud_name, api_key,
api_secret }

storage_config Object No Backblaze B2 config { key_id,
app_key, bucket }

email_templates Object No Custom HTML per notification
type

sms_templates Object No Custom SMS text per
notification type

updated_at Date Auto timestamps: true

---

---

**📊 Admin Dashboard --- Reports: Complete Design** --- Data sources ·
Aggregation · Filters · Output

---

---

_Every report in the Admin Dashboard is generated by MongoDB Aggregation
Pipelines. Reports can be viewed live on-screen or exported as PDF/Excel
via the report_jobs queue. Below is the complete design for each
report._

## How Reports Work

---

**Step** **What happens**

---

1\. Request Admin/Staff clicks \'Generate Report\' with filters (date
range, plan, etc.)

2\. Queue A new document is inserted into report_jobs with status:
queued

3\. Cron Report Generator cron picks up queued jobs every 2 minutes
job

4\. MongoDB aggregation pipeline runs against the relevant
Aggregate collections

5\. Result is formatted into PDF (pdfkit) or Excel (exceljs)
Generate file

6\. Upload Generated file is uploaded to Cloudinary / Backblaze B2

7\. Notify report_jobs.status → completed, file_url saved, staff
notified in-app

8\. Staff clicks download link --- valid for 7 days (expires_at
Download TTL)

---

## Report 1 --- Monthly Revenue

_Shows total revenue, transaction count, discount given, and refunds ---
broken down by month._

**Data Source**

---

**Collection** **Fields Used**

---

payments amount, original_amount, discount_amount, currency,
gateway, status, paid_at

refunds amount, status, processed_at

users name, email (for per-user breakdown)

plans name (for plan-wise revenue breakdown)

subscriptions plan_id, billing_cycle

---

**Filters Available**

---

**Filter** **Type** **Description**

---

Date Range Date picker from_date to to_date --- defaults to current
month

Gateway Multi-select bkash \| nagad \| stripe \| paypal \| all

Currency Select BDT \| USD \| all

Plan Multi-select Filter by subscription plan

Billing Cycle Select monthly \| yearly \| all

---

**Aggregation Pipeline (MongoDB)**

+-----------------------------------------------------------------------+
| db.payments.aggregate(\[ |
| |
| { \$match: { |
| |
| status: \'success\', |
| |
| paid_at: { \$gte: from_date, \$lte: to_date } |
| |
| }}, |
| |
| { \$lookup: { from: \'subscriptions\', localField: |
| \'subscription_id\', |
| |
| foreignField: \'\_id\', as: \'sub\' }}, |
| |
| { \$unwind: \'\$sub\' }, |
| |
| { \$lookup: { from: \'plans\', localField: \'sub.plan_id\', |
| |
| foreignField: \'\_id\', as: \'plan\' }}, |
| |
| { \$group: { |
| |
| \_id: { year: { \$year: \'\$paid_at\' }, month: { \$month: |
| \'\$paid_at\' } }, |
| |
| total_revenue: { \$sum: \'\$amount\' }, |
| |
| total_discount: { \$sum: \'\$discount_amount\' }, |
| |
| transaction_count: { \$sum: 1 }, |
| |
| by_gateway: { \$push: { g: \'\$gateway\', a: \'\$amount\' } }, |
| |
| by_plan: { \$push: { p: \'\$plan.name\', a: \'\$amount\' } } |
| |
| }}, |
| |
| { \$sort: { \'\_id.year\': -1, \'\_id.month\': -1 } } |
| |
| \]) |
+=======================================================================+

**Output Columns**

---

**Column** **Description**

---

Month / Year e.g. January 2025

Gross Revenue Sum of original_amount

Discount Given Sum of discount_amount

Net Revenue Sum of amount (after discount)

Refunds Total refunded amount from refunds collection

Final Revenue Net Revenue minus Refunds

Transactions Total successful payment count

Avg. Order Value Net Revenue / Transactions

By Gateway Breakdown: bKash / Nagad / Stripe / PayPal

By Plan Breakdown: Free / Basic / Standard / Premium

By Billing Cycle Monthly vs Yearly split

---

## Report 2 --- Yearly Revenue

_Same as Monthly Revenue but grouped by year. Includes year-over-year
growth %._

**Extra Output Columns**

---

**Column** **Description**

---

YoY Growth % ((this_year - last_year) / last_year) \* 100

Best Month Month with highest revenue in that year

Worst Month Month with lowest revenue in that year

Avg Monthly Total yearly revenue / 12

---

## Report 3 --- Top Books Report

_Ranks books by read count, borrow count, wishlist count, review count,
and average rating._

**Data Source**

---

**Collection** **Fields Used**

---

books title, author_ids, cover_url, read_count,
borrow_count, wishlist_count, average_rating,
review_count, access_level

reading_sessions book_id, duration_mins, created_at --- for reading
time analytics

reviews book_id, rating --- for rating distribution

authors name --- for author name display

categories name --- for category display

---

**Filters Available**

---

**Filter** **Type** **Description**

---

Date Range Date picker Filter by when reading sessions occurred

Category Multi-select Filter by book category

Language Multi-select Filter by book language

Access Level Multi-select free \| basic \| standard \| premium

Sort By Select read_count \| borrow_count \| average_rating
\| wishlist_count

Limit Number Top 10 / 25 / 50 / 100

---

**Aggregation Pipeline**

+-----------------------------------------------------------------------+
| db.reading_sessions.aggregate(\[ |
| |
| { \$match: { created_at: { \$gte: from_date, \$lte: to_date } } }, |
| |
| { \$group: { |
| |
| \_id: \'\$book_id\', |
| |
| session_count: { \$sum: 1 }, |
| |
| total_read_mins: { \$sum: \'\$duration_mins\' }, |
| |
| unique_readers: { \$addToSet: \'\$user_id\' } |
| |
| }}, |
| |
| { \$lookup: { from: \'books\', localField: \'\_id\', |
| |
| foreignField: \'\_id\', as: \'book\' }}, |
| |
| { \$unwind: \'\$book\' }, |
| |
| { \$project: { |
| |
| title: \'\$book.title\', |
| |
| read_count: \'\$book.read_count\', |
| |
| borrow_count: \'\$book.borrow_count\', |
| |
| average_rating: \'\$book.average_rating\', |
| |
| session_count: 1, |
| |
| total_read_mins: 1, |
| |
| unique_readers: { \$size: \'\$unique_readers\' } |
| |
| }}, |
| |
| { \$sort: { read_count: -1 } }, |
| |
| { \$limit: 50 } |
| |
| \]) |
+=======================================================================+

**Output Columns**

---

**Column** **Description**

---

Rank 1, 2, 3 \...

Book Title With cover thumbnail

Author Author name(s)

Category Category name

Access Level free \| basic \| standard \| premium

Total Reads books.read_count

Total Borrows books.borrow_count

Wishlisted books.wishlist_count

Avg Rating books.average_rating (★ display)

Review Count books.review_count

Unique Readers Distinct users who read

Avg Read Time Total reading minutes / session count

---

## Report 4 --- User Analytics Report

_Comprehensive user activity --- new registrations, active vs inactive,
reading habits, plan distribution._

**Data Source**

---

**Collection** **Fields Used**

---

users name, email, status, subscription_status,
current_plan_id, reading_streak_days,
total_books_read, total_reading_mins, created_at,
last_active_at

subscriptions plan_id, status, billing_cycle, created_at

reading_sessions user_id, duration_mins, created_at

reading_progress user_id, is_completed, percent_complete

reviews user_id --- to count active reviewers

login_history actor_id, created_at --- for login frequency

---

**Filters Available**

---

**Filter** **Type** **Description**

---

Date Range Date picker Registration date range

Status Multi-select active \| suspended \| deleted

Subscription Multi-select free \| trial \| active \| expired
Status

Plan Multi-select Filter by current plan

Activity Select active (read in last 30 days) \| inactive
(no activity 30+ days)

Language Select en \| bn

---

**Sub-reports Included**

---

**Sub-report** **Description** **Aggregation Source**

---

New Registrations Daily/weekly/monthly new users.created_at
signups chart

Plan Distribution Pie chart: how many users users.current_plan_id
on each plan

Active vs Inactive Users who read in last 30 reading_sessions.created_at
days vs not

Top Readers Users with highest users.total_reading_mins
total_reading_mins

Reading Streak Users with streak \>= 7, users.reading_streak_days
30, 60 days

Completion Rate \% users who completed at reading_progress.is_completed
least 1 book

Churn Analysis Users who cancelled subscriptions.cancelled_at
subscription this period

Login Frequency Avg logins per user per login_history
month

---

**Output Columns (User List)**

---

**Column** **Description**

---

Name User full name

Email User email

Registered Registration date

Plan Current active plan

Status active \| suspended

Books Read users.total_books_read

Reading Time users.total_reading_mins (formatted as hrs)

Streak users.reading_streak_days days

Last Active users.last_active_at

Login Count Total logins from login_history

Reviews Written Count from reviews collection

---

## Report 5 --- Subscription Report

_Tracks MRR, ARR, new subscriptions, cancellations, upgrades,
downgrades, and churn rate._

**Data Source**

---

**Collection** **Fields Used**

---

subscriptions All fields --- primary source

plans name, price_monthly, price_yearly

users name, email

payments amount --- for actual revenue tied to subscription

---

**Key Metrics Calculated**

---

**Metric** **Formula / Logic**

---

MRR (Monthly Recurring SUM(active monthly subs × price) + SUM(active
Revenue) yearly subs × price / 12)

ARR (Annual Recurring MRR × 12
Revenue)

New Subscriptions COUNT where status=active AND starts_at in
date range

Cancellations COUNT where cancelled_at in date range

Churn Rate % (Cancellations / Total Active at period start)
× 100

Upgrades COUNT where previous_plan_id is set AND new
plan price \> old

Downgrades COUNT where previous_plan_id is set AND new
plan price \< old

Trial Conversions COUNT where is_trial was true and status =
active now

Renewal Rate % (Renewed subs / subs that were due for
renewal) × 100

Avg Subscription Age AVG(now - starts_at) for all active
subscriptions

---

**Output Columns (Subscription List)**

---

**Column** **Description**

---

User Name + email

Plan Current plan name

Billing Cycle monthly \| yearly

Status active \| trial \| cancelled \| expired

Start Date subscriptions.starts_at

End Date subscriptions.ends_at

Renewals subscriptions.renewal_count

Total Paid SUM of all payments for this subscription

Cancelled At subscriptions.cancelled_at

Cancel Reason subscriptions.cancel_reason

---

## Report 6 --- Active & Inactive Users Report

_Identifies engaged users vs users at risk of churning. Useful for
re-engagement campaigns._

**Definition of Active vs Inactive**

---

**Status** **Definition**

---

Active Had at least 1 reading_session in the last 30 days

Semi-Active Had reading_session 31--90 days ago but not in last
30

Inactive No reading_session in 90+ days

Never Read Has subscription but zero reading_sessions ever

---

**Aggregation Pipeline**

+-----------------------------------------------------------------------+
| db.users.aggregate(\[ |
| |
| { \$match: { subscription_status: { \$in: \[\'active\',\'trial\'\] } |
| } }, |
| |
| { \$lookup: { |
| |
| from: \'reading_sessions\', |
| |
| let: { uid: \'\$\_id\' }, |
| |
| pipeline: \[ |
| |
| { \$match: { \$expr: { \$eq: \[\'\$user_id\', \'\$\$uid\'\] } } }, |
| |
| { \$sort: { created_at: -1 } }, |
| |
| { \$limit: 1 } |
| |
| \], |
| |
| as: \'last_session\' |
| |
| }}, |
| |
| { \$addFields: { |
| |
| last_read: { \$arrayElemAt: \[\'\$last_session.created_at\', 0\] }, |
| |
| days_since_read: { |
| |
| \$divide: \[{ \$subtract: \[new Date(), \'\$last_read\'\] }, |
| 86400000\] |
| |
| } |
| |
| }}, |
| |
| { \$addFields: { |
| |
| activity_status: { \$switch: { branches: \[ |
| |
| { case: { \$lte: \[\'\$days_since_read\', 30\] }, then: \'active\' }, |
| |
| { case: { \$lte: \[\'\$days_since_read\', 90\] }, then: |
| \'semi_active\' }, |
| |
| { case: { \$gt: \[\'\$days_since_read\', 90\] }, then: \'inactive\' } |
| |
| \], default: \'never_read\' }} |
| |
| }} |
| |
| \]) |
+=======================================================================+

## Report 7 --- Coupon Usage Report

_Shows which coupons are being used, by whom, how often, and how much
discount was given._

**Data Source**

---

**Collection** **Fields Used**

---

coupons code, label, discount_type, discount_value,
usage_limit, used_count, expires_at

coupon_usages coupon_id, user_id, payment_id, discount_applied,
used_at

payments amount, original_amount --- to calculate savings

users name, email --- who used the coupon

flash_sales title --- if flash sale discount was applied instead

---

**Output Columns**

---

**Column** **Description**

---

Coupon Code coupons.code

Label Internal name e.g. Eid Sale 2025

Type percentage \| fixed

Discount Value e.g. 20% or BDT 100

Total Uses coupon_usages count for this coupon

Usage Limit coupons.usage_limit

Remaining Uses usage_limit - used_count

Total Discount SUM(coupon_usages.discount_applied)
Given

Total Revenue SUM(payments.amount) where coupon applied
Impact

Unique Users DISTINCT count of user_id in coupon_usages

Expires At coupons.expires_at

Status active \| expired \| exhausted

---

## Report 8 --- Borrow & Reservation Stats

_Tracks book borrowing patterns, return rates, overdue stats, and
reservation queue health._

**Data Source**

---

**Collection** **Fields Used**

---

borrows All fields --- primary source

reservations All fields --- reservation analytics

books title, author_ids, available_copies

users name, email

plans name --- to see which plans borrow most

---

**Key Metrics**

---

**Metric** **Description**

---

Total Borrows COUNT of all borrows in date range

Active Borrows COUNT where status = active

Returned On Time COUNT where returned_at \<= due_at

Expired (Overdue) COUNT where status = expired

Avg Borrow Duration AVG(due_at - borrowed_at) in days

Most Borrowed Books books ranked by borrow_count in period

Most Borrowing Users users ranked by borrow count

Total Reservations COUNT from reservations collection

Avg Queue Size AVG queue_position per book

Avg Wait Time AVG(notified_at - created_at) for fulfilled
reservations

Fulfillment Rate fulfilled / total reservations × 100

---

## Report 9 --- Staff Activity Report

_Audit log report --- who did what, when, and how much. Used for
accountability and performance review._

**Data Source**

---

**Collection** **Fields Used**

---

staff_activity_logs All fields --- primary source

admin_activity_logs All fields --- for admin actions

staff name, email, role_id

roles name --- role display

---

**Filters Available**

---

**Filter** **Type** **Description**

---

Date Range Date picker Filter by action date

Staff Member Multi-select Filter by specific staff

Module Multi-select books \| members \| subscriptions \| coupons
\| reports \| settings

Action Multi-select view \| create \| edit \| delete \| export \|
send \| refund

---

**Output Columns**

---

**Column** **Description**

---

Staff Name staff.name

Role roles.name

Action e.g. books.create --- human readable

Module Which section

Target What was affected e.g. \'Book: রবীন্দ্র রচনাবলী\'

Description Full human-readable description

IP Address staff_activity_logs.ip_address

Date & Time created_at formatted

---

**Summary Metrics**

---

**Metric** **Description**

---

Total Actions Total log entries in date range

Actions by Staff Breakdown per staff member --- who is most active

Actions by Module Which module had most activity

Actions by Type create vs edit vs delete breakdown

Most Active Day Day with highest action count

Most Active Time Hour of day with highest activity

---

## Report 10 --- Reading Analytics Report

_Deep-dive into how members are reading --- time spent, completion
rates, popular genres, device usage._

**Data Source**

---

**Collection** **Fields Used**

---

reading_sessions All fields --- primary source

reading_progress percent_complete, is_completed, total_reading_mins

books title, category_ids, language, access_level

categories name --- for genre analytics

users total_books_read, total_reading_mins,
reading_streak_days

---

**Sub-reports Included**

---

**Sub-report** **Description**

---

Total Reading Time SUM of all reading_sessions.duration_mins in date
range

Avg Session Length AVG(duration_mins) per session

Completion Rate Books where is_completed=true / total books
started × 100

Peak Reading Hours GROUP BY hour of day from
reading_sessions.started_at

Peak Reading Days GROUP BY day of week --- when do people read most

Popular Genres TOP categories by session count

Language Breakdown Sessions by book language (EN vs BN vs others)

Format Preference PDF vs EPUB usage from book_files.format

Device Breakdown desktop vs mobile vs tablet from
reading_sessions.device_type

Reading Streak Stats Distribution of users.reading_streak_days

Dropout Analysis Books with high start rate but low completion
rate

New vs Return Readers First-time book starts vs returning to same book

---

**Aggregation Pipeline --- Peak Reading Hours**

+-----------------------------------------------------------------------+
| db.reading_sessions.aggregate(\[ |
| |
| { \$match: { created_at: { \$gte: from_date, \$lte: to_date } } }, |
| |
| { \$addFields: { |
| |
| hour: { \$hour: { date: \'\$started_at\', timezone: \'Asia/Dhaka\' } |
| }, |
| |
| day_of_week: { \$dayOfWeek: { date: \'\$started_at\', timezone: |
| \'Asia/Dhaka\' } } |
| |
| }}, |
| |
| { \$group: { |
| |
| \_id: { hour: \'\$hour\', day: \'\$day_of_week\' }, |
| |
| session_count: { \$sum: 1 }, |
| |
| total_mins: { \$sum: \'\$duration_mins\' } |
| |
| }}, |
| |
| { \$sort: { session_count: -1 } } |
| |
| \]) |
+=======================================================================+

## Admin Dashboard Overview (Live --- No Export)

_The main dashboard page shows live counters and charts. These are NOT
report_jobs --- they run as direct API queries on page load with
lightweight aggregations._

---

**Widget** **Data Source** **Query Type**

---

Total Members users COUNT where status=active

Active Subscriptions users COUNT where
subscription_status=active

New Members Today users COUNT where created_at \>=
today 00:00

MRR subscriptions Calculated from active sub
prices

Revenue This Month payments SUM amount where paid_at in
current month

Total Books books COUNT where is_available=true

Books Added This books COUNT where created_at in
Month current month

Active Borrows borrows COUNT where status=active

Pending Reservations reservations COUNT where status=waiting

Pending Reports report_jobs COUNT where
status=queued\|processing

Registration Chart users GROUP BY date for last 30 days

Revenue Chart payments GROUP BY date for last 30 days

Popular Books Chart books TOP 5 by read_count

Plan Distribution Pie users GROUP BY current_plan_id

Failed Payments payments COUNT where status=failed,
last 7 days

Subscription Expiring subscriptions COUNT where ends_at within 7
days

---

## Report Export Formats

---

**Format** **Library** **Contents**

---

PDF pdfkit (Node.js --- Header with library logo, filters
Free) applied, summary metrics, data table,
page numbers, generated date

Excel exceljs (Node.js --- Summary sheet + data sheet. Formatted
Free) headers, column widths auto-fit, number
formatting, date formatting

---

## Report Permissions (RBAC)

---

**Permission** **Who Can Access**

---

reports.view Can view report dashboard and live widgets. Cannot
export.

reports.export Can request PDF/Excel export via report_jobs queue.

No permission Cannot see Reports section at all --- hidden from
sidebar.

---

---

**⏱️ TTL Indexes & Auto-expiry Summary**

---

---

---

**Collection** **TTL Field** **Duration** **Effect**

---

email_verify_tokens expires_at At date (0s) Auto-delete expired
tokens

password_reset_tokens expires_at At date (0s) Auto-delete expired
tokens

staff_invite_tokens expires_at At date (0s) Auto-delete expired
invites

login_history created_at 90 days Rolling window of login
history

webhook_logs created_at 90 days Auto-cleanup webhook logs

notifications created_at 90 days Auto-delete old in-app
notifications

notification_logs created_at 90 days Auto-delete delivery logs

reading_sessions created_at 1 year Auto-cleanup old session
data

search_logs created_at 180 days Auto-cleanup search
history

staff_activity_logs created_at 180 days Auto-cleanup staff logs

admin_activity_logs created_at 2 years Longer retention for
admin audit

report_jobs expires_at At date (0s) Auto-delete expired
report files

---

---

**🔄 Background Cron Jobs Required**

---

---

---

**Job** **Schedule** **What it does**

---

Subscription expiry Every hour Mark subs expired, reset
user.subscription_status to free

Borrow expiry Every hour Mark borrows expired, increment
book.available_copies

Reservation Every 30 min When borrow expires → notify next
notifier user in queue

Reservation claim Every 30 min Cancel reservations where claim
expiry window (48hr) passed

Renewal reminder Daily at 9AM Email+SMS users whose subscription
expires in 3 days

Birthday coupon Daily at 8AM Apply birthday coupon for users with
sender birthday today

Flash sale Every 5 min Activate/deactivate flash sales based
activator on starts_at/ends_at

Reading streak Daily at Reset streak if user didn\'t read
updater midnight yesterday

Report generator Every 2 min Pick queued report_jobs, generate
file, update status

Device token Weekly Remove FCM tokens that have been
cleanup inactive 90+ days

---

_Digital Library Management System --- MongoDB Database Design v3.0_

_36 Collections \| 10 Reports \| Mongoose ODM \| MongoDB Atlas Free
Tier_
