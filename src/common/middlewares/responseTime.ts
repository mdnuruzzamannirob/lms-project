import type { RequestHandler } from 'express'

export const responseTime: RequestHandler = (_request, response, next) => {
  const start = process.hrtime.bigint()
  const originalEnd = response.end.bind(response)

  response.end = ((...args: Parameters<typeof originalEnd>) => {
    const durationInNs = process.hrtime.bigint() - start
    const durationInMs = Number(durationInNs) / 1_000_000
    response.locals.responseTimeMs = durationInMs.toFixed(2)

    if (!response.headersSent) {
      response.setHeader(
        'x-response-time',
        `${response.locals.responseTimeMs}ms`,
      )
    }

    return originalEnd(...args)
  }) as typeof response.end

  next()
}
