import { Connection, Metadata, Story, Storymetadata } from '../../models'
import { getHeaderMetadata, getUserId, metadata, streamClose, streamData, streamError } from '../../utils'
import mongoose from 'mongoose'

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

  const story = await Story.findOne({
    _id: data.storyId,
    $or: [{
      sharedWith: userId
    }, {
      user: userId
    }]
  }).lean()

  if(!story || !story._id) {
    return
  }

  const storyMetadataStream = Storymetadata.find({
    story: data.storyId
  }).lean().batchSize(10000).cursor()

  storyMetadataStream.on('data', streamData(ctx, 'storyMetadatas', storyMetadatas, 10000, metadataIds, 'metadata'))
  storyMetadataStream.on('error', streamError)
  storyMetadataStream.on('end', streamClose(ctx, 'storyMetadatas', storyMetadatas, delayedQueries))

  function delayedQueries() {
    console.info('doing now delayedQueries...')
    //querying the storyMetadata
    const metadataStream = Metadata.find({
      _id: {
        '$in': metadataIds
      }
    }).lean().batchSize(10000).cursor()
    let metadatas = []

    metadataStream.on('data', streamData(ctx, 'metadatas', metadatas, 5000))
    metadataStream.on('error', streamError)
    metadataStream.on('end', streamClose(ctx, 'metadatas', metadatas))
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

    console.log('Storymetadata deleted...', result);

    ctx.socket.emit('addRemoveMetadataSave', result)
  } catch(e) {
    console.error('error in storyRemove ...', e)
  }
}
