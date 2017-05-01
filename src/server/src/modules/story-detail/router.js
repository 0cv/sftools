import { ensureAuthenticated } from '../../middleware'
import * as story from './controller'

export const baseUrl = '/StoryDetail'

export const io = (socket) => {
  socket.on('story.commitToBranch', story.commitToBranch)
  socket.on('story.getMetadatas', story.getMetadatas)
  socket.on('story.storyMetadataRemove', story.storyMetadataRemove)
}

export default [
  {
    method: 'GET',
    route: '/:_id',
    handlers: [
      ensureAuthenticated,
      story.getStory
    ]
  }
]
