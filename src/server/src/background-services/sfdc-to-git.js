import { Connection, PrivateKey, GitServer, User } from '../models'
import mongoose from 'mongoose'
import { config } from '../../config'
import buildPackage from './util/build-package'
import { jsforce } from '../utils'
import Promise from 'bluebird'

const _needle = require('needle')
const needle = Promise.promisifyAll(require('needle-retries')(_needle))
const fs = Promise.promisifyAll(require('fs'))
const path = require('path')
const execAsync = Promise.promisify(require('child_process').exec)
const AdmZip = require('adm-zip')
const slug = require('slug')
const rimrafAsync = Promise.promisify(require('rimraf'))

let globalAllGitServers = []

//entry point called either from worker.js
export async function sfdcToGit() {
  console.log('sfdcToGit started')

  try {
    const tmpFilesFolder = 'tmpFiles'
    //we first configurate Git and the Private Keys
    //so that we can perform basic operations such as git pull / git push etc.
    let connections = await createSSHKey()
    console.log('connections', connections)

    //Retrieve Metadata From Git in order to populate ./.git
    connections = await retrieveMetadataFromGit(connections, tmpFilesFolder, false)

    //for each connection, we retrieve the metadata from SFDC and then push them to Git
    await Promise.join(...connections
      .map(async (connection) => {
        //initialise each connection with jsForce
        let sfConn = jsforce(connection)

        try {
          await sfConn.query('SELECT Id FROM Account limit 1')
        } catch (e) {
          console.error('Fail to make a test query returning (invalid token)', e)
          sfConn._destroy()
          return
        }

        //retrieve Metadata from Salesforce
        await retrieveMetadataFromSalesforce(connection, sfConn, tmpFilesFolder)

        //connection not needed anymore, we can destroy it
        sfConn._destroy()

        console.info('startBackup.connection.pushMetadataToGit', connection.folder)
        if (!connection || !connection.accesstoken) {
          return
        }

        //Push Metadata to Git
        await pushMetadataToGit(connection, globalAllGitServers, tmpFilesFolder, true)
      })
    )
    console.log('sfdcToGit finished!')
  } catch (e) {
    console.log('ERROR IN startBackup', e)
  }
}

//get the git server from the connection
function findCurrentGitserver(connection, allGitservers) {
  if (!connection.gitserver) {
    return
  }
  let server = allGitservers.find((allGitserver) => {
    return allGitserver._id.toString() === connection.gitserver.toString() && connection.user.toString() === allGitserver.user.toString()
  })
  return server && server.gitserver
}

//create the folder of the connection param and pulls the data from GitHub / Bitbucket (if it already exists).
//topFolder: folder where the metadata are saved temporarily
//onlyPull: whether or not delete the files once they are retrieved. In most cases, we delete them
//          so that we only keep the information in .git
export async function retrieveMetadataFromGit(connections, topFolder, onlyPull, fetch) {
  await rimrafAsync(topFolder)
  await fs.mkdirAsync(topFolder)

  const userIds = connections.map((connection) => mongoose.Types.ObjectId(connection.user))

  const usersTmp = await User.find({
    '_id': {
      '$in': userIds
    }
  }).lean()

  let users = new Map()
  for (let user of usersTmp) {
    users.set(user._id.toString(), user)
  }

  connections = await Promise.join(...connections.map((connection) => pullMetadata(connection, topFolder, onlyPull, users, fetch)))

  //filter remaining connections
  return connections.filter((conn) => conn)
}

