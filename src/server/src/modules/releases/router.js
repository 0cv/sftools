import {ensureAuthenticated} from '../../middleware'
import * as release from './controller'

export const baseUrl = '/Release'

export default [
  {
    method: 'POST',
    route: '/',
    handlers: [
      ensureAuthenticated,
      release.createRelease
    ]
  },
  {
    method: 'PUT',
    route: '/:_id',
    handlers: [
      ensureAuthenticated,
      release.getRelease,
      release.updateRelease
    ]
  },
  {
    method: 'GET',
    route: '/',
    handlers: [
      ensureAuthenticated,
      release.getReleases
    ]
  },
  {
    method: 'GET',
    route: '/:_id',
    handlers: [
      ensureAuthenticated,
      release.getRelease
    ]
  },
  {
    method: 'DELETE',
    route: '/:_id',
    handlers: [
      ensureAuthenticated,
      release.deleteRelease
    ]
  }
]
