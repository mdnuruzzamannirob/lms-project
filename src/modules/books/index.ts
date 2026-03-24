export * from './controller'
export * from './interface'
export * from './model'
export { booksRouter } from './router'
export * from './service'
export * from './validation'
export * from './utils'

import * as booksControllerExports from './controller'
import * as booksServiceExports from './service'
import * as booksRouterExports from './router'
import * as booksValidationExports from './validation'

export const booksModule = {
  controller: booksControllerExports,
  service: booksServiceExports,
  router: booksRouterExports,
  validation: booksValidationExports,
}
