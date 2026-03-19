**Digital Library Management System**

**Final Complete Feature List**

Version 2.0 \| Web-Based SaaS \| Global Market

# System Overview

---

**Item** **Detail**

---

Product Type Web-Based SaaS Digital Library

Target Market Global (Bangladesh + International)

Platform Web (Mobile Responsive)

Languages English + Bangla

Library Type Digital / E-Book Only

Business Model Freemium + Subscription

Payment bKash, Nagad, Stripe, PayPal

E-Book Formats PDF + EPUB

Notifications Email, SMS, In-App, Push

Authentication Email/Password, Google, Facebook

---

# User Structure

---

**Role** **Access Level** **Description**

---

Super Admin (You) Full Access CEO --- Controls everything
including roles, staff, revenue,
settings

Librarian / Staff RBAC Based Invited by Admin --- access only
per assigned role permissions

Member / User User Dashboard Registered customers who subscribe
and read books

---

# Module 1 --- Public Homepage

Visible to everyone --- no login required.

- Library introduction and description

- Featured / Popular books list with preview

- Pricing plans display (Free vs Paid comparison)

- Register / Login buttons

- English and Bangla language toggle

- Fully responsive design (Mobile + Desktop)

- Call-to-action sections for registration

- Testimonials / Reviews section

# Module 2 --- Authentication Module

## Registration & Login

- Email / Password registration

- Google OAuth Login

- Facebook OAuth Login

- Secure password hashing (bcrypt)

- JWT-based session management

## Email Verification

- Verification email sent automatically after registration

- If not verified --- Dashboard shows Banner + Resend Option

- Verification link expires after 24 hours

- Resend verification email option

## Password Management

- Forgot password via email link

- Password reset with secure token

- Password change from profile settings

## Profile

- Update name, profile picture

- Change password

- Language preference (English / Bangla)

- Notification preferences

# Module 3 --- Onboarding Flow

After email verification is complete, users are guided through plan
selection.

- Plan Selection Page appears after verification

- Free Plan option --- goes directly to dashboard with limited access

- Paid Plan option --- redirects to payment flow

- Payment successful --- full dashboard access granted

- \"Skip for now\" option --- enters dashboard with upgrade prompts

- Step-by-step onboarding wizard for new users

# Module 4 --- Subscription & Payment

## Plans

---

**Plan** **Access** **Billing**

---

Free Limited books, preview only, basic Free forever
features

Basic Limited book access, bookmarks Monthly / Yearly

Standard All books, borrow, reserve, discounts Monthly / Yearly

Premium Unlimited + offline + all features + Monthly / Yearly
priority support

---

## Payment Gateways

- bKash (Bangladesh)

- Nagad (Bangladesh)

- Stripe (International / Card)

- PayPal (International)

## Billing Features

- Monthly and yearly billing cycles

- Yearly plan discount (e.g., 2 months free)

- Auto-renewal with reminder notification

- Plan upgrade / downgrade

- Subscription cancellation with end-of-term access

- Invoice / Receipt generation and download

- Full payment history

- Refund processing (Admin managed)

# Module 5 --- Freemium Lock System

Free users can access limited features. Premium features are locked with
upgrade prompts.

## Lock Scenarios

- Attempting to read a full book on Free plan --- Upgrade Popup appears

- Reaching monthly free limit --- Upgrade prompt with plan comparison

- Accessing borrow/download feature --- Upgrade required

- Dashboard banner for Free users showing upgrade benefits

## Upgrade Prompts

- Modal popup with plan comparison table

- One-click redirect to payment page

- \'Stay on Free\' option always available

# Module 6 --- User Dashboard

## Home Tab

- Welcome message with user name

- Resume Reading --- continue from last page

- Recommended Books (based on reading history and category)

- Newly added books section

- Upgrade banner for Free users

- Reading streak / activity summary

## Book Catalogue

- Full book listing with covers

- Search by title, author, category, ISBN

