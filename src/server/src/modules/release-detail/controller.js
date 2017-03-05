import { Connection, Release, Story, Storymetadata } from '../../models'
import { getHeaderMetadata, getUserId, metadata, streamClose, streamData, streamError } from '../../utils'
import mongoose from 'mongoose'

export async function getDetails(ctx) {
  console.log('ctx.params._id', ctx.params._id)
  const release = await Release.findOne({
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
    release,
    subMetadatas: {
      CustomObject: metadata.customObjectMetadata,
      SharingRules: metadata.sharingRulesMetadata,
      Workflow: metadata.workflowMetadata
    }
  }
}

export async function getStoryMetadata(ctx, data) {
  const userId = await getUserId(ctx)
  const metadatas = []

  const stories = await Story.find({
    _id: {
      $in: data.storyIds.map(id => mongoose.Types.ObjectId(id))
    },
    $or: [{
      sharedWith: userId
    }, {
      user: userId
    }]
  }).lean()

  const storyIds = stories.map(story => story._id)

  console.log('final story ids', storyIds);

  const metadataStream = Storymetadata.aggregate([{
    $sort: {
      updated_at: data.oldestFirst ? 1 : -1
    }
  }, {
    $match: {
      story: {
        $in: storyIds
      }
    }
  }, {
    $group: {
      _id: '$fullPath', // grouped by fullPath
      doc: {
        '$first': '$$ROOT'
      }
    }
  }, {
    $project: {
      fullPath: '$_id', //
      newValue: '$doc.newValue',
      newValueBin: '$doc.newValueBin',
      isDeleted: '$doc.isDeleted'
    }
  }, {
    $sort: {
      fullPath: 1
    }
  }]).cursor({
    batchSize: 10000
  }).allowDiskUse(true).exec().stream()

  metadataStream.on('data', streamData(ctx, 'metadatas', metadatas, 10000))
  metadataStream.on('error', streamError)
  metadataStream.on('end', streamClose(ctx, 'metadatas', metadatas))
}
