import { AppError } from './AppError'

interface ValidationIssue {
  path?: string
  message?: string
}

export const handleValidationError = (issues: ValidationIssue[]): AppError => {
  const details = issues.map((issue) => ({
    path: issue.path || 'unknown',
    message: issue.message ?? 'Validation error',
  }))

  return new AppError('Validation failed', 400, details)
}
