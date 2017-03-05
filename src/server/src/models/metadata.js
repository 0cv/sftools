import mongoose from 'mongoose'
import Promise from 'bluebird'
mongoose.Promise = Promise

const _Metadata = new mongoose.Schema({
  project: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    index: true
  },
  apiFolder: {
    type: String,
    index: true
  }, //e.g. ApexClass
  name: String, //e.g. ClsController.cls
  filePath: String, //e.g. classes/ClsController.cls
  fullPath: String, //like filePath for main metadata. Added part for nested metadata, such as CustomObject, e.g. objects/Account.object|fields
  isIgnored: Boolean,
  status: {
    type: String,
    index: true
  },
  newValue: String, //new content of the metadata
  newValueBin: Buffer,
  updated_at: Date,
  storyMetadata: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Metadata'
  }]
})

const Metadata = mongoose.model('Metadata', _Metadata)
export { Metadata }
