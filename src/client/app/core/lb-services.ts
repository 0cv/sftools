import { Injectable, Inject, Optional } from '@angular/core'
import { Http, Headers, Request, Response } from '@angular/http'
import { Observable } from 'rxjs/Observable'
import 'rxjs/add/observable/throw'
import 'rxjs/add/operator/map'
import 'rxjs/add/operator/catch'
import 'rxjs/add/operator/share'

export interface FilterInterface {
  fields?: any
  include?: any
  limit?: any
  order?: any
  skip?: any
  offset?: any
  where?: any
}

class ServerAuth {
  protected accessTokenId: any
  protected currentUserId: any
  protected currentUserData: any

  protected propsPrefix: string = '$LoopBack$'

  constructor() {
    this.accessTokenId = this.load("accessTokenId")
    this.currentUserId = this.load("currentUserId")
    this.currentUserData = null
  }

  public getCurrentUserId(): any {
    return this.currentUserId
  }

  public setCurrentUserData(data: any): ServerAuth {
    this.currentUserData = data
    return this
  }

  public getCurrentUserData(): any {
    return this.currentUserData
  }

  public getAccessTokenId(): any {
    return this.accessTokenId
  }

  public save() {
    var storage = sessionStorage
    this.saveThis(storage, "accessTokenId", this.accessTokenId)
    this.saveThis(storage, "currentUserId", this.currentUserId)
  }

  public setUser(accessTokenId: any, userId: any, userData: any) {
    this.accessTokenId = accessTokenId
    this.currentUserId = userId
    this.currentUserData = userData
  }

  public clearUser() {
    this.accessTokenId = null
    this.currentUserId = null
    this.currentUserData = null
  }

  public clearStorage() {
    this.saveThis(sessionStorage, "accessTokenId", null)
    this.saveThis(sessionStorage, "currentUserId", null)
  }

  // Note: LocalStorage converts the value to string
  // We are using empty string as a marker for null/undefined values.
  protected saveThis(storage: any, name: string, value: any) {
    try {
      var key = this.propsPrefix + name
      if (value == null) {
        value = ''
      }
      storage[key] = value
    }
    catch(err) {
      console.log('Cannot access local/session storage:', err)
    }
  }

  protected load(name: string): any {
    var key = this.propsPrefix + name
    if(typeof window === 'undefined') {
      return null
    }
    return window.localStorage[key] || window.sessionStorage[key] || null
  }
}

let auth = new ServerAuth()


/**
 * Default error handler
 */
export class ErrorHandler {
  public handleError(error: Response): Observable<any> {
    let ret
    if(!error.headers) {
      ret = 'Unreachable endpoint'
    } else if(!error.headers.get('Content-Type') || error.headers.get('Content-Type').indexOf('text/plain') > -1) {
      ret = error.text()
    } else {
      ret = error.json().error || 'Server error'
    }
    return Observable.throw(ret)
  }
}


@Injectable()
export abstract class BaseServerApi {

  protected path: string

  constructor(
    @Inject(Http) protected http: Http,
    @Optional() @Inject(ErrorHandler) protected errorHandler: ErrorHandler
  ) {
    if (!errorHandler) {
      this.errorHandler = new ErrorHandler()
    }
    this.init()
  }

  /**
   * Get path for building part of URL for API
   * @return string
   */
  protected getPath(): string {
    return this.path
  }

  protected init() {
    this.path = "/api"
  }

  /**
   * Process request
   * @param string  method    Request method (GET, POST, PUT)
   * @param string  url       Request url (my-host/my-url/:id)
   * @param any     urlParams Values of url parameters
   * @param any     params    Parameters for building url (filter and other)
   * @param any     data      Request body
   */
  public request(method: string, url: string, urlParams: any = {},
                 params: any = {}, data: any = null) {
    let headers = new Headers()
    headers.append('Content-Type', 'application/json')

    if (auth.getAccessTokenId()) {
      headers.append('Authorization', auth.getAccessTokenId())
    }

    let requestUrl = url
    let key: string
    for (key in urlParams) {
      requestUrl = requestUrl.replace(new RegExp(":" + key + "(\/|$)", "g"), urlParams[key] + "$1")
    }

    let parameters: string[] = []
    for (var param in params) {
      parameters.push(param + '=' + (typeof params[param] === 'object' ? JSON.stringify(params[param]) : params[param]))
    }
    requestUrl += (parameters ? '?' : '') + parameters.join('&')

    let request = new Request({
      headers: headers,
      method: method,
      url: requestUrl,
      body: data ? JSON.stringify(data) : null
    })
    return this.http.request(request)
      .map(res => {
        if(res.headers.has('Content-Disposition')) {
          //we want to download it...
          return res.text()
        } else if(res.text() != "") {
          return res.json()
        } else {
          return {}
        }
      })
      .catch(this.errorHandler.handleError)
  }
}

