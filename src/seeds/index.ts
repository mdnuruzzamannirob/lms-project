import { seedPermissions } from './permissions.seed'
import { seedPlans } from './plans.seed'
import { seedSettings } from './settings.seed'
import { seedSuperAdmin } from './superAdmin.seed'

export const runAllSeeds = async (): Promise<void> => {
  await seedPermissions()
  await seedPlans()
  await seedSettings()
  await seedSuperAdmin()
}
