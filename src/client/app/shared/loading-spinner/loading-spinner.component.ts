import { Component, Injectable, Input } from '@angular/core'

@Component({
  selector: 'loading-spinner',
  styleUrls: ['./loading-spinner.scss'],
  templateUrl: './loading-spinner.html'
})

@Injectable()
export class LoadingSpinnerComponent {
  @Input() isShown: boolean = true
  constructor() {}
}
