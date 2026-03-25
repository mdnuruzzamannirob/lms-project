import { describe, expect, it } from 'vitest'

import { UserModel } from '../../src/modules/auth/model'
import { authService } from '../../src/modules/auth/service'

describe('Auth integration flow', () => {
  it('registers and logs in a user', async () => {
    const email = `auth-${Date.now()}@mail.test`
    const password = 'StrongPass123!'

    const registered = await authService.register({
      firstName: 'Auth',
      lastName: 'User',
      email,
      password,
      countryCode: 'BD',
    })

    expect(registered.user.email).toBe(email)
    expect(registered.tokens.accessToken.length).toBeGreaterThan(20)

    const loggedIn = await authService.login({
      email,
      password,
    })

    expect(loggedIn.requiresTwoFactor).toBe(false)
    if (loggedIn.requiresTwoFactor) {
      throw new Error(
        'Expected login without 2FA challenge in integration test.',
      )
    }
    expect(loggedIn.user.email).toBe(email)
    expect(loggedIn.accessToken.length).toBeGreaterThan(20)
  })

  it('rejects login when account is suspended', async () => {
    const email = `suspended-${Date.now()}@mail.test`
    const password = 'StrongPass123!'

    const registered = await authService.register({
      firstName: 'Suspended',
      lastName: 'User',
      email,
      password,
      countryCode: 'BD',
    })

    await UserModel.updateOne(
      { _id: registered.user.id },
      { $set: { isSuspended: true } },
    )

    await expect(
      authService.login({
        email,
        password,
      }),
    ).rejects.toThrow('Account is inactive or suspended.')
  })

  it('rejects refresh for inactive account', async () => {
    const email = `inactive-${Date.now()}@mail.test`
    const password = 'StrongPass123!'

    const registered = await authService.register({
      firstName: 'Inactive',
      lastName: 'User',
      email,
      password,
      countryCode: 'BD',
    })

    await UserModel.updateOne(
      { _id: registered.user.id },
      { $set: { isActive: false } },
    )

    await expect(
      authService.refreshSession(registered.tokens.refreshToken),
    ).rejects.toThrow('Account is inactive or suspended.')
  })
})
