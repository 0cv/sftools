import { Connection, GitServer, Metadata, Project, Story, Storymetadata } from '../../models'
import { getHeaderMetadata, getUserId, metadata, streamClose, streamData, streamError } from '../../utils'
import { createSSHKey, getLatestCommits, gitDiff, pushMetadataToGit, transformFilesToJS, retrieveMetadataFromGit } from '../../background-services'
import { config } from '../../../config'
import mongoose from 'mongoose'

const xml2js = Promise.promisifyAll( require('xml2js') )
const path = require('path')
const execAsync = Promise.promisify(require('child_process').exec)
const metadataZip = require('../../../metadata-zip').metadataZip
const fs = Promise.promisifyAll(require('fs'))
const AdmZip = require('adm-zip')


export async function commitToBranch(ctx, data) {
  const userId = await getUserId(ctx)
  const metadatas = data.metadatas
  const story = await Story.findOne({
    _id: data.story._id
  })
  const commitMessage = data.commitMessage
  const fakeConnection = {
    _id: story._id,
    user: userId,
    commitmessage: commitMessage,
    folder: story.repository,
    companyfolder: story.organization,
    branch: story.branch,
    privatekey: story.privateKey,
    gitserver: story.gitServer
  }

  await retrieveMetadataFromGit([fakeConnection], userId, true, true)

  const pfad = path.join(userId, fakeConnection._id.toString())

  // We try to create the branch (will get an error if it exists, does not matter...)
  try {
    await execAsync(`cd ${pfad} && git branch ${story.branch}`)
  } catch (e) {
    console.error('git branch newBranch:', e)
  }

  let firstCommit
  try {
    firstCommit = await execAsync(`cd ${pfad} && git merge-base master ${story.branch}`)
    firstCommit = firstCommit.split('\n')[0]
  } catch (e) {
    console.error('git merge-base master branch:', e)
    return
  }

  // We take the first Commit
  try {
    await execAsync(`cd ${pfad} && git checkout ${firstCommit}`)
  } catch (e) {
    console.error('git checkout ${firstCommit}:', e)
    return
  }

  // we create a tmp dir
  try {
    await execAsync(`mkdir -p tmp/${pfad}`)
  } catch (e) {
    console.error('mkdir -p tmp/${pfad}:', e)
    return
  }

  // We copy the content to a temporary dir
  try {
    await execAsync(`cp -R ${pfad} tmp/${userId}`)
  } catch (e) {
    console.error('cp -R ${pfad} tmp/${userId}:', e)
    return
  }

  // We delete the .git repo
  try {
    await execAsync(`rm -rf tmp/${pfad}/.git`)
  } catch (e) {
    console.error('rm -rf tmp/${pfad}/.git:', e)
    return
  }

  // We checkout the branch now
  try {
    await execAsync(`cd ${pfad} && git checkout ${story.branch}`)
  } catch (e) {
    console.error('git checkout branch:', e)
    return
  }

  // We delete the content but .git
  try {
    await execAsync(`cd ${pfad} && find . -maxdepth 1 ! -name ".git" ! -name ".*" | xargs rm -rf`, {
      maxBuffer: Infinity
    })
  } catch (e) {
    console.error('cd ${pfad} && find . -maxdepth 1 ! -name ".git" ! -name ".*" | xargs rm -rf:', e)
    return
  }

  // We copy the tmp dir to the repo
  try {
    await execAsync(`cp -R tmp/${pfad} ${userId}`)
  } catch (e) {
    console.error('cp -R tmp/${pfad} ${userId}:', e)
    return
  }

  // We remove the tmp dir
  try {
    await execAsync(`rm -rf tmp/${pfad}`)
  } catch (e) {
    console.error('rm -rf tmp/${pfad}:', e)
    return
  }

  //we describe the metadata of the different connections
  //storing all the top metadata per connection
  const project = await Project.findOne({
    _id: story.project
  }).lean()

  const connection = await Connection.findOne({
    _id: project.connection
  }).lean()

  const metadataTemp = await getHeaderMetadata(null, [connection])
  const mapMetadata = {}

  let upsertedMetadataPath = new Set()
  if (!metadataTemp) {
    // Nothing to proceed
    return
  }
  for (let connectionId of Object.keys(metadataTemp)) {
    for (let _metadata of metadataTemp[connectionId]) {
      mapMetadata[_metadata.directoryName] = _metadata
    }
  }

  const folders = new Set()
  const latestMetadata = []

  let fileNames = {}
  for (let _metadata of metadatas) {
    let folder = _metadata.fullPath.split('/')[0]
    if(!(folder in mapMetadata)) {
      continue
    }
    folders.add(folder)
    if (!(folder in fileNames)) {
      fileNames[folder] = new Set()
    }
    fileNames[folder].add(_metadata.filePath.substring(_metadata.filePath.indexOf('/') + 1))
  }

  const _latestMetadata = []

  for (let folder of folders) {
    _latestMetadata.push(...await transformFilesToJS(
      userId,
      folder,
      [...fileNames[folder]],
      mapMetadata[folder].xmlName, //e.g. ApexClass,
      story._id.toString(),
      new Map(),
      upsertedMetadataPath,
      story.project,
      false
    ))
  }

  for (let _metadata of _latestMetadata) {
    latestMetadata.push(_metadata.insertOne.document)
  }

  // We have now to merge the changes into the latest Metadata, that we transform first as a Map
  const mapChangedMetadata = new Map()
  for (let _metadata of metadatas) {
    mapChangedMetadata.set(_metadata.fullPath, _metadata)
  }

  let allFilesPossiblyDeleted = new Set()
  for (let i = latestMetadata.length - 1; i >= 0; i--) {
    let _metadata = latestMetadata[i]
    if (mapChangedMetadata.has(_metadata.fullPath)) {
      if (mapChangedMetadata.get(_metadata.fullPath).status === 'Deleted') {
        latestMetadata.splice(i, 1)
        allFilesPossiblyDeleted.add(_metadata.filePath)
      } else {
        _metadata.newValue = mapChangedMetadata.get(_metadata.fullPath).newValue
        _metadata.newValueBin = mapChangedMetadata.get(_metadata.fullPath).newValueBin
      }
      mapChangedMetadata.delete(_metadata.fullPath)
    }
  }

  // We are going to delete all files which may have been deleted. This is not obviously the case for complex metadata (i.e. a field on an object)
  // However this would be the case for a Trigger. So we can just remove the file, it will be recreated either way later
  // if it really exists
  await Promise.all([...allFilesPossiblyDeleted].map(async (filePath) => {
    try {
      await execAsync(`cd ${pfad} && rm -rf ${filePath}`)
    } catch(e) {
      console.log('error deleting path', e)
      // Nothing to handle if the file does not exist
    }
  }))

  mapChangedMetadata.forEach((tmp) => {
    latestMetadata.push(tmp)
  })

  // Now we can transform the LatestMetadata as real files to be saved first Locally.
  let subMetadatas = {
    CustomObject: metadata.customObjectMetadata,
    SharingRules: metadata.sharingRulesMetadata,
    Workflow: metadata.workflowMetadata
  }

  let zip = metadataZip(mapMetadata, latestMetadata, subMetadatas)
  const time = process.hrtime()
  const fileName = (time[0] * 1e9 + time[1]).toString() + '.zip'
  zip
    .generateNodeStream({ type: 'nodebuffer', streamFiles: true })
    .pipe(fs.createWriteStream(fileName))
    .on('finish', async function () {
      // JSZip generates a readable stream with a "end" event,
      // but is piped here in a writable stream which emits a "finish" event.

      // We read the package.xml currently on the Disk (i.e. corresponding to the remote branch)
      let packageXML1
      try {
        packageXML1 = await fs.readFileAsync(path.join(pfad, 'package.xml'), 'utf8')
      } catch (e) {
        console.log('packageXML1 does not exist', packageXML1)
        packageXML1 = null
        // Nothing to handle, it's fine that the file does not exists
      }

      let big = new AdmZip(fileName)
      big.extractAllTo(pfad, true)

      // We only do this in case the first package exists.
      if (packageXML1) {
        // We read the package.xml which has just been overwritten by the change done on the Branch
        let packageXML2
        try {
          packageXML2 = await fs.readFileAsync(path.join(pfad, 'package.xml'), 'utf8')
        } catch (e) {
          console.log('packageXML2 does not exist', packageXML2)
          packageXML2 = null
          // Nothing to handle, it's fine that the file does not exists
        }

        if (packageXML2) {
          // Now we can merge both
          const packageXML = await mergePackageXML([packageXML1, packageXML2])

          // And we save it on the Disk
          await fs.writeFileAsync(path.join(pfad, 'package.xml'), packageXML)
        }
      }

      await fs.unlinkAsync(fileName)

      let globalAllGitServers = await GitServer.find().lean()
      let error = await pushMetadataToGit(fakeConnection, globalAllGitServers, userId, false)

      if(error) {
        console.log('error1', error)
      }

      // We now update the story Hash with the latest Hash
      const latestRemoteCommit = await getLatestCommits([fakeConnection])
      story.latestCommit = latestRemoteCommit.get(fakeConnection._id.toString())
      await story.save()

      ctx.socket.emit('commitToBranch', {
        msg: error || 'Successfully committed to Git'
      })
    })
}

