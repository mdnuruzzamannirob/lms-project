export type { INotification } from './interface'
export { notificationsRouter } from './router'
export { notificationsService } from './service'

import * as notificationsControllerExports from './controller'
import * as notificationsServiceExports from './service'
import * as notificationsRouterExports from './router'
import * as notificationsValidationExports from './validation'

export const notificationsModule = {
  controller: notificationsControllerExports,
  service: notificationsServiceExports,
  router: notificationsRouterExports,
  validation: notificationsValidationExports,
}
export * from './utils'
