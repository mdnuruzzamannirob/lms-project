export * from './controller'
export * from './interface'
export * from './model'
export { onboardingRouter } from './router'
export * from './service'
export * from './validation'

import * as onboardingControllerExports from './controller'
import * as onboardingServiceExports from './service'
import * as onboardingRouterExports from './router'
import * as onboardingValidationExports from './validation'

export const onboardingModule = {
  controller: onboardingControllerExports,
  service: onboardingServiceExports,
  router: onboardingRouterExports,
  validation: onboardingValidationExports,
}
export * from './utils'
