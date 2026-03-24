export type { ISearchLog } from './interface'
export { searchRouter } from './router'
export { searchService } from './service'

import * as searchControllerExports from './controller'
import * as searchServiceExports from './service'
import * as searchRouterExports from './router'
import * as searchValidationExports from './validation'

export const searchModule = {
  controller: searchControllerExports,
  service: searchServiceExports,
  router: searchRouterExports,
  validation: searchValidationExports,
}