//this method literally pull metadata from Salesforce. It's called for each Connection
async function pullMetadata(connection, topFolder, onlyPull, users, fetch) {
  let gitusername,
    pfad = path.join(topFolder, connection._id.toString()),
    gitServer = findCurrentGitserver(connection, globalAllGitServers)

  for (let globalAllGitServer of globalAllGitServers) {
    if (globalAllGitServer.gitserver === gitServer && globalAllGitServer.user.toString() === connection.user.toString()) {
      gitusername = globalAllGitServer.username
      break
    }
  }

  let gitFolder = slug(connection.folder).toLowerCase()
  let sshURL = `git@${connection._id}:${connection.companyfolder ? connection.companyfolder : gitusername}/${gitFolder}.git`

  await fs.mkdirAsync(pfad)

  try {
    await execAsync(`git init ${pfad}`, {
      maxBuffer: Infinity
    })
  } catch (e) {
    console.error('sfdcToGit.retrieveMetadataFromGit.gitInit:', e)
    return
  }

  console.info(`cd ${pfad} && git config --local http.sslverify false`)
  try {
    await execAsync(`cd ${pfad} && git config --local http.sslverify false`, {
      maxBuffer: Infinity
    })
  } catch (e) {
    console.error('sfdcToGit.retrieveMetadataFromGit.config:', e)
    return
  }

  console.info('git config', `cd ${pfad} && git config user.email "${users.get(connection.user.toString()).email}" && git config user.name "${gitusername}"`)
  try {
    await execAsync(`cd ${pfad} && git config user.email "${users.get(connection.user.toString()).email}" && git config user.name "${gitusername}"`, {
      maxBuffer: Infinity
    })
  } catch (e) {
    console.error('sfdcToGit.retrieveMetadataFromGit.config:', e)
    return
  }

  if (fetch) {
    console.info('git fetch master', `cd ${pfad} && git fetch ${sshURL} master:master --update-head-ok`)
    try {
      await execAsync(`cd ${pfad} && git fetch ${sshURL} master:master --update-head-ok`, {
        maxBuffer: Infinity
      })
    } catch (e) {
      console.error('sfdcToGit.retrieveMetadataFromGit.gitFetch1:', e)
      return connection
    }

    console.info('git fetch branch', `cd ${pfad} && git fetch ${sshURL} ${connection.branch}:${connection.branch} --update-head-ok`)
    try {
      await execAsync(`cd ${pfad} && git fetch ${sshURL} ${connection.branch}:${connection.branch} --update-head-ok`, {
        maxBuffer: Infinity
      })
    } catch (e) {
      console.error('sfdcToGit.retrieveMetadataFromGit.gitFetch2:', e)
      return connection
    }
  } else {
    console.info('git pull', `cd ${pfad} && git pull --depth 1 ${sshURL} ${connection.branch ? connection.branch : 'master'}`)
    try {
      await execAsync(`cd ${pfad} && git pull --depth 1 ${sshURL} ${connection.branch ? connection.branch : 'master'}`, {
        maxBuffer: Infinity
      })
    } catch (e) {
      console.error('sfdcToGit.retrieveMetadataFromGit.gitPull:', e)
      //we return the connection because this error may occur simply because the folder does not
      //exist yet. Therefore, the process shall continue.
      return connection
    }
  }


  if (onlyPull) {
    return connection
  }
  console.info('delete everything but .git...', connection._id)
  try {
    await execAsync(`cd ${pfad} && find . -maxdepth 1 ! -name ".git" ! -name ".*" | xargs rm -rf`, {
      maxBuffer: Infinity
    })
  } catch (e) {
    console.error('sfdcToGit.retrieveMetadataFromGit.deleteEverythingButGit:', e)
  }
  return connection
}

export async function getLatestCommits(connections) {
  let ret = new Map()
  await Promise.join(...connections.map((connection) => getLatestCommit(ret, connection)))
  return ret
}

async function getLatestCommit(ret, connection) {
  try {
    console.info('connection', connection.folder)
    let gitusername,
      gitServer = findCurrentGitserver(connection, globalAllGitServers)

    for (let globalAllGitServer of globalAllGitServers) {
      if (globalAllGitServer.gitserver === gitServer && globalAllGitServer.user.toString() === connection.user.toString()) {
        gitusername = globalAllGitServer.username
        break
      }
    }

    let gitFolder = slug(connection.folder).toLowerCase()
    let sshURL = ' git@' + connection._id + ':' + (connection.companyfolder ? connection.companyfolder : gitusername) + '/' + gitFolder + '.git '

    console.info('git config --global http.sslverify false')
    await execAsync('git config --global http.sslverify false')

    let hash = await execAsync('git ls-remote ' + sshURL + (connection.branch ? connection.branch : 'master'))
    console.info('sfdcToGit.getLatestCommits0', connection.folder, hash)
    if (hash.includes('\t')) {
      hash = hash.split('\t')[0]
    }
    console.info('sfdcToGit.getLatestCommits1', connection.folder, hash)

    ret.set(connection._id.toString(), hash)
  } catch (e) {
    console.info('sfdcToGit.getLatestCommits.gitPull:', e)
  }
}