/**
 * Api for the `User` model.
 */
@Injectable()
export class User extends BaseServerApi {

  constructor(
    @Inject(Http) http: Http,
    @Optional() @Inject(ErrorHandler) errorHandler: ErrorHandler
  ) {
    super(http, errorHandler)
  }

  public reset(data: any = undefined) {
    let method: string = "POST"

    let url: string = this.getPath() + "/User/reset"
    let urlParams: any = {
    }

    let params: any = {}

    let result = this.request(method, url, urlParams, params, data)
    return result
  }

  public find(filter: FilterInterface = undefined) {
    let method: string = "GET"

    let url: string = this.getPath() + "/User"
    let urlParams: any = {
    }

    let params: any = {}

    let result = this.request(method, url, urlParams, params)
    return result
  }

  /**
   * Create a new instance of the model and persist it into the data source.
   *
   * @param object data Request data.
   *
   * This method expects a subset of model properties as request parameters.
   *
   * @returns object An empty reference that will be
   *   populated with the actual data once the response is returned
   *   from the server.
   *
   * <em>
   * (The remote method definition does not provide any description.
   * This usually means the response is a `User` object.)
   * </em>
   */
  public create(data: any = undefined) {
    let method: string = "POST"

    let url: string = this.getPath() + "/User"
    let urlParams: any = {
    }

    let params: any = {}

    let result = this.request(method, url, urlParams, params, data)
    return result
  }

  /**
   * Update attributes for a model instance and persist it into the data source.
   *
   * @param any id User id
   *
   * @param object data Request data.
   *
   * This method expects a subset of model properties as request parameters.
   *
   * @returns object An empty reference that will be
   *   populated with the actual data once the response is returned
   *   from the server.
   *
   * <em>
   * (The remote method definition does not provide any description.
   * This usually means the response is a `User` object.)
   * </em>
   */
  public updateAttributes(id: any, data: any = undefined) {
    let method: string = "PUT"

    let url: string = this.getPath() + "/User/:id"
    let urlParams: any = {
      id: id
    }

    let params: any = {}

    let result = this.request(method, url, urlParams, params, data)
    return result
  }


  /**
   * Login a user with username/email and password.
   *
   * @param string include Related objects to include in the response. See the description of return value for more details.
   *   Default value: `user`.
   *
   * @param object data Request data.
   *
   * This method expects a subset of model properties as request parameters.
   *
   * @returns object An empty reference that will be
   *   populated with the actual data once the response is returned
   *   from the server.
   *
   * The response body contains properties of the AccessToken created on login.
   * Depending on the value of `include` parameter, the body may contain additional properties:
   *
   *   - `user` - `{User}` - Data of the currently logged in user. (`include=user`)
   *
   *
   */
  public login(credentials: any, include: any = "user") {
    let method: string = "POST"

    let url: string = this.getPath() + "/User/login"
    let urlParams: any = {
    }

    let params: any = {}
    if (include !== undefined) {
      params.include = include
    }

    let result = this.request(method, url, urlParams, params, credentials).share()

    result.subscribe(
      response => {
        auth.setUser(response.id, response.userId, response.user)
        auth.save()
      },
      () => null
    )
    return result
  }

  /**
   * Logout a user with access token.
   *
   * @param object data Request data.
   *
   *  - `access_token` – `{string}` - Do not supply this argument, it is automatically extracted from request headers.
   *
   * @returns object An empty reference that will be
   *   populated with the actual data once the response is returned
   *   from the server.
   *
   * This method returns no data.
   */
  public logout() {
    let method: string = "POST"

    let url: string = this.getPath() + "/User/logout"
    let urlParams: any = {
    }

    let params: any = {}

    let result = this.request(method, url, urlParams, params)
      .share()
      result.subscribe(
        () => {
          auth.clearUser()
          auth.clearStorage()
        },
        () => null
      )
    return result
  }

  /**
   * Reset password for a user with email.
   *
   * @param object data Request data.
   *
   * This method expects a subset of model properties as request parameters.
   *
   * @returns object An empty reference that will be
   *   populated with the actual data once the response is returned
   *   from the server.
   *
   * This method returns no data.
   */
  public resetPassword(options: any) {
    let method: string = "POST"

    let url: string = this.getPath() + "/User/reset"
    let urlParams: any = {
    }

    let params: any = {}

    let result = this.request(method, url, urlParams, params, options)
    return result
  }

  /**
   * @name lbServices.User#isAuthenticated
   *
   * @returns {boolean} True if the current user is authenticated (logged in).
   */
  public isAuthenticated() {
    let method: string = "GET"

    let url: string = this.getPath() + "/User/isAuthenticated"
    let urlParams: any = {
    }

    let params: any = {}
    let result = this.request(method, url, urlParams, params)
    return result
  }