async function mergePackageXML(files) {

  let listMetadata = {}

  let [parsedXML1, parsedXML2] = await Promise.join(
    xml2js.parseStringAsync(files[0], { trim: true, parseComments: true, commentkey: '$$' }),
    xml2js.parseStringAsync(files[1], { trim: true, parseComments: true, commentkey: '$$' })
  )
  assignToObject(parsedXML1)
  assignToObject(parsedXML2)

  let mainMetadata = []
  for (let metadata in listMetadata) {
    mainMetadata.push(metadata)

    listMetadata[metadata] = Array.from(listMetadata[metadata])
    listMetadata[metadata].sort(alphabeticallySorting)
  }
  mainMetadata.sort(alphabeticallySorting)

  let builder = new xml2js.Builder({ headless: true, renderOpts: { offset: 1, indent: '    ', pretty: true, newline: '\n' } })
  let packageXML = '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<Package xmlns="http://soap.sforce.com/2006/04/metadata">\n'

  for (let i = 0; i < mainMetadata.length; i++) {
    packageXML += builder.buildObject({ 'types': { 'members': listMetadata[mainMetadata[i]], 'name': mainMetadata[i] } }) + '\n'
  }

  packageXML += builder.buildObject({ 'version': config.apiVersion }) + '\n</Package>'

  return packageXML

  function assignToObject(result) {
    result = result.Package
    if (result.types) {
      for (let j = result.types.length - 1; j >= 0; j--) {
        let type = result.types[j].name[0]
        if (!(type in listMetadata)) {
          listMetadata[type] = new Set()
        }
        if (result.types[j].members) {
          for (let k = result.types[j].members.length - 1; k >= 0; k--) {
            listMetadata[type].add(result.types[j].members[k])
          }
        }
      }
    }
  }

  function alphabeticallySorting(a, b) {
    let valA = a.toLowerCase(), valB = b.toLowerCase()
    if (valA < valB) { //sort string ascending
      return -1
    }
    if (valA > valB) {
      return 1
    }
    return 0
  }
}

