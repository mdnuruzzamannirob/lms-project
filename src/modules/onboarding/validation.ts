import { z } from 'zod'

export const onboardingValidation = {
  selectPlanBody: z.object({
    planCode: z.string().trim().min(2).max(50),
  }),
  completeBody: z.object({
    agreeToTerms: z.literal(true),
  }),
  confirmPaymentBody: z.object({
    sessionId: z.string().trim().min(3),
    reference: z.string().trim().min(3).optional(),
  }),
  storeInterestsBody: z.object({
    interests: z.array(z.string().trim()).min(1),
  }),
  storeLanguageBody: z.object({
    language: z.string().trim().min(2).max(10),
  }),
}
