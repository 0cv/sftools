import mongoose from 'mongoose'
import Promise from 'bluebird'
mongoose.Promise = Promise

const _Project = new mongoose.Schema({
  name: String,
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  sharedWith: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  connection: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Connection'
  },
  latestCommit: String
})

const Project = mongoose.model('Project', _Project)
export { Project }
