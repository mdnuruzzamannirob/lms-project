export type { IMember, IMemberDetail } from './interface'
export { membersRouter } from './router'
export { membersService } from './service'

import * as membersControllerExports from './controller'
import * as membersServiceExports from './service'
import * as membersRouterExports from './router'
import * as membersValidationExports from './validation'

export const membersModule = {
  controller: membersControllerExports,
  service: membersServiceExports,
  router: membersRouterExports,
  validation: membersValidationExports,
}
export * from './utils'