  /**
   * @name lbServices.User#getCurrentId
   *
   * @returns object Id of the currently logged-in user or null.
   */
  public getCurrentId() {
    return auth.getCurrentUserId()
  }
}

/**
 * Api for the `Connection` model.
 */
@Injectable()
export class Connection extends BaseServerApi {

  constructor(
    @Inject(Http) http: Http,
    @Optional() @Inject(ErrorHandler) errorHandler: ErrorHandler
  ) {
    super(http, errorHandler)
  }

  /**
   * Create a new instance of the model and persist it into the data source.
   *
   * @param object data Request data.
   *
   * This method expects a subset of model properties as request parameters.
   *
   * @returns object An empty reference that will be
   *   populated with the actual data once the response is returned
   *   from the server.
   *
   * <em>
   * (The remote method definition does not provide any description.
   * This usually means the response is a `Connection` object.)
   * </em>
   */
  public create(data: any = undefined) {
    let method: string = "POST"

    let url: string = this.getPath() + "/Connection"
    let urlParams: any = {
    }

    let params: any = {}

    let result = this.request(method, url, urlParams, params, data)
    return result
  }

  /**
   * Find a model instance by id from the data source.
   *
   * @param any id Model id
   *
   * @param object filter Filter defining fields and include
   *
   * @returns object An empty reference that will be
   *   populated with the actual data once the response is returned
   *   from the server.
   *
   * <em>
   * (The remote method definition does not provide any description.
   * This usually means the response is a `Connection` object.)
   * </em>
   */
  public findById(id: any, filter: FilterInterface = undefined) {
    let method: string = "GET"

    let url: string = this.getPath() + "/Connection/:id"
    let urlParams: any = {
      id: id
    }

    let params: any = {}
    if (filter !== undefined) {
      params.filter = filter
    }

    let result = this.request(method, url, urlParams, params)
    return result
  }

  /**
   * Find all instances of the model matched by filter from the data source.
   *
   * @param object filter Filter defining fields, where, include, order, offset, and limit
   *
   * @returns object[] An empty reference that will be
   *   populated with the actual data once the response is returned
   *   from the server.
   *
   * <em>
   * (The remote method definition does not provide any description.
   * This usually means the response is a `Connection` object.)
   * </em>
   */
  public find(filter: FilterInterface = undefined) {
    let method: string = "GET"

    let url: string = this.getPath() + "/Connection"
    let urlParams: any = {
    }

    let params: any = {}
    if (filter !== undefined) {
      params.filter = filter
    }

    let result = this.request(method, url, urlParams, params)
    return result
  }


  /**
   * Delete a model instance by id from the data source.
   *
   * @param any id Model id
   *
   * @returns object An empty reference that will be
   *   populated with the actual data once the response is returned
   *   from the server.
   *
   * <em>
   * (The remote method definition does not provide any description.
   * This usually means the response is a `Connection` object.)
   * </em>
   */
  public deleteById(id: any) {
    let method: string = "DELETE"

    let url: string = this.getPath() + "/Connection/:id"
    let urlParams: any = {
      id: id
    }

    let params: any = {}

    let result = this.request(method, url, urlParams, params)
    return result
  }

  /**
   * Update attributes for a model instance and persist it into the data source.
   *
   * @param any id PersistedModel id
   *
   * @param object data Request data.
   *
   * This method expects a subset of model properties as request parameters.
   *
   * @returns object An empty reference that will be
   *   populated with the actual data once the response is returned
   *   from the server.
   *
   * <em>
   * (The remote method definition does not provide any description.
   * This usually means the response is a `Connection` object.)
   * </em>
   */
  public updateAttributes(id: any, data: any = undefined) {
    let method: string = "PUT"

    let url: string = this.getPath() + "/Connection/:id"
    let urlParams: any = {
      id: id
    }

    let params: any = {}

    let result = this.request(method, url, urlParams, params, data)
    return result
  }


    /**
   * Describe Metadata (fetch top level metadata).
   *
   * @returns object array of metadata
   *
   */
  public getDescribeMetadata(params: any = {}) {
    let method: string = "GET"

    let url: string = this.getPath() + "/Connection/getDescribeMetadata"
    let urlParams: any = {}

    let result = this.request(method, url, urlParams, params)
    return result
  }

}

/**
 * Api for the `Gitserver` model.
 */
@Injectable()
export class GitServer extends BaseServerApi {

  constructor(
    @Inject(Http) http: Http,
    @Optional() @Inject(ErrorHandler) errorHandler: ErrorHandler
  ) {
    super(http, errorHandler)
  }

  /**
   * Create a new instance of the model and persist it into the data source.
   *
   * @param object data Request data.
   *
   * This method expects a subset of model properties as request parameters.
   *
   * @returns object An empty reference that will be
   *   populated with the actual data once the response is returned
   *   from the server.
   *
   * <em>
   * (The remote method definition does not provide any description.
   * This usually means the response is a `Gitserver` object.)
   * </em>
   */
  public create(data: any = undefined) {
    let method: string = "POST"

    let url: string = this.getPath() + "/Gitserver"
    let urlParams: any = {
    }

    let params: any = {}

    let result = this.request(method, url, urlParams, params, data)
    return result
  }

