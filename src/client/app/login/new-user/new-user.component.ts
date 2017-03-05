import { User } from 'core/lb-services'
import { Component, Injectable } from '@angular/core'
import { Router } from '@angular/router'
import { FormGroup, FormControl } from '@angular/forms'
import { MdSnackBar } from '@angular/material'

@Component({
  selector: 'new-user',
  styleUrls: [
    './new-user.scss'
  ],
  templateUrl: './new-user.html'
})

@Injectable()
export class NewUserComponent {

  form = new FormGroup({
    email: new FormControl(),
    username: new FormControl(),
    password: new FormControl(),
    password_verif: new FormControl()
  })

  constructor(
    private router: Router,
    private user: User,
    private snackBar: MdSnackBar
  ) {}

  onSubmit() {
    const user = Object.assign({}, this.form.value)
    delete user.password_verif
    this.user.create(user).subscribe(res => {
      // some actions on login
      this.router.navigateByUrl('/login/')
    }, error => {
      this.snackBar.open(error, 'DISMISS', {
        politeness: 'assertive',
        duration: 5000
      })
    })
  }
}
