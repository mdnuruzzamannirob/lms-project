import { AppError } from '../../common/errors/AppError'
import type { PermissionSeed } from './interface'
import { PermissionModel, RoleModel } from './model'

export const defaultPermissionSeeds: PermissionSeed[] = [
  {
    key: 'rbac.view',
    name: 'View RBAC',
    description: 'View permissions and roles',
    module: 'rbac',
  },
  {
    key: 'rbac.manage',
    name: 'Manage RBAC',
    description: 'Create and update roles and permissions',
    module: 'rbac',
  },
  {
    key: 'staff.view',
    name: 'View Staff',
    description: 'Read staff list and profile',
    module: 'staff',
  },
  {
    key: 'staff.manage',
    name: 'Manage Staff',
    description: 'Invite, suspend, and change staff roles',
    module: 'staff',
  },
  {
    key: 'onboarding.view',
    name: 'View Onboarding',
    description: 'Read onboarding configuration and status',
    module: 'onboarding',
  },
  {
    key: 'onboarding.manage',
    name: 'Manage Onboarding',
    description: 'Manage onboarding plan options and completion',
    module: 'onboarding',
  },
  {
    key: 'plans.view',
    name: 'View Plans',
    description: 'View subscription plans',
    module: 'plans',
  },
  {
    key: 'plans.manage',
    name: 'Manage Plans',
    description: 'Create and update subscription plans',
    module: 'plans',
  },
  {
    key: 'subscriptions.view',
    name: 'View Subscriptions',
    description: 'View subscription records',
    module: 'subscriptions',
  },
  {
    key: 'subscriptions.manage',
    name: 'Manage Subscriptions',
    description: 'Create and update subscription states',
    module: 'subscriptions',
  },
  {
    key: 'payments.view',
    name: 'View Payments',
    description: 'View payment records and statuses',
    module: 'payments',
  },
  {
    key: 'payments.manage',
    name: 'Manage Payments',
    description: 'Verify and refund payments',
    module: 'payments',
  },
  {
    key: 'promotions.view',
    name: 'View Promotions',
    description: 'View coupons and flash sales',
    module: 'promotions',
  },
  {
    key: 'promotions.manage',
    name: 'Manage Promotions',
    description: 'Create and update coupons and flash sales',
    module: 'promotions',
  },
  {
    key: 'authors.view',
    name: 'View Authors',
    description: 'View author records',
    module: 'authors',
  },
  {
    key: 'authors.manage',
    name: 'Manage Authors',
    description: 'Create, update, and delete authors',
    module: 'authors',
  },
  {
    key: 'categories.view',
    name: 'View Categories',
    description: 'View category records and trees',
    module: 'categories',
  },
  {
    key: 'categories.manage',
    name: 'Manage Categories',
    description: 'Create, update, and delete categories',
    module: 'categories',
  },
  {
    key: 'books.view',
    name: 'View Books',
    description: 'View book records',
    module: 'books',
  },
  {
    key: 'books.manage',
    name: 'Manage Books',
    description: 'Create, update, delete books and manage files',
    module: 'books',
  },
  {
    key: 'borrows.view',
    name: 'View Borrows',
    description: 'View borrow records',
    module: 'borrows',
  },
  {
    key: 'borrows.manage',
    name: 'Manage Borrows',
    description: 'Manage borrow lifecycle and overrides',
    module: 'borrows',
  },
  {
    key: 'reservations.view',
    name: 'View Reservations',
    description: 'View reservation queues and status',
    module: 'reservations',
  },
  {
    key: 'reservations.manage',
    name: 'Manage Reservations',
    description: 'Manage reservation queue lifecycle',
    module: 'reservations',
  },
  {
    key: 'reviews.view',
    name: 'View Reviews',
    description: 'View all reviews in admin',
    module: 'reviews',
  },
  {
    key: 'reviews.manage',
    name: 'Manage Reviews',
    description: 'Moderate review visibility',
    module: 'reviews',
  },
  {
    key: 'notifications.view',
    name: 'View Notifications',
    description: 'View notification records and logs',
    module: 'notifications',
  },
  {
    key: 'notifications.manage',
    name: 'Manage Notifications',
    description: 'Send bulk notifications',
    module: 'notifications',
  },
  {
    key: 'search.view',
    name: 'View Search',
    description: 'View search logs and analytics',
    module: 'search',
  },
  {
    key: 'members.view',
    name: 'View Members',
    description: 'View user and member information',
    module: 'members',
  },
  {
    key: 'members.manage',
    name: 'Manage Members',
    description: 'Suspend, unsuspend, and manage user accounts',
    module: 'members',
  },
  {
    key: 'audit.view',
    name: 'View Audit Logs',
    description: 'View and export staff/admin activity logs',
    module: 'audit',
  },
  {
    key: 'audit.manage',
    name: 'Manage Audit Logs',
    description: 'Create and manage activity log entries',
    module: 'audit',
  },
  {
    key: 'reports.view',
    name: 'View Reports',
    description: 'View report jobs, statuses, and downloads',
    module: 'reports',
  },
  {
    key: 'reports.manage',
    name: 'Manage Reports',
    description: 'Create and process asynchronous reports',
    module: 'reports',
  },
  {
    key: 'settings.view',
    name: 'View Settings',
    description: 'View global application settings',
    module: 'settings',
  },
  {
    key: 'settings.manage',
    name: 'Manage Settings',
    description: 'Update global application settings',
    module: 'settings',
  },
]

