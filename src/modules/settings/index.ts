export * from './controller'
export * from './interface'
export * from './model'
export { settingsRouter } from './router'
export * from './service'
export * from './validation'
export * from './utils'

import * as settingsControllerExports from './controller'
import * as settingsServiceExports from './service'
import * as settingsRouterExports from './router'
import * as settingsValidationExports from './validation'

export const settingsModule = {
  controller: settingsControllerExports,
  service: settingsServiceExports,
  router: settingsRouterExports,
  validation: settingsValidationExports,
}
