import type { Express } from 'express'
import passport from 'passport'
import {
  Strategy as FacebookStrategy,
  type Profile as FacebookProfile,
  type VerifyFunction as FacebookVerifyFunction,
} from 'passport-facebook'
import {
  Strategy as GoogleStrategy,
  type Profile as GoogleProfile,
  type VerifyCallback as GoogleVerifyCallback,
} from 'passport-google-oauth20'

import { config } from './index'

const shouldEnableGoogle = Boolean(
  config.oauth.googleClientId &&
  config.oauth.googleClientSecret &&
  config.oauth.googleCallbackUrl,
)

const shouldEnableFacebook = Boolean(
  config.oauth.facebookAppId &&
  config.oauth.facebookAppSecret &&
  config.oauth.facebookCallbackUrl,
)

if (shouldEnableGoogle) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: config.oauth.googleClientId!,
        clientSecret: config.oauth.googleClientSecret!,
        callbackURL: config.oauth.googleCallbackUrl!,
      },
      (
        _accessToken: string,
        _refreshToken: string,
        profile: GoogleProfile,
        done: GoogleVerifyCallback,
      ) => {
        const email = profile.emails?.[0]?.value?.toLowerCase().trim()

        if (!email) {
          done(new Error('Google account does not contain an email address'))
          return
        }

        done(null, {
          provider: 'google' as const,
          providerId: profile.id,
          email,
          name: profile.displayName || email.split('@')[0],
        })
      },
    ),
  )
}

if (shouldEnableFacebook) {
  passport.use(
    new FacebookStrategy(
      {
        clientID: config.oauth.facebookAppId!,
        clientSecret: config.oauth.facebookAppSecret!,
        callbackURL: config.oauth.facebookCallbackUrl!,
        profileFields: ['id', 'displayName', 'emails'],
      },
      ((
        _accessToken: string,
        _refreshToken: string,
        profile: FacebookProfile,
        done: (error: Error | null, user?: Express.User | false) => void,
      ) => {
        const email = profile.emails?.[0]?.value?.toLowerCase().trim()

        if (!email) {
          done(new Error('Facebook account does not contain an email address'))
          return
        }

        done(null, {
          provider: 'facebook' as const,
          providerId: profile.id,
          email,
          name: profile.displayName || email.split('@')[0],
        })
      }) as FacebookVerifyFunction,
    ),
  )
}

passport.serializeUser((user, done) => {
  done(null, user)
})

passport.deserializeUser((user: Express.User, done) => {
  done(null, user)
})

export const initializePassport = (app: Express): void => {
  app.use(passport.initialize())
}