export const rbacService = {
  ensurePermissionSeed: async (
    permissions: PermissionSeed[] = defaultPermissionSeeds,
  ): Promise<void> => {
    if (!permissions.length) {
      return
    }

    await Promise.all(
      permissions.map((permission) =>
        PermissionModel.updateOne(
          { key: permission.key },
          { $set: permission },
          { upsert: true },
        ),
      ),
    )
  },

  listPermissions: async (): Promise<PermissionSeed[]> => {
    const permissions = await PermissionModel.find({}).sort({
      module: 1,
      key: 1,
    })

    return permissions.map((permission) => ({
      key: permission.key,
      name: permission.name,
      description: permission.description,
      module: permission.module,
    }))
  },

  listRoles: async (): Promise<
    Array<{
      id: string
      name: string
      description: string
      permissions: string[]
      isSystem: boolean
      createdAt: string
      updatedAt: string
    }>
  > => {
    const roles = await RoleModel.find({}).sort({ name: 1 })

    return roles.map((role) => ({
      id: role._id.toString(),
      name: role.name,
      description: role.description,
      permissions: role.permissions,
      isSystem: role.isSystem,
      createdAt: role.createdAt.toISOString(),
      updatedAt: role.updatedAt.toISOString(),
    }))
  },

  getRoleById: async (
    roleId: string,
  ): Promise<{
    id: string
    name: string
    description: string
    permissions: string[]
    isSystem: boolean
    createdAt: string
    updatedAt: string
  }> => {
    const role = await RoleModel.findById(roleId)

    if (!role) {
      throw new AppError('Role not found.', 404)
    }

    return {
      id: role._id.toString(),
      name: role.name,
      description: role.description,
      permissions: role.permissions,
      isSystem: role.isSystem,
      createdAt: role.createdAt.toISOString(),
      updatedAt: role.updatedAt.toISOString(),
    }
  },

  createRole: async (payload: {
    name: string
    description: string
    permissions: string[]
    isSystem?: boolean
  }) => {
    const existing = await RoleModel.findOne({ name: payload.name })

    if (existing) {
      throw new AppError('Role with this name already exists.', 409)
    }

    const role = await RoleModel.create({
      name: payload.name,
      description: payload.description,
      permissions: payload.permissions,
      isSystem: payload.isSystem ?? false,
    })

    return rbacService.getRoleById(role._id.toString())
  },

  updateRole: async (
    roleId: string,
    payload: {
      name?: string
      description?: string
      permissions?: string[]
    },
  ) => {
    const role = await RoleModel.findById(roleId)

    if (!role) {
      throw new AppError('Role not found.', 404)
    }

    if (payload.name) {
      role.name = payload.name
    }

    if (payload.description) {
      role.description = payload.description
    }

    if (payload.permissions) {
      role.permissions = payload.permissions
    }

    await role.save()
    return rbacService.getRoleById(role._id.toString())
  },

  deleteRole: async (roleId: string): Promise<void> => {
    const role = await RoleModel.findById(roleId)

    if (!role) {
      throw new AppError('Role not found.', 404)
    }

    if (role.isSystem) {
      throw new AppError('System roles cannot be deleted.', 400)
    }

    await role.deleteOne()
  },
}
