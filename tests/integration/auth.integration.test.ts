import { describe, expect, it } from 'vitest'

import { authService } from '../../src/modules/auth/auth.service'

describe('Auth integration flow', () => {
  it('registers and logs in a user', async () => {
    const email = `auth-${Date.now()}@mail.test`
    const password = 'StrongPass123!'

    const registered = await authService.register({
      name: 'Auth User',
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

    expect(loggedIn.user.email).toBe(email)
    expect(loggedIn.tokens.accessToken.length).toBeGreaterThan(20)
  })
})
