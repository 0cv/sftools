import mongoose from 'mongoose'
import Promise from 'bluebird'
mongoose.Promise = Promise

const _Release = new mongoose.Schema({
  name: String,
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  sharedWith: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  stories: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Story'
  }]
})

const Release = mongoose.model('Release', _Release)
export { Release }
