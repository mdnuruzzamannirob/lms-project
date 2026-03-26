import type { Types } from 'mongoose'

export interface IPermission {
  _id: Types.ObjectId
  key: string
  name: string
  module: string
  createdAt: Date
  updatedAt: Date
}

export interface IRole {
  _id: Types.ObjectId
  name: string
  description: string
  permissions: string[]
  isSystem: boolean
  createdAt: Date
  updatedAt: Date
}

export type PermissionSeed = {
  key: string
  name: string
  module: string
}

export interface RoleResponse {
  id: string
  name: string
  description: string
  permissions: string[]
  isSystem: boolean
  createdAt: string
  updatedAt: string
}

export interface CreateRolePayload {
  name: string
  description: string
  permissions: string[]
  isSystem?: boolean
}

export interface UpdateRolePayload {
  name?: string
  description?: string
  permissions?: string[]
}
