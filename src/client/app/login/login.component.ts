import { User } from 'core/lb-services'
import { Component, Injectable } from '@angular/core'
import { Router } from '@angular/router'
import { StoreService } from 'core/store.service'
import { FormGroup, FormControl } from '@angular/forms'
import { MdSnackBar } from '@angular/material'

@Component({
  selector: 'login',
  styleUrls: [
    './login.scss'
  ],
  templateUrl: './login.html'
})

@Injectable()
export class LoginComponent {

  form = new FormGroup({
    username: new FormControl(),
    password: new FormControl()
  })

  constructor(
    private router: Router,
    private user: User,
    private store: StoreService,
    private snackBar: MdSnackBar
  ) {}

  submit() {
    this.user.login(this.form.value).subscribe(res => {
      this.store.create('user', res.user)
      this.router.navigate(['/connections'])
    }, error => {
      this.snackBar.open(error, 'DISMISS', {
        politeness: 'assertive',
        duration: 5000
      })
    })
  }
}
