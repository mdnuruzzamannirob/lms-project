import passport from 'passport'
import {
  ExtractJwt,
  Strategy as JwtStrategy,
  StrategyOptions,
} from 'passport-jwt'
import { User } from '../models/user.model'
import env from './env'

const opts: StrategyOptions = {
  jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
  secretOrKey: env.JWT_SECRET,
}

passport.use(
  'user-jwt',
  new JwtStrategy(opts, async (payload, done) => {
    try {
      if (payload.type !== 'user') return done(null, false)

      const user = await User.findById(payload.id).select(
        '-password_hash -google_id -facebook_id',
      )

      if (!user || user.status !== 'active') return done(null, false)
      if (user.token_version !== payload.tv) return done(null, false)

      return done(null, user)
    } catch (err) {
      return done(err, false)
    }
  }),
)

export default passport
