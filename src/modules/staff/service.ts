import { AppError } from '../../common/errors/AppError'
import { auditService } from '../../common/services/audit.service'
import { emailService } from '../../common/services/email.service'
import {
  generateRandomToken,
  hashStringSha256,
  hashWithScrypt,
} from '../../common/utils/crypto'
import { RoleModel } from '../rbac/model'
import {
  StaffActivityLogModel,
  StaffInviteTokenModel,
} from '../staff-auth/model'
import type { IStaff } from './interface'
import { StaffModel } from './model'

const buildStaffSummary = (staff: IStaff | null) => {
  if (!staff) {
    throw new AppError('Staff not found.', 404)
  }

  return {
    id: staff._id.toString(),
    name: staff.name,
    email: staff.email,
    phone: staff.phone,
    roleId: staff.roleId.toString(),
    isSuperAdmin: staff.isSuperAdmin,
    isActive: staff.isActive,
    twoFactorEnabled: staff.twoFactor.enabled,
    createdAt: staff.createdAt.toISOString(),
    updatedAt: staff.updatedAt.toISOString(),
  }
}

export const staffService = {
  inviteStaff: async (
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

    await emailService.sendEmail({
      to: payload.email,
      subject: 'LMS Staff Invitation',
      text: `Your invitation token is: ${rawToken}`,
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
  },

  reinviteStaff: async (
    staffId: string,
    actorId?: string,
    requestId?: string,
  ) => {
    const staff = await StaffModel.findById(staffId)

    if (!staff) {
      throw new AppError('Staff not found.', 404)
    }

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

    await emailService.sendEmail({
      to: staff.email,
      subject: 'LMS Staff Re-Invitation',
      text: `Your new invitation token is: ${rawToken}`,
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
  },

  listStaff: async () => {
    const staffRows = await StaffModel.find({}).sort({ createdAt: -1 })
    return staffRows.map((row) => buildStaffSummary(row))
  },

  getStaffById: async (staffId: string) => {
    const staff = await StaffModel.findById(staffId)
    return buildStaffSummary(staff)
  },

  getStaffActivity: async (staffId: string) => {
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
  },

  updateStaffRole: async (
    staffId: string,
    roleId: string,
    actorId?: string,
    requestId?: string,
  ) => {
    const staff = await StaffModel.findById(staffId)

    if (!staff) {
      throw new AppError('Staff not found.', 404)
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
  },

  suspendStaff: async (
    staffId: string,
    actorId?: string,
    requestId?: string,
  ) => {
    const staff = await StaffModel.findById(staffId)

    if (!staff) {
      throw new AppError('Staff not found.', 404)
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
  },

  unsuspendStaff: async (
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
  },

  removeStaff: async (
    staffId: string,
    actorId?: string,
    requestId?: string,
  ) => {
    const staff = await StaffModel.findById(staffId)

    if (!staff) {
      throw new AppError('Staff not found.', 404)
    }

    await StaffModel.deleteOne({ _id: staff._id })

    await auditService.logEvent({
      actor: { id: actorId ?? 'system', type: 'staff' },
      action: 'staff.delete',
      module: 'staff',
      targetId: staffId,
      targetType: 'staff',
      description: 'Staff account deleted.',
      ...(requestId ? { requestId } : {}),
    })
  },

  createStaffFromInvite: async (payload: {
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
  },
}
