import {ensureAuthenticated} from '../../middleware'
import * as connection from './controller'

export const baseUrl = '/Connection'

export default [
  {
    method: 'POST',
    route: '/',
    handlers: [
      ensureAuthenticated,
      connection.createConnection,
      connection.authorize
    ]
  },
  {
    method: 'PUT',
    route: '/:_id',
    handlers: [
      ensureAuthenticated,
      connection.getConnection,
      connection.updateConnection
    ]
  },
  {
    method: 'GET',
    route: '/getDescribeMetadata',
    handlers: [
      ensureAuthenticated,
      connection.getDescribeMetadata
    ]
  },
  {
    method: 'GET',
    route: '/getMetadata',
    handlers: [
      ensureAuthenticated,
      connection.getMetadata
    ]
  },
  {
    method: 'GET',
    route: '/',
    handlers: [
      ensureAuthenticated,
      connection.getConnections
    ]
  },
  {
    method: 'GET',
    route: '/callback',
    handlers: [
      ensureAuthenticated,
      connection.callback
    ]
  },
  {
    method: 'GET',
    route: '/:_id',
    handlers: [
      ensureAuthenticated,
      connection.getConnection
    ]
  },
  {
    method: 'DELETE',
    route: '/:_id',
    handlers: [
      ensureAuthenticated,
      connection.deleteConnection
    ]
  }

];