  /**
   * Find a model instance by id from the data source.
   *
   * @param any id Model id
   *
   * @param object filter Filter defining fields and include
   *
   * @returns object An empty reference that will be
   *   populated with the actual data once the response is returned
   *   from the server.
   *
   * <em>
   * (The remote method definition does not provide any description.
   * This usually means the response is a `Gitserver` object.)
   * </em>
   */
  public findById(id: any, filter: FilterInterface = undefined) {
    let method: string = "GET"

    let url: string = this.getPath() + "/Gitserver/:id"
    let urlParams: any = {
      id: id
    }

    let params: any = {}
    if (filter !== undefined) {
      params.filter = filter
    }

    let result = this.request(method, url, urlParams, params)
    return result
  }

  /**
   * Find all instances of the model matched by filter from the data source.
   *
   * @param object filter Filter defining fields, where, include, order, offset, and limit
   *
   * @returns object[] An empty reference that will be
   *   populated with the actual data once the response is returned
   *   from the server.
   *
   * <em>
   * (The remote method definition does not provide any description.
   * This usually means the response is a `Gitserver` object.)
   * </em>
   */
  public find(filter: FilterInterface = undefined) {
    let method: string = "GET"

    let url: string = this.getPath() + "/Gitserver"
    let urlParams: any = {
    }

    let params: any = {}
    if (filter !== undefined) {
      params.filter = filter
    }

    let result = this.request(method, url, urlParams, params)
    return result
  }

  /**
   * Delete a model instance by id from the data source.
   *
   * @param any id Model id
   *
   * @returns object An empty reference that will be
   *   populated with the actual data once the response is returned
   *   from the server.
   *
   * <em>
   * (The remote method definition does not provide any description.
   * This usually means the response is a `Gitserver` object.)
   * </em>
   */
  public deleteById(id: any) {
    let method: string = "DELETE"

    let url: string = this.getPath() + "/Gitserver/:id"
    let urlParams: any = {
      id: id
    }

    let params: any = {}

    let result = this.request(method, url, urlParams, params)
    return result
  }

  /**
   * Update attributes for a model instance and persist it into the data source.
   *
   * @param any id PersistedModel id
   *
   * @param object data Request data.
   *
   * This method expects a subset of model properties as request parameters.
   *
   * @returns object An empty reference that will be
   *   populated with the actual data once the response is returned
   *   from the server.
   *
   * <em>
   * (The remote method definition does not provide any description.
   * This usually means the response is a `Gitserver` object.)
   * </em>
   */
  public updateAttributes(id: any, data: any = undefined) {
    let method: string = "PUT"

    let url: string = this.getPath() + "/Gitserver/:id"
    let urlParams: any = {
      id: id
    }

    let params: any = {}

    let result = this.request(method, url, urlParams, params, data)
    return result
  }
}

/**
 * Api for the `Deployment` model.
 */
@Injectable()
export class Deployment extends BaseServerApi {
  constructor(
    @Inject(Http) http: Http,
    @Optional() @Inject(ErrorHandler) errorHandler: ErrorHandler
  ) {
    super(http, errorHandler)
  }

  public getPackage(data: any = undefined) {
    let method: string = "POST"

    let url: string = this.getPath() + "/Deployment/getPackage"
    let urlParams: any = {
    }

    let params: any = {}

    let result = this.request(method, url, urlParams, params, data)
    return result
  }

  public getDescribeMetadata(data: any = undefined) {
    let method: string = "GET"

    let url: string = this.getPath() + "/Deployment/getDescribeMetadata"
    let urlParams: any = {
    }

    let params: any = {}

    let result = this.request(method, url, urlParams, params, data)
    return result
  }

}

/**
 * Api for the `Privatekey` model.
 */
@Injectable()
export class PrivateKey extends BaseServerApi {

  constructor(
    @Inject(Http) http: Http,
    @Optional() @Inject(ErrorHandler) errorHandler: ErrorHandler
  ) {
    super(http, errorHandler)
  }

  /**
   * Create a new instance of the model and persist it into the data source.
   *
   * @param object data Request data.
   *
   * This method expects a subset of model properties as request parameters.
   *
   * @returns object An empty reference that will be
   *   populated with the actual data once the response is returned
   *   from the server.
   *
   * <em>
   * (The remote method definition does not provide any description.
   * This usually means the response is a `Privatekey` object.)
   * </em>
   */
  public create(data: any = undefined) {
    let method: string = "POST"

    let url: string = this.getPath() + "/Privatekey"
    let urlParams: any = {
    }

    let params: any = {}

    let result = this.request(method, url, urlParams, params, data)
    return result
  }

