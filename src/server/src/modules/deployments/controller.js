import { Connection, Story, Storymetadata } from '../../models'
import { config } from '../../../config'
import jszip from 'jszip'
import { getHeaderMetadata, getUserId, jsforce, metadata, streamClose, streamData, streamError } from '../../utils'
const metadataZip = require('../../../metadata-zip').metadataZip //bit hacky to reference the path ..
import mongoose from 'mongoose'

const packageHeader = '<?xml version="1.0" encoding="UTF-8"?>\n' +
  '<Package xmlns="http://soap.sforce.com/2006/04/metadata">'

const packageFooter = '\t<version>' + config.apiVersion + '</version>\n' +
'</Package>'

export async function cancel(ctx, data) {
  console.log('going to cancel', data.targetId, data.deploymentId)
  const connection = await Connection.findById(data.targetId)
  const sfConn = jsforce(connection)
  await sfConn.metadata._invoke('cancelDeploy', {String: data.deploymentId})
  ctx.socket.emit('deployment', {
    message: {
      state: 'Canceling'
    }
  })
  sfConn._destroy()
}

export async function deploy(ctx, data) {
  try {
    let zipBase64

    if(!data.deleteMetadata) {
      if(data.storyIds && data.storyIds.length) {
        zipBase64 = await getMetadataFromStories(ctx, data)
      } else {
        let res = await getMetadataFromSalesforce(ctx, data)
        zipBase64 = res.zipFile
      }

      ctx.socket.emit('deployment', {
        message: {
          state: 'Package retrieved'
        }
      })
    } else {
      let zip = new jszip()
      zip.file('destructiveChanges.xml', buildPackage(data.metadata))
      zip.file('package.xml', packageHeader + packageFooter)

      zipBase64 = await zip.generateAsync({
        type: 'base64'
      })
    }

    const deploymentResult = await deployMetadataToSalesforce(zipBase64, ctx, data)
    console.log('result of deployment: ', deploymentResult)
    ctx.socket.emit('deployment', {
      deploymentResult
    })
  } catch(e) {
    console.log('error deploy ==>', e)
  }
}

export async function deployMetadataToSalesforce(zip, ctx, data) {
  const connection = await Connection.findById( data.deleteMetadata? data.sourceId : data.targetId )
  const sfConn = jsforce(connection)
  sfConn.metadata.pollTimeout = 60 * 1000 * 1000 // 1 hour
  sfConn.metadata.pollInterval = 15 * 1000 // 15 seconds
  const deploy = sfConn.metadata.deploy(zip, {
    checkOnly: data.checkOnly,
    rollbackOnError: connection.issandbox?data.rollbackOnError:true,
    testLevel: data.testLevel,
    singlePackage: data.deleteMetadata || !!data.storyIds.length
  })

  if(ctx) {
    ctx.socket.emit('deployment', {
      message: {
        state: `Starting deployment to ${connection.folder}`
      }
    })

    deploy.on('progress', async (event) => {
      console.log('progressing ...', event)
      ctx.socket.emit('deployment', {
        deploymentId: event.id
      })

      const deploymentResult = await sfConn.metadata.checkDeployStatus(event.id, true)
      ctx.socket.emit('deployment', {
        deploymentResult
      })
      console.log('intermediaryStatus', deploymentResult)
    })
  }

  const res = await deploy.complete(true)
  sfConn._destroy()
  return res
}

function getMetadataFromStories(ctx, data) {
  return new Promise(async (resolve, reject) => {
    try {
      const userId = await getUserId(ctx)

      let subMetadatas = {
        CustomObject: metadata.customObjectMetadata,
        SharingRules: metadata.sharingRulesMetadata,
        Workflow: metadata.workflowMetadata
      }
      let storyMetadataStream,
        storyMetadatas = []

      let request = {
        session: {
          passport: {
            user: {
              _id: userId
            }
          }
        }
      }

      await getDescribeMetadata(request)
      let describeMetadata = request.body

      let stories = await Story.find({
        _id: {
          $in: data.storyIds.map(storyId => mongoose.Types.ObjectId(storyId))
        },
        $or: [{
          sharedWith: userId
        }, {
          user: userId
        }]
      }).lean()

      ctx.socket.emit('deployment', {
        message: {
          state: `Deploying ${stories.length > 1?'stories': 'story'} ${stories.map(story => story.name).join(', ')}`
        }
      })

      let query = {
        story: {
          $in: stories.map(story => story._id)
        }
      }

      if (data.metadata.length) {
        //we must query additionally the paths to restrict to them
        query._id = {
          $in: data.metadata.map(metadata => mongoose.Types.ObjectId(metadata))
        }
      }

      let callback = function() {
        console.log('storyMetadatas', storyMetadatas)
        let zip = metadataZip(describeMetadata, storyMetadatas, subMetadatas)
        zip.generateAsync({
          type: 'base64'
        }).then((myZip) => {
          resolve(myZip)
        })
      }

      storyMetadataStream = Storymetadata.find(query).sort({
        fullPath: 1
      }).lean().batchSize(10000).cursor()
      storyMetadataStream.on('data', streamData(ctx, null, storyMetadatas, 10000))
      storyMetadataStream.on('error', streamError)
      storyMetadataStream.on('end', streamClose(ctx, null, storyMetadatas, callback))
    } catch(e) {
      reject(e)
    }
  })
}


