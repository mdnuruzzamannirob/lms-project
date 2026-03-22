// THIS FILE IS AUTO-GENERATED
// Run: pnpm generate:permissions
// Do NOT edit manually

export const PERMISSIONS = {
  // Audit
  AUDIT_MANAGE: "audit.manage",
  AUDIT_VIEW: "audit.view",

  // Authors
  AUTHORS_MANAGE: "authors.manage",

  // Books
  BOOKS_MANAGE: "books.manage",

  // Categories
  CATEGORIES_MANAGE: "categories.manage",

  // Members
  MEMBERS_MANAGE: "members.manage",
  MEMBERS_VIEW: "members.view",

  // Notifications
  NOTIFICATIONS_MANAGE: "notifications.manage",

  // Payments
  PAYMENTS_MANAGE: "payments.manage",
  PAYMENTS_VIEW: "payments.view",

  // Plans
  PLANS_MANAGE: "plans.manage",

  // Promotions
  PROMOTIONS_MANAGE: "promotions.manage",
  PROMOTIONS_VIEW: "promotions.view",

  // Publishers
  PUBLISHERS_MANAGE: "publishers.manage",

  // Rbac
  RBAC_MANAGE: "rbac.manage",
  RBAC_VIEW: "rbac.view",

  // Reports
  REPORTS_MANAGE: "reports.manage",
  REPORTS_VIEW: "reports.view",

  // Reviews
  REVIEWS_MANAGE: "reviews.manage",
  REVIEWS_VIEW: "reviews.view",

  // Settings
  SETTINGS_MANAGE: "settings.manage",
  SETTINGS_VIEW: "settings.view",

  // Staff
  STAFF_MANAGE: "staff.manage",
  STAFF_VIEW: "staff.view",

  // Subscriptions
  SUBSCRIPTIONS_MANAGE: "subscriptions.manage",
  SUBSCRIPTIONS_VIEW: "subscriptions.view",
} as const

export type PermissionKey = (typeof PERMISSIONS)[keyof typeof PERMISSIONS]

export const ALL_PERMISSIONS = Object.values(PERMISSIONS) as PermissionKey[]

const _dupeCheck = new Set(ALL_PERMISSIONS)
if (_dupeCheck.size !== ALL_PERMISSIONS.length) {
  throw new Error('Duplicate permissions detected.')
}

export interface PermissionSeed {
  key: string
  name: string
  module: string
}

export const PERMISSION_SEEDS: PermissionSeed[] = ALL_PERMISSIONS.map((key) => {
  const [mod = '', action = ''] = key.split('.')

  return {
    key,
    name:
      action.charAt(0).toUpperCase() +
      action.slice(1) +
      ' ' +
      mod.charAt(0).toUpperCase() +
      mod.slice(1),
    module: mod,
  }
})
