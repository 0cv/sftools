import mongoose from 'mongoose'
import Promise from 'bluebird'
mongoose.Promise = Promise

const _Story = new mongoose.Schema({
  name: String,
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
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
