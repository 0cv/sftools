import mongoose from 'mongoose'
import Promise from 'bluebird'
mongoose.Promise = Promise

const _Storymetadata = new mongoose.Schema({
  newValue: String,
  newValueBin: Buffer,
  isDeleted: Boolean,
  story: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Story',
    index: true
  },
  fullPath: { //redundant, but for allowing easier streaming when zipping data
    type: String,
    index: true
  },
  metadata: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Metadata'
  },
  project: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    index: true
  },
  updated_at: {
    type: Date,
    index: true
  }
})

const Storymetadata = mongoose.model('Storymetadata', _Storymetadata)
export { Storymetadata }
