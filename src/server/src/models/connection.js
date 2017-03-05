import mongoose from 'mongoose'
import Promise from 'bluebird'
mongoose.Promise = Promise

const _Connection = new mongoose.Schema({
  folder: String,
  description: String,
  lastupdate: Date,
  accesstoken: String,
  refreshtoken: String,
  instanceurl: String,
  sforgid: String,
  componenttypes: [String],
  backupmanagedpackage: Boolean,
  backupStatus: String,
  orgname: String,
  privatekey: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Privatekey'
  },
  gitserver: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Gitserver'
  },
  commitmessage: String,
  companyfolder: String,
  issandbox: Boolean,
  branch: String,
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  isrunningunittests: Boolean,
  unitteststatus: String,
  unittestlastrun: Date,
  unittestsrecipients: [String],
  unittestsstart: {
    type: Number
  },
  unittestsend: {
    type: Number
  },
  isunittestasync: Boolean,
  unittestfrequencyrun: String,
  slackwebhook: String
})

const Connection = mongoose.model('Connection', _Connection)
export {Connection}