  /**
   * Find a model instance by id from the data source.
   *
   * @param any id Model id
   *
   * @param object filter Filter defining fields and include
   *
   * @returns object An empty reference that will be
   *   populated with the actual data once the response is returned
   *   from the server.
   *
   * <em>
   * (The remote method definition does not provide any description.
   * This usually means the response is a `Privatekey` object.)
   * </em>
   */
  public findById(id: any, filter: FilterInterface = undefined) {
    let method: string = "GET"

    let url: string = this.getPath() + "/Privatekey/:id"
    let urlParams: any = {
      id: id
    }

    let params: any = {}
    if (filter !== undefined) {
      params.filter = filter
    }

    let result = this.request(method, url, urlParams, params)
    return result
  }

  /**
   * Find all instances of the model matched by filter from the data source.
   *
   * @param object filter Filter defining fields, where, include, order, offset, and limit
   *
   * @returns object[] An empty reference that will be
   *   populated with the actual data once the response is returned
   *   from the server.
   *
   * <em>
   * (The remote method definition does not provide any description.
   * This usually means the response is a `Privatekey` object.)
   * </em>
   */
  public find(filter: FilterInterface = undefined) {
    let method: string = "GET"

    let url: string = this.getPath() + "/Privatekey"
    let urlParams: any = {
    }

    let params: any = {}
    if (filter !== undefined) {
      params.filter = filter
    }

    let result = this.request(method, url, urlParams, params)
    return result
  }

  /**
   * Delete a model instance by id from the data source.
   *
   * @param any id Model id
   *
   * @returns object An empty reference that will be
   *   populated with the actual data once the response is returned
   *   from the server.
   *
   * <em>
   * (The remote method definition does not provide any description.
   * This usually means the response is a `Privatekey` object.)
   * </em>
   */
  public deleteById(id: any) {
    let method: string = "DELETE"

    let url: string = this.getPath() + "/Privatekey/:id"
    let urlParams: any = {
      id: id
    }

    let params: any = {}

    let result = this.request(method, url, urlParams, params)
    return result
  }

  /**
   * Update attributes for a model instance and persist it into the data source.
   *
   * @param any id PersistedModel id
   *
   * @param object data Request data.
   *
   * This method expects a subset of model properties as request parameters.
   *
   * @returns object An empty reference that will be
   *   populated with the actual data once the response is returned
   *   from the server.
   *
   * <em>
   * (The remote method definition does not provide any description.
   * This usually means the response is a `Privatekey` object.)
   * </em>
   */
  public updateAttributes(id: any, data: any = undefined) {
    let method: string = "PUT"

    let url: string = this.getPath() + "/Privatekey/:id"
    let urlParams: any = {
      id: id
    }

    let params: any = {}

    let result = this.request(method, url, urlParams, params, data)
    return result
  }
}

/**
 * Api for the `Project` model.
 */
@Injectable()
export class Project extends BaseServerApi {

  constructor(
    @Inject(Http) http: Http,
    @Optional() @Inject(ErrorHandler) errorHandler: ErrorHandler
  ) {
    super(http, errorHandler)
  }

  /**
   * Create a new instance of the model and persist it into the data source.
   *
   * @param object data Request data.
   *
   * This method expects a subset of model properties as request parameters.
   *
   * @returns object An empty reference that will be
   *   populated with the actual data once the response is returned
   *   from the server.
   *
   * <em>
   * (The remote method definition does not provide any description.
   * This usually means the response is a `Project` object.)
   * </em>
   */
  public create(data: any = undefined) {
    let method: string = "POST"

    let url: string = this.getPath() + "/Project"
    let urlParams: any = {
    }

    let params: any = {}

    let result = this.request(method, url, urlParams, params, data)
    return result
  }

  /**
   * Find a model instance by id from the data source.
   *
   * @param any id Model id
   *
   * @param object filter Filter defining fields and include
   *
   * @returns object An empty reference that will be
   *   populated with the actual data once the response is returned
   *   from the server.
   *
   * <em>
   * (The remote method definition does not provide any description.
   * This usually means the response is a `Project` object.)
   * </em>
   */
  public findById(id: any, filter: FilterInterface = undefined) {
    let method: string = "GET"

    let url: string = this.getPath() + "/Project/:id"
    let urlParams: any = {
      id: id
    }

    let params: any = {}
    if (filter !== undefined) {
      params.filter = filter
    }

    let result = this.request(method, url, urlParams, params)
    return result
  }

  /**
   * Find all instances of the model matched by filter from the data source.
   *
   * @param object filter Filter defining fields, where, include, order, offset, and limit
   *
   * @returns object[] An empty reference that will be
   *   populated with the actual data once the response is returned
   *   from the server.
   *
   * <em>
   * (The remote method definition does not provide any description.
   * This usually means the response is a `Project` object.)
   * </em>
   */
  public find(filter: FilterInterface = undefined) {
    let method: string = "GET"

    let url: string = this.getPath() + "/Project"
    let urlParams: any = {
    }

    let params: any = {}
    if (filter !== undefined) {
      params.filter = filter
    }

    let result = this.request(method, url, urlParams, params)
    return result
  }

