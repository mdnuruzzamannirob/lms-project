import { AppError } from '../../common/errors/AppError'
import { auditService } from '../../common/services/audit.service'
import { emailService } from '../../common/services/email.service'
import {
  generateRandomToken,
  hashStringSha256,
  hashWithScrypt,
} from '../../common/utils/crypto'
import { config } from '../../config'
import { RoleModel } from '../rbac/model'
import {
  StaffActivityLogModel,
  StaffInviteTokenModel,
} from '../staff-auth/model'
import { StaffModel } from './model'
import { buildStaffSummary } from './utils'

const inviteStaff = async (
  payload: {
    name: string
    email: string
    roleId: string
    phone?: string
    expiresInDays: number
  },
  actorId?: string,
  requestId?: string,
) => {
  const role = await RoleModel.findById(payload.roleId)

  if (!role) {
    throw new AppError('Role not found for staff invitation.', 404)
  }

  const existing = await StaffModel.findOne({ email: payload.email })

  if (existing) {
    throw new AppError('Staff with this email already exists.', 409)
  }

  const rawToken = generateRandomToken(24)
  const tokenHash = hashStringSha256(rawToken)
  const expiresAt = new Date(
    Date.now() + payload.expiresInDays * 24 * 60 * 60 * 1000,
  )

  await StaffInviteTokenModel.create({
    email: payload.email,
    name: payload.name,
    phone: payload.phone,
    roleId: role._id,
    tokenHash,
    expiresAt,
    invitedBy: actorId,
  })

  const inviteUrl = `${config.staffPortalUrl.replace(/\/$/, '')}/accept-invite?token=${encodeURIComponent(rawToken)}`
  const roleName = role.name
  const expiryHours = payload.expiresInDays * 24

  await emailService.sendEmail({
    to: payload.email,
    subject: "You've been invited to Stackread Dashboard",
    text: `Hi ${payload.name},\n\nYou have been invited to join Stackread as ${roleName}.\nActivate your account using this link:\n${inviteUrl}\n\nThis link expires in ${expiryHours} hours.`,
    html: `<p>Hi ${payload.name},</p><p>You have been invited to join Stackread as <strong>${roleName}</strong>.</p><p><a href="${inviteUrl}">Activate Account</a></p><p>This link expires in ${expiryHours} hours.</p>`,
  })

  await auditService.logEvent({
    actor: { id: actorId ?? 'system', type: 'staff' },
    action: 'staff.invite',
    module: 'staff',
    description: `Staff invitation sent to ${payload.email}.`,
    ...(requestId ? { requestId } : {}),
    meta: { roleId: payload.roleId },
  })

  return {
    email: payload.email,
    roleId: payload.roleId,
    expiresAt: expiresAt.toISOString(),
  }
}

const reinviteStaff = async (
  staffId: string,
  actorId?: string,
  requestId?: string,
) => {
  const staff = await StaffModel.findById(staffId)

  if (!staff) {
    throw new AppError('Staff not found.', 404)
  }

  if (staff.isSuperAdmin) {
    throw new AppError('Super Admin cannot be reinvited', 403)
  }

  await StaffInviteTokenModel.deleteMany({
    email: staff.email,
    usedAt: null,
  })

  const rawToken = generateRandomToken(24)
  const tokenHash = hashStringSha256(rawToken)
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)

  await StaffInviteTokenModel.create({
    email: staff.email,
    name: staff.name,
    phone: staff.phone,
    roleId: staff.roleId,
    tokenHash,
    expiresAt,
    invitedBy: actorId,
  })

  const inviteUrl = `${config.staffPortalUrl.replace(/\/$/, '')}/accept-invite?token=${encodeURIComponent(rawToken)}`
  const expiryHours = 7 * 24
  const role = staff.roleId ? await RoleModel.findById(staff.roleId) : null
  const roleName = role?.name ?? 'staff'

  await emailService.sendEmail({
    to: staff.email,
    subject: "You've been invited to Stackread Dashboard",
    text: `Hi ${staff.name},\n\nYou have been invited to join Stackread as ${roleName}.\nActivate your account using this link:\n${inviteUrl}\n\nThis link expires in ${expiryHours} hours.`,
    html: `<p>Hi ${staff.name},</p><p>You have been invited to join Stackread as <strong>${roleName}</strong>.</p><p><a href="${inviteUrl}">Activate Account</a></p><p>This link expires in ${expiryHours} hours.</p>`,
  })

  await auditService.logEvent({
    actor: { id: actorId ?? 'system', type: 'staff' },
    action: 'staff.reinvite',
    module: 'staff',
    targetId: staffId,
    targetType: 'staff',
    description: `Staff invitation resent to ${staff.email}.`,
    ...(requestId ? { requestId } : {}),
  })

  return {
    staffId,
    email: staff.email,
    expiresAt: expiresAt.toISOString(),
  }
}

const listStaff = async () => {
  const staffRows = await StaffModel.find({ deletedAt: null }).sort({
    createdAt: -1,
  })
  return staffRows.map((row) => buildStaffSummary(row))
}

const getStaffById = async (staffId: string) => {
  const staff = await StaffModel.findById(staffId)

  if (staff?.deletedAt) {
    throw new AppError('Staff not found.', 404)
  }

  return buildStaffSummary(staff)
}

const getStaffActivity = async (staffId: string) => {
  const rows = await StaffActivityLogModel.find({ staffId })
    .sort({ createdAt: -1 })
    .limit(50)

  return rows.map((row) => ({
    id: row._id.toString(),
    action: row.action,
    ipAddress: row.ipAddress,
    userAgent: row.userAgent,
    createdAt: row.createdAt.toISOString(),
  }))
}

