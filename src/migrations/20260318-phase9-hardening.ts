import { ReportJobModel } from '../modules/reports/model'
import { SettingsModel } from '../modules/settings/model'

export const migration20260318Phase9Hardening = async (): Promise<void> => {
  // Ensure singleton settings exists for deployment safety.
  await SettingsModel.updateOne(
    { singletonKey: 'global' },
    {
      $setOnInsert: {
        singletonKey: 'global',
        providers: {
          email: {
            from: 'noreply@example.com',
            enabled: true,
          },
          push: { enabled: true },
          storage: { enabled: true, basePath: 'uploads' },
          payment: { enabled: true, currency: 'BDT' },
        },
        templates: { email: {}, push: {} },
        maintenance: {
          enabled: false,
          message: 'System is currently under maintenance.',
          allowedIps: [],
        },
        trial: {
          enabled: true,
          durationDays: 7,
          maxDevices: 2,
          autoActivate: true,
        },
      },
    },
    { upsert: true },
  )

  // Normalize stale processing jobs to queued for retry-safe restarts.
  await ReportJobModel.updateMany(
    {
      status: 'processing',
    },
    {
      $set: {
        status: 'queued',
      },
    },
  )
}
