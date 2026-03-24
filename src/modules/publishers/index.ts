export { publishersRouter } from './router'
export * from './utils'

import * as publishersControllerExports from './controller'
import * as publishersServiceExports from './service'
import * as publishersRouterExports from './router'
import * as publishersValidationExports from './validation'

export const publishersModule = {
  controller: publishersControllerExports,
  service: publishersServiceExports,
  router: publishersRouterExports,
  validation: publishersValidationExports,
}
