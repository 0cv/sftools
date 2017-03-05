import mongoose from 'mongoose'
import Promise from 'bluebird'
mongoose.Promise = Promise

const _PrivateKey = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  name: String,
  value: String
})

const PrivateKey = mongoose.model('PrivateKey', _PrivateKey)
export { PrivateKey }
