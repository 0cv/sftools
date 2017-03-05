import { jsforce } from './jsforce'
import { config } from '../../config'
import { Connection } from '../models'

export async function getHeaderMetadata(ctx, connections) {
  try {
    if(ctx) {
      connections = await Connection.find({user: ctx.session.passport.user._id, _id: ctx.query.source})
    }

    let headerMetadatas = await Promise.all(
      connections.map(async (connection) => {
        try {
          let conn = jsforce(connection)
          const res = await conn.metadata.describe(config.apiVersion)
          conn._destroy()
          return await res
        } catch(e) {
          console.error('getHeaderMetadata#error when retrieving metadata', e)
          return {metadataObjects: []}
        }
      })
    )
    let result = {}
    for(let i = 0; i < connections.length; i++) {
      result[connections[i]._id] = headerMetadatas[i].metadataObjects
    }
    return result
  } catch(e) {
    console.error('getHeaderMetadata error', e)
  }
}