const updateStaffRole = async (
  staffId: string,
  roleId: string,
  actorId?: string,
  requestId?: string,
) => {
  const staff = await StaffModel.findById(staffId)

  if (!staff) {
    throw new AppError('Staff not found.', 404)
  }

  if (staff.isSuperAdmin) {
    throw new AppError('Super Admin role cannot be modified', 403)
  }

  const role = await RoleModel.findById(roleId)

  if (!role) {
    throw new AppError('Role not found.', 404)
  }

  staff.roleId = role._id
  await staff.save()

  await auditService.logEvent({
    actor: { id: actorId ?? 'system', type: 'staff' },
    action: 'staff.role.update',
    module: 'staff',
    targetId: staffId,
    targetType: 'staff',
    description: `Staff role changed to ${role.name}.`,
    ...(requestId ? { requestId } : {}),
    meta: { roleId },
  })

  return buildStaffSummary(staff)
}

const suspendStaff = async (
  staffId: string,
  actorId?: string,
  requestId?: string,
) => {
  const staff = await StaffModel.findById(staffId)

  if (!staff) {
    throw new AppError('Staff not found.', 404)
  }

  if (staff.isSuperAdmin) {
    throw new AppError('Super Admin cannot be suspended', 403)
  }

  staff.isActive = false
  await staff.save()

  await auditService.logEvent({
    actor: { id: actorId ?? 'system', type: 'staff' },
    action: 'staff.suspend',
    module: 'staff',
    targetId: staffId,
    targetType: 'staff',
    description: 'Staff account suspended.',
    ...(requestId ? { requestId } : {}),
  })

  return buildStaffSummary(staff)
}

const unsuspendStaff = async (
  staffId: string,
  actorId?: string,
  requestId?: string,
) => {
  const staff = await StaffModel.findById(staffId)

  if (!staff) {
    throw new AppError('Staff not found.', 404)
  }

  staff.isActive = true
  await staff.save()

  await auditService.logEvent({
    actor: { id: actorId ?? 'system', type: 'staff' },
    action: 'staff.unsuspend',
    module: 'staff',
    targetId: staffId,
    targetType: 'staff',
    description: 'Staff account unsuspended.',
    ...(requestId ? { requestId } : {}),
  })

  return buildStaffSummary(staff)
}

const removeStaff = async (
  staffId: string,
  requestingStaffId: string,
  actorId?: string,
  requestId?: string,
) => {
  const staff = await StaffModel.findById(staffId)

  if (!staff) {
    throw new AppError('Staff not found.', 404)
  }

  if (staff.isSuperAdmin) {
    throw new AppError('Super Admin cannot be deleted', 403)
  }

  if (staffId === requestingStaffId) {
    throw new AppError('You cannot delete your own account', 400)
  }

  staff.isActive = false
  staff.deletedAt = new Date()
  await staff.save()

  await auditService.logEvent({
    actor: { id: actorId ?? 'system', type: 'staff' },
    action: 'staff.delete',
    module: 'staff',
    targetId: staffId,
    targetType: 'staff',
    description: 'Staff account deleted.',
    ...(requestId ? { requestId } : {}),
  })
}

const resetStaffTwoFactor = async (
  staffId: string,
  requestingStaffId: string,
  actorId?: string,
  requestId?: string,
) => {
  const staff = await StaffModel.findById(staffId)

  if (!staff) {
    throw new AppError('Staff not found.', 404)
  }

  if (staff.isSuperAdmin) {
    throw new AppError('Super Admin 2FA cannot be reset', 403)
  }

  if (staffId === requestingStaffId) {
    throw new AppError('Cannot reset your own 2FA', 400)
  }

  staff.twoFactor.enabled = false
  staff.twoFactor.secret = undefined
  staff.twoFactor.pendingSecret = undefined
  staff.twoFactor.lastVerifiedAt = undefined
  await staff.save()

  await auditService.logEvent({
    actor: { id: actorId ?? 'system', type: 'staff' },
    action: 'staff.2fa.reset',
    module: 'staff',
    targetId: staffId,
    targetType: 'staff',
    description: 'Staff 2FA reset by admin.',
    ...(requestId ? { requestId } : {}),
  })

  return buildStaffSummary(staff)
}

const createStaffFromInvite = async (payload: {
  email: string
  name: string
  password: string
  roleId: string
  phone?: string
}) => {
  const existing = await StaffModel.findOne({ email: payload.email })

  if (existing) {
    throw new AppError('Staff account already exists.', 409)
  }

  const role = await RoleModel.findById(payload.roleId)

  if (!role) {
    throw new AppError('Role not found for invited staff.', 404)
  }

  const passwordHash = await hashWithScrypt(payload.password)

  const staff = await StaffModel.create({
    name: payload.name,
    email: payload.email,
    ...(payload.phone ? { phone: payload.phone } : {}),
    passwordHash,
    roleId: role._id,
    isSuperAdmin: false,
    isActive: true,
    twoFactor: { enabled: false },
  })

  return buildStaffSummary(staff)
}

export const staffService = {
  inviteStaff,
  reinviteStaff,
  listStaff,
  getStaffById,
  getStaffActivity,
  updateStaffRole,
  suspendStaff,
  unsuspendStaff,
  removeStaff,
  resetStaffTwoFactor,
  createStaffFromInvite,
}
