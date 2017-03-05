import mongoose from 'mongoose'
import bcrypt from 'bcrypt'
import { config } from '../../config'
import jwt from 'jsonwebtoken'
import beautifyUnique from 'mongoose-beautiful-unique-validation'
import Promise from 'bluebird'
mongoose.Promise = Promise

const _User = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: 'Two users cannot share the same Email'
  },
  username: {
    type: String,
    required: true,
    unique: 'Two users cannot share the same Username'
  },
  password: {
    type: String,
    required: true
  }
})

_User.plugin(beautifyUnique)

_User.pre('save', function preSave(next) {
  console.log('presave...')
  const user = this

  if (!user.isModified('password')) {
    return next()
  }

  new Promise((resolve, reject) => {
    bcrypt.genSalt(10, (err, salt) => {
      if (err) {
        return reject(err)
      }
      resolve(salt)
    })
  })
  .then(salt => {
    bcrypt.hash(user.password, salt, (err, hash) => {
      if (err) {
        throw new Error(err)
      }

      user.password = hash

      next(null)
    })
  })
  .catch(err => next(err))
})

_User.methods.validatePassword = function validatePassword(password) {
  const user = this

  return new Promise((resolve, reject) => {
    bcrypt.compare(password, user.password, (err, isMatch) => {
      if (err) {
        return reject(err)
      }

      resolve(isMatch)
    })
  })
}

_User.methods.generateToken = function generateToken() {
  console.log('generateToken...')
  const user = this

  return jwt.sign({
    id: user.id
  }, config.token)
}

const User = mongoose.model('User', _User)
export {User}
