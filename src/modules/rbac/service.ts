import {
  PERMISSION_SEEDS,
  type PermissionSeed,
} from '../../common/constants/permissions'
import { AppError } from '../../common/errors/AppError'
import { StaffModel } from '../staff/model'
import { PermissionModel, RoleModel } from './model'
import { assertValidPermissions } from './utils'

const ensurePermissionSeed = async (): Promise<void> => {
  if (!PERMISSION_SEEDS.length) {
    return
  }

  await Promise.all(
    PERMISSION_SEEDS.map((permission) =>
      PermissionModel.updateOne(
        { key: permission.key },
        { $set: permission },
        { upsert: true },
      ),
    ),
  )
}

const listPermissions = async (): Promise<PermissionSeed[]> => {
  const permissions = await PermissionModel.find({}).sort({
    module: 1,
    key: 1,
  })

  return permissions.map((permission) => ({
    key: permission.key,
    name: permission.name,
    module: permission.module,
  }))
}

const listRoles = async (): Promise<
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
}

const getRoleById = async (
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
}

const createRole = async (payload: {
  name: string
  description: string
  permissions: string[]
  isSystem?: boolean
}) => {
  assertValidPermissions(payload.permissions)

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
}

const updateRole = async (
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
    assertValidPermissions(payload.permissions)
    role.permissions = payload.permissions
  }

  await role.save()
  return rbacService.getRoleById(role._id.toString())
}

const deleteRole = async (roleId: string): Promise<void> => {
  const role = await RoleModel.findById(roleId)

  if (!role) {
    throw new AppError('Role not found.', 404)
  }

  if (role.isSystem) {
    throw new AppError('System roles cannot be deleted.', 400)
  }

  const assignedStaffCount = await StaffModel.countDocuments({
    roleId: role._id,
    deletedAt: null,
  })

  if (assignedStaffCount > 0) {
    throw new AppError(
      `Cannot delete role — ${assignedStaffCount} staff member(s) are assigned to it`,
      400,
    )
  }

  await role.deleteOne()
}

export const rbacService = {
  ensurePermissionSeed,
  listPermissions,
  listRoles,
  getRoleById,
  createRole,
  updateRole,
  deleteRole,
}