  /**
   * Delete a model instance by id from the data source.
   *
   * @param any id Model id
   *
   * @returns object An empty reference that will be
   *   populated with the actual data once the response is returned
   *   from the server.
   *
   * <em>
   * (The remote method definition does not provide any description.
   * This usually means the response is a `Project` object.)
   * </em>
   */
  public deleteById(id: any) {
    let method: string = "DELETE"

    let url: string = this.getPath() + "/Project/:id"
    let urlParams: any = {
      id: id
    }

    let params: any = {}

    let result = this.request(method, url, urlParams, params)
    return result
  }

  /**
   * Update attributes for a model instance and persist it into the data source.
   *
   * @param any id PersistedModel id
   *
   * @param object data Request data.
   *
   * This method expects a subset of model properties as request parameters.
   *
   * @returns object An empty reference that will be
   *   populated with the actual data once the response is returned
   *   from the server.
   *
   * <em>
   * (The remote method definition does not provide any description.
   * This usually means the response is a `Project` object.)
   * </em>
   */
  public updateAttributes(id: any, data: any = undefined) {
    let method: string = "PUT"

    let url: string = this.getPath() + "/Project/:id"
    let urlParams: any = {
      id: id
    }

    let params: any = {}

    let result = this.request(method, url, urlParams, params, data)
    return result
  }
}



/**
 * Api for the `ProjectDetail` model.
 */
@Injectable()
export class ProjectDetail extends BaseServerApi {

  constructor(
    @Inject(Http) http: Http,
    @Optional() @Inject(ErrorHandler) errorHandler: ErrorHandler
  ) {
    super(http, errorHandler)
  }

  /**
   * Get all the project details
   *
   */
  public getDetails(id: any = undefined) {
    let method: string = "GET"

    let url: string = this.getPath() + "/ProjectDetail/:id"
    let urlParams: any = {
      id: id
    }

    let params: any = {}

    let result = this.request(method, url, urlParams, params)
    return result
  }
}

/**
 * Api for the `ReleaseDetail` model.
 */
@Injectable()
export class ReleaseDetail extends BaseServerApi {

  constructor(
    @Inject(Http) http: Http,
    @Optional() @Inject(ErrorHandler) errorHandler: ErrorHandler
  ) {
    super(http, errorHandler)
  }

  /**
   * Get all the release details
   *
   */
  public getDetails(id: any = undefined) {
    let method: string = "GET"

    let url: string = this.getPath() + "/ReleaseDetail/:id"
    let urlParams: any = {
      id: id
    }

    let params: any = {}

    let result = this.request(method, url, urlParams, params)
    return result
  }
}

/**
 * Api for the `StoryDetail` model.
 */
@Injectable()
export class StoryDetail extends BaseServerApi {

  constructor(
    @Inject(Http) http: Http,
    @Optional() @Inject(ErrorHandler) errorHandler: ErrorHandler
  ) {
    super(http, errorHandler)
  }

  /**
   * Get all the story details
   *
   */
  public getStory(id: any = undefined) {
    let method: string = "GET"

    let url: string = this.getPath() + "/StoryDetail/:id"
    let urlParams: any = {
      id: id
    }

    let params: any = {}

    let result = this.request(method, url, urlParams, params)
    return result
  }
}

/**
 * Api for the `Release` model.
 */
@Injectable()
export class Release extends BaseServerApi {

  constructor(
    @Inject(Http) http: Http,
    @Optional() @Inject(ErrorHandler) errorHandler: ErrorHandler
  ) {
    super(http, errorHandler)
  }

  /**
   * Create a new instance of the model and persist it into the data source.
   *
   * @param object data Request data.
   *
   * This method expects a subset of model properties as request parameters.
   *
   * @returns object An empty reference that will be
   *   populated with the actual data once the response is returned
   *   from the server.
   *
   * <em>
   * (The remote method definition does not provide any description.
   * This usually means the response is a `Release` object.)
   * </em>
   */
  public create(data: any = undefined) {
    let method: string = "POST"

    let url: string = this.getPath() + "/Release"
    let urlParams: any = {
    }

    let params: any = {}

    let result = this.request(method, url, urlParams, params, data)
    return result
  }

  /**
   * Find a model instance by id from the data source.
   *
   * @param any id Model id
   *
   * @param object filter Filter defining fields and include
   *
   * @returns object An empty reference that will be
   *   populated with the actual data once the response is returned
   *   from the server.
   *
   * <em>
   * (The remote method definition does not provide any description.
   * This usually means the response is a `Release` object.)
   * </em>
   */
  public findById(id: any, filter: FilterInterface = undefined) {
    let method: string = "GET"

    let url: string = this.getPath() + "/Release/:id"
    let urlParams: any = {
      id: id
    }

    let params: any = {}
    if (filter !== undefined) {
      params.filter = filter
    }

    let result = this.request(method, url, urlParams, params)
    return result
  }

