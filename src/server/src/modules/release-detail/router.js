import {ensureAuthenticated} from '../../middleware'
import * as release from './controller'

export const baseUrl = '/ReleaseDetail'

export const io = (socket) => {
  socket.on('release.getStoryMetadata', release.getStoryMetadata)
}

export default [
  {
    method: 'GET',
    route: '/:_id',
    handlers: [
      ensureAuthenticated,
      release.getDetails
    ]
  }
]
