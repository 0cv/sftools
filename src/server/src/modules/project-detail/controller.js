import { Metadata, Project, Story, Storymetadata } from '../../models'
import { getHeaderMetadata, getUserId, streamClose, streamData, streamError } from '../../utils'
import mongoose from 'mongoose'

export async function getDetails(ctx) {
  console.log('ctx.params._id', ctx.params._id)
  const project = await Project.findOne({
    _id: ctx.params._id,
    $or: [{
      sharedWith: ctx.session.passport.user._id
    }, {
      user: ctx.session.passport.user._id
    }]
  }).lean()
  ctx.query.source = project.connection
  const [listMetadataTmp, stories] = await Promise.join(
    await getHeaderMetadata(ctx),
    Story.find({
      $or: [{
        sharedWith: ctx.session.passport.user._id
      }, {
        user: ctx.session.passport.user._id
      }]
    }).lean())

  const headerMetadata = listMetadataTmp && listMetadataTmp[Object.keys(listMetadataTmp)[0]]

  let describeMetadata = {}
  for (let metadata of headerMetadata) {
    describeMetadata[metadata.directoryName] = metadata
  }

  ctx.body = {
    project,
    describeMetadata,
    stories
  }
}

export async function storyMetadata(ctx, data) {
  const oldMetadataStories = data.oldMetadataStories
  const newMetadataStories = data.newMetadataStories

  const userId = await getUserId(ctx)
  const [projects, stories] = await Promise.join(
    Project.find({
      $or: [{
        sharedWith: userId
      }, {
        user: userId
      }]
    }).lean(),
    Story.find({
      $or: [{
        sharedWith: userId
      }, {
        user: userId
      }]
    }).lean()
  )

  let projectIds = projects.map(project => project._id.toString())
  let storyIds = stories.map(story => story._id.toString())

  if (newMetadataStories.length) {
    let toUpsert = []

    //handling the new metadata stories
    newMetadataStories
      .filter(tmp => projectIds.indexOf(tmp.project) > -1 && storyIds.indexOf(tmp.story) > -1)
      .map(function(tmp) {
        if (!tmp._id) {
          tmp.story = mongoose.Types.ObjectId(tmp.story)
          tmp.metadata = mongoose.Types.ObjectId(tmp.metadata)
          tmp.project = mongoose.Types.ObjectId(tmp.project)
          tmp.updated_at = new Date()
          toUpsert.push({
            insertOne: {
              document: tmp
            }
          })
        } else {
          toUpsert.push({
            updateOne: {
              filter: {
                _id: mongoose.Types.ObjectId(tmp._id)
              },
              update: {
                $set: {
                  newValue: tmp.newValue,
                  newValueBin: tmp.newValueBin,
                  isDeleted: tmp.isDeleted,
                  updated_at: new Date()
                }
              }
            }
          })
        }
      })
    console.time('saveTime')

    try {
      const result = await Storymetadata.collection.bulkWrite(toUpsert, {
        ordered: false
      })
      console.log('saveStorymetadata inserted==>', result.nInserted, result.nModified, result.nUpserted)
      console.timeEnd('saveTime')
      ctx.socket.emit('addRemoveMetadataSave', result)
    } catch(e) {
      console.error('error in insert==>', e)
    }
  }

  //handling the deleted metadata
  if (oldMetadataStories.length) {
    let toDelete = []
    let idsToDelete = oldMetadataStories.map(id => mongoose.Types.ObjectId(id))
    projectIds = projectIds.map(id => mongoose.Types.ObjectId(id))
    storyIds = storyIds.map(id => mongoose.Types.ObjectId(id))

    while (idsToDelete.length) {
      toDelete.push({
        deleteMany: {
          filter: {
            '_id': {
              '$in': idsToDelete.splice(0, 5000)
            },
            'project': {
              '$in': projectIds
            },
            'story': {
              '$in': storyIds
            }
          }
        }
      })
    }

    console.time('deleteTime')
    try {
      const result = await Storymetadata.collection.bulkWrite(toDelete, {
        ordered: false
      })
      console.log('saveStorymetadata deleted==>', result.nInserted, result.nModified, result.nUpserted)
      console.timeEnd('deleteTime')

      ctx.socket.emit('addRemoveMetadataSave', result)
    } catch(e) {
      console.error('error in deleted==>', e)
    }
  }
}

export async function ignoreMetadatas(ctx, data) {
  ctx.socket.emit('status', {
    bufferValue: 50,
    syncingStatus: 'Received on the server, saving to the database...',
    isLoading: true
  })
  const selectedNodeIds = data.selectedNodeIds.map(node => mongoose.Types.ObjectId(node))
  const userId = await getUserId(ctx)
  const projects = await Project.find({
    $or: [{
      sharedWith: userId
    }, {
      user: userId
    }]
  })

  const projectIds = projects.map(project => mongoose.Types.ObjectId(project._id))
  const toIgnore = []

  console.log('selectedNodeIds', selectedNodeIds)
  console.log('projectIds', projectIds)
  while (selectedNodeIds.length) {
    toIgnore.push({
      updateMany: {
        filter: {
          _id: {
            $in: selectedNodeIds.splice(0, 5000)
          },
          project: {
            $in: projectIds
          }
        },
        update: {
          $set: {
            isIgnored: true,
            updated_at: new Date()
          }
        }
      }
    })
  }

  const result = await Metadata.collection.bulkWrite(toIgnore, {
    ordered: false
  })

  ctx.socket.emit('status', {
    syncingStatus: `Updated ${result.modifiedCount} metadatas`,
    isLoading: false
  })

  console.log('metadata ignored==>', result)
}

export async function getMetadatas(ctx, data) {
  const userId = await getUserId(ctx)
  console.log('cookie/projectId=>', userId, data.projectId)

  const metadatas = [],
    storyMetadatas = [],
    metadatasPayload = [],
    metadataIds = []

  const project = await Project.findOne({
    _id: data.projectId,
    $or: [{
      sharedWith: userId
    }, {
      user: userId
    }]
  }).lean()
  console.log('project', project)

  if(!project._id) {
    return
  }

  const metadataStream = Metadata.find({
    project: data.projectId,
    isIgnored: data.showIgnored
  }, '_id fullPath isIgnored status updated_at').lean().batchSize(10000).cursor()
  metadataStream.on('data', streamData(ctx, 'metadatas', metadatas, 10000, metadataIds, '_id'))
  metadataStream.on('error', streamError)
  metadataStream.on('end', streamClose(ctx, 'metadatas', metadatas, delayedQueries))

  async function delayedQueries() {
    console.info('doing now delayedQueries==>', metadataIds.length)
    //querying the storyMetadata
    const storyMetadataStream = Storymetadata.find({
      project: data.projectId
    }).lean().batchSize(10000).cursor()

    storyMetadataStream.on('data', streamData(ctx, 'storyMetadatas', storyMetadatas, 5000))
    storyMetadataStream.on('error', streamError)
    storyMetadataStream.on('end', streamClose(ctx, 'storyMetadatas', storyMetadatas))

    //querying the metadata with only the big payload (for speeding first the query above)
    const metadataPayloadStream = Metadata.find({
      project: data.projectId,
      isIgnored: data.showIgnored
    }, '_id newValue newValueBin').read('sp').lean().batchSize(5000).cursor()
    metadataPayloadStream.on('data', streamData(ctx, 'metadatasPayload', metadatasPayload, 5000))
    metadataPayloadStream.on('error', streamError)
    metadataPayloadStream.on('end', streamClose(ctx, 'metadatasPayload', metadatasPayload))
  }

}
