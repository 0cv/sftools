import passport from 'koa-passport'
import {User} from '../src/models'
import {Strategy} from 'passport-local'

passport.serializeUser((user, done) => {
  user.password = null
  done(null, user)
})

passport.deserializeUser(async (user, done) => {
  done(null, user)
})

passport.use(new Strategy(async (username, password, done) => {
  try {
    const user = await User.findOne({ username })
    if (!user) { return done(null, false) }

    try {
      const isMatch = await user.validatePassword(password)

      if (!isMatch) { return done(null, false) }

      done(null, user)
    } catch (err) {
      done(err)
    }

  } catch (err) {
    return done(err)
  }
}))

