import { Component, OnInit } from '@angular/core'
import { User } from 'core/lb-services'
import { StoreService } from 'core/store.service'

@Component({
  selector: 'settings',
  styleUrls: [
    './settings.scss'
  ],
  templateUrl: './settings.html'
})

export class SettingsComponent implements OnInit {
  user: any = {}

  constructor(
    private store: StoreService
  ) {}

  ngOnInit() {
    this.store.read('user').subscribe((users) => {
      console.log('users', users)
      this.user = users.length && users[0]
    })
  }
}
