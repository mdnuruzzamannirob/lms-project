import { describe, expect, it } from 'vitest'

import { auditService } from '../../../src/modules/audit/service'
import { reportsService } from '../../../src/modules/reports/service'
import { settingsService } from '../../../src/modules/settings/service'
import { createStaff } from '../../fixtures/factories'

describe('Audit/Settings/Reports unit behavior', () => {
  it('creates and lists audit logs', async () => {
    const staff = await createStaff()

    await auditService.createLog({
      actorType: 'admin',
      actorId: staff._id.toString(),
      actorEmail: staff.email,
      action: 'test.audit',
      module: 'audit',
      description: 'Audit unit test',
    })

    const logs = await auditService.listLogs({
      page: 1,
      limit: 10,
    })

    expect(logs.data.length).toBe(1)
  })

  it('returns singleton settings and updates settings', async () => {
    const staff = await createStaff()

    const current = await settingsService.getGlobalSettings()
    expect(current.providers.email.from).toBeDefined()

    const updated = await settingsService.updateGlobalSettings(
      staff._id.toString(),
      {
        maintenance: {
          enabled: true,
          message: 'Maintenance window',
        },
      },
    )

    expect(updated.maintenance.enabled).toBe(true)
    expect(updated.maintenance.message).toBe('Maintenance window')
  })

  it('creates report jobs and processes queued jobs', async () => {
    const staff = await createStaff()

    const created = await reportsService.createReportJob({
      staffId: staff._id.toString(),
      type: 'admin_overview',
      format: 'json',
      filters: {},
    })

    expect(created.status).toBe('queued')

    const processed = await reportsService.processQueuedReportsBatch(1)
    expect(processed.length).toBe(1)
  })
})
