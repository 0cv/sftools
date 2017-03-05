import {Injectable} from '@angular/core'
import {Subject}    from 'rxjs/Subject'
import {Observable} from 'rxjs/Observable'

@Injectable()
export class LoadingSpinnerService {
  // Observable string sources
  private _spinnerStateAnnouncedSource = new Subject<boolean>()
  // Observable string streams
  spinnerStateAnnounced$: Observable<any> = this._spinnerStateAnnouncedSource.asObservable()
  // Service message commands
  announceSpinnerState(isShown: boolean) {
    this._spinnerStateAnnouncedSource.next(isShown)
  }
}