export async function getStory(ctx) {
  console.log('ctx.params._id', ctx.params._id)
  const story = await Story.findOne({
    _id: ctx.params._id,
    $or: [{
      sharedWith: ctx.session.passport.user._id
    }, {
      user: ctx.session.passport.user._id
    }]
  }).lean()

  if (story.organization) {
    story.username = story.organization
  } else {
    const gitServer = await GitServer.findOne({
      _id: story.gitServer
    }).lean()
    story.username = gitServer.username
  }

  const project = await Project.findOne({
    _id: story.project
  }).lean()

  const connection = await Connection.findOne({
    _id: project.connection
  }).lean()

  const listMetadataTmp = await getHeaderMetadata(null, [connection])

  let describeMetadata = {}
  if (listMetadataTmp) {
    for (let connectionId of Object.keys(listMetadataTmp)) {
      let headerMetadata = listMetadataTmp[connectionId]

      for (let metadata of headerMetadata) {
        describeMetadata[metadata.directoryName] = metadata
      }
    }
  }

  ctx.body = {
    describeMetadata,
    story,
    subMetadatas: {
      CustomObject: metadata.customObjectMetadata,
      SharingRules: metadata.sharingRulesMetadata,
      Workflow: metadata.workflowMetadata
    }
  }
}

export async function getMetadatas(ctx, data) {
  const userId = await getUserId(ctx)
  console.log('cookie/storyId=>', userId, data.storyId)

  const storyMetadatas = [],
    metadataIds = []

  let metadataFullpaths = [],
    finalDifferences = []

  const story = await Story.findOne({
    _id: data.storyId,
    $or: [{
      sharedWith: userId
    }, {
      user: userId
    }]
  })

  if (!story || !story._id) {
    return
  }

  // We pull the metadata from the remote repo

  if (story.repository &&
    story.branch &&
    story.project &&
    story.privateKey &&
    story.gitServer) {

    // fakeConnection is just an helper object, as we have no proper Connection on a Story record.
    const fakeConnection = {
      _id: story._id,
      user: userId,
      folder: story.repository,
      companyfolder: story.organization,
      branch: story.branch,
      privatekey: story.privateKey,
      gitserver: story.gitServer
    }

    const pfad = path.join(userId, fakeConnection._id.toString())

    try {
      await execAsync('rm -rf ' + pfad)
    }
    catch (e) {
      console.log('sfdcToGit.pushMetadataToGit.catch:', e)
    }

    await createSSHKey([fakeConnection])

    const latestRemoteCommit = await getLatestCommits([fakeConnection])
    console.log('latestRemoteCommit', latestRemoteCommit)
    console.log('story', story)
    if (latestRemoteCommit.get(fakeConnection._id.toString()) &&
      latestRemoteCommit.get(fakeConnection._id.toString()) !== story.latestCommit) {
      // Let's check whether the latest commit on the story is the same than the latest commit in Git...
      // (could not be the same in case for example a commit has been done manually)

      // There is one or more commit on Git, which are not included in the DB... We have to pull them first.

      //we are going to pull the branch from the repository to get the latest version.

      story.latestCommit = latestRemoteCommit.get(fakeConnection._id.toString())
      await story.save()

      const project = await Project.findOne({
        _id: story.project
      }).lean()

      const connection = await Connection.findOne({
        _id: project.connection
      }).lean()

      await retrieveMetadataFromGit([fakeConnection], userId, true, true)

      try {
        await execAsync(`cd ${pfad} && git checkout ${story.branch}`)
      } catch (e) {
        console.error('git checkout branch:', e)
        return
      }

      // Find the latest commit from the branch which has been subject to a merge (into the Master)
      let firstCommit
      try {
        firstCommit = await execAsync(`cd ${pfad} && git merge-base master ${story.branch}`)
        firstCommit = firstCommit.split('\n')[0]
      } catch (e) {
        console.error('git merge-base master branch:', e)
        return
      }

      // List the difference of files between the HEAD and the latest merge on master
      let differences = await gitDiff(fakeConnection, firstCommit, userId)
      // These differences must be extracted - particularly changes happening within complex metadata (e.g. a field in Account.object)

      // We store in a variable the changes from the HEAD
      const latestMetadata = [], originMetadata = []

      const folders = new Set()

      differences.forEach(difference => folders.add(difference.split('/')[0]))

      let fileNames = {}
      for (let difference of differences) {
        let folder = difference.split('/')[0]
        if (!(folder in fileNames)) {
          fileNames[folder] = new Set()
        }
        fileNames[folder].add(difference.substring(difference.indexOf('/') + 1))
      }

      //we describe the metadata of the different connections
      //storing all the top metadata per connection
      const metadataTemp = await getHeaderMetadata(null, [connection])
      const mapMetadata = new Map()
      if (!metadataTemp) {
        // Nothing to proceed
        return
      }
      for (let connectionId of Object.keys(metadataTemp)) {
        for (let metadata of metadataTemp[connectionId]) {
          mapMetadata.set(metadata.directoryName, metadata)
        }
      }
      console.log('mapMetadata', mapMetadata)
      console.log('folders', folders)
      let upsertedMetadataPath = new Set()

      for (let folder of folders) {
        latestMetadata.push(...await transformFilesToJS(
          userId,
          folder,
          [...fileNames[folder]],
          mapMetadata.get(folder).xmlName, //e.g. ApexClass,
          story._id.toString(),
          new Map(),
          upsertedMetadataPath,
          story.project,
          false
        ))
      }

      // And now we do the same for the changes of the commit of the latest merge
      //checkout of the beginning of the branch
      try {
        await execAsync(`cd ${pfad} && git checkout ${firstCommit}`)
      } catch (e) {
        console.error('git checkout branch:', e)
        return
      }
      upsertedMetadataPath = new Set()

      for (let folder of folders) {
        originMetadata.push(...await transformFilesToJS(
          userId,
          folder,
          [...fileNames[folder]],
          mapMetadata.get(folder).xmlName, //e.g. ApexClass,
          story._id.toString(),
          new Map(),
          upsertedMetadataPath,
          story.project,
          false
        ))
      }

      // And now we compare both and check the real differences between latestMetadata and originMetadata
      for (let latest of latestMetadata) {
        latest = latest.insertOne.document
        let originIndex = originMetadata.findIndex(tmp => tmp.insertOne.document.fullPath === latest.fullPath)
        let origin

        if (originIndex > -1) {
          origin = originMetadata[originIndex]
          originMetadata.splice(originIndex, 1)
        }
        if (originIndex === -1 ||
          origin.insertOne.document.newValueBin !== latest.newValueBin ||
          origin.insertOne.document.newValue !== latest.newValue) {

          latest.isDeleted = false
          finalDifferences.push(latest)
        }
      }

      if (originMetadata.length) {
        for (let latest of originMetadata) {
          latest.insertOne.document.isDeleted = true
          finalDifferences.push(latest.insertOne.document)
        }
      }

      finalDifferences = finalDifferences.map(finalDifference => ({
        fullPath: finalDifference.fullPath,
        isDeleted: finalDifference.isDeleted,
        newValue: finalDifference.newValue,
        newValueBin: finalDifference.newValueBin,
        project: mongoose.Types.ObjectId(story.project),
        story: mongoose.Types.ObjectId(story._id),
        updated_at: new Date()
      }))

      console.log('finalDifferences', finalDifferences)

      //we still need to query the metadata from the Org
      metadataFullpaths = finalDifferences.map(finalDifference => finalDifference.fullPath)
      delayedQueries(true)
    } else {
      getStoryMetadata()
    }
  } else {
    getStoryMetadata()
  }

  function getStoryMetadata() {
    // Without a repository and branch, we fetch the story metadata saved in the MongoDB.
    const storyMetadataStream = Storymetadata.find({
      story: data.storyId
    }).lean().batchSize(10000).cursor()

    storyMetadataStream.on('data', streamData(ctx, 'storyMetadatas', storyMetadatas, 10000, metadataIds, 'metadata'))
    storyMetadataStream.on('error', streamError)
    storyMetadataStream.on('end', streamClose(ctx, 'storyMetadatas', storyMetadatas, delayedQueries))
  }

  async function delayedQueries(queryFullpaths) {
    console.info('doing now delayedQueries...')
    //querying the storyMetadata
    let query
    if (queryFullpaths) {
      query = {
        fullPath: {
          '$in': metadataFullpaths
        },
        project: story.project.toString()
      }
    } else {
      query = {
        _id: {
          '$in': metadataIds
        }
      }
    }

    const metadataStream = Metadata.find(query).lean().batchSize(5000).cursor()
    let metadatas = []

    metadataStream.on('error', streamError)

    if (queryFullpaths) {
      // We don't stream anything to the client, so that we can keep the metadata for assigning the _id at the end
      metadataStream.on('data', streamData(ctx, null, metadatas, 0))
      metadataStream.on('end', async function () {
        // We need to assign here the _id to the StoryMetadata, by using the fullPath as a key.
        // The _id is used by default on the FrontEnd.


        for (let finalDifference of finalDifferences) {
          let metadata = metadatas.find(tmp => tmp.fullPath === finalDifference.fullPath)
          if (metadata) {
            finalDifference.metadata = metadata._id
          }
        }

        // We delete first the current Storymetadata
        let toDelete = []

        toDelete.push({
          deleteMany: {
            filter: {
              'story': story._id
            }
          }
        })

        let result = await Storymetadata.collection.bulkWrite(toDelete, {
          ordered: false
        })

        console.log('result of delete ', result)

        // We can now insert the new ones (the difference calculated on Git)
        let toInsert = []
        for (let finalDifference of finalDifferences) {
          toInsert.push({
            insertOne: {
              document: finalDifference
            }
          })
        }

        result = await Storymetadata.collection.bulkWrite(toInsert, {
          ordered: false
        })

        console.log('result of insert ', result)
        console.log('finalDifferences2', finalDifferences)

        // we send the storyMetadata to the client
        streamClose(ctx, 'storyMetadatas', finalDifferences)()

        // we send the metadatas to the client
        streamClose(ctx, 'metadatas', metadatas)()
      })
    } else {
      // Else we just stream the records coming from MongoDB
      metadataStream.on('data', streamData(ctx, 'metadatas', metadatas, 5000))
      metadataStream.on('end', streamClose(ctx, 'metadatas', metadatas))
    }
  }
}


export async function storyMetadataRemove(ctx, data) {
  const userId = await getUserId(ctx)

  console.log('storyMetadataRemove', data.ids)
  try {
    const idsToDelete = data.ids.map(id => mongoose.Types.ObjectId(id))

    const stories = await Story.find({
      $or: [{
        sharedWith: userId
      }, {
        user: userId
      }]
    }).lean()

    const storyIds = stories.map(story => story._id)

    const result = await Storymetadata.collection.bulkWrite([{
      deleteMany: {
        filter: {
          _id: {
            $in: idsToDelete
          },
          story: {
            $in: storyIds
          }
        }
      }
    }], {
        ordered: false
      })

    console.log('Storymetadata deleted...', result)

    ctx.socket.emit('addRemoveMetadataSave', result)
  } catch (e) {
    console.error('error in storyRemove ...', e)
  }
}
