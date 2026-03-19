import { hashWithScrypt } from '../common/utils/crypto'
import { config } from '../config'
import { connectToDatabase, disconnectFromDatabase } from '../config/db'
import { logger } from '../config/logger'
import { defaultPermissionSeeds, rbacService } from '../modules/rbac'
import { RoleModel } from '../modules/rbac/model'
import { StaffModel } from '../modules/staff/model'

export const seedSuperAdmin = async (): Promise<void> => {
  await rbacService.ensurePermissionSeed()

  const allPermissionKeys = defaultPermissionSeeds.map(
    (permission) => permission.key,
  )

  const role = await RoleModel.findOneAndUpdate(
    { name: config.superAdmin.name },
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

  const email = config.superAdmin.email.toLowerCase()
  const password = config.superAdmin.password
  const name = config.superAdmin.name

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
