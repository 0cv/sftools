import { Injectable } from '@angular/core'
import { Http, ConnectionBackend, RequestOptions, Request, RequestOptionsArgs } from '@angular/http'
import { Observable } from 'rxjs'
import { LoadingSpinnerService } from 'core/loading-spinner.service'

@Injectable()
export class ExtHttp extends Http {
  constructor(backend: ConnectionBackend, defaultOptions: RequestOptions, private loading: LoadingSpinnerService) {
    super(backend, defaultOptions)
  }

  request(url: string | Request, options?: RequestOptionsArgs): Observable<any> {
    setTimeout(() => this.loading.announceSpinnerState(true))
    return Observable.create((observer) => {
      super
        .request(url, options)
        .subscribe(res => {
          observer.next(res)
          setTimeout(() => this.loading.announceSpinnerState(false))
          observer.complete()
        }, err => {
          console.log('err!!==>', err)
          const body = err._body
          setTimeout(() => this.loading.announceSpinnerState(false))
          window.alert(body)
          throw new Error(body)
        })
    })
  }
}
