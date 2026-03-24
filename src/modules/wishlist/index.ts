export * from './controller'
export * from './interface'
export * from './model'
export { wishlistRouter } from './router'
export * from './service'
export * from './validation'

import * as wishlistControllerExports from './controller'
import * as wishlistServiceExports from './service'
import * as wishlistRouterExports from './router'
import * as wishlistValidationExports from './validation'

export const wishlistModule = {
  controller: wishlistControllerExports,
  service: wishlistServiceExports,
  router: wishlistRouterExports,
  validation: wishlistValidationExports,
}
export * from './utils'
