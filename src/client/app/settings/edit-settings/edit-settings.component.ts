import { Component, OnInit } from '@angular/core'
import { Router } from '@angular/router'
import { User } from 'core/lb-services'
import { StoreService } from 'core/store.service'
import { FormGroup, FormControl } from '@angular/forms'

@Component({
  selector: 'edit-settings',
  styleUrls: [
    './edit-settings.scss'
  ],
  templateUrl: './edit-settings.html'
})

export class EditSettingsComponent implements OnInit {
  form = new FormGroup({
    _id: new FormControl(),
    email: new FormControl(),
    username: new FormControl(),
    password: new FormControl(),
  })

  password_verif

  constructor(
    private router: Router,
    private user: User,
    private store: StoreService
  ) {}

  ngOnInit() {
    this.store.read('user').subscribe((users) => {
      this.form.patchValue(users[0])
    })
  }

  save() {
    this.user.updateAttributes(this.form.value._id, this.form.value).subscribe((res) => {
      console.log('res', res)
      this.store.update('user', this.form.value)
      this.router.navigate(['/settings'])
    })
  }
}
