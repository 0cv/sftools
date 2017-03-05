import {ensureAuthenticated} from '../../middleware'
import * as deployment from './controller'


export const baseUrl = '/Deployment'

export const io = (socket) => {
  socket.on('deployment.cancel', deployment.cancel)
  socket.on('deployment.deploy', deployment.deploy)
  socket.on('deployment.getStoryReleaseMetadata', deployment.getStoryReleaseMetadata)
  socket.on('deployment.getZip', deployment.getZip)
}

export default [
  {
    method: 'POST',
    route: '/getPackage',
    handlers: [
      ensureAuthenticated,
      deployment.getPackage
    ]
  }, 
  {
    method: 'GET',
    route: '/getDescribeMetadata',
    handlers: [
      ensureAuthenticated,
      deployment.getDescribeMetadata
    ]
  }
]