//Create a .git/config file which will be used later to perform Git operations
export async function createSSHKey(connections) {
  try {
    let [keys, gitservers, connectionsTmp] = await Promise.join(
      PrivateKey.find().lean(),
      GitServer.find().lean(),
      Connection.find({
        privatekey: {
          $ne: null
        },
        componenttypes: { $gt: [] }
      }))

    if (!connections) {
      connections = connectionsTmp
    }
    if (!Array.isArray(connections)) {
      connections = [connections]
    }
    if (!Array.isArray(gitservers)) {
      gitservers = [gitservers]
    }
    if (!Array.isArray(keys)) {
      keys = [keys]
    }
    globalAllGitServers = gitservers

    //avoid throwing error with SSL Certs
    let configFile = ''

    //we resolve the path which shall exist on any system
    const userDirectory = process.env.HOME || process.env.HOMEPATH || process.env.USERPROFILE

    for (let connection of connections) {
      let gitServerName = findCurrentGitserver(connection, gitservers)
      configFile += 'Host ' + connection._id.toString() + '\n'
      configFile += 'HostName ' +
        (gitServerName === 'GitHub' ? 'github.com' :
          gitServerName === 'Bitbucket' ? 'bitbucket.org' : '') + '\n'
      configFile += 'IdentityFile ' + path.join(userDirectory, '.ssh', connection.privatekey.toString()) + '\n'
    }

    await fs.writeFileAsync(path.join(userDirectory, '.ssh', 'config'), configFile)

    await Promise.all(keys.map(async (key) => {
      let myPath = path.join(userDirectory, '.ssh', key._id.toString())
      await fs.writeFileAsync(myPath, key.value)
      await fs.chmodAsync(myPath, '700')
    }))

  } catch (e) {
    console.log('ERROR IN createSSHKey', e)
    throw e
  }
  return connections
}


