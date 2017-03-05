import {ensureAuthenticated} from '../../middleware'
import * as project from './controller'

export const baseUrl = '/Project'

export default [
  {
    method: 'POST',
    route: '/',
    handlers: [
      ensureAuthenticated,
      project.createProject
    ]
  },
  {
    method: 'PUT',
    route: '/:_id',
    handlers: [
      ensureAuthenticated,
      project.getProject,
      project.updateProject
    ]
  },
  {
    method: 'GET',
    route: '/',
    handlers: [
      ensureAuthenticated,
      project.getProjects
    ]
  },
  {
    method: 'GET',
    route: '/:_id',
    handlers: [
      ensureAuthenticated,
      project.getProject
    ]
  },
  {
    method: 'DELETE',
    route: '/:_id',
    handlers: [
      ensureAuthenticated,
      project.deleteProject
    ]
  }
]
