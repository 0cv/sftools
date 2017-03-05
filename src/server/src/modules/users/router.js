import {ensureAuthenticated} from '../../middleware'
import * as user from './controller'

export const baseUrl = '/User'

export default [
  {
    method: 'POST',
    route: '/',
    handlers: [
      user.createUser
    ]
  },
  {
    method: 'POST',
    route: '/login',
    handlers: [
      user.login
    ]
  },
  {
    method: 'POST',
    route: '/reset',
    handlers: [
      user.resetPassword
    ]
  },
  {
    method: 'POST',
    route: '/logout',
    handlers: [
      ensureAuthenticated,
      user.logout
    ]
  },
  {
    method: 'GET',
    route: '/isAuthenticated',
    handlers: [
      user.isAuthenticated
    ]
  },
  {
    method: 'GET',
    route: '/',
    handlers: [
      ensureAuthenticated,
      user.getUser
    ]
  },
  {
    method: 'PUT',
    route: '/:_id',
    handlers: [
      ensureAuthenticated,
      user.updateUser
    ]
  }
]
