import {
  it,
  inject,
  injectAsync,
  describe,
  beforeEachProviders,
  TestComponentBuilder
} from 'angular2/testing'

import {Component, provide} from 'angular2/core'

// Load the implementations that should be tested
import {Login} from './login.component'

describe('About', () => {
  // provide our implementations or mocks to the dependency injector
  beforeEachProviders(() => [
    Login
  ])

  it('should log ngOnInit', inject([ Login ], (login) => {
    spyOn(console, 'log')
    expect(console.log).not.toHaveBeenCalled()

    login.ngOnInit()
    expect(console.log).toHaveBeenCalled()
  }))

})
