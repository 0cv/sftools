import { ExtHttp } from './auth-http.service'
import { RequestOptions, XHRBackend } from '@angular/http'
import { LoadingSpinnerService } from './loading-spinner.service'

export function httpFactory(backend: XHRBackend, defaultOptions: RequestOptions, loadingSpinnerService: LoadingSpinnerService) {
  return new ExtHttp(
    backend,
    defaultOptions,
    loadingSpinnerService
  )
}
