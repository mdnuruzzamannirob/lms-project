import { hashWithScrypt } from '../common/utils/crypto'
import { connectToDatabase, disconnectFromDatabase } from '../config/db'
import { logger } from '../config/logger'
import { defaultPermissionSeeds, rbacService } from '../modules/rbac'
import { RoleModel } from '../modules/rbac/model'
import { StaffModel } from '../modules/staff/model'

const SUPER_ADMIN_ROLE_NAME = 'super-admin'

const getRequiredEnv = (key: string): string => {
  const value = process.env[key]?.trim()

  if (!value) {
    throw new Error(`${key} is required for super admin seed`)
  }

  return value
}

export const seedSuperAdmin = async (): Promise<void> => {
  await rbacService.ensurePermissionSeed()

  const allPermissionKeys = defaultPermissionSeeds.map(
    (permission) => permission.key,
  )

  const role = await RoleModel.findOneAndUpdate(
    { name: SUPER_ADMIN_ROLE_NAME },
    {
      $set: {
        description: 'System Super Admin Role',
        permissions: allPermissionKeys,
        isSystem: true,
      },
    },
    {
      upsert: true,
      new: true,
    },
  )

  const email = getRequiredEnv('SUPER_ADMIN_EMAIL').toLowerCase()
  const password = getRequiredEnv('SUPER_ADMIN_PASSWORD')
  const name = process.env.SUPER_ADMIN_NAME?.trim() || 'Super Admin'

  const existing = await StaffModel.findOne({ email })

  if (existing) {
    existing.isSuperAdmin = true
    existing.isActive = true
    existing.roleId = role._id
    await existing.save()
    return
  }

  const passwordHash = await hashWithScrypt(password)

  await StaffModel.create({
    name,
    email,
    passwordHash,
    roleId: role._id,
    isSuperAdmin: true,
    isActive: true,
    twoFactor: { enabled: false },
  })
}

if (require.main === module) {
  void (async () => {
    try {
      await connectToDatabase()
      await seedSuperAdmin()
      logger.info('Super admin seed completed successfully.')
      await disconnectFromDatabase()
      process.exit(0)
    } catch (error) {
      logger.error('Super admin seed failed.', {
        error:
          error instanceof Error
            ? (error.stack ?? error.message)
            : String(error),
      })
      await disconnectFromDatabase()
      process.exit(1)
    }
  })()
}
