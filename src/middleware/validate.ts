import { NextFunction, Request, Response } from 'express'
import { ValidationChain, validationResult } from 'express-validator'
import { sendError } from '../utils/response'

export const validate =
  (rules: ValidationChain[]) =>
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    await Promise.all(rules.map((rule) => rule.run(req)))
    const result = validationResult(req)
    if (result.isEmpty()) return next()

    const errors = result.array().reduce<Record<string, string>>((acc, err) => {
      acc[(err as { path: string }).path] = err.msg as string
      return acc
    }, {})

    sendError(res, 'Validation failed.', 422, errors)
  }
