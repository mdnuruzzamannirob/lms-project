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