  /**
   * Find all instances of the model matched by filter from the data source.
   *
   * @param object filter Filter defining fields, where, include, order, offset, and limit
   *
   * @returns object[] An empty reference that will be
   *   populated with the actual data once the response is returned
   *   from the server.
   *
   * <em>
   * (The remote method definition does not provide any description.
   * This usually means the response is a `Release` object.)
   * </em>
   */
  public find(filter: FilterInterface = undefined) {
    let method: string = "GET"

    let url: string = this.getPath() + "/Release"
    let urlParams: any = {
    }

    let params: any = {}
    if (filter !== undefined) {
      params.filter = filter
    }

    let result = this.request(method, url, urlParams, params)
    return result
  }

  /**
   * Delete a model instance by id from the data source.
   *
   * @param any id Model id
   *
   * @returns object An empty reference that will be
   *   populated with the actual data once the response is returned
   *   from the server.
   *
   * <em>
   * (The remote method definition does not provide any description.
   * This usually means the response is a `Release` object.)
   * </em>
   */
  public deleteById(id: any) {
    let method: string = "DELETE"

    let url: string = this.getPath() + "/Release/:id"
    let urlParams: any = {
      id: id
    }

    let params: any = {}

    let result = this.request(method, url, urlParams, params)
    return result
  }

  /**
   * Update attributes for a model instance and persist it into the data source.
   *
   * @param any id PersistedModel id
   *
   * @param object data Request data.
   *
   * This method expects a subset of model properties as request parameters.
   *
   * @returns object An empty reference that will be
   *   populated with the actual data once the response is returned
   *   from the server.
   *
   * <em>
   * (The remote method definition does not provide any description.
   * This usually means the response is a `Release` object.)
   * </em>
   */
  public updateAttributes(id: any, data: any = undefined) {
    let method: string = "PUT"

    let url: string = this.getPath() + "/Release/:id"
    let urlParams: any = {
      id: id
    }

    let params: any = {}

    let result = this.request(method, url, urlParams, params, data)
    return result
  }
}


/**
 * Api for the `Story` model.
 */
@Injectable()
export class Story extends BaseServerApi {

  constructor(
    @Inject(Http) http: Http,
    @Optional() @Inject(ErrorHandler) errorHandler: ErrorHandler
  ) {
    super(http, errorHandler)
  }

  /**
   * Create a new instance of the model and persist it into the data source.
   *
   * @param object data Request data.
   *
   * This method expects a subset of model properties as request parameters.
   *
   * @returns object An empty reference that will be
   *   populated with the actual data once the response is returned
   *   from the server.
   *
   * <em>
   * (The remote method definition does not provide any description.
   * This usually means the response is a `Story` object.)
   * </em>
   */
  public create(data: any = undefined) {
    let method: string = "POST"

    let url: string = this.getPath() + "/Story"
    let urlParams: any = {
    }

    let params: any = {}

    let result = this.request(method, url, urlParams, params, data)
    return result
  }

  /**
   * Find a model instance by id from the data source.
   *
   * @param any id Model id
   *
   * @param object filter Filter defining fields and include
   *
   * @returns object An empty reference that will be
   *   populated with the actual data once the response is returned
   *   from the server.
   *
   * <em>
   * (The remote method definition does not provide any description.
   * This usually means the response is a `Story` object.)
   * </em>
   */
  public findById(id: any, filter: FilterInterface = undefined) {
    let method: string = "GET"

    let url: string = this.getPath() + "/Story/:id"
    let urlParams: any = {
      id: id
    }

    let params: any = {}
    if (filter !== undefined) {
      params.filter = filter
    }

    let result = this.request(method, url, urlParams, params)
    return result
  }

  /**
   * Find all instances of the model matched by filter from the data source.
   *
   * @param object filter Filter defining fields, where, include, order, offset, and limit
   *
   * @returns object[] An empty reference that will be
   *   populated with the actual data once the response is returned
   *   from the server.
   *
   * <em>
   * (The remote method definition does not provide any description.
   * This usually means the response is a `Story` object.)
   * </em>
   */
  public find(filter: FilterInterface = undefined) {
    let method: string = "GET"

    let url: string = this.getPath() + "/Story"
    let urlParams: any = {
    }

    let params: any = {}
    if (filter !== undefined) {
      params.filter = filter
    }

    let result = this.request(method, url, urlParams, params)
    return result
  }