- Filter by category, language, format, rating

- Book detail page: cover, title, author, description, ratings, reviews

- Free preview --- first 20% of book

- Read / Borrow / Reserve action buttons

- Wishlist / Save for later

## Online Reading System

- In-browser reader --- no download required

- PDF and EPUB format support

- Font size adjustment (increase / decrease)

- Dark mode and Light mode toggle

- Page bookmarking (save specific pages)

- Highlight text and add personal notes

- Auto-save reading progress

- Resume from last position on any device

- Copy / Download protection (DRM)

## Borrow System

- Borrow book for a limited time (based on plan)

- Access automatically revoked after borrow period ends

- Active borrows list with remaining time

- Borrow limit per plan enforced

## Reservation System

- Reserve unavailable books

- Queue position displayed (e.g., \'You are #3 in line\')

- Email + In-App notification when book becomes available

- Cancel reservation option

## My Library

- Reading history --- all books read

- Reading progress tracker --- percentage per book

- Wishlist / saved books

- Active borrowed books with due dates

- Reservation status list

## Rating & Reviews

- Rate books 1-5 stars after reading

- Write text review

- Edit or delete own review

- View all reviews for a book

## Offers & Discounts

- View available coupon codes

- Apply coupon at checkout

- Birthday discount (auto-applied)

- Special / seasonal offer notifications

## Notifications Center

- All notifications in one place

- Mark as read / delete

- Notification categories: payment, reminders, new books, offers

## Account & Settings

- Edit profile (name, photo)

- Change password

- Language toggle (English / Bangla)

- Notification preference settings

- Subscription details and payment history

- Cancel or manage subscription

# Module 7 --- Notification System

---

**Event** **Email** **SMS** **In-App** **Push**

---

Registration & Email Yes No Yes No
Verification

Subscription Confirmed Yes Yes Yes Yes

Payment Receipt Yes Yes Yes No

Renewal Reminder (3 days Yes Yes Yes Yes
before)

Subscription Expired Yes Yes Yes Yes

Borrow Expiry Reminder Yes No Yes Yes

Reserved Book Available Yes Yes Yes Yes

New Book Added Yes No Yes Yes

New Offer / Discount Yes No Yes Yes

Account Suspended Yes Yes Yes No

---

# Module 8 --- Staff / Librarian System

## Staff Onboarding (Invite System)

- Admin creates new staff by entering name + email + role

- System sends automated invitation email with secure link

- Invitation link expires after 48 hours

- Staff clicks link and sets their own password

- Staff immediately gets access based on assigned role

- Admin can resend invitation if expired

## Staff Login

- Separate login page: yourdomain.com/staff/login

- Email + Password only (no Google/Facebook)

- Two-Factor Authentication is mandatory for staff access

- First successful password check returns a setup temp token if 2FA is not configured

- Staff must complete /staff/2fa/setup and /staff/2fa/enable before receiving access token

- Cannot access User dashboard

- Cannot access Admin dashboard areas beyond permissions

## Staff Dashboard

- Personalized dashboard showing only permitted modules

- Modules without permission are completely hidden (not just disabled)

- Quick stats relevant to their role

- Recent activity summary

## Activity Logging

- Every staff action is logged automatically

- Logs include: action type, module, timestamp, staff name

- Admin can view all staff activity logs

- Logs cannot be deleted by staff

# Module 9 --- Role & Permission System (RBAC)

## Role Management

- Admin can create unlimited custom roles

- Assign any combination of permissions to a role

- Edit roles at any time (changes apply immediately)

- Delete roles (staff with that role must be reassigned)

- Assign / change a staff member\'s role anytime

## Permission List

---

**Module** **Permissions Available**

---

Books View, Add, Edit, Delete, Upload PDF/EPUB, Set
Featured

Members / Users View, Edit, Suspend, Delete

Subscriptions View, Modify, Cancel, Process Refund

Borrow & Reserve View, Manage, Override

Notifications Send to users, Send bulk

Discounts & Coupons View, Create, Edit, Delete

Reports View, Export PDF/Excel

Settings View, Modify (Admin only by default)

---

## Example Roles

---

**Role Name** **Permissions Included**

---

Book Manager Books (full), Reports (view only)

Member Support Members, Subscriptions, Borrow/Reserve,
Notifications

Senior Librarian Books, Members, Subscriptions, Borrow/Reserve,
Notifications, Discounts, Reports

Report Analyst Reports (view + export) only

---

# Module 10 --- Admin Dashboard

Full access for Super Admin (you) only.

## Overview / Analytics

- Total users, active members, new registrations today

- Monthly Revenue (MRR) and total revenue

- Active subscriptions breakdown by plan

- Most read / popular books chart

- Registration growth chart (daily / monthly)

- Revenue trend chart

## Book Management

- Add, edit, delete books

- Upload PDF and EPUB files

- Upload book cover image

- Manage categories and tags

- Set featured books (shows on homepage)

- Bulk import via CSV

- Book availability toggle

## User Management

- View all registered users

- User details: profile, subscription, reading history, activity

- Manually assign / change subscription plan

- Suspend or delete user accounts

- Search and filter users

## Staff Management

- Invite new staff by email

- Assign / change role for staff

- Suspend or delete staff account

- View staff activity logs

- Resend invitation to pending staff

## Subscription Management

- View all subscriptions with status

- Manually adjust subscription (extend, cancel, change plan)

- Process refunds

- View payment history for any user

## Discount & Coupon Management

- Create coupons (percentage or fixed amount)

- Set expiry date and usage limit per coupon

- Flash sale creation with time limit

- Birthday discount configuration

- View coupon usage reports

- Activate / deactivate coupons

## Reports & Analytics

- Monthly and yearly revenue report

- Top 10 most read books

- Active vs inactive user report

- Subscription plan distribution report

- Coupon usage report

- Staff activity report

- Export all reports to PDF or Excel

## System Settings

- Library name, logo, address, contact

- Plan names and pricing configuration

- Borrow limit per plan

- Email and SMS template customization

- Language and currency settings

- Payment gateway configuration

- Notification settings

- Maintenance mode toggle

# System Page & URL Structure

---

**URL** **Visible To** **Purpose**

---

yourdomain.com Everyone Public Homepage

yourdomain.com/login All users User Login

yourdomain.com/register New users User Registration

yourdomain.com/verify-email Registered users Email Verification

yourdomain.com/onboarding Verified users Plan Selection

yourdomain.com/dashboard Members User Dashboard

yourdomain.com/dashboard/books Members Book Catalogue

yourdomain.com/dashboard/read/:id Members Online Reader

yourdomain.com/dashboard/library Members My Library

yourdomain.com/dashboard/settings Members Account Settings

yourdomain.com/staff/login Staff only Staff Login

yourdomain.com/staff/dashboard Staff only Staff Panel (RBAC)

yourdomain.com/admin/login Admin only Admin Login

yourdomain.com/admin/dashboard Admin only Full Admin Panel

---

# Recommended Tech Stack

All tools below are 100% free and open source to get started. Paid
upgrades only needed when scaling.

## Core Stack (Free)

---

**Layer** **Technology** **Free Plan Details**

---

Frontend Next.js + Tailwind 100% Free --- Open Source
CSS

Backend Node.js + Express.js 100% Free --- Open Source

ODM Mongoose 100% Free --- MongoDB ODM for
Node.js

Database MongoDB Atlas (Free Free 512MB shared cluster --- enough
Tier) to start

Authentication JWT + Passport.js 100% Free --- Open Source

Social Login Passport Google + 100% Free --- OAuth 2.0
Facebook Strategy

---

## File Storage (Free)

---

**Tool** **Free Limit** **Use For**

---

Cloudinary (Free 25GB storage + 25GB Book covers, profile images
Tier) bandwidth/month

Backblaze B2 (Free 10GB free storage PDF / EPUB file storage
Tier)

Supabase Storage 1GB storage, 2GB Alternative for files
(Free) bandwidth

---

## Email (Free)

---

**Tool** **Free Limit** **Use For**

---

Resend (Free Tier) 3,000 emails/month Verification, receipts,
free reminders

Nodemailer + Gmail Unlimited (Gmail Development & small scale
SMTP limits apply)

Brevo 300 emails/day free Transactional emails
(ex-Sendinblue)

---

## SMS (Free / Low Cost)

---

**Tool** **Free Plan** **Use For**

---

Twilio (Trial) Free trial credit SMS for Bangladesh +
(\~\$15) International

SSL Wireless Pay-as-you-go, no Bangladesh SMS only
(Bangladesh) monthly fee

Alpha SMS Pay-as-you-go, cheap Bangladesh SMS only
(Bangladesh) BDT rate

---

## Push Notifications (Free)

---

**Tool** **Free Limit** **Use For**

---

Firebase FCM Completely Free --- Browser + Mobile push
(Google) no limit notifications

Web Push API Completely Free --- Browser push (no third party
(Native) browser built-in needed)

---

## Payment (Free Integration)

---

**Gateway** **Integration Cost** **Transaction Fee**

---

SSLCommerz (bKash, Free sandbox + free \% per transaction only
Nagad, Card) integration

Stripe Free to integrate 2.9% + \$0.30 per
transaction

PayPal Free to integrate \% per transaction only

---

## Hosting (Free Tier)

---

**Tool** **Free Plan** **Use For**

---

Vercel (Free Unlimited deployments, Next.js Frontend Hosting
Tier) 100GB bandwidth

Render (Free 750 hrs/month free Node.js + Express Backend
Tier)

Railway \$5 free credit/month Backend + DB alternative
(Starter)

MongoDB Atlas 512MB free cluster Database Hosting

---

## Book Reader (Free & Open Source)

---

**Tool** **License** **Use For**

---

PDF.js (Mozilla) Apache 2.0 --- Free In-browser PDF reading

Epub.js MIT License --- Free In-browser EPUB reading

---

## Other Dev Tools (Free)

---

**Tool** **Free Plan** **Use For**

---

Git + GitHub Free for public & Version control
private repos

Postman Free tier available API testing

VS Code Completely Free Code editor

Figma (Free 3 projects free UI/UX Design
Tier)

---

---

**💡 Upgrade Path --- When to Pay**

---

---

---

**When** **Upgrade To** **Estimated Cost**

---

500+ users active MongoDB Atlas M10 Cluster \~\$57/month

High file storage Cloudinary Paid / AWS S3 \~\$5-20/month
needed

High email volume Resend Pro / SendGrid \~\$20/month

Custom domain + Vercel Pro / Own VPS \~\$20/month
SSL

Production backend Render Pro / DigitalOcean \~\$7-25/month

---

# Development Phases

---

**Phase** **Duration** **Deliverables**

---

Phase 1 Month 1 Homepage, Auth, Email Verification, Onboarding,
Plan Selection

Phase 2 Month 2 Book Management, Online Reader (PDF+EPUB), Book
Catalogue

Phase 3 Month 3 Borrow System, Reservation, Notification System

Phase 4 Month 4 Admin Panel, RBAC, Staff System, Activity Logs

Phase 5 Month 5 Discount/Coupon, Payment Integration, Reports

Phase 6 Month 6 Testing, Bug Fixes, Performance Optimization,
Launch

---

# Future Modules (Phase 2 Roadmap)

- Referral System --- invite friends and earn discounts

- Mobile App --- Android and iOS

- Advanced AI Book Recommendations

- Audio Books support

- Community / Discussion forum per book

- Multi-language book content support

- Publisher / Author portal for content submission

_Digital Library Management System --- Confidential Feature Document
v2.0_

_All rights reserved. For internal planning use only._
