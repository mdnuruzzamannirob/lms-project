import { model, Schema, type Model } from 'mongoose'

import type { IPermission, IRole } from './interface'

type PermissionDocument = IPermission
type RoleDocument = IRole

const permissionSchema = new Schema<PermissionDocument>(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    name: { type: String, required: true, trim: true },
    module: { type: String, required: true, trim: true, index: true },
  },
  {
    timestamps: true,
    versionKey: false,
  },
)

const roleSchema = new Schema<RoleDocument>(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    description: { type: String, required: true, trim: true },
    permissions: [{ type: String, required: true, trim: true }],
    isSystem: { type: Boolean, default: false },
  },
  {
    timestamps: true,
    versionKey: false,
  },
)

roleSchema.index({ permissions: 1 })

export const PermissionModel: Model<PermissionDocument> =
  model<PermissionDocument>('Permission', permissionSchema)

export const RoleModel: Model<RoleDocument> = model<RoleDocument>(
  'Role',
  roleSchema,
)
