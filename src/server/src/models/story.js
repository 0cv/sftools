import mongoose from 'mongoose'
import Promise from 'bluebird'
mongoose.Promise = Promise

const _Story = new mongoose.Schema({
  branch: String,
  name: String,
  organization: String,
  latestCommit: String,
  gitServer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Gitserver'
  },
  privateKey: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Privatekey'
  },
  project: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project'
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  repository: String,
  sharedWith: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  storyMetadata: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Storymetadata'
  }]
})

const Story = mongoose.model('Story', _Story)
export { Story }
