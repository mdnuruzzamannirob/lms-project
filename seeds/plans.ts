/**
 * Seed: 4 subscription plans (Free / Basic / Standard / Premium).
 * Run: pnpm seed:plans
 */

import 'dotenv/config'
import mongoose from 'mongoose'
import env from '../src/config/env'
import { Plan } from '../src/models/plan.model'

const PLANS = [
  {
    name: 'Free',
    slug: 'free' as const,
    description: 'Get started with limited access to our library.',
    color: '#64748b',
    sort_order: 0,
    price_monthly: 0,
    price_yearly: 0,
    currency: 'BDT',
    borrow_limit: 0,
    borrow_duration_days: 0,
    book_access_limit: 0,
    monthly_read_limit: 3,
    offline_access: false,
    is_free: true,
    is_active: true,
    features: [
      'Preview first 20% of books',
      'Up to 3 books per month',
      'Basic search',
      'In-app notifications',
    ],
  },
  {
    name: 'Basic',
    slug: 'basic' as const,
    description: 'Access a selection of books with bookmarking features.',
    color: '#3b82f6',
    sort_order: 1,
    price_monthly: 199,
    price_yearly: 1990,
    currency: 'BDT',
    borrow_limit: 0,
    borrow_duration_days: 14,
    book_access_limit: 50,
    monthly_read_limit: 10,
    offline_access: false,
    is_free: false,
    is_active: true,
    features: [
      'Access up to 50 books',
      'Up to 10 reads per month',
      'Bookmarks & highlights',
      'Email notifications',
      'Reading history',
    ],
  },
  {
    name: 'Standard',
    slug: 'standard' as const,
    description: 'Full library access, borrow, and reserve books.',
    color: '#8b5cf6',
    sort_order: 2,
    price_monthly: 399,
    price_yearly: 3990,
    currency: 'BDT',
    borrow_limit: 5,
    borrow_duration_days: 14,
    book_access_limit: -1,
    monthly_read_limit: -1,
    offline_access: false,
    is_free: false,
    is_active: true,
    features: [
      'Unlimited book access',
      'Borrow up to 5 books',
      'Book reservations',
      'Discount coupon access',
      'Email + SMS notifications',
    ],
  },
  {
    name: 'Premium',
    slug: 'premium' as const,
    description: 'All features, offline reading, and priority support.',
    color: '#f59e0b',
    sort_order: 3,
    price_monthly: 699,
    price_yearly: 6990,
    currency: 'BDT',
    borrow_limit: -1,
    borrow_duration_days: 21,
    book_access_limit: -1,
    monthly_read_limit: -1,
    offline_access: true,
    is_free: false,
    is_active: true,
    features: [
      'Everything in Standard',
      'Unlimited borrows (21-day)',
      'Offline reading',
      'All notification channels',
      'Priority support',
      'Early access to new releases',
    ],
  },
]

const seed = async (): Promise<void> => {
  await mongoose.connect(env.MONGODB_URI)
  console.log('Connected to MongoDB.')

  let created = 0,
    skipped = 0

  for (const plan of PLANS) {
    const existing = await Plan.findOneAndUpdate(
      { slug: plan.slug },
      { $setOnInsert: plan },
      { upsert: true, new: false },
    )
    if (!existing) {
      created++
      console.log(`  ✓ ${plan.name}`)
    } else {
      skipped++
      console.log(`  - Skipped: ${plan.name}`)
    }
  }

  console.log(`\nDone. ${created} created, ${skipped} already existed.`)
  await mongoose.disconnect()
}

seed().catch((err: Error) => {
  console.error('Seed failed:', err.message)
  process.exit(1)
})
