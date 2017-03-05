import {ensureAuthenticated} from '../../middleware'
import * as privateKey from './controller'

export const baseUrl = '/Privatekey'

export default [
  {
    method: 'POST',
    route: '/',
    handlers: [
      ensureAuthenticated,
      privateKey.createPrivatekey
    ]
  },
  {
    method: 'PUT',
    route: '/:_id',
    handlers: [
      ensureAuthenticated,
      privateKey.getPrivatekey,
      privateKey.updatePrivatekey
    ]
  },
  {
    method: 'GET',
    route: '/',
    handlers: [
      ensureAuthenticated,
      privateKey.getPrivatekeys
    ]
  },
  {
    method: 'GET',
    route: '/:_id',
    handlers: [
      ensureAuthenticated,
      privateKey.getPrivatekey
    ]
  },
  {
    method: 'DELETE',
    route: '/:_id',
    handlers: [
      ensureAuthenticated,
      privateKey.deletePrivatekey
    ]
  }
]