//responsible for creating the GIT repo (if it doesn't exist) and for pushing the data to the GIT server.
export async function pushMetadataToGit(connection, allGitservers, tmpFilesFolder, doUpdate) {
  console.log('process pushMetadataToGit', process.memoryUsage(), connection.folder)

  let workingPfad = `"${path.join(tmpFilesFolder, connection._id.toString())}"`,
    post_data = {},
    gitusername,
    gitpassword,
    post_options = {
      headers: {
        'Content-Type': 'application/json'
      },
      json: true
    }

  let gitServerName = findCurrentGitserver(connection, allGitservers)
  let gitFolder = slug(connection.folder).toLowerCase()

  if (gitServerName === 'Bitbucket') {
    for (let allGitserver of allGitservers) {
      if (allGitserver.gitserver === 'Bitbucket' && allGitserver.user.toString() === connection.user.toString()) {
        gitusername = allGitserver.username
        gitpassword = allGitserver.password
        break
      }
    }
    post_options.url = 'https://api.bitbucket.org/2.0/repositories/' + (connection.companyfolder ? connection.companyfolder : gitusername) + '/' + slug(connection.folder).toLowerCase()
    post_options.username = gitusername
    post_options.password = gitpassword
    post_data = {
      is_private: 'true',
      scm: 'git',
      name: gitFolder
    }
    if (connection.companyfolder && connection.companyfolder.length) {
      post_data.owner = connection.companyfolder
    }
  } else if (gitServerName === 'GitHub') {
    for (let allGitserver of allGitservers) {
      if (allGitserver.gitserver === 'GitHub' && allGitserver.user.toString() === connection.user.toString()) {
        gitusername = allGitserver.username
        gitpassword = allGitserver.password
        break
      }
    }
    post_options.url = 'https://api.github.com/user/repos'
    post_options.username = gitusername
    post_options.password = gitpassword
    post_data.name = gitFolder
  }

  const sshURL = `git@${connection._id}:${connection.companyfolder && connection.companyfolder.length ? connection.companyfolder : gitusername}/${gitFolder}.git`

  // post_options.headers['Content-Length'] = Buffer.byteLength(post_data)
  console.log('workingPfad', workingPfad)
  console.log('post_data', post_data)

  await fs.openAsync(workingPfad.replace(/"/g, '') + '/package.xml', 'r')
  const payload = await needle.postAsync(post_options.url, post_data, post_options)
  const res = payload.body

  console.log('creation of folder:', res)
  try {
    await execAsync(`cd ${workingPfad} && git add -A`, {
      maxBuffer: Infinity
    })
  } catch (e) {
    console.log('sfdcToGit.pushMetadataToGit.gitAdd:', e.message)
    return e.message
  }

  let commitMessage = connection.commitmessage || 'heroku commit'
  try {
    await execAsync(`cd ${workingPfad} && git commit -m "${commitMessage}"`, {
      maxBuffer: Infinity
    })
  } catch (e) {
    console.log('sfdcToGit.pushMetadataToGit.gitCommit:', e)
    return 'Nothing has changed??...<br/><br/>' + e.message
  }

  try {
    await execAsync(`cd ${workingPfad} && git push --all ${sshURL}`, {
      maxBuffer: Infinity
    })
  } catch (e) {
    console.log('sfdcToGit.pushMetadataToGit.gitPush:', e)
    return e.message
  }

  if (doUpdate) {
    let currentDate = new Date()
    try {
      await Connection.update({
        '_id': connection._id
      }, {
          $set: {
            lastupdate: currentDate.toGMTString(),
            backupStatus: null
          }
        })
    } catch (e) {
      console.log('sfdcToGit.pushMetadataToGit:', e)
      const files = await fs.readdirAsync(workingPfad.replace(/"/g, ''))
      console.info('files still there:', files)
    }

    try {
      await execAsync('rm -rf ' + workingPfad)
    }
    catch (e) {
      console.log('sfdcToGit.pushMetadataToGit.catch:', e)
    }
  }
  return null
}

//get the metadata from salesforce and extracts the zip on the server drive.
//this method is called for every connection
async function retrieveMetadataFromSalesforce(connection, sfConn, tmpFilesFolder) {
  console.log('retrieveMetadataFromSalesforce started', connection._id)

  // Build the package xml as a JS object
  const jsPackage = await buildPackage(connection, sfConn)
  console.log('jsPackage', jsPackage)

  sfConn.metadata.pollTimeout = 3 * 60 * 60 * 1000 // 3 hours
  sfConn.metadata.pollInterval = 15 * 1000 // 15 seconds

  const time = process.hrtime()
  const fileName = (time[0] * 1e9 + time[1]).toString() + '.zip'

  const packageStream = fs.createWriteStream(fileName)

  try {
    sfConn.metadata.retrieve({
      apiVersion: config.apiVersion,
      singlePackage: true,
      unpackaged: jsPackage
    })
      .stream().pipe(packageStream)
  } catch (e) {
    console.log('Error when retrieving metadata', e)
    return
  }

  await new Promise((resolve) => {
    packageStream.on('close', function () {
      console.log('Zip Saved')
      resolve()
    })
  })

  //the zip is now saved on the disk, it must be now unzipped
  console.log('memory usage', process.memoryUsage(), connection.folder, fileName)
  let currentFolder = path.join(tmpFilesFolder, connection._id.toString())
  try {
    let big = new AdmZip(fileName)
    console.log('mem4', process.memoryUsage(), connection.folder)
    big.extractAllTo(currentFolder, true)
  } catch (e) {
    console.error('Error in AdmZip', e)
  }
  console.log('mem5', process.memoryUsage(), connection.folder)
  await fs.unlinkAsync(fileName)
}
