import {ensureAuthenticated} from '../../middleware'
import * as validation from './controller'

export const baseUrl = '/Validation'

export default [
  {
    method: 'POST',
    route: '/',
    handlers: [
      ensureAuthenticated,
      validation.createValidation
    ]
  },
  {
    method: 'PUT',
    route: '/:_id',
    handlers: [
      ensureAuthenticated,
      validation.getValidation,
      validation.updateValidation
    ]
  },
  {
    method: 'GET',
    route: '/',
    handlers: [
      ensureAuthenticated,
      validation.getValidations
    ]
  },
  {
    method: 'GET',
    route: '/:_id',
    handlers: [
      ensureAuthenticated,
      validation.getValidation
    ]
  },
  {
    method: 'DELETE',
    route: '/:_id',
    handlers: [
      ensureAuthenticated,
      validation.deleteValidation
    ]
  }
]
