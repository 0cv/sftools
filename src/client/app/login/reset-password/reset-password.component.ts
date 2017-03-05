import { User } from 'core/lb-services'
import { Component, Injectable } from '@angular/core'
import { Router } from '@angular/router'
import { FormGroup, FormControl } from '@angular/forms'

@Component({
  selector: 'reset-password',
  styleUrls: [
    './reset-password.scss'
  ],
  templateUrl: './reset-password.html'
})

@Injectable()
export class ResetPasswordComponent {

  form = new FormGroup({
    email: new FormControl()
  })

  constructor(
    private router: Router,
    private user: User
  ) {}

  onSubmit() {
    console.log('submit reset password')
    this.user.reset(this.form.value).subscribe(res => {
      this.router.navigateByUrl('/login/')
    })
  }

}
