import {ensureAuthenticated} from '../../middleware'
import * as project from './controller'

export const baseUrl = '/ProjectDetail'

export const io = (socket) => {
  socket.on('project.getMetadatas', project.getMetadatas)
  socket.on('project.ignoreMetadatas', project.ignoreMetadatas)
  socket.on('project.storyMetadata', project.storyMetadata)
}

export default [
  {
    method: 'GET',
    route: '/:_id',
    handlers: [
      ensureAuthenticated,
      project.getDetails
    ]
  }
]
