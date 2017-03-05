import {ensureAuthenticated} from '../../middleware'
import * as gitServer from './controller'

export const baseUrl = '/Gitserver'

export default [
  {
    method: 'POST',
    route: '/',
    handlers: [
      ensureAuthenticated,
      gitServer.createGitserver
    ]
  },
  {
    method: 'PUT',
    route: '/:_id',
    handlers: [
      ensureAuthenticated,
      gitServer.getGitserver,
      gitServer.updateGitserver
    ]
  },
  {
    method: 'GET',
    route: '/',
    handlers: [
      ensureAuthenticated,
      gitServer.getGitservers
    ]
  },
  {
    method: 'GET',
    route: '/:_id',
    handlers: [
      ensureAuthenticated,
      gitServer.getGitserver
    ]
  },
  {
    method: 'DELETE',
    route: '/:_id',
    handlers: [
      ensureAuthenticated,
      gitServer.deleteGitserver
    ]
  }
]