async function getMetadataFromSalesforce(ctx, data) {
  const pkg = extractObjectMetadata(data.metadata, false, true, true)
  const connection = await Connection.findById(data.sourceId)
  const sfConn = jsforce(connection)
  sfConn.metadata.pollTimeout = 60 * 1000 * 1000 // 1 hour
  sfConn.metadata.pollInterval = 10 * 1000 // 10 seconds

  const retrieve = sfConn.metadata.retrieve({ unpackaged: pkg })

  ctx.socket.emit('deployment', {
    message: {
      state: `Starting package retrieval from ${connection.folder}`
    }
  })

  retrieve.on('progress', event => {
    console.log('progressing ...', event)
    ctx.socket.emit('deployment', {
      message: event
    })
  })

  const zip = await retrieve.complete()

  sfConn._destroy()
  return zip
}

export async function getDescribeMetadata(ctx) {
  console.log('Get Describe Metadata!')
  // We fetch all the connections and get the list metadata for all them as a story could be assigned
  // to multiple connections... (and each connection may have different header metadata, e.g. Territory)
  const listMetadataTmp = await getHeaderMetadata(null, await Connection.find({user: ctx.session.passport.user._id}))

  let describeMetadata = {}
  if(listMetadataTmp) {
    for(let connectionId of Object.keys(listMetadataTmp)) {
      let headerMetadata = listMetadataTmp[connectionId]

      for (let metadata of headerMetadata) {
        describeMetadata[metadata.directoryName] = metadata
      }
    }
  }

  ctx.body = describeMetadata
}

export async function getStoryReleaseMetadata(ctx, data) {
  const userId = await getUserId(ctx)
  console.log('userid/storyId=>', userId, data.storyIds)

  const storyMetadatas = [],
    metadataIds = []

  let stories = await Story.find({
    _id: {
      $in: data.storyIds.map(storyId => mongoose.Types.ObjectId(storyId))
    },
    $or: [{
      sharedWith: userId
    }, {
      user: userId
    }]
  }).lean()

  console.log('stories', stories)
  if(!stories || !stories.length) {
    return
  }

  stories = stories.map(story => story._id)
  const storyMetadataStream = Storymetadata.find({
    story: {
      $in: stories
    }
  }, '_id fullPath isDeleted').lean().batchSize(10000).cursor()

  storyMetadataStream.on('data', streamData(ctx, 'storyMetadatas', storyMetadatas, 10000, metadataIds, 'metadata'))
  storyMetadataStream.on('error', streamError)
  storyMetadataStream.on('end', streamClose(ctx, 'storyMetadatas', storyMetadatas))

}

export function getPackage(ctx) {
  ctx.set('Content-Disposition', 'attachment')
  ctx.body = buildPackage(ctx.request.body)
}

function buildPackage(metadata) {
  return packageHeader + extractObjectMetadata(metadata, false, true, false) + packageFooter
}

export async function getZip(ctx, data) {
  console.log('getZip ...')
  try {
    const zip = await getMetadataFromSalesforce(ctx, data)

    ctx.socket.emit('deployment', zip)
  } catch(e) {
    console.log('error getZip ==>', e)
  }
}

function extractObjectMetadata(metadata, withDomainName, withFormating, isObject) {
  const objectMetadata = new Map()
  let ret

  for (let i = 0; i < metadata.length; i++) {
    if (metadata[i].indexOf('/') !== -1) {
      let path = metadata[i].split('/')
      if (path.length === 4) {
        //CustomObject ...
        path[0] = path[2]
        path[1] = path[1] + '.' + path[3]
      }

      if (path.length !== 3 || (path[0] !== 'CustomObject' && path[0] !== 'Workflow')) {
        if (!objectMetadata.has(path[0])) {
          objectMetadata.set(path[0], new Set())
        }
        objectMetadata.get(path[0]).add(path[1])
      }

      if (path.length === 3) {
        if (path[0] === 'CustomObject' || path[0] === 'Workflow') {
          //otherwise, we gonna mess up the deployment, we don't want anyway this value.
          continue
        }
        objectMetadata.get(path[0]).add(path[1] + '/' + path[2])
      }
    }
  }

  if (isObject) {
    ret = {types: [], version: config.apiVersion}
  } else {
    ret = ''
  }

  objectMetadata.forEach(function(members, key) {
    if (members.size) {
      if (isObject) {
        ret.types.push({
          name: key,
          members: [...members]
        })
      } else {

        ret += (withFormating ? '\n\t' : '') + '<' + (withDomainName ? '' : '') + 'types>' + (withFormating ? '\n' : '')

        for (let member of members) {
          ret += (withFormating ? '\t\t' : '') + '<' + (withDomainName ? '' : '') + 'members>' + member + '</' + (withDomainName ? '' : '') + 'members>' + (withFormating ? '\n' : '')
        }
        ret += (withFormating ? '\t\t' : '') + '<' + (withDomainName ? '' : '') + 'name>' + key + '</' + (withDomainName ? '' : '') + 'name>' + (withFormating ? '\n' : '')
        ret += (withFormating ? '\t' : '') + '</' + (withDomainName ? '' : '') + 'types>' + (withFormating ? '\n' : '')
      }
    }
  })

  return ret
}
