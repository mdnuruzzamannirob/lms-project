import type { RequestHandler } from 'express'
import { describe, expect, it, vi } from 'vitest'

import { AppError } from '../../src/common/errors/AppError'
import { authenticateTempToken } from '../../src/common/middlewares/authenticateTempToken'
import { requirePermission } from '../../src/common/middlewares/requirePermission'
import { signTempToken } from '../../src/common/utils/token'
import { config } from '../../src/config'

const createNext = () => vi.fn<(error?: unknown) => void>()

describe('requirePermission middleware', () => {
  it('allows wildcard permission for non-superadmin staff', () => {
    const middleware = requirePermission('staff.manage')
    const next = createNext()

    const request = {
      auth: {
        type: 'staff',
        isSuperAdmin: false,
        permissions: ['*'],
      },
    } as Parameters<RequestHandler>[0]

    middleware(request, {} as Parameters<RequestHandler>[1], next)

    expect(next).toHaveBeenCalledWith()
  })

  it('denies access when permission is missing', () => {
    const middleware = requirePermission('staff.manage')
    const next = createNext()

    const request = {
      auth: {
        type: 'staff',
        isSuperAdmin: false,
        permissions: ['staff.view'],
      },
    } as Parameters<RequestHandler>[0]

    middleware(request, {} as Parameters<RequestHandler>[1], next)

    expect(next).toHaveBeenCalledTimes(1)
    const [error] = next.mock.calls[0] ?? []
    expect(error).toBeInstanceOf(AppError)
    expect((error as AppError).statusCode).toBe(403)
  })
})

describe('authenticateTempToken middleware', () => {
  it('returns AppError via next when authorization header is missing', () => {
    const next = createNext()
    const request = {
      headers: {},
    } as Parameters<RequestHandler>[0]

    authenticateTempToken(request, {} as Parameters<RequestHandler>[1], next)

    expect(next).toHaveBeenCalledTimes(1)
    const [error] = next.mock.calls[0] ?? []
    expect(error).toBeInstanceOf(AppError)
    expect((error as AppError).statusCode).toBe(401)
  })

  it('sets request.auth for valid temporary staff token', () => {
    const next = createNext()
    const token = signTempToken(
      {
        id: 'staff-id-1',
        email: 'staff@mail.test',
        actorType: 'staff',
        pending2FA: true,
      },
      config.jwt.staffSecret,
      '5m',
    )

    const request = {
      headers: {
        authorization: `Bearer ${token}`,
      },
    } as Parameters<RequestHandler>[0]

    authenticateTempToken(request, {} as Parameters<RequestHandler>[1], next)

    expect(next).toHaveBeenCalledWith()
    expect(request.auth.sub).toBe('staff-id-1')
    expect(request.auth.type).toBe('staff-temp')
  })
})
