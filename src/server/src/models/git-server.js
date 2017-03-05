import mongoose from 'mongoose'
import Promise from 'bluebird'
mongoose.Promise = Promise

const _GitServer = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  name: String,
  gitserver: String,
  username: String,
  password: String
})

const GitServer = mongoose.model('GitServer', _GitServer)
export { GitServer }
