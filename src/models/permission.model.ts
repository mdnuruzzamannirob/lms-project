import { Document, Schema, model } from 'mongoose'

export interface IPermission extends Document {
  name: string
  module: string
  action: string
  description: string
  is_active: boolean
}

const schema = new Schema<IPermission>(
  {
    name: { type: String, required: true, unique: true },
    module: { type: String, required: true },
    action: { type: String, required: true },
    description: { type: String, default: '' },
    is_active: { type: Boolean, default: true },
  },
  { timestamps: true },
)

export const Permission = model<IPermission>('Permission', schema)
