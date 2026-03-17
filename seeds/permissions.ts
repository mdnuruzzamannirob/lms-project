/**
 * Seed: 29 RBAC permissions.
 * Run: pnpm seed:permissions
 */

import 'dotenv/config'
import mongoose from 'mongoose'
import env from '../src/config/env'
import { Permission } from '../src/models/permission.model'

const PERMISSIONS = [
  {
    name: 'books.view',
    module: 'books',
    action: 'view',
    description: 'View book list and details',
  },
  {
    name: 'books.create',
    module: 'books',
    action: 'create',
    description: 'Add new books',
  },
  {
    name: 'books.edit',
    module: 'books',
    action: 'edit',
    description: 'Edit book info',
  },
  {
    name: 'books.delete',
    module: 'books',
    action: 'delete',
    description: 'Delete books',
  },
  {
    name: 'books.upload',
    module: 'books',
    action: 'upload',
    description: 'Upload PDF/EPUB files',
  },
  {
    name: 'books.featured',
    module: 'books',
    action: 'featured',
    description: 'Set/unset featured books',
  },

  {
    name: 'members.view',
    module: 'members',
    action: 'view',
    description: 'View member list and profiles',
  },
  {
    name: 'members.edit',
    module: 'members',
    action: 'edit',
    description: 'Edit member details',
  },
  {
    name: 'members.suspend',
    module: 'members',
    action: 'suspend',
    description: 'Suspend/unsuspend members',
  },
  {
    name: 'members.delete',
    module: 'members',
    action: 'delete',
    description: 'Delete member accounts',
  },

  {
    name: 'subscriptions.view',
    module: 'subscriptions',
    action: 'view',
    description: 'View subscription records',
  },
  {
    name: 'subscriptions.edit',
    module: 'subscriptions',
    action: 'edit',
    description: 'Modify subscriptions',
  },
  {
    name: 'subscriptions.refund',
    module: 'subscriptions',
    action: 'refund',
    description: 'Process refunds',
  },
  {
    name: 'subscriptions.manage',
    module: 'subscriptions',
    action: 'manage',
    description: 'Cancel or extend subscriptions',
  },

  {
    name: 'borrows.view',
    module: 'borrows',
    action: 'view',
    description: 'View borrow and reservation records',
  },
  {
    name: 'borrows.manage',
    module: 'borrows',
    action: 'manage',
    description: 'Override borrow/reservation status',
  },

  {
    name: 'notifications.send',
    module: 'notifications',
    action: 'send',
    description: 'Send bulk notifications to users',
  },

  {
    name: 'coupons.view',
    module: 'coupons',
    action: 'view',
    description: 'View coupon list',
  },
  {
    name: 'coupons.create',
    module: 'coupons',
    action: 'create',
    description: 'Create coupons',
  },
  {
    name: 'coupons.edit',
    module: 'coupons',
    action: 'edit',
    description: 'Edit coupons',
  },
  {
    name: 'coupons.delete',
    module: 'coupons',
    action: 'delete',
    description: 'Delete coupons',
  },

  {
    name: 'flash_sales.view',
    module: 'flash_sales',
    action: 'view',
    description: 'View flash sales',
  },
  {
    name: 'flash_sales.create',
    module: 'flash_sales',
    action: 'create',
    description: 'Create flash sales',
  },
  {
    name: 'flash_sales.edit',
    module: 'flash_sales',
    action: 'edit',
    description: 'Edit flash sales',
  },
  {
    name: 'flash_sales.delete',
    module: 'flash_sales',
    action: 'delete',
    description: 'Delete flash sales',
  },

  {
    name: 'reports.view',
    module: 'reports',
    action: 'view',
    description: 'View reports',
  },
  {
    name: 'reports.export',
    module: 'reports',
    action: 'export',
    description: 'Export reports as PDF/Excel',
  },

  {
    name: 'settings.view',
    module: 'settings',
    action: 'view',
    description: 'View system settings',
  },
  {
    name: 'settings.edit',
    module: 'settings',
    action: 'edit',
    description: 'Modify system settings (Admin only)',
  },
] as const

const seed = async (): Promise<void> => {
  await mongoose.connect(env.MONGODB_URI)
  console.log('Connected to MongoDB.')

  let created = 0,
    skipped = 0

  for (const perm of PERMISSIONS) {
    const existing = await Permission.findOneAndUpdate(
      { name: perm.name },
      { $setOnInsert: perm },
      { upsert: true, new: false },
    )
    if (!existing) {
      created++
      console.log(`  ✓ ${perm.name}`)
    } else skipped++
  }

  console.log(`\nDone. ${created} created, ${skipped} already existed.`)
  await mongoose.disconnect()
}

seed().catch((err: Error) => {
  console.error('Seed failed:', err.message)
  process.exit(1)
})