  /**
   * Delete a model instance by id from the data source.
   *
   * @param any id Model id
   *
   * @returns object An empty reference that will be
   *   populated with the actual data once the response is returned
   *   from the server.
   *
   * <em>
   * (The remote method definition does not provide any description.
   * This usually means the response is a `Story` object.)
   * </em>
   */
  public deleteById(id: any) {
    let method: string = "DELETE"

    let url: string = this.getPath() + "/Story/:id"
    let urlParams: any = {
      id: id
    }

    let params: any = {}

    let result = this.request(method, url, urlParams, params)
    return result
  }

  /**
   * Update attributes for a model instance and persist it into the data source.
   *
   * @param any id PersistedModel id
   *
   * @param object data Request data.
   *
   * This method expects a subset of model properties as request parameters.
   *
   * @returns object An empty reference that will be
   *   populated with the actual data once the response is returned
   *   from the server.
   *
   * <em>
   * (The remote method definition does not provide any description.
   * This usually means the response is a `Story` object.)
   * </em>
   */
  public updateAttributes(id: any, data: any = undefined) {
    let method: string = "PUT"

    let url: string = this.getPath() + "/Story/:id"
    let urlParams: any = {
      id: id
    }

    let params: any = {}

    let result = this.request(method, url, urlParams, params, data)
    return result
  }
}


/**
 * Api for the `Validation` model.
 */
@Injectable()
export class Validation extends BaseServerApi {

  constructor(
    @Inject(Http) http: Http,
    @Optional() @Inject(ErrorHandler) errorHandler: ErrorHandler
  ) {
    super(http, errorHandler)
  }

  /**
   * Create a new instance of the model and persist it into the data source.
   *
   * @param object data Request data.
   *
   * This method expects a subset of model properties as request parameters.
   *
   * @returns object An empty reference that will be
   *   populated with the actual data once the response is returned
   *   from the server.
   *
   * <em>
   * (The remote method definition does not provide any description.
   * This usually means the response is a `Validation` object.)
   * </em>
   */
  public create(data: any = undefined) {
    let method: string = "POST"

    let url: string = this.getPath() + "/Validation"
    let urlParams: any = {
    }

    let params: any = {}

    let result = this.request(method, url, urlParams, params, data)
    return result
  }

  /**
   * Find a model instance by id from the data source.
   *
   * @param any id Model id
   *
   * @param object filter Filter defining fields and include
   *
   * @returns object An empty reference that will be
   *   populated with the actual data once the response is returned
   *   from the server.
   *
   * <em>
   * (The remote method definition does not provide any description.
   * This usually means the response is a `Validation` object.)
   * </em>
   */
  public findById(id: any, filter: FilterInterface = undefined) {
    let method: string = "GET"

    let url: string = this.getPath() + "/Validation/:id"
    let urlParams: any = {
      id: id
    }

    let params: any = {}
    if (filter !== undefined) {
      params.filter = filter
    }

    let result = this.request(method, url, urlParams, params)
    return result
  }

  /**
   * Find all instances of the model matched by filter from the data source.
   *
   * @param object filter Filter defining fields, where, include, order, offset, and limit
   *
   * @returns object[] An empty reference that will be
   *   populated with the actual data once the response is returned
   *   from the server.
   *
   * <em>
   * (The remote method definition does not provide any description.
   * This usually means the response is a `Validation` object.)
   * </em>
   */
  public find(filter: FilterInterface = undefined) {
    let method: string = "GET"

    let url: string = this.getPath() + "/Validation"
    let urlParams: any = {
    }

    let params: any = {}
    if (filter !== undefined) {
      params.filter = filter
    }

    let result = this.request(method, url, urlParams, params)
    return result
  }

  /**
   * Delete a model instance by id from the data source.
   *
   * @param any id Model id
   *
   * @returns object An empty reference that will be
   *   populated with the actual data once the response is returned
   *   from the server.
   *
   * <em>
   * (The remote method definition does not provide any description.
   * This usually means the response is a `Validation` object.)
   * </em>
   */
  public deleteById(id: any) {
    let method: string = "DELETE"

    let url: string = this.getPath() + "/Validation/:id"
    let urlParams: any = {
      id: id
    }

    let params: any = {}

    let result = this.request(method, url, urlParams, params)
    return result
  }

  /**
   * Update attributes for a model instance and persist it into the data source.
   *
   * @param any id PersistedModel id
   *
   * @param object data Request data.
   *
   * This method expects a subset of model properties as request parameters.
   *
   * @returns object An empty reference that will be
   *   populated with the actual data once the response is returned
   *   from the server.
   *
   * <em>
   * (The remote method definition does not provide any description.
   * This usually means the response is a `Validation` object.)
   * </em>
   */
  public updateAttributes(id: any, data: any = undefined) {
    let method: string = "PUT"

    let url: string = this.getPath() + "/Validation/:id"
    let urlParams: any = {
      id: id
    }

    let params: any = {}

    let result = this.request(method, url, urlParams, params, data)
    return result
  }
}
