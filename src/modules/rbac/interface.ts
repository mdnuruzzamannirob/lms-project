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
