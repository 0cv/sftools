import mongoose from 'mongoose'
import Promise from 'bluebird'
mongoose.Promise = Promise

const _Validation = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  story: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Story'
  },
  release: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Release'
  },
  target: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Connection'
  },
  status: String, //'Validating', 'Waiting'
  latestOutcome: String, //Failed|Succeeded|SucceededPartial|Canceled
  latestValidationTime: Date,
  testLevel: String, //'NoTestRun', 'RunLocalTests' or 'RunAllTestsInOrg'
  frequency: String, //asap,1h,6h,24h
  emails: String,
  log: String
})

const Validation = mongoose.model('Validation', _Validation)
export { Validation }

