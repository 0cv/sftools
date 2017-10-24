import { gitToDb, sfdcToGit, storiesValidation, unitTest } from '../src/background-services'
import mongoose from 'mongoose'
import { config } from '../config'
import Promise from 'bluebird'
const exec = require('child_process').exec

var mongooseOptions = {
  server: {
    socketOptions: {
      connectTimeoutMS: 300000
    }
  },
  useMongoClient: true
}

mongoose.Promise = Promise
mongoose.connect(config.database, mongooseOptions)

start()

async function start() {
  try {
    console.log('starting worker_server')

    await gitToDb()
    await Promise.all([
      async function() {
        await sfdcToGit(),
        await gitToDb()
      }(),
      unitTest(),
      storiesValidation()
    ])

    console.log('finished worker_server, restarting in 10 minutes')

    setTimeout(() => {
      restartProcess()
    }, 60 * 1000 * 10) // 10 minutes
  } catch(e) {
    console.log('ERROR IN WORKER_SERVER', e)
  }
}


process.on('uncaughtException', function(err) {
  console.error('UNCAUGHTEXCEPTION: ' + err)
  console.error(err.stack)
  setTimeout(function() {
    restartProcess()
  }, 1000 * 60 * 5)
});


function restartProcess() {
  let curlURL = 'curl -H "Accept: application/json" -u :' + process.env.APITOKEN + ' -X POST https://api.heroku.com/apps/' + process.env.INSTANCE_NAME + '/ps/restart';
  exec(curlURL, function(error, stdout, stderr) {
    console.info('process restarted!', process.env.INSTANCE_NAME)
    console.info('stdout', stdout)
    console.info('stderr', stderr)
    if(stdout && stdout.indexOf('"id":"maintenance"') > -1) {
      console.log('Maintenance mode ... trying again in 5 min')
      setTimeout(() => {
        restartProcess()
      }, 1000 * 60 * 5)
    }
    error && console.error(error);
  });
}
