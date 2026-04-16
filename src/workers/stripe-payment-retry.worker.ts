import { subscriptionsService } from '../modules/subscriptions/service'
import { executeWithRetry } from './retry.util'

export const runStripePaymentRetryWorker = async (): Promise<void> => {
  await executeWithRetry(
    'stripe-payment-retry',
    async () => {
      await subscriptionsService.processDueStripeInvoiceRetries()
    },
    {
      maxAttempts: 4,
      backoffMs: 500,
    },
  )
}
